import React from 'react';
import './EditSection.css';
import { EditIcon } from './EditIcons';

/**
 * A reusable wrapper component for any section that can be switched
 * between a read-only view and an editable form.
 *
 * @param {string} title - The title of the section.
 * @param {React.ReactNode} children - The content to be displayed (either the read-only view or the edit form).
 * @param {boolean} isEditing - A flag from the parent to determine if this section is in edit mode.
 * @param {function} onEdit - The function to call when the "Edit" button is clicked.
 * @param {function} onSave - The function to call when the "Save" button is clicked.
 * @param {function} onCancel - The function to call when the "Cancel" button is clicked.
 * @param {boolean} canEdit - A flag based on user roles to determine if the "Edit" button should be shown at all.
 * @param {boolean} isDisabled - A flag to disable the "Edit" button (e.g., when another section is being edited).
 */
export const EditSection = ({ title, titleAddon, children, isEditing, onEdit, onSave, onCancel, canEdit, isDisabled, hasChanges }) => {

    // Do not render the section at all if the user has no edit rights and it's a section that only appears for editing.
    if (!canEdit && isEditing) return null;

    return (
        <div className={`details-section edit-section-wrapper ${isEditing ? 'editing' : ''} ${isDisabled ? 'disabled' : ''}`}>
            <div className="section-header">
              <div className="section-title-container">
                    <h3 className="section-title">{title}</h3>
                    {titleAddon && titleAddon}
                </div>
                
                {/* Conditionally render the Edit button based on permissions and state */}
                {canEdit && !isEditing && (
                    <button 
                        onClick={onEdit} 
                        className="edit-button" 
                        aria-label={`Edit ${title}`}
                        disabled={isDisabled}
                        title={isDisabled ? "Save or cancel other changes first" : `Edit ${title}`}
                    >
                        <EditIcon />
                        <span>Edit</span>
                    </button>
                )}
            </div>

            <div className="section-content">
                {children}
            </div>

            {/* Conditionally render the Save/Cancel buttons */}
            {isEditing && (
                <div className="section-actions">
                    <button onClick={onSave} className="action-button save-button" disabled={!hasChanges}>Save</button>
                    <button onClick={onCancel} className="action-button cancel-button">Cancel</button>
                </div>
            )}
        </div>
    );
};