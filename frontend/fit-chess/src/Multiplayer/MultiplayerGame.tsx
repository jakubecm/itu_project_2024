// File: MultiplayerGame.tsx
// Author: Norman Babiak (xbabia01)
// Desc: Component for the multiplayer game create and to show the server browser

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ServerBrowser } from './ServerBrowser';
import { JoinGame } from './JoinGame';
import './ServerBrowser.css';

interface CreateGameLobbyProps {
    serverIp: string;
    onGameCreated: (gameId: string, playerColor: string) => void;
}

// Component for creating a game after clicking the "Create New Game" button
const CreateGamelobby: React.FC<CreateGameLobbyProps> = ({ serverIp, onGameCreated }) => {
    const [gameName, setGameName] = useState('');
    const [theme, setTheme] = useState('regular');
    const [color, setColor] = useState<'white' | 'black'>('white');
    const [themes, setThemes] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false); // Flag to indicate if the form is submitting

    // Fetch themes for the dropdown
    useEffect(() => {
        const fetchThemes = async () => {
            try {
                const response = await fetch(`http://${serverIp}:5000/themes`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setThemes(data.themes || []);

            } catch (e) {
                console.error('Failed to fetch themes:', e);
            }
        };
        fetchThemes();
    }, [serverIp]);

    // Handle theme change
    const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTheme(e.target.value);
    };

    // Handle input send
    const handleSubmit = async () => {
        // Prevent empty game name
        if (!gameName.trim()) {
            return;
        }

        // Prevent submitting multiple times
        setIsSubmitting(true);

        try {
            // Create the game
            const createResponse = await fetch(`http://${serverIp}:5000/multiplayer/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ game_name: gameName, theme }),
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                throw new Error(errorData.error || 'Failed to create game.');
            }

            const createData = await createResponse.json();
            const gameId = createData.game_id;  // Get the game ID for the join request

            // Join the game right after creating it
            const joinResponse = await fetch(`http://${serverIp}:5000/multiplayer/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ game_id: gameId, player: color }),
            });

            if (!joinResponse.ok) {
                const joinErrorData = await joinResponse.json();
                throw new Error(joinErrorData.error || 'Failed to join game.');
            }

            const joinData = await joinResponse.json();
            console.log(joinData.message);

            // Notify parent component of the created game
            onGameCreated(gameId, color);

        } catch (e) {
            console.error('Failed to create or join game:', e);

        } finally {
            setIsSubmitting(false); // Reset the submitting flag
        }
    };

    return (
        <div className="server-browser-container">
            <h1 className="title">Create New Game</h1>
            <div className="create-game-lobby">
                {/* Game Name Input */}
                <label className="lobby-label">
                    Game Name:
                    <input 
                        type="text" 
                        value={gameName} 
                        onChange={e => setGameName(e.target.value)} 
                        required 
                        className="lobby-input"
                    />
                </label>

                {/* Theme Selection */}
                <label className="lobby-label">
                    Theme:
                    <select 
                        value={theme} 
                        onChange={handleThemeChange} 
                        className="lobby-select"
                    >
                        {themes.length > 0 ? themes.map((t) => (
                            <option key={t} value={t}>
                                { /* Capitalize the first letter */ }
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                            </option>
                        )) : <option value="regular">Regular</option>} {/* Default theme */}
                    </select>
                </label>

                {/* Color Selection */}
                <div className="color-selection">
                    Choose Color:
                    <div className="color-options">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#333' }}>
                            <input 
                                type="radio" 
                                value="white" 
                                checked={color==='white'} 
                                onChange={()=>setColor('white')} 
                                aria-label="Join as White"
                                style={{ cursor: 'pointer' }}
                            />
                            White
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#333' }}>
                            <input 
                                type="radio" 
                                value="black" 
                                checked={color==='black'} 
                                onChange={()=>setColor('black')} 
                                aria-label="Join as Black"
                                style={{ cursor: 'pointer' }}
                            />
                            Black
                        </label>
                    </div>
                </div>

                {/* Submit Button */}
                <button type="button" className="create-button-in" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create & Join'}
                </button>
            </div>
        </div>
    );
}

// Main component for the multiplayer game
export const MultiplayerGame: React.FC = () => {
    const [gameId, setGameId] = useState<string | null>(null); // Track the game ID
    const [playerColor, setPlayerColor] = useState<string | null>(null);
    const [serverIp, setServerIp] = useState<string | null>(null);
    const [creatingGame, setCreatingGame] = useState<boolean>(false);

    // Reset the game view when the player leaves
    const handleLeaveGame = () => {
        setGameId(null);
        setPlayerColor(null);
        setCreatingGame(false);
    };

    // On mount, set server IP dynamically
    useEffect(() => {
        const ip = window.location.hostname; // Get the IP address of the server
        setServerIp(ip);
    }, []);

    const navigate = useNavigate(); // Use navigate hook to navigate between routes

    const handleJoin = (gameId: string) => {
        setGameId(gameId);
        setPlayerColor(null); 
    };

    // Handle game creation
    const handleGameCreated = (createdGameId: string, chosenColor: string) => {
        setGameId(createdGameId);
        setPlayerColor(chosenColor);
        setCreatingGame(false);
    };

    // If server IP is not set, show loading
    if (!serverIp) {
        return <div>Loading...</div>;
    }

    // If game ID is set, join the game
    if (gameId) {
        return (
            <JoinGame gameId={gameId} serverIp={serverIp} onLeave={handleLeaveGame} playerColor={playerColor}/>
        );
    }

    // If creating game, show the create game lobby
    if (creatingGame) {
        return (
            <CreateGamelobby serverIp={serverIp} onGameCreated={handleGameCreated}/>
        );
    }

    return (
        <div className="server-browser-container">
            <button className="back-button" onClick={() => navigate(-1)}>
                ⬅️ Back
            </button>
            <h1 className="title">Server Browser</h1>
            <ServerBrowser serverIp={serverIp} onJoin={handleJoin}/>
            <button className="create-button" onClick={() => setCreatingGame(true)}>
                Create New Game
            </button>
        </div>
    );
};
