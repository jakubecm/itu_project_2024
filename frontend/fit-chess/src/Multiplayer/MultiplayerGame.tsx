import React, { useState } from 'react';
import { ServerBrowser } from './ServerBrowser';
import { JoinGame } from './JoinGame';

export const MultiplayerGame: React.FC = () => {
    const [gameId, setGameId] = useState<string | null>(null); // Track the game ID
    const [serverIp, setServerIp] = useState<string | null>(null);

    // On mount, set server IP dynamically
    useState(() => {
        const ip = window.location.hostname; // Get the IP address of the server
        setServerIp(ip);
    });

    // Function to handle creating a new game
    const createGame = async () => {
        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/create`, {
                method: 'POST',
            });
            const data = await response.json();
            setGameId(data.game_id);

        } catch (e) {
            console.error('Failed to create game:', e);
        }
    };

    // Function to handle joining a game from the Server Browser
    const handleJoin = (gameId: string) => {
        setGameId(gameId);
    };

    return (
        <div>
            {!gameId ? (
                <div>
                    {/* Button to create a new game */}
                    <button onClick={createGame}>Create New Game</button>

                    {/* Server browser to list available games */}
                    <ServerBrowser serverIp={serverIp!} onJoin={handleJoin} />
                </div>
            ) : (
                // Show Join Game screen once a game is selected or created
                <JoinGame gameId={gameId} serverIp={serverIp!} />
            )}
        </div>
    );
};
