import { useDrag } from 'react-dnd';
import { SQUARE_SIZE } from './board';
import { calculatePosition } from './utils';
import './Board.css';


interface PieceProps {
    type: string;
    position: string;  // the 'from' position for the drag
    handlePick: (position: string) => void;
    onClick?: () => void;
    theme: string; // The theme used for the piece images
}

const pieceSrc: { [key: string]: string } = {
    'p': 'black_pawn.png', 'n': 'black_knight.png', 'b': 'black_bishop.png', 'r': 'black_rook.png', 'q': 'black_queen.png', 'k': 'black_king.png',
    'P': 'white_pawn.png', 'N': 'white_knight.png', 'B': 'white_bishop.png', 'R': 'white_rook.png', 'Q': 'white_queen.png', 'K': 'white_king.png',
};

export const Piece: React.FC<PieceProps> = ({ type, position, handlePick, onClick, theme }) => {
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
    const pieceUrl = `http://127.0.0.1:5000/themes/${theme}/${pieceImg}`;

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
            <img src={pieceUrl} alt={type} height={SQUARE_SIZE} width={SQUARE_SIZE} />
        </div>
    )
}

interface PromotionOptionsProps {
    onSelect: (piece: string) => void;
    promotionSqr: string;
    turn: string;
    theme: string;
}

export const PromotionOptions: React.FC<PromotionOptionsProps> = ({ onSelect, turn, promotionSqr, theme }) => {
    const queen = turn === 'white' ? 'Q' : 'q';
    const rook = turn === 'white' ? 'R' : 'r';
    const bishop = turn === 'white' ? 'B' : 'b';
    const knight = turn === 'white' ? 'N' : 'n';
    const position = calculatePosition(promotionSqr);
    const squareSizeNum = parseInt(SQUARE_SIZE.slice(0, -2));
    const X = position.x + 'px';
    const Y = turn === 'white' ? (position.y + squareSizeNum) + 'px' : // position the promotion options below the pawn
        (position.y - 4 * squareSizeNum) + 'px';  // position the promotion options above the pawn

    const apiUrl = `http://127.0.0.1:5000/themes/${theme}/`;

    // tyto divy se musi nacpat do componentu nebo alespon css classy ale jsem liny :sob:
    return (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: X, top: Y }}>
            <button className="promotion-button" onClick={() => onSelect('q')}><img src={apiUrl + pieceSrc[queen]} alt={'pQ'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></button>
            <button className="promotion-button" onClick={() => onSelect('r')}><img src={apiUrl + pieceSrc[rook]} alt={'pR'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></button>
            <button className="promotion-button" onClick={() => onSelect('b')}><img src={apiUrl + pieceSrc[bishop]} alt={'pB'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></button>
            <button className="promotion-button" onClick={() => onSelect('n')}><img src={apiUrl + pieceSrc[knight]} alt={'pN'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></button>
        </div>
    );
};
