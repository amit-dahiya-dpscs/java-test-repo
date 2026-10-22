import React from 'react';
import { logAuditEvent } from '../../services/auditService';
import { DeleteIcon, UndoIcon } from './EditIcons.js';

// --- IMPORT SHARED STYLES ---
import './EditSection.css'; 

/**
 * Ident Alias Edit Section
 * Uses shared 'EditSection.css' for delete/undo/strikethrough styles.
 */
const AliasEditSection = ({ editData, handleListItemChange, setEditData, canDelete, errors, onConfirmDelete }) => {

    const handleAdd = () => {
        logAuditEvent('ADD_ALIAS_CLICK');
        setEditData([...editData, { id: null, name: '' }]);
    };

    const handleDelete = (index, alias) => {
        const isNew = alias.id === null;
        // Check for empty name (trimming whitespace)
        const isEmpty = !alias.name || !alias.name.trim();

        // 1. New & Empty: Remove immediately
        if (isNew && isEmpty) {
            setEditData(editData.filter((_, i) => i !== index));
            return;
        }

        // 2. Existing or Filled: Toggle Deletion Mark
        const isCurrentlyMarked = !!alias._isMarkedForDeletion;

        const executeToggleDeletion = () => {
            const updatedAliases = [...editData];
            if (!isCurrentlyMarked) {
                // Mark
                logAuditEvent('MARK_ALIAS_FOR_DELETION', { alias });
                updatedAliases[index]._isMarkedForDeletion = true;
            } else {
                // Undo
                logAuditEvent('UNDO_DELETE_ALIAS', { alias });
                delete updatedAliases[index]._isMarkedForDeletion;
                // Re-validate field on undo
                handleListItemChange('aliases', index, 'name', updatedAliases[index].name);
            }
            setEditData(updatedAliases);
        };
        
        if (isCurrentlyMarked) {
            executeToggleDeletion(); // Undo doesn't need confirmation
        } else {
            onConfirmDelete(
                "Do you want to mark this alias for deletion? The change will be permanent when you click Save.",
                executeToggleDeletion
            );
        }
    };

    return (
        <div className="editable-list-container">
            {editData.length > 0 ? (
                editData.map((alias, index) => {
                    const isNew = alias.id === null;
                    const isDeleted = alias._isMarkedForDeletion;

                    return (
                        <div 
                            key={alias.id || `new-${index}`} 
                            // Applies 'marked-for-deletion' class from EditSection.css
                            className={`editable-list-item ${isDeleted ? 'marked-for-deletion' : ''}`}
                        >
                            <div className="detail-item full-width">
                                {isNew ? (
                                    /* NEW ALIAS: Editable Input */
                                    <>
                                        <input
                                            type="text"
                                            className={`detail-value-edit ${errors[`aliases[${index}].name`] ? 'error' : ''}`}
                                            value={alias.name || ''}
                                            onChange={(e) => handleListItemChange('aliases', index, 'name', e.target.value)}
                                            placeholder="Last Name, First Name"
                                            autoFocus
                                        />
                                        {errors[`aliases[${index}].name`] && (
                                            <span className="field-error-text">{errors[`aliases[${index}].name`]}</span>
                                        )}
                                    </>
                                ) : (
                                    /* EXISTING ALIAS: Read-Only Text (Juve Style) */
                                    <div className={`detail-value ${isDeleted ? 'read-only-in-edit' : ''}`}>
                                        {alias.name}
                                    </div>
                                )}
                            </div>

                            {/* Delete/Undo Button */}
                            {canDelete && (
                                <button
                                    onClick={() => handleDelete(index, alias)}
                                    // Uses .delete-button and .undo from EditSection.css
                                    className={`delete-button ${isDeleted ? 'undo' : ''}`}
                                    title={isDeleted ? "Undo Deletion" : "Mark for Deletion"}
                                >
                                    {isDeleted ? <UndoIcon /> : <DeleteIcon />}
                                </button>
                            )}
                        </div>
                    );
                })
            ) : (
                <p className="no-records-text">No aliases exist for this record.</p>
            )}
            
            <button onClick={handleAdd} className="add-button">
                Add New Alias
            </button>
        </div>
    );
};

export default AliasEditSection;