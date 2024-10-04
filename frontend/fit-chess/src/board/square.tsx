import { useDrop } from 'react-dnd';

interface SquareProps {
    position: string;
    children?: React.ReactNode;  // Piece component
}

export const Square: React.FC<SquareProps> = ({ children, position }) => {
    const [{ isOver }, dropRef] = useDrop({
        accept: 'piece',
        drop: (item: { position: string }) => {
          //onMovePiece(item.position, position);
        },
        collect: (monitor) => ({
          isOver: monitor.isOver(),
        }),
      });

    // evil hack
    const isDarkSquare = (position.charCodeAt(0) + parseInt(position[1])) % 2 === 1;

    const backgroundColor = isDarkSquare ? 'brown' : 'yellow';

    return (
        <div  ref={dropRef} style={{
            width: '50px',
            height: '50px',
            backgroundColor: backgroundColor,
            position: 'relative',
        }}>

            {children}

        </div>
    )
}