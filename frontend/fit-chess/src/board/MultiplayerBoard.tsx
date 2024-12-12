import React, { useCallback, useEffect, useState } from 'react';
import { Square } from './square';
import { CapturedPiecesComponent, Piece, PromotionOptions } from './piece';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import GameOverModal from '../Effects/GameOverModal';
import './Board.css'; 
import Settings from './Settings';
import Sidebar from './Sidebar';

export const SQUARE_SIZE = '80px';
document.documentElement.style.setProperty('--square-size', SQUARE_SIZE);

interface GameState {
    fen: string;
    turn: string;
    is_checkmate: boolean;
    is_stalemate: boolean;
    is_check: boolean;
    material_balance: number;
    check_square?: string;
    move_history?: string[];  // Added to match backend return
}

interface Players {
    white: string;
    black: string;
}

interface MultiplayerBoardProps {
    gameId: string;
    playerColor: string;
    serverIp: string;
}

export const MultiplayerBoard: React.FC<MultiplayerBoardProps> = ({ gameId, playerColor, serverIp }) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
    const [legalMoves, setLegalMoves] = useState<string[]>([]);
    const [promotionMove, setPromotionMove] = useState<{ fromSquare: string; toSquare: string } | null>(null);
    const [showPromotionOptions, setShowPromotionOptions] = useState(false);
    const [showGameOverModal, setShowGameOverModal] = useState(false);  // Track if the modal was closed
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [moveMode, setMoveMode] = useState<"selectingPiece" | "selectingTarget">("selectingPiece");
    const [theme, setTheme] = useState<string>('regular');
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [players, setPlayers] = useState<Players>({ white: 'White', black: 'Black' });

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
    };

    // Fetch game state and check for checkmate/stalemate
    const fetchGameState = useCallback(async () => {
        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/game_state?game_id=${gameId}`);
            const data = await response.json();
            setGameState(data);

            // Set moveHistory from the server state
            if (data.move_history) {
                setMoveHistory(data.move_history);
            }

            if ((data.is_checkmate || data.is_stalemate) && !showGameOverModal) {
                setTimeout(() => setShowGameOverModal(true), 100);
            }

        } catch (e) {
            console.error('Failed to fetch game state:', e);
        }
    }, [serverIp, gameId, showGameOverModal]);

    // Fetch game state every second
    useEffect(() => {
        fetchGameState(); // Initial load
        const intervalId = setInterval(fetchGameState, 1000);
        return () => clearInterval(intervalId);
    }, [fetchGameState]);

    const simulateMove = async (move: string) => {
        try {
            const response = await fetch(`http://${serverIp}:5000/simulate_move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_id: gameId, move }),
            });
            const data = await response.json();
            if (data.error) {
                console.error(data.error);
                return;
            }

            setGameState(data);
            setSelectedPiece(null); // Reset selected piece
            setLegalMoves([]); // Reset legal moves
        } catch (e) {
            console.error('Failed to make a move: ', e);
        }
    };

    const submitMove = async (fromSquare: string, toSquare: string, currentGameState: GameState | null) => {
        if (!currentGameState || currentGameState.is_checkmate) return;
        if (currentGameState.turn !== playerColor) return; 

        try {
            const move = fromSquare === toSquare ? '0000' : `${fromSquare}${toSquare}`;
            if (move === '0000') {
                setSelectedPiece(null); // Reset selected piece
                setLegalMoves([]); // Reset legal moves
                return;
            }
    
            const response = await fetch(`http://${serverIp}:5000/multiplayer/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ game_id: gameId, move }),
            });
            
            const data = await response.json();
            if (data.error) {
                console.error(data.error);
                setSelectedPiece(null); // Reset selected piece
                setLegalMoves([]); // Reset legal moves
                setMoveMode('selectingPiece');
                setSelectedSquare(null);
                return;
            }
    
            setGameState(data);
            setSelectedPiece(null); // Reset selected piece
            setLegalMoves([]); // Reset legal moves
            setSelectedSquare(null);

        } catch (e) {
            console.error('Failed to make a move: ', e);
        }
    };
    
    // Handle move logic
    const handleMove = useCallback(async (fromSquare: string, toSquare: string, piece: string) => {
        if (showPromotionOptions) return; // Prevent moves while promotion options are shown
    
        const isPromotion = (piece === 'P' && toSquare[1] === '8') || (piece === 'p' && toSquare[1] === '1');
        
        if (isPromotion) {
            simulateMove(`${fromSquare}${toSquare}`);
            setPromotionMove({ fromSquare, toSquare });
            setShowPromotionOptions(true);

        } else {
            console.log('Game state before submit:', gameState);
            await submitMove(fromSquare, toSquare, gameState);  // Pass the latest `gameState`
        }
    }, [showPromotionOptions, gameState]);

    const handlePieceSelection = async (position: string) => {
        if (gameState?.turn !== playerColor || gameState?.is_checkmate) return; // Prevent piece selection if it's not the player's turn

        setSelectedSquare(null);
        setSelectedPiece(position);
        fetchLegalMoves(position);
    };

    const handleSquareClick = useCallback(async (position: string) => {
        if (!gameState || gameState.is_checkmate) return;

        if (moveMode === 'selectingPiece') {
            const moves = await fetchLegalMoves(position);
            setSelectedSquare(position);

            // If there are legal moves, switch to selecting target mode
            if (moves.length > 0) {
                setMoveMode('selectingTarget');
            } else {
                setMoveMode('selectingPiece');
            }

        } else if (moveMode === 'selectingTarget' && selectedSquare) {

            // If the same square is clicked again, deselect it
            if (selectedSquare === position) {
                setSelectedSquare(null);
                setSelectedPiece(null);
                setLegalMoves([]);
                setMoveMode('selectingPiece');
                return;
            }

            const moves = await fetchLegalMoves(position); // Fetch legal moves for the target square

            // If the target square is a legal move, make the move
            if (moves.length > 0) {
                setSelectedSquare(position);
                setLegalMoves(moves);
                setMoveMode('selectingTarget');

            } else if (selectedSquare) {
                // If the target square is not a legal move, deselect the selected square
                handleMove(selectedSquare, position, '');
                setSelectedSquare(null);
                setMoveMode('selectingPiece');
            }
        }
    }, [moveMode, selectedSquare, handleMove, gameState]);

    const fetchLegalMoves = async (square: string) => {
        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/legal_moves_multi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_id: gameId, position: square }),
            });
            const data = await response.json();
            setLegalMoves(data.legal_moves);
            return data.legal_moves;

        } catch (e) {
            console.error('Failed to fetch legal moves:', e);
            return [];
        }
    };

    // Handle promotion selection
    const handlePromotionSelect = async (piece: string) => {
        if (promotionMove) {
            await submitMove(promotionMove.fromSquare, promotionMove.toSquare + piece, gameState); // Add the selected piece to the move
            setShowPromotionOptions(false);
            setPromotionMove(null);
        }
    };

    // function that launches when a square is navigated to with keyboard
    // it updates the selected square
    const navigateBoard = useCallback((direction: string) => {
        let row = selectedSquare ? parseInt(selectedSquare[1], 10) : 1;
        let col = selectedSquare ? selectedSquare[0].charCodeAt(0) : 'a'.charCodeAt(0);

        if (direction === 'ArrowUp') row = Math.min(row + 1, 8);
        if (direction === 'ArrowDown') row = Math.max(row - 1, 1);
        if (direction === 'ArrowLeft') col = Math.max(col - 1, 'a'.charCodeAt(0));
        if (direction === 'ArrowRight') col = Math.min(col + 1, 'h'.charCodeAt(0));

        setSelectedSquare(String.fromCharCode(col) + row);
    }, [selectedSquare]);

    // function for selecting a square with keyboard
    // based on mode it either selects a piece or a target square for a move
    const selectSquare = useCallback(async () => {
        if (!selectedSquare || !gameState || gameState.is_checkmate) return;

        if (moveMode === "selectingPiece") {
            // First selection mode: fetch legal moves for the selected piece
            const response = await fetch(`http://${serverIp}:5000/multiplayer/legal_moves_multi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_id: gameId, position: selectedSquare }),
            });
            const data = await response.json();

            if (data.legal_moves.length > 0) {
                setSelectedPiece(selectedSquare); // Set selected piece if it has legal moves
                setLegalMoves(data.legal_moves);
                setMoveMode("selectingTarget"); // Switch to target selection mode

            } else {
                console.log('No legal moves for selected square');
            }

        } else if (moveMode === "selectingTarget") {
            // Second selection mode: submit the move
            if (selectedPiece && selectedSquare) {
                await handleMove(selectedPiece, selectedSquare, selectedPiece);
                setSelectedPiece(null); // Reset selection
                setLegalMoves([]); // Clear legal moves
                setMoveMode("selectingPiece"); // Switch back to piece selection mode
            }
        }
    }, [selectedSquare, moveMode, selectedPiece, handleMove]);
    
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (showPromotionOptions) return;

            switch (event.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    navigateBoard(event.key);
                    break;
                case ' ':
                    selectSquare();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSquare, showPromotionOptions, navigateBoard, selectSquare]);

    const startNewGame = async () => {
        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/new_game?game_id=${gameId}`, {
                method: 'GET',
            });
            const data = await response.json();
            setGameState(data);
            // Move history will be updated from server after polling
            setPlayers({ white: 'White', black: 'Black' });
        }
        catch (e) {
            console.error('Failed to start a new game: ', e);
        }
    };

    useEffect(() => {
        if (gameState && (gameState.is_checkmate || gameState.is_stalemate)) {
            setTimeout(() => setShowGameOverModal(true), 100);
        }
    }, [gameState]);

    if (!gameState) {
        return <div>Loading...</div>;
    }

    const renderSquares = () => {
        if (!gameState || !gameState.fen) return null;

        const squares: JSX.Element[] = [];
        let row = '8';
        let col = 'a';

        gameState.fen.split(' ')[0].split('').forEach((c) => {
            if (c === '/') {
                row = String.fromCharCode(row.charCodeAt(0) - 1);
                col = 'a';
                return;
            }

            if (c >= '1' && c <= '8') {
                for (let i = 0; i < parseInt(c); i++) {
                    const sq = col + row;
                    const selected = selectedSquare === sq;
                    const highlighted = selectedPiece === sq || legalMoves.includes(sq);
                    squares.push(
                            <Square 
                                key={sq} 
                                position={sq} 
                                highlighted={highlighted} 
                                selected={selected} 
                                handleMove={handleMove} 
                                onClick={handleSquareClick}
                            />
                    );

                    col = String.fromCharCode(col.charCodeAt(0) + 1);
                }

            } else {
                const sq = col + row;
                const selected = selectedSquare === sq;
                const highlighted = selectedPiece === sq || legalMoves.includes(sq);
                const inCheck = gameState.check_square ? sq === gameState.check_square : (((c === 'k' && gameState.turn === 'black') || (c === 'K' && gameState.turn === 'white')) && gameState.is_check);
                squares.push(
                    <Square 
                        key={sq} 
                        position={sq} 
                        highlighted={highlighted} 
                        selected={selected} 
                        handleMove={handleMove} 
                        inCheck={inCheck} 
                        onClick={handleSquareClick}>
                            
                        <Piece type={c} position={sq} handlePick={handlePieceSelection} theme={theme}/>
                    </Square>
                );
                col = String.fromCharCode(col.charCodeAt(0) + 1);
            }
        });

        return squares;
    };

    return (
        <div className='board-container multiplayer-mode'>
            <div className='board-sidebar-container'>
                <div>
                    <div style={{display: 'flex'}}>
                        <span className='board-text' style={{marginRight: '10px', fontSize: '29px'}}>{players.black}</span>
                        <CapturedPiecesComponent pieces={undefined} material={gameState.material_balance} theme={theme} player='black' />
                    </div>
                    <DndProvider backend={HTML5Backend}>
                        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(8, ' + SQUARE_SIZE + ')' }}>
                            {renderSquares()}
                            {showPromotionOptions && promotionMove && <PromotionOptions onSelect={handlePromotionSelect} turn={gameState.turn} promotionSqr={promotionMove.toSquare} theme={theme}/>}
                            {showGameOverModal && (
                                <GameOverModal
                                    message={gameState.is_checkmate ? `Checkmate! ${gameState.turn === 'white' ? 'Black' : 'White'} wins!` : "Stalemate! It's a draw!"}
                                    onClose={() => setShowGameOverModal(false)}
                                    onNewGame={startNewGame}
                                />
                            )}
                        </div>
                    </DndProvider>
                    <div style={{display: 'flex'}}>
                        <span className='board-text' style={{marginRight: '10px', fontSize: '29px'}}>{players.white}</span>
                        <CapturedPiecesComponent pieces={undefined} material={gameState.material_balance} theme={theme} player='white' />
                    </div>
                </div>
                <Sidebar moveHistory={moveHistory} onRevert={null} onHint={() => {}} />
            </div>
            <Settings onThemeChange={handleThemeChange} />
        </div>
    );
};
