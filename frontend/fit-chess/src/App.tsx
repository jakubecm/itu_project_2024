import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";

// Define the type for the game state
interface GameState {
  fen: string;
  turn: "white" | "black";
  is_checkmate: boolean;
  is_stalemate: boolean;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    turn: "white",
    is_checkmate: false,
    is_stalemate: false,
  });

    // Fetch the current game state from the backend
    const startGame = async (): Promise<void> => {
      const response = await fetch("http://127.0.0.1:5000/new_game");
      const data: GameState = await response.json();
      setGameState(data);
    };

  // Fetch the current game state from the backend
  const fetchGameState = async (): Promise<void> => {
    const response = await fetch("http://127.0.0.1:5000/state");
    const data: GameState = await response.json();
    setGameState(data);
  };

  // Make a move by sending it to the backend
  const makeMove = async (fromSquare: string, toSquare: string): Promise<void> => {
    const move = `${fromSquare}${toSquare}`;
    const response = await fetch("http://127.0.0.1:5000/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ move }),
    });
    const data: GameState = await response.json();
    setGameState(data);
  };

  // This function is called when a piece is moved
  const handleMove = (fromSquare: string, toSquare: string): void => {
    makeMove(fromSquare, toSquare);
  };

  useEffect(() => {
    fetchGameState(); // Fetch the game state when the component loads
  }, []);

  startGame(); // Start a new game when the component loads

  return (
    <div>
      <h1>Chess Game</h1>
      <Chessboard
        position={gameState.fen}
        onPieceDrop={(sourceSquare: string, targetSquare: string) =>
          handleMove(sourceSquare, targetSquare)
        }
      />
      <div>
        <p>Turn: {gameState.turn}</p>
        {gameState.is_checkmate && <p>Checkmate!</p>}
        {gameState.is_stalemate && <p>Stalemate!</p>}
      </div>
    </div>
  );
};

export default App;
