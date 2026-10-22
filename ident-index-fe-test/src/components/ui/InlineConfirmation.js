import React, { useState } from 'react';
import './ConfirmationModal.css'; // We can reuse some button styles

const InlineConfirmation = ({ title, details, onConfirm, onCancel }) => {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        if (reason.trim()) {
            onConfirm(reason);
        }
    };

    return (
        <div className="inline-confirmation-banner">
            <h4>{title}</h4>
            <div className="confirmation-details">
                {Object.entries(details).map(([key, value]) => (
                    <p key={key}><strong>{key}:</strong> {value}</p>
                ))}
            </div>
            <div className="form-group">
                <label htmlFor="deletion-reason">Reason for Deletion:</label>
                <textarea
                    id="deletion-reason"
                    className="comment-textarea-edit"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows="2"
                    placeholder="A reason is required to proceed."
                    autoFocus
                />
            </div>
            <div className="inline-confirmation-buttons">
                <button onClick={onCancel} className="action-button cancel-button small">Cancel</button>
                <button 
                    onClick={handleConfirm} 
                    className="action-button save-button small"
                    disabled={!reason.trim()}
                >
                    Confirm
                </button>
            </div>
        </div>
    );
};

export default InlineConfirmation;