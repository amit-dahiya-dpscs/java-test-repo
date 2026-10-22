import React from 'react';

/**
 * Ident Name Edit Section
 * Matches exact UI structure of Juve (Label + Single Input for Name).
 * Uses 'ident-layout' grid to align fields in a single row.
 */
const NameEditSection = ({ editData, handleChange, errors }) => {

    if (!editData) {
        return null;
    }

    return (
        // Added 'ident-layout' to apply the 4-column grid layout
        <div className="details-grid top-section-grid ident-layout">
            
            {/* 1. NAME INPUT (Single String - Juve Style) */}
            <div className="detail-item-name">
                <label className="detail-label" htmlFor="name-edit">Name:</label>
                <input
                    id="name-edit"
                    type="text"
                    name="name"
                    className="detail-value-edit"
                    value={editData.name || ''}
                    onChange={handleChange}
                    placeholder="Last Name, First Name Middle Name"
                    autoFocus
                />
                {errors.name && <span className="field-error-text" role="alert">{errors.name}</span>}
            </div>

            {/* 2. FBI / UCN INPUT (Required by Ident FRD) */}
            <div className="detail-item">
                <label className="detail-label" htmlFor="ucn-edit">FBI / UCN:</label>
                <input
                    id="ucn-edit"
                    type="text"
                    name="ucn"
                    className="detail-value-edit"
                    value={editData.ucn || ''}
                    onChange={handleChange}
                    placeholder="Enter or Clear UCN"
                    maxLength={9}
                />
            </div>

            {/* 3. SID (READ-ONLY) */}
            <div className="detail-item-sid">
                <div className="detail-item">
                    <span className="detail-label">SID:</span>
                    <span className="detail-value read-only-in-edit">{editData.sid}</span>
                </div>
            </div>

            {/* 4. RECORD TYPE (READ-ONLY) */}
            <div className="detail-item-record-type">
                <div className="detail-item">
                    <span className="detail-label">Record Type:</span>
                    <span className="detail-value read-only-in-edit">{editData.recordType}</span>
                </div>
            </div>

        </div>
    );
};

export default NameEditSection;