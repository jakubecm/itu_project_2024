import { Link, useNavigate } from 'react-router-dom';
import './Menu.css';
import chessIcon from '../assets/menu-icon.png';

function NewGameMenu() {
  const navigate = useNavigate();

  return (
    <div className="new-game-menu">
      <button className="back-button" onClick={() => navigate("/")}>⬅️ Back</button>
      <h1 className="title">New Game</h1>
      <div className="menu-container">
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link to="/new-game/difficulty">
            <button className="button">Player vs AI</button>
          </Link>
        </div>
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link to="/multiplayer">
            <button className="button">LAN</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NewGameMenu;
