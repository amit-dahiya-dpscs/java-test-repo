import React, { useState } from 'react';
import './ConsolidationModal.css';

const ConsolidationModal = ({ onConfirm, onCancel }) => {
    const [targetSid, setTargetSid] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (targetSid.trim()) {
            onConfirm(targetSid.trim().toUpperCase());
        }
    };

    return (
        <div className="modal-overlay">
            {/* Added role role="dialog" for accessibility */}
            <div className="consolidation-modal" role="dialog" aria-labelledby="modalTitle">
                <div className="modal-header">
                    <h3 id="modalTitle">
                        {/* NEW: Professional Inline SVG Merge Icon */}
                        <svg
                            className="header-icon-svg"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                            />
                        </svg>
                        SID Consolidation
                    </h3>
                    <button className="close-x" onClick={onCancel} aria-label="Close modal">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <label htmlFor="targetSid" className="input-label">
                            Target SID Number
                        </label>
                        <input
                            type="text"
                            id="targetSid"
                            className="modal-input"
                            value={targetSid}
                            onChange={(e) => setTargetSid(e.target.value)}
                            autoFocus
                            autocomplete="off"
                            required
                        />
                        {/* Added Helper Text */}
                        <small className="helper-text">
                            The current record will be merged into the Target SID entered above. This action cannot be undone.
                        </small>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-close modal-btn" onClick={onCancel}>
                            Cancel
                        </button>
                        {/* Changed text to "Consolidate Records" for clarity */}
                        <button type="submit" className="btn-enter modal-btn" disabled={!targetSid.trim()}>
                            Consolidate
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConsolidationModal;