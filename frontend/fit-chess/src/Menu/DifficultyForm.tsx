// File: DifficultyForm.tsx
// Author: Milan Jakubec (xjakub41)
// Desc: Component for creating and editing custom difficulty settings.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './DifficultyForm.css';

// Define a type for the difficulty settings
interface DifficultySettings {
  name: string;
  "Skill Level": number;
  "Depth": number;
  "Move Overhead": number;
  "UCI_LimitStrength": boolean;
  "UCI_Elo": number;
}

const sliderSettings = {
  "Skill Level": { min: 0, max: 20, step: 1 },
  "Depth": { min: 1, max: 64, step: 1 },
  "Move Overhead": { min: 0, max: 500, step: 10 },
  "UCI_Elo": { min: 0, max: 3000, step: 10 }
};

const descriptions = {
  "Skill Level": "Adjust the skill level of the AI.",
  "Depth": "Set the search depth for the AI.",
  "Move Overhead": "Additional time added to the AI's move time (in milliseconds).",
  "UCI_LimitStrength": "Limit the strength of the AI. When enabled, AI plays up to the set Elo.",
  "UCI_Elo": "Set the Elo rating of the AI."
};

const DifficultyForm: React.FC = () => {
  const [settings, setSettings] = useState<DifficultySettings>({
    name: '',
    "Skill Level": 10,
    "Depth": 3,
    "Move Overhead": 100,
    "UCI_LimitStrength": false,
    "UCI_Elo": 1500
  });
  const [isEditing, setIsEditing] = useState(false);
  const { level } = useParams<{ level?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (level) {
      fetchDifficulty(level);
    }
  }, [level]);

  const fetchDifficulty = async (level: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/difficulty/get?level=${level}`);
      if (!response.ok) throw new Error('Failed to fetch difficulty details');
      const data = await response.json();
      setSettings({ name: level, ...data.settings });
      setIsEditing(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'name' ? value : parseInt(value, 10))
    }));
  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = `http://127.0.0.1:5000/difficulty/${isEditing ? 'update' : 'create'}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level: settings.name, settings })
      });

      if (response.ok) {
        navigate('/difficulty-list/');
      } else {
        throw new Error('Failed to submit difficulty');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className='new-game-menu'>
      <form onSubmit={handleSubmit}>
        <h1 className="title">{isEditing ? 'Edit Difficulty' : 'Create New Difficulty'}</h1>

        <div className="form-group">
          <label>Difficulty Name</label>
          <input type="text" name="name" value={settings.name} onChange={handleChange} disabled={isEditing} />
        </div>

        {Object.entries(settings).filter(([key]) => key !== 'name').map(([key, value]) => (
          <div key={key} className="form-group">
            <label>{key}</label>
            {key === 'UCI_LimitStrength' ? (
              <input type="checkbox" name={key} checked={value as boolean} onChange={handleChange} />
            ) : (
              <>
                <input type="range" name={key} min={sliderSettings[key as keyof typeof sliderSettings].min}
                  max={sliderSettings[key as keyof typeof sliderSettings].max}
                  step={sliderSettings[key as keyof typeof sliderSettings].step} value={value as number}
                  onChange={handleChange} />
                <input type="number" name={key} min={sliderSettings[key as keyof typeof sliderSettings].min}
                  max={sliderSettings[key as keyof typeof sliderSettings].max}
                  value={value as number} onChange={handleChange} style={{ marginLeft: '10px' }} />
              </>
            )}
            <p className='setting-description'>{descriptions[key as keyof typeof descriptions]}</p>
          </div>
        ))}
        <button type="submit">{isEditing ? 'Update Difficulty' : 'Create Difficulty'}</button>
        <button onClick={() => navigate('/difficulty-list/')} className="back-button">⬅️ Back</button>
      </form>
    </div>
  );
};

export default DifficultyForm;
