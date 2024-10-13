import { useDrop } from 'react-dnd';

interface SquareProps {
    position: string;  // This is the 'to' position
    highlighted: boolean;
    handleMove: (from: string, to: string) => void; // function that launches when a move is made
    inCheck?: boolean;
    children?: React.ReactNode;  // Piece component
}

export const Square: React.FC<SquareProps> = ({ position, highlighted, handleMove, inCheck, children }) => {
  const [{ isOver }, dropRef] = useDrop({
    accept: 'piece',
    drop: (item: { position: string }) => {
      handleMove(item.position, position);  // Pass both 'from' and 'to' positions to the handleMove function
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
        width: '50px',
        height: '50px',
        backgroundColor: backgroundColor,
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
};
