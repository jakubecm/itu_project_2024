import { Link, useNavigate } from 'react-router-dom';
import './Menu.css';
import chessIcon from '../assets/menu-icon.png';

function AIGameMenu() {
  const navigate = useNavigate();   

  return (
    <div className="new-game-menu">
      <button className="back-button" onClick={() => navigate("/new-game")}>⬅️ Back</button>
      <h1 className="title">Choose difficulty</h1>
      <div className="menu-container">
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link to="/board/beginner">
            <button className="button">Beginner</button>
          </Link>
        </div>
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link to="/board/intermediate">
            <button className="button">Intermediate</button>
          </Link>
        </div>
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link to="/difficulty-list">
            <button className="button">Custom</button>
          </Link>
        </div>
        <div className="menu-item">
          <img src={chessIcon} alt="Chess icon" className="icon" />
          <Link to="/board">
            <button className="button">Free play</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AIGameMenu;
