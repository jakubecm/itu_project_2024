import React, { useEffect, useState } from 'react';

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

    // Fetch the list of games from the backend
    const fetchGames = async () => {
        try {
            const response = await fetch(`http://${serverIp}:5000/multiplayer/games`);
            const data = await response.json();
            setGames(data);

        } catch (error) {
            console.error('Error fetching games:', error);
        }
    };

    // Poll every 5 seconds to update the list of games
    // TODO: Add refresh button instead of polling every 5 seconds
    useEffect(() => {
        fetchGames();
        const interval = setInterval(fetchGames, 5000);
        return () => clearInterval(interval);  // Cleanup on component unmount
    }, [serverIp]);  // ServerIp as a dependency to ensure fetchGames runs when it changes

    return (
        <div>
            <h3>Available Games</h3>
            <ul>
                {games.map((game) => (
                    <li key={game.game_id}>
                        Game ID: {game.game_id} | Players: White - {game.players.white || 'Open'}, Black - {game.players.black || 'Open'}
                        <button onClick={() => onJoin(game.game_id)}>Join</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
