// File: utils.tsx
// Authors: xracek12
// Desc: Utility functions for the chess board

import { SQUARE_SIZE } from './board';

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

export function parseLastMove(moveHistory: string[]): { fromSquare: string, toSquare: string } {
  if (moveHistory.length === 0) {
    return { fromSquare: "", toSquare: "" };
  };
    const lastMove = moveHistory[moveHistory.length - 1]; // Get the last move from the history
    const regex = /(?:Player|AI): (\w\d) to (\w\d)/;

    console.log(lastMove);

    const match = lastMove.match(regex);
    if (match) {
        const fromSquare = match[1];
        const toSquare = match[2];
        return { fromSquare, toSquare };
    } else {
        throw new Error("Invalid move format in history.");
    }
}