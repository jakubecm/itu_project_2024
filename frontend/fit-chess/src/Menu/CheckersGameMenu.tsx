import { Link, useNavigate } from 'react-router-dom';
import './Menu.css';
import chessIcon from '../assets/menu-icon.png';

function CheckersGameMenu() {
  const navigate = useNavigate();

  return (
    <div className="new-game-menu">
      <button className="back-button" onClick={() => navigate(-1)}>⬅️ Back</button>
      <h1 className="title">New Game</h1>
      <div className="menu-container">
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link to="/checkers" state={{ variant: 'standard' }}>
            <button className="button">Standard</button>
          </Link>
        </div>
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link to="/checkers" state={{ variant: 'frysk' }}>
            <button className="button">Frysk!</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CheckersGameMenu;
