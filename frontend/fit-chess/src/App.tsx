import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';

interface GameState {
  fen: string;
  turn: string;
  is_checkmate: boolean;
  is_stalemate: boolean;
}

function App() {
  const [gameState, setGameState] = useState<GameState>({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Initial board state in FEN notation
    turn: 'white',
    is_checkmate: false,
    is_stalemate: false,
  });

  // Function to fetch the game state from the backend
  const fetchGameState = async () => {
    const response = await fetch('http://127.0.0.1:5000/state');
    const data = await response.json();
    setGameState(data);
  };

  // Function to start a new game by calling the backend
  const startNewGame = async () => {
    const response = await fetch('http://127.0.0.1:5000/new_game', {
      method: 'POST',
    });
    const data = await response.json();
    setGameState(data);
  };

  // Function to send a move to the backend
  const makeMove = async (fromSquare: string, toSquare: string) => {
    const move = `${fromSquare}${toSquare}`;
    const response = await fetch('http://127.0.0.1:5000/move', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ move }),
    });
    const data = await response.json();
    setGameState(data);
  };

  // Function to request an AI move from the backend
  const requestAiMove = async () => {
    const response = await fetch('http://127.0.0.1:5000/ai_move', {
      method: 'POST',
    });
    const data = await response.json();
    setGameState(data);
  };

  // Called when a piece is dropped on the chessboard
  const handleMove = (fromSquare: string, toSquare: string) => {
    makeMove(fromSquare, toSquare);
  };

  useEffect(() => {
    fetchGameState(); // Fetch initial game state on load
  }, []);

  return (
    <div className="App">
      <h1>Chess Game</h1>
      <button onClick={startNewGame}>New Game</button>
      <button onClick={requestAiMove}>AI Move</button>
      <Chessboard
        position={gameState.fen}
        onPieceDrop={(sourceSquare, targetSquare) =>
          handleMove(sourceSquare, targetSquare)
        }
      />
      <div>
        <p>Turn: {gameState.turn}</p>
        {gameState.is_checkmate && <p>Checkmate!</p>}
        {gameState.is_stalemate && <p>Stalemate!</p>}
      </div>
    </div>
  );
}

export default App;