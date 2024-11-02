import { Link, useNavigate } from 'react-router-dom';

function TutorialList() {
    const navigate = useNavigate();

    return (
        <div className="tutorial-list">
            <button className="back-button" onClick={() => navigate(-1)}>⬅️ Back</button>
            <h1 className="title">Tutorial</h1>
            <div className="menu-container">
                <div className="menu-item">
                    <Link to="/tutorial1">
                        <button className="button">Tutorial 1</button>
                    </Link>
                </div>
                <div className="menu-item">
                    <Link to="/tutorial/2">
                        <button className="button">Tutorial 2</button>
                    </Link>
                </div>
            </div>
        </div>
    );

}

export default TutorialList;