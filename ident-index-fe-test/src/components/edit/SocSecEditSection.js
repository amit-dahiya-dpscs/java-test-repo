import React from 'react';
import { logAuditEvent } from '../../services/auditService';
import { DeleteIcon, UndoIcon } from './EditIcons';
import { autoFormatSsn } from '../../hooks/useValidation';
import './EditSection.css';

const SocSecEditSection = ({ editData, handleListItemChange, setEditData, canDelete, errors, onConfirmDelete }) => {

    const LIST_KEY = 'appendedSsns';

    // REMOVED: useEffect for formatting. This logic has been moved to DetailsView.js handleEdit()
    // to prevent dependency warnings and infinite loops.

    const handleAdd = () => {
        logAuditEvent('ADD_SSN_CLICK');
        setEditData([...editData, { id: null, ssn: '' }]);
    };

    const handleDelete = (index, item) => {
        const isNew = item.id === null || item.id === undefined;
        const isEmpty = !item.ssn || !item.ssn.trim();

        if (isNew && isEmpty) {
            setEditData(editData.filter((_, i) => i !== index));
            return;
        }

        const isDeleted = !!item._isMarkedForDeletion;
        const toggle = () => {
            const updated = [...editData];
            if (!isDeleted) {
                logAuditEvent('MARK_SSN_DELETE', { item });
                updated[index]._isMarkedForDeletion = true;
            } else {
                logAuditEvent('UNDO_SSN_DELETE', { item });
                delete updated[index]._isMarkedForDeletion;
                handleListItemChange(LIST_KEY, index, 'ssn', updated[index].ssn);
            }
            setEditData(updated);
        };

        if (isDeleted) {
            toggle();
        } else {
            onConfirmDelete("Mark this SSN for deletion? The change will be permanent when you click Save.", toggle);
        }
    };

    return (
        <div className="editable-list-container">
            {editData.map((item, index) => {
                const isDeleted = item._isMarkedForDeletion;
                const fieldError = errors[`${LIST_KEY}[${index}].ssn`];

                return (
                    <div key={item.id || `new-${index}`} className={`editable-list-item ${isDeleted ? 'marked-for-deletion' : ''}`}>
                        <div className="detail-item full-width">
                            <input
                                type="text"
                                className={`detail-value-edit ${fieldError ? 'error' : ''}`}
                                value={item.ssn || ''}
                                onChange={(e) => {
                                    // Apply Auto-Format immediately
                                    const val = autoFormatSsn(e.target.value);
                                    handleListItemChange(LIST_KEY, index, 'ssn', val);
                                }}
                                placeholder="XXX-XX-XXXX"
                                maxLength={11}
                                disabled={isDeleted}
                            />
                            {fieldError && <span className="field-error-text">{fieldError}</span>}
                        </div>

                        {canDelete && (
                            <button 
                                onClick={() => handleDelete(index, item)} 
                                className={`delete-button ${isDeleted ? 'undo' : ''}`}
                                title={isDeleted ? "Undo Deletion" : "Mark for Deletion"}
                            >
                                {isDeleted ? <UndoIcon /> : <DeleteIcon />}
                            </button>
                        )}
                    </div>
                );
            })}
            <button onClick={handleAdd} className="add-button">Add SSN</button>
        </div>
    );
};

export default SocSecEditSection;