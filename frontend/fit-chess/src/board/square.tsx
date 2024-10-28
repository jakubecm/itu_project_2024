import { useDrop } from 'react-dnd';
import { SQUARE_SIZE } from './board';

interface SquareProps {
    position: string;  // This is the 'to' position
    highlighted: boolean;
    handleMove: (from: string, to: string, piece: string) => void; // function that launches when a move is made
    inCheck?: boolean;
    children?: React.ReactNode;  // Piece component
}

export const Square: React.FC<SquareProps> = ({ position, highlighted, handleMove, inCheck, children }) => {
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

  let backgroundColor = 'yellow';  // Light square color
  if (isOver) {
    backgroundColor = 'red';  // When piece is hovering over
  } else if (highlighted) {
      backgroundColor = 'lightgreen';  // When square is highlighted as legal move
  } else if (inCheck) {
      backgroundColor = 'blue';  // When the piece is in check
  } else if (isDarkSquare) {
      backgroundColor = 'brown';  // Dark square color
  }

  return (
    <div
      ref={dropRef}
      style={{
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        backgroundColor: backgroundColor,
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
};

// calculates the position of the square relative to the board
// returns the distance of the top-left corner of the square from the top-left corner of the board in pixels
export function calculatePosition(promotionSquare: string) {
  const file = promotionSquare[0]; // e.g., "e" from "e8"
  const rank = promotionSquare[1]; // e.g., "8" from "e8"
  const squareSizeNum = parseInt(SQUARE_SIZE.slice(0, -2));

  // Map file to column index (a=0, b=1, ..., h=7)
  const columnIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);

  // Map rank to row index (1=bottom row, 8=top row, so invert it to 0=bottom, 7=top)
  const rowIndex = 8 - parseInt(rank);

  // Calculate X and Y positions in pixels
  const xPosition = columnIndex * squareSizeNum;
  const yPosition = rowIndex * squareSizeNum;

  return { x: xPosition, y: yPosition };
}