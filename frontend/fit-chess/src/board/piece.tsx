// File: piece.tsx
// Authors: xracek12, xjakub41
// Desc: Definitions of chess pieces, pawn promotion menu and captured pieces component
// xracek12: Main logic for the Piece, PromotionOptions and CapturedPiecesComponent components
// xjakub41: visual theme support

import { useDrag } from 'react-dnd';
import { calculatePosition } from './utils';
import './Board.css';
import { SQUARE_SIZE } from './board';


interface PieceProps {
    type: string;
    position: string;  // the 'from' position for the drag
    handlePick: (position: string) => void;
    onClick?: () => void;
    theme: string; // theme used for the piece images
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
            onClick={onClick}
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
    document.documentElement.style.setProperty('--square-size', SQUARE_SIZE);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: X, top: Y }}>
            <button className="promotion-button" onClick={() => onSelect('q')}><img src={apiUrl + pieceSrc[queen]} alt={'pQ'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></button>
            <button className="promotion-button" onClick={() => onSelect('r')}><img src={apiUrl + pieceSrc[rook]} alt={'pR'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></button>
            <button className="promotion-button" onClick={() => onSelect('b')}><img src={apiUrl + pieceSrc[bishop]} alt={'pB'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></button>
            <button className="promotion-button" onClick={() => onSelect('n')}><img src={apiUrl + pieceSrc[knight]} alt={'pN'} height={SQUARE_SIZE} width={SQUARE_SIZE} /></button>
        </div>
    );
};

export interface CapturedPieces {
    white: Pieces;
    black: Pieces;
}

interface Pieces {
    p: number;
    r: number;
    n: number;
    b: number;
    q: number;
}

export const CapturedPiecesComponent: React.FC<{ pieces?: Pieces, material: number, player: string, theme: string }> = ({ pieces, material, player, theme }) => {
    const pieceOrder = player === 'white' 
        ? { Q: 'q', R: 'r', B: 'b', N: 'n', P: 'p' } // opponents pieces for white player
        : { Q: 'Q', R: 'R', B: 'B', N: 'N', P: 'P' }; // opponents pieces for black player

    const apiUrl = `http://127.0.0.1:5000/themes/${theme}/`;

    const lead = player === 'white' ? material : -material;
    if (!pieces) {
        return null;
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', height: '44px', marginLeft: 'auto' }}>
            {Object.entries(pieceOrder).map(([key, piece]) => (
                Array(pieces[key.toLowerCase() as keyof Pieces]).fill(null).map((_, index) => (
                    <img
                        key={`${piece}-${index}`}
                        src={apiUrl + pieceSrc[piece]}
                        alt={`Captured ${piece}`}
                        height={40}
                        width={40}
                        style={{
                            margin: '2px',
                            position: 'relative',
                            marginLeft: `${(index * -25) - 5}px`, // make them overlap
                            zIndex: 10-index // leftmost piece is on top
                        }}
                    />
                ))
            ))}
            {lead > 0 && <span style={{ fontSize: '1.5em', marginLeft: '10px' }}>+{lead}</span>}
        </div>
    );
};

