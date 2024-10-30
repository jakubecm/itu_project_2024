import React, { useEffect, useState } from 'react';
import { Square } from './Square';
import { Piece } from './Piece';
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
    const [hasGameEnded, setHasGameEnded] = useState(false);
    const [modalClosed, setModalClosed] = useState(false); // Track if the modal was closed

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

    const handleMove = async (fromSquare: string, toSquare: string) => {
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
                if (data.is_checkmate || data.is_stalemate) {
                    setHasGameEnded(true);
                }
            }
        } catch (e) {
            console.error('Failed to make a move:', e);
        }
    };

    useEffect(() => {
        if (!hasGameEnded) {
            fetchGameState();
            const intervalId = setInterval(fetchGameState, 1000);
            return () => clearInterval(intervalId);
        }
    }, [gameId, hasGameEnded]);

    // Update modal visibility only if gameState has valid data and the game ended
    useEffect(() => {
        if (gameState && (gameState.is_checkmate || gameState.is_stalemate)) {
            setModalClosed(false); // Ensure modal opens upon game end
        }
    }, [gameState?.is_checkmate, gameState?.is_stalemate]);

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
                    squares.push(
                        <Square
                            key={squarePos}
                            position={squarePos}
                            highlighted={selectedPiece === squarePos || legalMoves.includes(squarePos)}
                            isCheckmateHighlight={gameState.check_square === squarePos}
                            handleMove={handleMove}
                        />
                    );
                    col = String.fromCharCode(col.charCodeAt(0) + 1);
                }
            } else {
                const squarePos = col + row;
                squares.push(
                    <Square
                        key={squarePos}
                        position={squarePos}
                        highlighted={selectedPiece === squarePos || legalMoves.includes(squarePos)}
                        inCheck={((c === 'k' && gameState.turn === 'black') || (c === 'K' && gameState.turn === 'white')) && gameState.is_check}
                        isCheckmateHighlight={gameState.check_square === squarePos}
                        handleMove={handleMove}
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
        <DndProvider backend={HTML5Backend}>
            <div>Turn: {gameState?.turn}</div>
            {gameState?.is_checkmate && <div>Checkmate</div>}
            {gameState?.is_stalemate && <div>Stalemate</div>}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(8, ${SQUARE_SIZE})` }}>
                {renderSquares()}
                {!modalClosed && gameState && hasGameEnded && (
                    <GameOverModal
                        message={gameState.is_checkmate ? `Checkmate! ${gameState.turn === 'white' ? 'Black' : 'White'} wins!` : "Stalemate! It's a draw!"}
                        onClose={() => setModalClosed(true)}
                    />
                )}
            </div>
        </DndProvider>
    );
};
