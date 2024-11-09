import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './ChatBox.css'; // Import the CSS file

const socket = io(`http://localhost:5000`);

interface ChatMessage {
    message: string;
    player_color: string;
}

const ChatBox = ({ playerColor }: { playerColor: string }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        socket.on('message', (msg: ChatMessage) => {
            setMessages((prevMessages) => [...prevMessages, msg]);
        });

        return () => {
            socket.off('message');
        };
    }, []);

    const sendMessage = () => {
        if (message.trim()) {
            socket.emit('message', { message, player_color: playerColor });
            setMessage('');
        }
    };

    return (
        <div className="chatbox-container">
            <div className="chatbox-messages">
                {messages.map((msgData, index) => (
                    <div key={index} className="chatbox-message">
                        <strong>{msgData.player_color}:</strong> {msgData.message}
                    </div>
                ))}
            </div>
            <div className="chatbox-input-container">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="chatbox-input"
                />
                <button onClick={sendMessage} className="chatbox-send-button">Send</button>
            </div>
        </div>
    );
};

export default ChatBox;
