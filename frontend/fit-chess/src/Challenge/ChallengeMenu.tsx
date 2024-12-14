import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Board } from '../board/board';
import './ChallengeMenu.css';
import { useNavigate } from 'react-router-dom';



interface Challenge {
    id: string;
    fen: string;
    name: string;
}

interface ChallengeData {
  challenges: { [key: string]: { fen: string; name: string } };
}

const ChallengeMenu: React.FC = () => {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const navigate = useNavigate();

    const fetchChallenges = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/get_challenges');
            const data: ChallengeData = await response.json();  

            if (response.ok) {
                const challengeList: Challenge[] = Object.entries(data.challenges).map(([id, challenge]) => ({
                    id,
                    fen: challenge.fen,
                    name: challenge.name,
                }));
                setChallenges(challengeList);
            } else {
                console.error('Failed to load challenges:');
            }
        } catch (error) {
            console.error('Error fetching challenges:', error);
        } finally {
            setLoading(false);
        }
    };

    // Delete a challenge
    const deleteChallenge = async (challengeId: string) => {
        try {
            const response = await fetch(`http://127.0.0.1:5000/delete_challenge/${challengeId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setChallenges((prev) => prev.filter((challenge) => challenge.id !== challengeId));
            } else {
                console.error('Failed to delete challenge');
            }
        } catch (error) {
            console.error('Error deleting challenge:', error);
        }
    };

    useEffect(() => {
        fetchChallenges();
    }, []);

    if (loading) {
        return <div>Loading challenges...</div>;
    }

    if (selectedChallenge) {
        const selectedFen = challenges.find((challenge) => challenge.id === selectedChallenge)?.fen || '';
        return (
            <div className="challenge-play-container">
                <button className="back-button" onClick={() => setSelectedChallenge(null)}>⬅️ Back</button>
                <Board initialFen={selectedFen} />
            </div>
        );
    }

    return (
        <div className="challenge-menu">
          <button className="back-button" onClick={() => navigate('/')}>⬅️ Back</button>       
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="menu-container">
              <div className="menu-center">
                <div className="menu-left">
                    <Link to="/challenge/create">
                        <button className="create-challenge-button">Create Challenge</button>
                    </Link>
                </div>
                <h2>Your Challenges:</h2>
                <ul className="challenge-list">
                  {challenges.map((challenge) => (
                    <li key={challenge.id} className="challenge-item-wrapper">
                      <div className="challenge-item">
                        <div style={{display: 'flex', flexDirection: 'column'}}>
                        <div className="challenge-info">
                          <span className="challenge-name">{challenge.name}</span>
                        </div>
                        <div className="challenge-buttons">
                          <button
                            className="play-button"
                            onClick={() => setSelectedChallenge(challenge.id)}
                          >
                            Play
                          </button>
                          <button 
                            className="edit-button"
                            onClick={() => navigate(`/challenge/edit/${challenge.id}`)}
                          >
                            Edit
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => deleteChallenge(challenge.id)}
                          >
                            Delete
                          </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
      
};

export default ChallengeMenu;
