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

    const fetchGameState = async () => {
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
    };

    const handleMove = async (fromSquare: string, toSquare: string, piece: string) => {
        if (showPromotionOptions) return;

        const isPromotion = (piece === 'P' && toSquare[1] === '8') || (piece === 'p' && toSquare[1] === '1');
        if (isPromotion) {
            setPromotionMove({ fromSquare, toSquare });
            setShowPromotionOptions(true);
        } else {
            await submitMove(fromSquare, toSquare);
        }
    };

    const submitMove = async (fromSquare: string, toSquare: string) => {
        if (gameState?.turn !== playerColor || gameState?.is_checkmate) return;

        try {
            const move = `${fromSquare}${toSquare}`;
            const response = await fetch(`http://${serverIp}:5000/multiplayer/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_id: gameId, move }),
            });

            if (response.ok) {
                const data = await response.json();
                setGameState(data);
                setSelectedPiece(null);
                setLegalMoves([]);
                setShowPromotionOptions(false);
                setPromotionMove(null);
            }
        } catch (e) {
            console.error('Failed to make a move:', e);
        }
    };

    const handlePieceSelection = async (position: string) => {
        if (gameState?.turn !== playerColor || gameState?.is_checkmate) return;

        setSelectedPiece(position);

        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/legal_moves_multi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_id: gameId, position }),
            });
            const data = await response.json();
            if (data.legal_moves) {
                setLegalMoves(data.legal_moves.map((move: string) => move.slice(2)));
            }
        } catch (e) {
            console.error('Failed to fetch legal moves:', e);
        }
    };

    const handlePromotionSelect = async (piece: string) => {
        if (promotionMove) {
            await submitMove(promotionMove.fromSquare, promotionMove.toSquare + piece);
            setShowPromotionOptions(false);
            setPromotionMove(null);
        }
    };

    const navigateBoard = useCallback((direction: string) => {
        let row = selectedSquare ? parseInt(selectedSquare[1], 10) : 1;
        let col = selectedSquare ? selectedSquare[0].charCodeAt(0) : 'a'.charCodeAt(0);

        if (direction === 'ArrowUp') row = Math.min(row + 1, 8);
        if (direction === 'ArrowDown') row = Math.max(row - 1, 1);
        if (direction === 'ArrowLeft') col = Math.max(col - 1, 'a'.charCodeAt(0));
        if (direction === 'ArrowRight') col = Math.min(col + 1, 'h'.charCodeAt(0));

        setSelectedSquare(String.fromCharCode(col) + row);
    }, [selectedSquare]);

    const selectSquare = useCallback(async () => {
        if (!selectedSquare) return;

        if (moveMode === "selectingPiece") {
            await handlePieceSelection(selectedSquare);
            setMoveMode("selectingTarget");
        } else if (moveMode === "selectingTarget" && selectedPiece) {
            await handleMove(selectedPiece, selectedSquare, selectedPiece);
            setSelectedPiece(null);
            setLegalMoves([]);
            setMoveMode("selectingPiece");
        }
    }, [selectedSquare, moveMode, selectedPiece, handleMove, handlePieceSelection]);

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

    const handleSquareClick = useCallback(
        (position: string) => {
            if (moveMode === 'selectingPiece') {
                handlePieceSelection(position);
                setMoveMode('selectingTarget');
            } else if (moveMode === 'selectingTarget' && selectedPiece) {
                handleMove(selectedPiece, position, selectedPiece);
                setSelectedPiece(null);
                setLegalMoves([]);
                setMoveMode('selectingPiece');
            }
        },
        [selectedPiece, moveMode]
    );

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
                            onClick={() => handleSquareClick(squarePos)}
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
                        onClick={() => handleSquareClick(squarePos)}
                    >
                        <Piece type={c} position={squarePos} handlePick={handlePieceSelection} />
                    </Square>
                );
                col = String.fromCharCode(col.charCodeAt(0) + 1);
            }
        });

        return squares;
    };

    useEffect(() => {
        fetchGameState();
        const intervalId = setInterval(fetchGameState, 1000);
        return () => clearInterval(intervalId);
    }, [gameId]);

    return (
        <div>
            <DndProvider backend={HTML5Backend}>
                <div>Turn: {gameState?.turn}</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(8, ${SQUARE_SIZE}px)`, position: 'relative' }}>
                    {renderSquares()}
                    {showPromotionOptions && promotionMove && (
                        <div
                            style={{
                                position: 'absolute',
                                top: `${(8 - parseInt(promotionMove.toSquare[1])) * SQUARE_SIZE}px`,
                                left: `${(promotionMove.toSquare[0].charCodeAt(0) - 'a'.charCodeAt(0)) * SQUARE_SIZE}px`,
                                zIndex: 1,
                            }}
                        >
                            <PromotionOptions
                                onSelect={handlePromotionSelect}
                                turn={gameState?.turn}
                                promotionSqr={promotionMove.toSquare}
                            />
                        </div>
                    )}
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
