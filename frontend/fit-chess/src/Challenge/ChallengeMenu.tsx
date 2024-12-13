import { Link, useNavigate } from 'react-router-dom';

function ChallengeMenu() {
  const navigate = useNavigate();

  return (
    <div className="challenge-menu">
      <button className="back-button" onClick={() => navigate(-1)}>⬅️ Back</button>
      <h1 className="title">Challenge</h1>
      <div className="menu-container">
        <div className="menu-item">
          <Link to="/challenge/play">
            <button className="button">Play Challenge</button>
          </Link>
        </div>
        <div className="menu-item">
          <Link to="/challenge/create">
            <button className="button">Create Challenge</button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ChallengeMenu;