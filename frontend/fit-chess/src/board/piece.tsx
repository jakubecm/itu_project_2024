import { useDrag } from 'react-dnd';

// import piece images
import P from '../assets/Chess_plt45.svg';
import N from '../assets/Chess_nlt45.svg';
import B from '../assets/Chess_blt45.svg';
import R from '../assets/Chess_rlt45.svg';
import Q from '../assets/Chess_qlt45.svg';
import K from '../assets/Chess_klt45.svg';
import p from '../assets/Chess_pdt45.svg';
import n from '../assets/Chess_ndt45.svg';
import b from '../assets/Chess_bdt45.svg';
import r from '../assets/Chess_rdt45.svg';
import q from '../assets/Chess_qdt45.svg';
import k from '../assets/Chess_kdt45.svg';


interface PieceProps {
    type: string;
    position: string;  // the 'from' position for the drag
    handlePick: (position: string) => void;
}

export const Piece: React.FC<PieceProps> = ({ type, position, handlePick }) => {
    const [{ isDragging }, dragRef] = useDrag({
        type: 'piece',
        item: () => {
            handlePick(position);  // call handlePick with the piece's position
            return { type, position } // send the piece's type and position to the drop square
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const pieceSrc: { [key: string]: string } = {
        'p': p, 'n': n, 'b': b, 'r': r, 'q': q, 'k': k,
        'P': P, 'N': N, 'B': B, 'R': R, 'Q': Q, 'K': K,
    };
    
    const pieceImg = pieceSrc[type];

    return (
        <div ref={dragRef}
            style={{ 
                opacity: isDragging ? 0.5 : 1, 
                cursor: 'default', 
                transform: 'translate(0, 0)'  // hides the background when dragging
            }}>
            <img src={pieceImg} alt={type} height={50} width={50} />
        </div>
    )
}
