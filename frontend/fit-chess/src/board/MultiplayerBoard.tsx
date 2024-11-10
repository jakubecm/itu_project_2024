import React, { useCallback, useEffect, useState } from 'react';
import { Square } from './square';
import { Piece, PromotionOptions } from './piece';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import GameOverModal from '../Effects/GameOverModal';
import './Board.css'; // Apply board styling consistently

export const SQUARE_SIZE = 80;
document.documentElement.style.setProperty('--square-size', `${SQUARE_SIZE}px`);

interface GameState {
    fen: string;
    turn: string;
    is_checkmate: boolean;
    is_stalemate: boolean;
    is_check: boolean;
    check_square?: string;
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
    const [hasGameEnded, setHasGameEnded] = useState(false);
    const [modalClosed, setModalClosed] = useState(false); // Track if the modal was closed
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [moveMode, setMoveMode] = useState<"selectingPiece" | "selectingTarget">("selectingPiece");

    // Fetch game state and check for checkmate/stalemate
    const fetchGameState = useCallback(async () => {
        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/game_state?game_id=${gameId}`);
            const data = await response.json();
            setGameState(data);

            if (data.is_checkmate || data.is_stalemate) {
                setHasGameEnded(true);
            }

        } catch (e) {
            console.error('Failed to fetch game state:', e);
        }
    }, [serverIp, gameId]);

    // Fetch game state every second
    useEffect(() => {
        fetchGameState(); // Initial load
        const intervalId = setInterval(fetchGameState, 1000);
        return () => clearInterval(intervalId);
    }, [fetchGameState]);

    // Simulate a move on the board
    const simulateMove = async (move: string) => {
        try {
            const response = await fetch(`http://${serverIp}:5000/simulate_move`, {
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

    const submitMove = async (fromSquare: string, toSquare: string, currentGameState: GameState | null) => {
        console.log('Inside submitMove, current gameState:', currentGameState);
        if (!currentGameState || currentGameState.turn !== playerColor || currentGameState.is_checkmate) return;
    
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
            console.log('Data after submitMove:', data);
    
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

        setSelectedPiece(position);

        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/legal_moves_multi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_id: gameId, position }),
            });
            const data = await response.json();

            if (data.legal_moves) {
                setLegalMoves(data.legal_moves);
            }

        } catch (e) {
            console.error('Failed to fetch legal moves:', e);
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
        if (!selectedSquare) return;
        
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
                    const squarePos = col + row;
                    const highlighted = selectedPiece === squarePos || legalMoves.includes(squarePos);
                    const isSelected = squarePos === selectedSquare;
                    squares.push(
                        <Square
                            key={squarePos}
                            position={squarePos}
                            highlighted={highlighted}
                            selected={isSelected}
                            handleMove={handleMove}
                            //onClick={() => handleSquareClick(squarePos)}
                        />
                    );
                    col = String.fromCharCode(col.charCodeAt(0) + 1);
                }
            } else {
                const squarePos = col + row;
                const highlighted = selectedPiece === squarePos || legalMoves.includes(squarePos);
                const inCheck = gameState.check_square === squarePos;
                const isSelected = squarePos === selectedSquare;
                squares.push(
                    <Square
                        key={squarePos}
                        position={squarePos}
                        highlighted={highlighted}
                        selected={isSelected}
                        inCheck={inCheck}
                        handleMove={handleMove}
                        //onClick={() => handleSquareClick(squarePos)}
                    >
                        <Piece type={c} position={squarePos} handlePick={handlePieceSelection} />
                    </Square>
                );
                col = String.fromCharCode(col.charCodeAt(0) + 1);
            }
        });

        return squares;
    };

    return (
        <div className='board-container'>
            <DndProvider backend={HTML5Backend}>
                <div>Turn: {gameState?.turn}</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(8, ${SQUARE_SIZE}px)`, position: 'relative' }}>
                    {renderSquares()}
                    {showPromotionOptions && promotionMove && <PromotionOptions onSelect={handlePromotionSelect} turn={gameState.turn} promotionSqr={promotionMove.toSquare}/>}
                    {!modalClosed && hasGameEnded && (
                        <GameOverModal
                            message={
                                gameState?.is_checkmate
                                    ? `Checkmate! ${gameState.turn === 'white' ? 'Black' : 'White'} wins!`
                                    : "Stalemate! It's a draw!"
                            }
                            onClose={() => setModalClosed(true)}
                        />
                    )}
                </div>
            </DndProvider>
        </div>
    );
};