// File: ServerBrowser.tsx
// Author: Norman Babiak (xbabia01)
// Desc: Component for the server browser, showing the list of games available to join

import React, { useEffect, useState } from 'react';
import './ServerBrowser.css';

interface Game {
    game_id: string;
    players: {
        white: string | null;
        black: string | null;
    };
    status: string;
    game_name: string;
    theme: string;
}

interface ServerBrowserProps {
    serverIp: string;
    onJoin: (gameId: string) => void;   // Callback to call when the player joins a game
}

export const ServerBrowser: React.FC<ServerBrowserProps> = ({ serverIp, onJoin }) => {
    const [games, setGames] = useState<Game[]>([]); // State to store the list of games

    // Fetch the list of games
    const fetchGames = async () => {
        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/games`);
            const data = await response.json();
            setGames(data);

        } catch (error) {
            console.error('Error fetching games:', error);
        }
    };

    // Fetch games on component mount and every 5 seconds
    useEffect(() => {
        fetchGames();
        const interval = setInterval(fetchGames, 5000);
        return () => clearInterval(interval);  // Cleanup on component unmount
    }, [serverIp]);  // ServerIp as a dependency to ensure fetchGames runs when it changes

    return (
        <div className="server-list-container">
            <ul className="game-list">
                {games.map((game) => (
                    <li key={game.game_id} className="game-item">
                        <div className="game-info">
                            <span className="game-id">Name: {game.game_name} (ID: {game.game_id})</span>
                            <span className="players">
                                Players: White - {game.players.white || 'Open'}, Black - {game.players.black || 'Open'}
                            </span>
                            <span className="players">
                                Theme: {game.theme}
                            </span>
                        </div>
                        <button className="join-button" onClick={() => onJoin(game.game_id)}>Join</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
