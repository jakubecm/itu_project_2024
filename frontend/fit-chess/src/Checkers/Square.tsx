// File: Square.tsx
// Author: Norman Babiak (xbabia01)
// Desc: Component for a single square on the board

import React from 'react';
import { Piece } from './Piece';
import '../board/Board.css';
import './CheckersBoard.css';
import { useDrop } from 'react-dnd';

interface SquareProps {
  position: string;
  isDark: boolean;
  highlighted: boolean;
  selected: boolean;
  playable: boolean;
  onClick: () => void;
  pieceType?: string;
  handleDrop: (fromPosition: string, toPosition: string) => void;
  handlePieceSelection: (position: string) => void;
  fetchLegalMoves: (position: string) => Promise<{ [toPosition: string]: string }>; // Function to fetch legal moves
}

export const Square: React.FC<SquareProps> = ({
  position,
  isDark,
  highlighted,
  selected,
  playable,
  onClick,
  pieceType,
  handleDrop,
  handlePieceSelection,
  fetchLegalMoves,
}) => {
  const dropRef = useDrop(() => ({  // Drop functionality
    accept: 'piece',
    drop: (item: { fromPosition: string }) => {
      handleDrop(item.fromPosition, position); // Handle piece drop in main board
    },
  }))[1];

  // Assign class names according to properties the square has
  const getClassName = () => {
    let className = isDark ? 'square-dark' : 'square-light';
    if (playable) className += ' square-playable'; // Highlight playable pieces
    if (highlighted) className += ' square-highlighted'; // Highlight legal moves
    if (selected) className += ' square-selected'; // Add selected styling
    return className;
  };

  return (
    <div
      ref={dropRef}
      className={getClassName()}
      onClick={onClick}
      style={{
        width: 'var(--square-size)',
        height: 'var(--square-size)',
        position: 'relative',
      }}
    >
      {pieceType && ( // If there is a piece at the position, render it
        <Piece
          type={pieceType}
          position={position}
          handlePick={handlePieceSelection} // Pass handlePieceSelection to the piece
          fetchLegalMoves={fetchLegalMoves} // Pass fetchLegalMoves to the piece
        />
      )}
    </div>
  );
};
