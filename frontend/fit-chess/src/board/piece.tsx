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
import { SQUARE_SIZE } from './board';
import { calculatePosition } from './utils';


interface PieceProps {
    type: string;
    position: string;  // the 'from' position for the drag
    handlePick: (position: string) => void;
    onClick?: () => void;
}

const pieceSrc: { [key: string]: string } = {
    'p': p, 'n': n, 'b': b, 'r': r, 'q': q, 'k': k,
    'P': P, 'N': N, 'B': B, 'R': R, 'Q': Q, 'K': K,
};

export const Piece: React.FC<PieceProps> = ({ type, position, handlePick, onClick }) => {
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

    const pieceImg = pieceSrc[type];

    return (
        <div 
            ref={dragRef}
            style={{
                opacity: isDragging ? 0.5 : 1,
                cursor: 'default',
                transform: 'translate(0, 0)',  // hides the background when dragging
            }}
            onClick={onClick}  // Volitelné `onClick` pro jednoduché kliknutí
        >
            <img src={pieceImg} alt={type} height={SQUARE_SIZE} width={SQUARE_SIZE} />
        </div>
    )
}

interface PromotionOptionsProps {
    onSelect: (piece: string) => void;
    promotionSqr: string;
    turn: string;
}

export const PromotionOptions: React.FC<PromotionOptionsProps> = ({ onSelect, turn, promotionSqr }) => {
    const queen = turn === 'white' ? 'Q' : 'q';
    const rook = turn === 'white' ? 'R' : 'r';
    const bishop = turn === 'white' ? 'B' : 'b';
    const knight = turn === 'white' ? 'N' : 'n';
    const position = calculatePosition(promotionSqr);
    const squareSizeNum = parseInt(SQUARE_SIZE.slice(0, -2));
    const X = position.x + 'px';
    const Y = turn === 'white' ? (position.y + squareSizeNum) + 'px' : // position the promotion options below the pawn
        (position.y - 4 * squareSizeNum) + 'px';  // position the promotion options above the pawn

    // tyto divy se musi nacpat do componentu nebo alespon css classy ale jsem liny :sob:
    return (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: X, top: Y }}>
            <div style={{
                width: SQUARE_SIZE,
                height: SQUARE_SIZE,
                backgroundColor: "green",
                position: 'relative',
                cursor: 'pointer',
            }} onClick={() => onSelect('q')}><img src={pieceSrc[queen]} alt={'pQ'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></div>
            <div style={{
                width: SQUARE_SIZE,
                height: SQUARE_SIZE,
                backgroundColor: "green",
                position: 'relative',
                cursor: 'pointer',
            }} onClick={() => onSelect('r')}><img src={pieceSrc[rook]} alt={'pR'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></div>
            <div style={{
                width: SQUARE_SIZE,
                height: SQUARE_SIZE,
                backgroundColor: "green",
                position: 'relative',
                cursor: 'pointer',
            }} onClick={() => onSelect('b')}><img src={pieceSrc[bishop]} alt={'pB'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></div>
            <div style={{
                width: SQUARE_SIZE,
                height: SQUARE_SIZE,
                backgroundColor: "green",
                position: 'relative',
                cursor: 'pointer',
            }} onClick={() => onSelect('n')}><img src={pieceSrc[knight]} alt={'pN'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></div>
        </div>
    );
};