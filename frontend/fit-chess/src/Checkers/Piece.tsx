import React from 'react';
import { useDrag } from 'react-dnd';
import '../board/Board.css';
import './CheckersBoard.css';
import redPiece from '../assets/red_piece.svg';
import blackPiece from '../assets/black_piece.svg';
import redKingPiece from '../assets/red_king_piece.svg';
import blackKingPiece from '../assets/black_king_piece.svg';

interface PieceProps {
  type: string; // 'r', 'b', 'R', 'B' for red, black, red king, black king
  position: string; // Position on the board
  handlePick: (position: string) => void; // Function to handle piece selection
  fetchLegalMoves: (position: string) => Promise<{ [toPosition: string]: string }>; // Function to fetch legal moves
}

export const Piece: React.FC<PieceProps> = ({ type, position, handlePick, fetchLegalMoves }) => {
  const [{ isDragging }, dragRef] = useDrag(() => ({  // Drag and drop functionality
    type: 'piece',
    item: { fromPosition: position },
    collect: (monitor) => ({  // Monitor the drag state
      isDragging: monitor.isDragging(),
    }),
  }));

  // Determine the image to display
  const getImage = () => {
    if (type === 'r') return redPiece;
    if (type === 'b') return blackPiece;
    if (type === 'R') return redKingPiece;
    if (type === 'B') return blackKingPiece;
    return null;
  };

  const handleMouseDown = () => {
    fetchLegalMoves(position);
  };

  const pieceStyle: React.CSSProperties = {
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move',
    width: '100%', // Ensures the piece fits within the container
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  };

  return (
    <div
      ref={dragRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onClick={() => handlePick(position)}
      onMouseDown={handleMouseDown}
    >
      {getImage() && <img src={getImage()!} alt="checkers piece" style={pieceStyle} />}
    </div>
  );
};
