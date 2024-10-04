import React from 'react';
import { Square } from './square';
import { Piece } from './piece';

interface BoardProps {
    fent: string;
}

export const Board: React.FC<BoardProps> = ({ fent }) => {
    console.log(fent);
    const pos = fent.split(' ')[0];
    const squares: JSX.Element[] = [];
    let row = '1';
    let col = 'a';
    pos.split('').forEach((c) => {
        if (c === '/') {
            return
        }
        if (c >= '1' && c <= '8') {
            for (let i = 0; i < parseInt(c); i++) {
                const pos = col + row;
                squares.push(<Square key={pos} position={pos} />)
                col = row === '8' ? String.fromCharCode(col.charCodeAt(0) + 1) : col;
                row = row === '8' ? '1' :  String.fromCharCode(row.charCodeAt(0) + 1);
            }
            return
        } else {
            const pos = col + row;
            squares.push(<Square key={pos} position={pos}><Piece type={c} /></Square>)
        }
        col = row === '8' ? String.fromCharCode(col.charCodeAt(0) + 1) : col;
        row = row === '8' ? '1' :  String.fromCharCode(row.charCodeAt(0) + 1);
    })

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 50px)' }}>
            {squares}
        </div>
    )
}