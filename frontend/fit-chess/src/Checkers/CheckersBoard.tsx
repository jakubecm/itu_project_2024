import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Square } from './Square';
import '../board/Board.css';
import './CheckersBoard.css';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Sidebar from '../board/Sidebar';

const BOARD_SIZE = 10; // Number of squares per side
export const SQUARE_SIZE = '64px';
document.documentElement.style.setProperty('--square-size', SQUARE_SIZE);

interface GameState {
  fen: string;
  turn: string;
  is_over: boolean;
  board_map: { [position: string]: string };
}

export const CheckersBoard: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);  // Selected piece position
  const [legalMoves, setLegalMoves] = useState<string[]>([]); // Legal moves for the selected piece (highlighted)
  const [legalMovesMap, setLegalMovesMap] = useState<{ [toPosition: string]: string }>({}); // Map of legal moves, for full move strings
  const [playablePieces, setPlayablePieces] = useState<string[]>([]); // Playable pieces for the current turn (highlighted)
  const location = useLocation();
  const variant = location.state?.variant || 'standard';  
  const mode = location.state?.mode || 'freeplay';
  const [moveHistory, setMoveHistory] = useState<string[]>([]); // Move history for the sidebar
  const fenFromState = location.state?.fen; // Custom fen from board setup mode

  // Initial piece and king count
  const initialPieceCount = location.state?.piece_count || (variant === 'frysk' ? 5 : 20);
  const initialKingCount = location.state?.king_count || 0;
  const [pieceCount] = useState(initialPieceCount);
  const [kingCount] = useState(initialKingCount);


  // Fetch the game state from the backend
  const fetchGameState = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/checkers/checkers_state');
      const data = await response.json();
      setGameState(data);

    } catch (error) {
      console.error('Error fetching game state:', error);
    }
  };

  // Start a new game
  const startNewGame = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/checkers/checkers_new_game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, piece_count: pieceCount, king_count: kingCount }),
      });
  
      const data = await response.json();
      setGameState(data);
      setMoveHistory([]);
    } catch (error) {
      console.error('Error starting new game:', error);
    }
  }, [variant, pieceCount, kingCount]);

  // Start the game with custom fen from board setup mode
  const applyCustomFen = useCallback(async () => {
    if (fenFromState) {
      try {
        const response = await fetch('http://127.0.0.1:5000/checkers/checkers_custom_setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fen: fenFromState, variant }),
        });
        const data = await response.json();
        setGameState(data);
        setMoveHistory([]);
        
      } catch (error) {
        console.error('Error applying custom fen:', error);
      }
    }
  }, [fenFromState, variant]);

  useEffect(() => {
    if (fenFromState && mode === 'freeplay') {
      applyCustomFen();

    } else {
      startNewGame();
    }
  }, [startNewGame, fenFromState, mode, applyCustomFen]);

  // Fetch legal moves for a given position
  const fetchLegalMoves = async (position: string) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/checkers/checkers_legal_moves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      });
  
      if (!response.ok) {
        console.error('Failed to fetch legal moves:', response.statusText);
        return {};
      }
  
      const data = await response.json();
  
      // Construct the legalMovesMap
      const movesMap: { [toPosition: string]: string } = {};
      data.legal_moves.forEach((move: string) => {
        const parts = move.split(/[-x]/g).map((p) => p.trim()); // Split and trim whitespace
        const toPosition = parts[1]; // 'to' position is the second part
        movesMap[toPosition] = move;
      });
      
      setLegalMoves(Object.keys(movesMap));
      setLegalMovesMap(movesMap);
      return movesMap; // Return the movesMap

    } catch (error) {
      console.error('Error fetching legal moves:', error);
      return {};
    }
  };
  
  // Fetch playable pieces for the current turn
  const fetchPlayablePieces = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/checkers/playable_pieces', {
        method: 'GET',
      });
  
      if (!response.ok) {
        console.error('Failed to fetch playable pieces:', response.statusText);
        return;
      }
  
      const data = await response.json();
      setPlayablePieces(data.playable_pieces); // Update playable pieces state

    } catch (error) {
      console.error('Error fetching playable pieces:', error);
    }
  };
  
  useEffect(() => {
    if (gameState) {
      fetchPlayablePieces(); // Fetch playable pieces for the current turn
    }
  }, [gameState]);

  // Handle square click
  const handleSquareClick = async (position: string) => {
    const board = gameState!.board_map;
    const piece = board[position];
  
    // If a piece is selected and the clicked square is a legal move
    if (selectedPiece) {
      if (legalMoves.includes(position)) {
        // Make the move
        await makeMove(selectedPiece, position, legalMovesMap);

      } else if (piece && gameState!.turn === (piece.toLowerCase() === 'r' ? 'white' : 'black')) {
        // Select a new piece if it's valid for the turn
        setSelectedPiece(position);
        await fetchLegalMoves(position);

      } else {
        // Deselect if invalid move or invalid piece
        setSelectedPiece(null);
        setLegalMoves([]);
      }

    } else if (piece && gameState!.turn === (piece.toLowerCase() === 'r' ? 'white' : 'black')) {
      // Select the piece if none is selected
      setSelectedPiece(position);
      await fetchLegalMoves(position);
    }
  };

  // Make a move
  const makeMove = async (fromPosition: string, toPosition: string, legalMovesMap: { [toPosition: string]: string }) => {
    // Find the move in PDN format from the legalMovesMap
    const movePDN = Object.values(legalMovesMap).find((move) => move.includes(toPosition));
    if (!movePDN) {
      console.error('Invalid move:', fromPosition, '->', toPosition);
      return;
    }
  
    // Proceed with making the move
    try {
      const response = await fetch('http://127.0.0.1:5000/checkers/checkers_move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ move: movePDN }),
      });
      const data = await response.json();
  
      if (data.error) {
        console.error('Backend rejected move:', data.error);
        return;
      }
  
      setMoveHistory((prevHistory) => [
        ...prevHistory,
        `${data.turn === 'white' ? 'Black' : 'Red'}: ${movePDN}`,
      ]);
  
      // Handle multi-captures
      if (data.is_capture && data.continue_capture) {
        setSelectedPiece(toPosition);
        await fetchLegalMoves(toPosition);
        if ((data.turn === 'black') && (data.ai_available) 
            && (variant !== 'frysk') && (mode !== 'freeplay')) {
          setTimeout(() => makeAIMove(), 500);
        }

      } else {
        setSelectedPiece(null);
        setLegalMoves([]);
        setLegalMovesMap({});
        if ((data.turn === 'black') && (data.ai_available) 
            && (variant !== 'frysk') && (mode !== 'freeplay')) {
          setTimeout(() => makeAIMove(), 500);
        }
      }
      console.log(gameState?.fen);
      await fetchGameState();

    } catch (error) {
      console.error('Error making move:', error);
    }
  };

  const makeAIMove = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/checkers/checkers_ai_move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (response.status === 500) {
        console.warn('AI not enabled. Skipping AI move.');
        return;
      }

      if (data.error) {
        console.error('AI move failed:', data.error);
        return;
      }

      setMoveHistory((prevHistory) => [...prevHistory, `AI: ${data.ai_move}`]);
      await fetchGameState();

    } catch (error) {
      console.error('Error making AI move:', error);
    }
  };

  // Handle piece selection
  const handlePieceSelection = async (position: string) => {
    setSelectedPiece(position);
    await fetchLegalMoves(position); // Populate legalMovesMap (for DnD)
  };

  // Handle piece drop
  const handleDrop = async (fromPosition: string, toPosition: string) => {
    let currentLegalMovesMap = legalMovesMap;

    // If legal moves are not populated, fetch them
    if (!currentLegalMovesMap || Object.keys(currentLegalMovesMap).length === 0) {
      currentLegalMovesMap = await fetchLegalMoves(fromPosition);
    }

    await makeMove(fromPosition, toPosition, currentLegalMovesMap);
  };

  useEffect(() => {
    fetchGameState();
  }, []);

