import React, { useState, useEffect } from 'react';
import { MultiplayerBoard } from '../board/MultiplayerBoard';

interface JoinGameProps {
    gameId: string;
    serverIp: string;
    onLeave: () => void; // Add an onLeave callback prop
}

export const JoinGame: React.FC<JoinGameProps> = ({ gameId, serverIp, onLeave }) => {
    const [playerColor, setPlayerColor] = useState<string | null>(null);
    const [hasLeftGame, setHasLeftGame] = useState<boolean>(false); // Track if the player has left the game

    const joinAsColor = async (color: string) => {
        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ game_id: gameId, player: color }),
            });
            const data = await response.json();
            setPlayerColor(color); // Set the player color

        } catch (error) {
            console.error('Failed to join as', color, error);
        }
    };

    // Function to leave the game
    const leaveGame = async () => {
        if (!gameId || !playerColor) { // Check if gameId and playerColor are available
            console.error('Missing game or player information');
            return;
        }

        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ game_id: gameId, player: playerColor }),
            });
            const data = await response.json();
            console.log(data.message);  // Log server response
            setPlayerColor(null);  // Reset player color to indicate they have left the game
            setHasLeftGame(true);  // Mark the game as left
            onLeave();  // Call the onLeave callback
            
        } catch (error) {
            console.error('Failed to leave the game:', error);
        }
    };

    // Automatically call leaveGame when the window/tab is closed
    useEffect(() => {
        const handleBeforeUnload = () => {
            leaveGame();  // Call leaveGame before the tab/window closes
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [gameId, playerColor, serverIp]);

    // If the player has left the game, show the server browser again
    if (hasLeftGame) {
        return null; // Prevent rendering after leaving
    }

    // Show color selection if player hasn't chosen a color
    if (!playerColor) {
        return (
            <div>
                <h3>Game ID: {gameId}</h3>
                <button onClick={() => joinAsColor('white')}>Join as White</button>
                <button onClick={() => joinAsColor('black')}>Join as Black</button>
            </div>
        );
    }

    // Once color is selected, show the game board and leave button
    return (
        <div>
            <h3>Playing as {playerColor}</h3>
            <MultiplayerBoard gameId={gameId} playerColor={playerColor} serverIp={serverIp} />
            <button onClick={leaveGame} style={{ marginTop: '10px' }}>Leave Game</button>
        </div>
    );
};
