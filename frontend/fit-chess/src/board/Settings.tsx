import { useState, useEffect } from 'react';
import Modal from 'react-modal';
Modal.setAppElement('#root'); // Suppresses modal-related console warnings
import './Settings.css';

interface SettingsProps {
    onThemeChange: (theme: string) => void;
}

const Settings = ({ onThemeChange }: SettingsProps) => {
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [themes, setThemes] = useState([]);
    const [selectedTheme, setSelectedTheme] = useState('Regular');


    useEffect(() => {
        const fetchThemes = async () => {
            try {
                const response = await fetch('http://127.0.0.1:5000/themes', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const data = await response.json();
                setThemes(data.themes);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                console.error('Error fetching themes', error);
            }
        };
        fetchThemes();
    }, [onThemeChange]);

    const handleOpenModal = () => {
        setModalIsOpen(true);
    };

    const handleCloseModal = () => {
        setModalIsOpen(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleThemeChange = (event: { target: { value: any; }; }) => {
        const newTheme = event.target.value;
        setSelectedTheme(newTheme);
        onThemeChange(newTheme);
    };

    return (
        <div>
            <button onClick={handleOpenModal} className="settings-button">
                <i className="fa fa-cog"></i> Settings
            </button>
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={handleCloseModal}
                contentLabel="Settings Modal"
                className="settings-modal"
                overlayClassName="settings-overlay"
            >
                <h2>Settings</h2>
                <div className="theme-selector">
                    <label htmlFor="theme-select" className="theme-label">Pieces Theme:</label>
                    <select id="theme-select" value={selectedTheme} onChange={handleThemeChange} className="theme-select">
                        {themes.map(theme => (
                            <option key={theme} value={theme}>{theme}</option>
                        ))}
                    </select>
                </div>
                <button onClick={handleCloseModal} className="close-button">Close</button>
            </Modal>
        </div>
    );
    
};

export default Settings;