const renderSquares = () => {
  const squares: JSX.Element[] = [];
  const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const rows = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  const board = gameState?.board_map || {};

  for (const row of rows) {
    for (const column of columns) {
      const position = column + row;
      const isDark = ((columns.indexOf(column) + row) % 2) === 1;
      const isPlayable = playablePieces.includes(position); // Highlight playable pieces
      const isHighlighted = legalMoves.includes(position); // Highlight legal moves
      const isSelected = selectedPiece === position;

      const pieceType = board[position];

      squares.push(
        <Square
          key={position}
          position={position}
          isDark={isDark}
          playable={isPlayable}
          highlighted={isHighlighted}
          selected={isSelected}
          onClick={() => handleSquareClick(position)}
          pieceType={pieceType}
          handlePieceSelection={handlePieceSelection}
          handleDrop={handleDrop}
          fetchLegalMoves={fetchLegalMoves} // Pass fetchLegalMoves down
        />
      );
    }
  }

  return squares;
};

  if (!gameState) {
    return <div>Loading...</div>;
  }

  return (
    <div className="board-container-check">
        <div className="board-sidebar-container-check">
            <div>
                <DndProvider backend={HTML5Backend}>
                    <div
                        style={{
                            position: 'relative',
                            display: 'grid',
                            gridTemplateColumns: `repeat(${BOARD_SIZE}, ${SQUARE_SIZE})`,
                        }}
                    >
                        {renderSquares()}
                    </div>
                </DndProvider>
                <div className="game-info">
                    {gameState.is_over && <div>Game Over!</div>}
                </div>
            </div>
            <div className="checkers-game-mode">
              <Sidebar
                moveHistory={moveHistory}
                onRevert={null}
                onHint={null}
              />
            </div>
        </div>
    </div>
  );
};
