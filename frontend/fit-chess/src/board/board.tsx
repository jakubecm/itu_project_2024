import React, { useEffect, useState } from 'react';
import { Square } from './square';
import { Piece } from './piece';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

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
    
    // function that launches when a move is made
    // calls the backend to make the move
    // fetches the new game state
    const handleMove = async (fromSquare: string, toSquare: string) => {
        try {
            const move = `${fromSquare}${toSquare}`;
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

    // function that launches when a piece is picked up
    // shows legal moves for the selected piece
    const handlePieceSelection = async (position: string) => {
        setSelectedPiece(position);
        const response = await fetch('http://127.0.0.1:5000/legal_moves', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ position }),
        });
        const data = await response.json();
        const moveDestination = data.legal_moves.map((move: string) => move.slice(2));  // Get last 2 chars as destination square
        setLegalMoves(moveDestination);
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

    // if the game state is not loaded, show a loading message
    // this prevents stuff breaking on the first load,
    // when the game is not fetched from backend yet
    if (loading || !gameState) {
        return <div>Loading...</div>;
    }

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
                const highlighted = selectedPiece === pos || legalMoves.includes(pos);  // highlight legal moves
                squares.push(<Square key={pos} position={pos} highlighted={highlighted} handleMove={handleMove} />);
                col = String.fromCharCode(col.charCodeAt(0) + 1);
            }
        } else {
            // letters represent pieces
            const pos = col + row;
            const highlighted = selectedPiece === pos || legalMoves.includes(pos);  // Same check here for highlighting
            const inCheck = ((c === 'k' && gameState.turn === 'black')  || (c === 'K' && gameState.turn === 'white')) && gameState.is_check;
            squares.push(
                <Square key={pos} position={pos} highlighted={highlighted} handleMove={handleMove} inCheck={inCheck}>
                    <Piece type={c} position={pos} handlePick={handlePieceSelection} />
                </Square>
            );
            col = String.fromCharCode(col.charCodeAt(0) + 1);
        }
    });
    
    
    return (
        // DndProvider is a wrapper component that sets up the context for drag and drop
        <DndProvider backend={HTML5Backend}>
            turn: {gameState.turn}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 50px)' }}>
                {squares}
            </div>
        </DndProvider>
    );
}