import React from 'react';
import { useNavigate, Link } from 'react-router-dom';  
import './tutorialList.css'; 

const TutorialList: React.FC = () => {
  const navigate = useNavigate(); 

  return (
    <div className="tutorial-list">
      <button className="back-button" onClick={() => navigate(-1)}>⬅️ Back</button>
      <h1 className="title"> Tutorials</h1>
      <div className="tutorial-card">
        <h2>1. Basic moves</h2> 
        <p>The player learns to move all the different pieces.</p> 
        <Link to="/tutorial1">
            <button className="tutorial-button">START</button>
        </Link>
      </div>
    </div>
  );
};

export default TutorialList;
