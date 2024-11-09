import { useDrop } from 'react-dnd';
import { SQUARE_SIZE } from './board';
import { useState } from 'react';

interface SquareProps {
    position: string;  // This is the 'to' position
    highlighted: boolean;
    selected: boolean; // bool for highlighting the selected square
    handleMove: (from: string, to: string, piece: string) => void; // function that launches when a move is made
    inCheck?: boolean;
    children?: React.ReactNode;  // Piece component
    onClick: (position: string) => void;  // function that launches when a square is clicked
}

export const Square: React.FC<SquareProps> = ({ position, highlighted, selected, handleMove, inCheck, children, onClick }) => {
  const [isHovered, setIsHovered] = useState(false); // State for hovering over the square
  const [{ isOver }, dropRef] = useDrop({
    accept: 'piece',
    drop: (item: { position: string, type: string }) => {
      handleMove(item.position, position, item.type);  // Pass both 'from' and 'to' positions to the handleMove function
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // evil hacks to check if the square is dark or light
  const isDarkSquare = (position.charCodeAt(0) + parseInt(position[1])) % 2 === 1;

  const getClassName = () => {
    if (isOver) return 'square-hovered';  // When piece is hovering over
    if (highlighted && isHovered) return 'square-highlighted-hover';  // When square is highlighted and hovered
    if (highlighted) return selected ? 'square-highlighted-current' : 'square-highlighted';  // When square is highlighted as legal move
    if (selected) return 'square-current';  // When square is selected
    if (inCheck) return 'square-check';  // When the piece is in check
    return isDarkSquare ? 'black-square' : 'white-square';  // Default square color
  };

  const sqrClass = getClassName();

  return (
    <div
      ref={dropRef}
      className={sqrClass}
      onClick={() => onClick(position)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
};
