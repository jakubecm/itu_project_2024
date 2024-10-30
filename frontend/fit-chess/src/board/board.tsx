import React, { useCallback, useEffect, useState } from 'react';
import { Square } from './square';
import { Piece, PromotionOptions } from './piece';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import GameOverModal from '../Effects/GameOverModal';

export const SQUARE_SIZE = '50px';

interface GameState {
    fen: string;
    turn: string;
    is_checkmate: boolean;
    is_stalemate: boolean;
    is_check: boolean;
}

export const Board: React.FC<{}> = () => {
    const [loading, setLoading] = useState<boolean>(true);  // Loading state to indicate API call is in progress
    const [gameState, setGameState] = useState<GameState>(); // Track the game state
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null); // Track the selected piece
    const [legalMoves, setLegalMoves] = useState<string[]>([]); // Track legal moves for the selected piece
    const [promotionMove, setPromotionMove] = useState<{ fromSquare: string; toSquare: string } | null>(null);
    const [showPromotionOptions, setShowPromotionOptions] = useState(false);
    const [showGameOverModal, setShowGameOverModal] = useState(false);
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null); // Track the selected square for keyboard navigation
    const [moveMode, setMoveMode] = useState<"selectingPiece" | "selectingTarget">("selectingPiece"); // Track the current move mode for keyboard navigation
    
    // function that launches when a move is made
    // handles promotion moves and submits the move
    const handleMove = useCallback(async (fromSquare: string, toSquare: string, piece: string) => {
        // forbid making a move if promotion options are shown
        if (showPromotionOptions) {
            return;
        }

        const isPromotion = (piece === 'P' && toSquare[1] === '8') || (piece === 'p' && toSquare[1] === '1');

        if (isPromotion) {
            simulateMove(`${fromSquare}${toSquare}`);    // Make the move without promotion
            setPromotionMove({ fromSquare, toSquare });  // Save the move
            setShowPromotionOptions(true);               // Show promotion options
        } else {
            await submitMove(fromSquare, toSquare);      // Regular move submission
        }
    }, [showPromotionOptions]);

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
        if (!selectedSquare) return;
        
        if (moveMode === "selectingPiece") {
            // First selection mode: fetch legal moves for the selected piece
            const response = await fetch('http://127.0.0.1:5000/legal_moves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ position: selectedSquare }),
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

    // Keyboard navigation
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
    }, [selectedSquare, selectedPiece, showPromotionOptions, navigateBoard, selectSquare]);

    const handlePromotionSelect = async (piece: string) => {
        if (promotionMove) {
            await submitMove(promotionMove.fromSquare, promotionMove.toSquare + piece);
            setPromotionMove(null);
            setShowPromotionOptions(false);
        }
    };

    // function that launches when a move is submitted
    // calls the backend to make the move
    // fetches the new game state
    const submitMove = async (fromSquare: string, toSquare: string) => {
        try {
            const move = fromSquare === toSquare ? '0000' : `${fromSquare}${toSquare}`;
            const response = await fetch('http://127.0.0.1:5000/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ move }),
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

    // function that simulates a move
    // calls the backend to return the would-be game state without actually making the move
    const simulateMove = async (move: string) => {
        try {
            const response = await fetch('http://127.0.0.1:5000/simulate_move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ move }),
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
    }

    // function that launches when a piece is picked up
    // shows legal moves for the selected piece
    const handlePieceSelection = async (position: string) => {
        // forbid making a move if promotion options are shown
        if (showPromotionOptions) {
            return;
        }

        setSelectedPiece(position);
        const response = await fetch('http://127.0.0.1:5000/legal_moves', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ position }),
        });
        const data = await response.json();
        setLegalMoves(data.legal_moves);
    }


    // start a new game by calling the backend
    const startNewGame = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/new_game', {
                method: 'POST',
            });
            const data = await response.json();
            setGameState(data);
        }
        catch (e) {
            console.error('Failed to start a new game: ', e);
        } finally {
            setLoading(false);
        }
    };

    // UseEffect hook to start a new game when the component mounts
    useEffect(() => {
        startNewGame();
    }, []); // Empty dependency array ensures this runs only once on mount

    useEffect(() => {
        if (gameState && (gameState.is_checkmate || gameState.is_stalemate)) {
            gameState.turn = gameState.turn === 'white' ? 'Black' : 'White';
            setShowGameOverModal(true);
        }
    }, [gameState]);

    // if the game state is not loaded, show a loading message
    // this prevents stuff breaking on the first load,
    // when the game is not fetched from backend yet
    if (loading || !gameState) {
        return <div>Loading...</div>;
    }

    const renderSquares = () => {
        const pos = gameState.fen.split(' ')[0];
        const squares: JSX.Element[] = [];
        let row = '8'; // Start at row 8
        let col = 'a'; // Start at column a

        pos.split('').forEach((c) => {
            if (c === '/') {
                // Move to the next row
                row = String.fromCharCode(row.charCodeAt(0) - 1);
                col = 'a';
                return;
            }

            if (c >= '1' && c <= '8') {
                // numbers represent empty squares
                for (let i = 0; i < parseInt(c); i++) {
                    const pos = col + row;
                    const highlighted = selectedPiece === pos || legalMoves.includes(pos) || selectedSquare === pos;  // highlight legal moves
                    squares.push(<Square key={pos} position={pos} highlighted={highlighted} handleMove={handleMove} />);
                    col = String.fromCharCode(col.charCodeAt(0) + 1);
                }
            } else {
                // letters represent pieces
                const pos = col + row;
                const highlighted = selectedPiece === pos || legalMoves.includes(pos) || selectedSquare === pos;  // Same check here for highlighting
                const inCheck = ((c === 'k' && gameState.turn === 'black') || (c === 'K' && gameState.turn === 'white')) && gameState.is_check;
                squares.push(
                    <Square key={pos} position={pos} highlighted={highlighted} handleMove={handleMove} inCheck={inCheck}>
                        <Piece type={c} position={pos} handlePick={handlePieceSelection} />
                    </Square>
                );
                col = String.fromCharCode(col.charCodeAt(0) + 1);
            }
        });

        return squares;
    };

    return (
        // DndProvider is a wrapper component that sets up the context for drag and drop
        <DndProvider backend={HTML5Backend}>
            turn: {gameState.turn}
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(8, ' + SQUARE_SIZE + ')' }}>
                {renderSquares()}
                {showPromotionOptions && promotionMove && <PromotionOptions onSelect={handlePromotionSelect} turn={gameState.turn} promotionSqr={promotionMove.toSquare}/>}
                {showGameOverModal && (
                    <GameOverModal
                        message={gameState.is_checkmate ? `Checkmate! ${gameState.turn} wins!` : "Stalemate! It's a draw!"}
                        onClose={() => setShowGameOverModal(false)}
                        onNewGame={startNewGame}
                    />
                )}
            </div>
        </DndProvider>
    );
}