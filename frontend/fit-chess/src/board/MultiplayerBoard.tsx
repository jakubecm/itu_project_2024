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

interface MultiplayerBoardProps {
    gameId: string;
    playerColor: string;
    serverIp: string; // IP address of the server
}

export const MultiplayerBoard: React.FC<MultiplayerBoardProps> = ({ gameId, playerColor, serverIp }) => {
    const [gameState, setGameState] = useState<GameState | null>(null); // Track the game state
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null); // Track the selected piece
    const [legalMoves, setLegalMoves] = useState<string[]>([]);  // Initialize as an empty array, track legal moves for the selected piece

    // Function to fetch the game state
    const fetchGameState = async () => {
        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/game_state?game_id=${gameId}`);
            const data = await response.json();
            setGameState(data); // Update the game state

        } catch (e) {
            console.error('Failed to fetch game state: ', e);

        }
    };

    // Function to fetch and highlight legal moves for the selected piece
    const handlePieceSelection = async (position: string) => {
        if(gameState?.turn !== playerColor) { // Check if it's the player's turn
            return;
        }

        setSelectedPiece(position);

        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/legal_moves_multi`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ game_id: gameId, position }),  // Send both game_id and position
            });
            
            const data = await response.json();
            if (data.legal_moves) {
                const moveDestination = data.legal_moves.map((move: string) => move.slice(2));  // Get last 2 chars as destination square
                setLegalMoves(moveDestination);
            } else {
                console.error('Invalid move:', data.error);
            }

        } catch (e) {
            console.error('Failed to fetch legal moves:', e);

        }
    };

    // Function to handle moves and update game state
    const handleMove = async (fromSquare: string, toSquare: string) => {
        if(gameState?.turn !== playerColor) { // Check if it's the player's turn
            return;
        }

        try {
            const move = `${fromSquare}${toSquare}`;
            const response = await fetch(`http://${serverIp}:5000/multiplayer/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ game_id: gameId, move }),
            });

            const data = await response.json();

            setGameState(data);
            setSelectedPiece(null);  // Reset selected piece
            setLegalMoves([]);  // Reset legal moves

        } catch (e) {
            console.error('Failed to make a move:', e);
    
        }
    };

useEffect(() => {

    fetchGameState();  // Call the async function

    // Fetch the game state every second, polling the server
    const intervalId = setInterval(() => {
        fetchGameState();
    }, 1000);  // Poll every second

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
}, [gameId]);

    if (!gameState) {
        return <div>Loading...</div>;
    }

    const { fen } = gameState;
    const rows = fen.split(' ')[0].split('/');
    const squares: JSX.Element[] = [];

    let row = '8';  // Initialize the row as '8'
    let col = 'a';  // Initialize the column as 'a'

    rows.forEach((rowStr) => {
        rowStr.split('').forEach((char) => {
            if (/\d/.test(char)) {
                // Handle empty squares
                const emptySquares = parseInt(char); // Convert the character to an integer
                for (let i = 0; i < emptySquares; i++) {
                    const squarePos = `${col}${row}`; // Generate the square position
                    const highlighted = selectedPiece === squarePos || legalMoves.includes(squarePos);

                    if (parseInt(row) >= 1 && parseInt(row) <= 8 && col >= 'a' && col <= 'h') { // Check if the square is within the board
                        squares.push(<Square key={squarePos} position={squarePos} highlighted={highlighted} handleMove={handleMove} />);
                    }

                    col = String.fromCharCode(col.charCodeAt(0) + 1); // Move to the next column
                }
            } else {
                // Handle occupied squares
                const squarePos = `${col}${row}`;
                const isHighlighted = legalMoves.includes(squarePos);  // Highlight legal move squares

                if (parseInt(row) >= 1 && parseInt(row) <= 8 && col >= 'a' && col <= 'h') {
                    squares.push( // Push the square component with the piece
                        <Square key={squarePos} position={squarePos} highlighted={isHighlighted} handleMove={handleMove}>
                            <Piece type={char} position={squarePos} handlePick={() => handlePieceSelection(squarePos)} />
                        </Square>
                    );
                }

                col = String.fromCharCode(col.charCodeAt(0) + 1);
            }
        });

        col = 'a';  // Reset column to 'a' for the next row
        row = String.fromCharCode(row.charCodeAt(0) - 1);  // Move to the next row (downwards)
    });

    return (
        <DndProvider backend={HTML5Backend}>
            <div> Turn: {gameState.turn} </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 50px)' }}>
                {squares}
            </div>
        </DndProvider>
    );
};
