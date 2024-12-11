import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import '../board/Board.css';
import './CheckersBoard.css';
import redPiece from '../assets/red_piece.svg';
import blackPiece from '../assets/black_piece.svg';
import redKingPiece from '../assets/red_king_piece.svg';
import blackKingPiece from '../assets/black_king_piece.svg';

const BOARD_SIZE = 10;
export const SQUARE_SIZE = '64px';
document.documentElement.style.setProperty('--square-size', SQUARE_SIZE);

export const CheckersCustomSetup: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const variant = location.state?.variant || 'standard';  // Get the variant from the location state

    const [boardState, setBoardState] = useState<{ [pos: string]: string }>({});        // Map of position to piece type
    const [selectedPieceType, setSelectedPieceType] = useState<string | null>(null);    // Piece type selected for placement

    // Board layout
    const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    const rows = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

    // Handle clicking on a square
    const handleSquareClick = (position: string, isDark: boolean) => {
        if (!isDark) return;   // Only allow placing pieces on dark squares

        if (selectedPieceType === 'remove') {
            // If remove mode is active, remove the piece if there is one
            setBoardState((prev) => {
                const newBoard = { ...prev }; // Copy the board state
                if (newBoard[position]) {     // If there is a piece at the position
                    delete newBoard[position];
                }

                return newBoard;
            });

        } else if (selectedPieceType) {
            // Place a piece
            setBoardState((prev) => {
                const newBoard = { ...prev };           // Copy the board state
                newBoard[position] = selectedPieceType; // Place the piece at the position

                return newBoard;
            });
        }
    };

    const handleStartFreeplay = async () => {
        // Collect pieces in a simple array
        const pieces = Object.entries(boardState).map(([position, type]) => ({ position, type }));

        // Send to backend to generate fen
        const response = await fetch('http://127.0.0.1:5000/checkers/generate_fen_from_setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pieces, variant })
        });

        const data = await response.json();
        const fen = data.fen;

        // Navigate to the freeplay game with the generated fen
        navigate('/checkers', {
            state: {
                variant,
                mode: 'freeplay',
                fen: fen,
            },
        });
    };

    const getPieceImage = (type: string) => {
        switch (type) {
            case 'r': return redPiece;
            case 'R': return redKingPiece;
            case 'b': return blackPiece;
            case 'B': return blackKingPiece;
            default: return null;
        }
    };

    const renderSquares = () => {
        const squares: JSX.Element[] = [];
        for (const row of rows) {
            for (const column of columns) {
                const position = column + row;  // a1, b1, ...
                const isDark = ((columns.indexOf(column) + row) % 2 === 1); // Dark squares are every other square
                const pieceType = boardState[position]; // Get the piece type at the position

                squares.push(   // Add a square to the board
                <div
                    key={position}
                    onClick={() => handleSquareClick(position, isDark)}
                    className={isDark ? 'square-dark' : 'square-light'}
                    style={{
                        width: 'var(--square-size)',
                        height: 'var(--square-size)',
                        position: 'relative'
                    }}
                >
                    {pieceType && (  // If there is a piece at the position, render it
                    <img
                        src={getPieceImage(pieceType) as string}
                        alt="checkers piece"
                        style={{
                            width: '100%',
                            height: '100%',
                            position: 'absolute',
                            top: 0,
                            left: 0
                        }}
                    />
                    )}
                </div>
                );
            }
        }

        return squares;
    };

  return (
    <div className="board-container-check" style={{ display: 'flex', flexDirection: 'row' }}>
        <div className="piece-selector" style={{ marginRight: '20px' }}>
            <h3>Select a piece type:</h3>
            <div onClick={() => setSelectedPieceType('r')} style={{ cursor: 'pointer', marginBottom: '10px', display:'flex', alignItems:'center' }}>
                <img src={getPieceImage('r') as string} alt="Red Man" style={{ width: '40px', height:'40px', marginRight:'10px' }} />
                Red Man
            </div>
            <div onClick={() => setSelectedPieceType('R')} style={{ cursor: 'pointer', marginBottom: '10px', display:'flex', alignItems:'center' }}>
                <img src={getPieceImage('R') as string} alt="Red King" style={{ width: '40px', height:'40px', marginRight:'10px' }} />
                Red King
            </div>
            <div onClick={() => setSelectedPieceType('b')} style={{ cursor: 'pointer', marginBottom: '10px', display:'flex', alignItems:'center' }}>
                <img src={getPieceImage('b') as string} alt="Black Man" style={{ width: '40px', height:'40px', marginRight:'10px' }} />
                Black Man
            </div>
            <div onClick={() => setSelectedPieceType('B')} style={{ cursor: 'pointer', marginBottom: '10px', display:'flex', alignItems:'center' }}>
                <img src={getPieceImage('B') as string} alt="Black King" style={{ width: '40px', height:'40px', marginRight:'10px' }} />
                Black King
            </div>
            <hr style={{ margin: '20px 0' }} />
            <div onClick={() => setSelectedPieceType('remove')} style={{ cursor: 'pointer', marginBottom: '20px', display:'flex', alignItems:'center', color: 'red', fontWeight: 'bold' }}>
                ❌ Remove Pieces
            </div>
            <button onClick={handleStartFreeplay}>Start Freeplay</button>
        </div>

        <DndProvider backend={HTML5Backend}>
            <div
                style={{    // Board style
                    position: 'relative',
                    display: 'grid',    
                    gridTemplateColumns: `repeat(${BOARD_SIZE}, ${SQUARE_SIZE})`,   // 10 columns
                }}
            >
                {renderSquares()}   
            </div>
        </DndProvider>
    </div>
    );
};
