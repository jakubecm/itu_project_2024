import { useDrag } from 'react-dnd';
import w_knight from '../assets/Chess_nlt45.svg';


interface PieceProps {
    type?: string;
    position?: string;
}

// piece images By Cburnett - Own work, CC BY-SA 3.0, https://commons.wikimedia.org/w/index.php?curid=1499812

export const Piece: React.FC<PieceProps> = ({ type, position }) => {
    (type);
    (position);
    const [{ isDragging }, dragRef] = useDrag({
        type: 'piece',
        item: { type, position },  // Data passed when drag starts
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    return (
        <div ref={dragRef}
            style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move' }}>
            <img src={w_knight} alt="Chess Knight" height={50} width={50} />
        </div>
    )
}