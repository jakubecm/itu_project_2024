import React, { useEffect, useState } from 'react';
import './ServerBrowser.css';

interface Game {
    game_id: string;
    players: { // Define the players object
        white: string | null;
        black: string | null;
    };
    status: string;
}

interface ServerBrowserProps {
    serverIp: string;  // Ensure serverIp is passed as a prop
    onJoin: (gameId: string) => void; // Define the onJoin function
}

export const ServerBrowser: React.FC<ServerBrowserProps> = ({ serverIp, onJoin }) => {
    const [games, setGames] = useState<Game[]>([]); // Initialize games as an empty array

    const fetchGames = async () => {
        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/games`);
            const data = await response.json();
            setGames(data);
        } catch (error) {
            console.error('Error fetching games:', error);
        }
    };

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
                            <span className="game-id">Game ID: {game.game_id}</span>
                            <span className="players">
                                Players: White - {game.players.white || 'Open'}, Black - {game.players.black || 'Open'}
                            </span>
                        </div>
                        <button className="join-button" onClick={() => onJoin(game.game_id)}>Join</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
