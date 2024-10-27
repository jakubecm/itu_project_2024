import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServerBrowser } from './ServerBrowser';
import { JoinGame } from './JoinGame';
import './ServerBrowser.css';

export const MultiplayerGame: React.FC = () => {
    const [gameId, setGameId] = useState<string | null>(null); // Track the game ID
    const [serverIp, setServerIp] = useState<string | null>(null);

    // Reset the game view when the player leaves
    const handleLeaveGame = () => {
        setGameId(null);
    };

    // On mount, set server IP dynamically
    useState(() => {
        const ip = window.location.hostname; // Get the IP address of the server
        setServerIp(ip);
    });

    const navigate = useNavigate(); // Use navigate hook to navigate between routes

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

    const handleJoin = (gameId: string) => {
        setGameId(gameId);
    };

    return (
        <div className="server-browser-container">
            {!gameId ? (
                <>
                <button className="back-button" onClick={() => navigate(-1)}>⬅️ Back</button>
                <h1 className="title">Server Browser</h1>
                    <ServerBrowser serverIp={serverIp!} onJoin={handleJoin} />
                    <button className="create-button" onClick={createGame}>Create New Game</button>
                </>
            ) : (
                <JoinGame gameId={gameId} serverIp={serverIp!} onLeave={handleLeaveGame} />
            )}
        </div>
    );
};
