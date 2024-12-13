// File: MainMenu.tsx
// Author: Norman Babiak (xbabia01), (some links added by Jiri Tesar (xtesar44))
// Desc: Main menu component for the application

import { Link } from 'react-router-dom';
import './Menu.css';
import chessIcon from '../assets/menu-icon.png';

function MainMenu() {
  return (
    <div className="main-menu">
      <div className="logo-container">
        <img src={chessIcon} alt="Chess icon" className="main-icon" />
        <h1 className="title">Chessnek</h1>
        <img src={chessIcon} alt="Chess icon" className="main-icon" />
      </div>
      <div className="menu-buttons">
        <Link to="/new-game">
          <button>New Game</button>
        </Link>
      </div>
      <div className="menu-buttons">
        <Link to="/tutorial">
          <button>Tutorial</button>
        </Link>
      </div>
      <div className="menu-buttons">
        <Link to="/checkers/new-game">
          <button>Checkers</button>
        </Link>
      </div>
      <div className="menu-buttons">
        <Link to="/challenge">
          <button>Challenge</button>
        </Link>
      </div>
    </div>
  );
}

export default MainMenu;