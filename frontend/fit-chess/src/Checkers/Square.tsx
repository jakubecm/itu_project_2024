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
  fetchLegalMoves: (position: string) => Promise<{ [toPosition: string]: string }>;
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
  const dropRef = useDrop(() => ({
    accept: 'piece',
    drop: (item: { fromPosition: string }) => {
      handleDrop(item.fromPosition, position); // Handle piece drop
    },
  }))[1];

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
      {pieceType && (
        <Piece
          type={pieceType}
          position={position}
          handlePick={handlePieceSelection}
          fetchLegalMoves={fetchLegalMoves} // Pass fetchLegalMoves to the piece
        />
      )}
    </div>
  );
};
