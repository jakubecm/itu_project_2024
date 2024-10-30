import React, { useEffect, useState } from 'react';
import { Square } from '../board/square';
import { Piece } from '../board/piece';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';



export const SQUARE_SIZE = '50px';

interface GameState {
    fen: string;
    turn: string;
    is_checkmate: boolean;
    is_stalemate: boolean;
    is_check: boolean;
}



export const TutorialBoard: React.FC<{}> = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
    const [legalMoves, setLegalMoves] = useState<string[]>([]);

    // start a new game by calling the backend
    const startNewGame = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/new_tutorial', {
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

    // if the game state is not loaded, show a loading message
    // this prevents stuff breaking on the first load,
    // when the game is not fetched from backend yet
    if (loading || !gameState) {
        return <div>Loading...</div>;
    }

    const handlePieceSelection = async (position: string) => {
        setSelectedPiece(position);

        try {
            const response = await fetch('http://127.0.0.1:5000/legal_moves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ position }),
            });
            const data = await response.json();
            setLegalMoves(data.legal_moves || []);
        } catch (error) {
            console.error('Failed to fetch legal moves:', error);
        }
    };

    const handleMove = async (fromSquare: string, toSquare: string) => {
        try {
            const response = await fetch('http://127.0.0.1:5000/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ move: `${fromSquare}${toSquare}` }),
            });
            if (response.ok) {
                const data = await response.json();
                setGameState(data);
                setSelectedPiece(null);
                setLegalMoves([]);
            }
        } catch (error) {
            console.error('Failed to make a move:', error);
        }
    };



    const renderSquares = () => {
        const rows = gameState.fen.split(' ')[0].split('/');
        const squares: JSX.Element[] = [];
        let row = '8';
        let col = 'a';
    
        rows.forEach((rowStr) => {
            rowStr.split('').forEach((char) => {
                if (/\d/.test(char)) {
                    const emptySquares = parseInt(char);
                    for (let i = 0; i < emptySquares; i++) {
                        const squarePos = `${col}${row}`;
                        squares.push(
                            <Square
                                key={squarePos}
                                position={squarePos}
                                highlighted={legalMoves.includes(squarePos)}
                                handleMove={handleMove} // Přidejte handleMove zde
                            />
                        );
                        col = String.fromCharCode(col.charCodeAt(0) + 1);
                    }
                } else {
                    const squarePos = `${col}${row}`;
                    squares.push(
                        <Square
                            key={squarePos}
                            position={squarePos}
                            highlighted={legalMoves.includes(squarePos)}
                            handleMove={handleMove} // handleMove již zde máte
                        >
                            <Piece type={char} position={squarePos} handlePick={() => handlePieceSelection(squarePos)} />
                        </Square>
                    );
                    col = String.fromCharCode(col.charCodeAt(0) + 1);
                }
            });
            col = 'a';
            row = String.fromCharCode(row.charCodeAt(0) - 1);
        });
    
        return squares;
    };
    

    return (
        <DndProvider backend={HTML5Backend}>
            <div> Turn: {gameState.turn} </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(8, ${SQUARE_SIZE})` }}>
                {renderSquares()}
            </div>
        </DndProvider>
    );
};

