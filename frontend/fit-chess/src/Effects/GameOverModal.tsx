import React, { useEffect, useState } from 'react';
import Snowfall from 'react-snowfall';
import garlic1 from '../assets/garlic1.svg';
import garlic2 from '../assets/garlic2.svg';
import garlic3 from '../assets/garlic3.svg';

interface GameOverModalProps {
    message: string;
    onClose: () => void;
    onNewGame: () => void;
}

const imageUrls = [garlic1, garlic2, garlic3]; // Use imported images

const GameOverModal: React.FC<GameOverModalProps> = ({ message, onClose, onNewGame }) => {
    const [loadedImages, setLoadedImages] = useState<HTMLImageElement[]>([]);

    useEffect(() => {
        const loadImages = async () => {
            const imagePromises = imageUrls.map((url) => {
                return new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.src = url;
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                });
            });

            try {
                const images = await Promise.all(imagePromises);
                setLoadedImages(images);
            } catch (error) {
                console.error("Failed to load images", error);
            }
        };

        loadImages();
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: 'linear-gradient(100deg, #E3D3D3 18%, #553737 100%)',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                textAlign: 'center',
                zIndex: 50,
            }}>
                <h2>Game Over</h2>
                <p>{message}</p>
                <button onClick={onNewGame} style={{ margin: '10px' }}>Start New Game</button>
                <button onClick={onClose} style={{ margin: '10px' }}>Close</button>
            </div>

            {loadedImages.length === imageUrls.length && (
                <Snowfall snowflakeCount={100} images={loadedImages} radius={[20, 50]} speed={[0.5, 10]} wind={[-1, 4]}/>
            )}
        </div>
    );
};

export default GameOverModal;
