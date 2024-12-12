import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Difficulty = {
  level: string;
  settings: {
    [key: string]: number;
  };
};

const DifficultyList: React.FC = () => {
  const [difficulties, setDifficulties] = useState<Record<string, Difficulty['settings']>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    
    fetchDifficulties();
  }, []);
  
  const fetchDifficulties = async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/difficulty/list',{
          method: 'GET',
          headers: {
              'Content-Type': 'application/json',
          },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch difficulties');
      }

      const data = await response.json();
      setDifficulties(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch difficulties:', error);
      setLoading(false);
    }
  };

  const handleDelete = async (level: string) => {
    try {
      await fetch(`http://127.0.0.1:5000/difficulty/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level }),
      });

      const updatedDifficulties = { ...difficulties };
      delete updatedDifficulties[level];
      setDifficulties(updatedDifficulties);
    } catch (error) {
      console.error('Failed to delete difficulty:', error);
    }
  };

  const handleEdit = (level: string) => {
    navigate(`/difficulty-list/edit/${level}`);
  };

  return (
    <div className="new-game-menu">
      <button className="back-button" onClick={() => navigate("/new-game/difficulty")}>⬅️ Back</button>
      <h1 className="title">Custom Difficulties</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        Object.entries(difficulties).map(([level]) => (
          <div key={level} className='difficulty-item'>
            <h2>{level}</h2>
            <button onClick={() => navigate(`/board/${level}`)}>Play</button>
            <button onClick={() => handleEdit(level)}>Edit</button>
            <button onClick={() => handleDelete(level)}>Delete</button>
          </div>
        ))
      )}
      <button className='create-difficulty-button' onClick={() => navigate(`/difficulty-list/create`)}>Create New Difficulty</button>
    </div>
  );
};

export default DifficultyList;
