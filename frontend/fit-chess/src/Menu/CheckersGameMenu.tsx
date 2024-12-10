import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './Menu.css';
import chessIcon from '../assets/menu-icon.png';

function CheckersGameMenu() {
  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState('standard');

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
  };

  return (
    <div className="new-game-menu">
      <button className="back-button" onClick={() => navigate(-1)}>⬅️ Back</button>
      <h1 className="title">New Game</h1>
      <div className="variant-selector">
        <button
          className={`variant-button ${selectedVariant === 'standard' ? 'selected' : ''}`}
          onClick={() => handleVariantChange('standard')}
        >
          Standard
        </button>
        <button
          className={`variant-button ${selectedVariant === 'frysk' ? 'selected' : ''}`}
          onClick={() => handleVariantChange('frysk')}
        >
          Frysk!
        </button>
      </div>
      <div className="menu-container-checkers">
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link 
            to="/checkers" 
            state={{ variant: selectedVariant, mode: 'player-vs-ai' }}
            className={selectedVariant === 'frysk' ? 'disabled-link' : ''}
          >
            <button
              className="button"
              disabled={selectedVariant === 'frysk'}
            >
              Player vs AI
            </button>
          </Link>
        </div>
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link to="/checkers" state={{ variant: selectedVariant, mode: 'freeplay' }}>
            <button className="button">Freeplay</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CheckersGameMenu;
