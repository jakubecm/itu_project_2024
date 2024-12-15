// File: Tutorial1.tsx
// Author: most function are taken from the old version board.tsx by xracek12, 
//         modified by xtesar44
// Description: Component for tutorial 1 - basic moves

import React, { useEffect, useState } from 'react';
import { Square } from '../board/square';
import { Piece } from '../board/piece';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useNavigate } from 'react-router-dom';
import './TutorialBoard.css';


export const SQUARE_SIZE = '80px';
document.documentElement.style.setProperty('--square-size', SQUARE_SIZE);

interface GameState {
    fen: string;
    turn: string;
    is_checkmate: boolean;
    is_stalemate: boolean;
    is_check: boolean;
}

export const TutorialBoard: React.FC<{}> = () => {
    const [loading, setLoading] = useState<boolean>(true); 
    const [gameState, setGameState] = useState<GameState | null>(null); // Track the game state
    const [legalMoves, setLegalMoves] = useState<string[]>([]); // Track legal moves for the selected piece
    const navigate = useNavigate();

    // start a new game by calling the backend for a new tutorial
    const startNewGame = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/new_tutorial', {
                method: 'GET',
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

    // Function to fetch legal moves for the selected piece
    const handlePieceSelection = async (position: string) => {

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

    // Function to handle a move from one square to another
    const handleMove = async (fromSquare: string, toSquare: string) => {
        try {
            const response = await fetch('http://127.0.0.1:5000/move_white', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ move: `${fromSquare}${toSquare}` }),
            });
            if (response.ok) {
                const data = await response.json();
                setGameState(data);
                setLegalMoves([]);
            }
        } catch (error) {
            console.error('Failed to make a move:', error);
        }
    };

    // Function to set a new FEN string for the game state
    const setFenString = async (newFen: string) => {
        try {
            const response = await fetch('http://127.0.0.1:5000/set_fen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fen: newFen })
            });
            const data = await response.json();
    
            if (data.error) {
                console.error("Invalid FEN format");
            } else {
                setGameState(data);  
            }
        } catch (error) {
            console.error("Failed to set FEN:", error);
        }
    };

    // Function to render the squares of the board
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
                                handleMove={handleMove} 
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
                            handleMove={handleMove} 
                        >
                            <Piece type={char} position={squarePos} handlePick={() => handlePieceSelection(squarePos)} theme={'regular'}/>
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
            <div style={{ justifyContent: 'center',alignItems: 'center', flexDirection: 'column' }}>
                <div className='tutorial1'>
                    <div className="board-container">
                        <button className="back-button" onClick={() => navigate(-1)}>⬅️ Back</button>
                        <div className="piece-row">
                            <Piece type="R" position="none" handlePick={() => {}} onClick={() => setFenString('8/8/8/8/8/8/8/R6R w KQkq - 0 1')} theme={'regular'} />
                            <Piece type="N" position="none" handlePick={() => {}} onClick={() => setFenString('8/8/8/8/8/8/8/1N4N1 w KQkq - 0 1')} theme={'regular'} />
                            <Piece type="B" position="none" handlePick={() => {}} onClick={() => setFenString('8/8/8/8/8/8/8/2B2B2 w KQkq - 0 1')} theme={'regular'} />
                            <Piece type="Q" position="none" handlePick={() => {}} onClick={() => setFenString('8/8/8/8/8/8/8/3Q4 w KQkq - 0 1')} theme={'regular'} />
                            <Piece type="K" position="none" handlePick={() => {}} onClick={() => setFenString('8/8/8/8/8/8/8/4K3 w KQkq - 0 1')} theme={'regular'} />
                            <Piece type="P" position="none" handlePick={() => {}} onClick={() => setFenString('8/8/8/8/8/8/PPPPPPPP/8 w KQkq - 0 1')} theme={'regular'} />
                        </div>                        
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(8, ${SQUARE_SIZE})` }}>
                            {renderSquares()}
                        </div>                        
                        <div className="description-container">
                            <p>On the left side, click on the figure you want to learn to move and try out their movements.</p>
                        </div>
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

