import React from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import './ConfirmationModal.css';

const ConfirmationModal = ({ message, onConfirm, onCancel }) => {
    const modalRef = useFocusTrap(true);

    return (
        <div className="notification-overlay">
            <div
                ref={modalRef}
                className="notification-modal confirmation-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirmation-title"
            >
                <p id="confirmation-title">{message}</p>
                <div className="confirmation-buttons">
                    <button className="confirm-button" onClick={onConfirm}>Yes</button>
                    <button className="cancel-button" onClick={onCancel}>No</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;