import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './Menu.css';
import chessIcon from '../assets/menu-icon.png';

function CheckersGameMenu() {
  const navigate = useNavigate();
  const [selectedVariant, setSelectedVariant] = useState('standard');
  const [pieceCount, setPieceCount] = useState(20); // Default piece count
  const [kingCount, setKingCount] = useState(0);    // Default king count

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);

    if (variant !== 'custom') {
      setPieceCount(20);
      setKingCount(0);
    }

    if (variant === 'frysk') {
      setPieceCount(5);
      setKingCount(0);
    }
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
        <button
          className={`variant-button ${selectedVariant === 'custom' ? 'selected' : ''}`}
          onClick={() => handleVariantChange('custom')}
        >
          Custom
        </button>
      </div>

      {selectedVariant === 'custom' && (
        <div className="custom-settings">
          <label>
            Number of pieces per side:
            <input
              type="number"
              value={pieceCount}
              min={1}
              max={20}
              onChange={(e) => setPieceCount(parseInt(e.target.value, 10))}
            />
          </label>
          <label>
            Number of kings per side:
            <input
              type="number"
              value={kingCount}
              min={0}
              max={pieceCount}
              onChange={(e) => setKingCount(parseInt(e.target.value, 10))}
            />
          </label>
        </div>
      )}

      <div className="menu-container-checkers">
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link 
            to="/checkers" 
            state={{ variant: selectedVariant, mode: 'player-vs-ai', piece_count: pieceCount, king_count: kingCount }}
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
          <Link 
            to="/checkers" 
            state={{ variant: selectedVariant, mode: 'freeplay', piece_count: pieceCount, king_count: kingCount }}
          >
            <button className="button">
              Freeplay
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CheckersGameMenu;
