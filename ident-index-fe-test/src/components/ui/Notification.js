import React, { useEffect } from 'react';
import './Notification.css';

const Notification = ({ message, type, onClose, isModal = false }) => { // Accept the new prop
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    // Conditionally add a class if the notification is inside a modal
    const overlayClass = `notification-overlay ${isModal ? 'in-modal' : ''}`;

    return (
        <div className={overlayClass}>
            <div className={`notification-modal ${type}`} role="alert">
                <p>{message}</p>
                <button onClick={onClose} className="close-button" aria-label="Close notification">&times;</button>
            </div>
        </div>
    );
};

export default Notification;