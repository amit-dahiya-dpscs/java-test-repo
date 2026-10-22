import React from 'react';
import { useReferenceData } from '../../context/ReferenceDataContext';
import { logAuditEvent } from '../../services/auditService';
import { DeleteIcon, UndoIcon } from './EditIcons';
import './EditSection.css';

const ScarMarkEditSection = ({ editData, handleListItemChange, setEditData, canDelete, errors, onConfirmDelete }) => {
    const { smtCodes } = useReferenceData();
    const LIST_KEY = 'appendedScarsMarks';

    const handleAdd = () => {
        logAuditEvent('ADD_SCAR_CLICK');
        setEditData([...editData, { id: null, code: '', description: '' }]);
    };

    const handleDelete = (index, item) => {
        const isNew = item.id === null || item.id === undefined;
        const isEmpty = !item.code || !item.code.trim();

        if (isNew && isEmpty) {
            setEditData(editData.filter((_, i) => i !== index));
            return;
        }

        const isDeleted = !!item._isMarkedForDeletion;
        const toggle = () => {
            const updated = [...editData];
            if (!isDeleted) {
                logAuditEvent('MARK_SCAR_DELETE', { item });
                updated[index]._isMarkedForDeletion = true;
            } else {
                logAuditEvent('UNDO_SCAR_DELETE', { item });
                delete updated[index]._isMarkedForDeletion;
                handleListItemChange(LIST_KEY, index, 'code', updated[index].code);
            }
            setEditData(updated);
        };

        if (isDeleted) {
            toggle();
        } else {
            onConfirmDelete("Mark this Scar/Mark for deletion? The change will be permanent when you click Save.", toggle);
        }
    };

    return (
        <div className="editable-list-container">
            {editData.map((item, index) => {
                const isDeleted = item._isMarkedForDeletion;
                const fieldError = errors[`${LIST_KEY}[${index}].code`];

                return (
                    <div key={item.id || `new-${index}`} className={`editable-list-item ${isDeleted ? 'marked-for-deletion' : ''}`}>
                        <div className="detail-item full-width">
                            <input
                                list={`smt-options-${index}`}
                                type="text"
                                className={`detail-value-edit ${fieldError ? 'error' : ''}`}
                                value={item.code || ''}
                                onChange={(e) => {
                                    // FIX: Strict Sanitization to prevent 400 Errors from backend
                                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
                                    handleListItemChange(LIST_KEY, index, 'code', val);
                                }}
                                placeholder="Code (e.g. TAT R ARM)"
                                disabled={isDeleted}
                                maxLength={10} 
                            />
                            <datalist id={`smt-options-${index}`}>
                                {smtCodes && Object.entries(smtCodes).map(([code, desc]) => (
                                    <option key={code} value={code}>{desc}</option>
                                ))}
                            </datalist>

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
            <button onClick={handleAdd} className="add-button">Add Scar/Mark</button>
        </div>
    );
};

export default ScarMarkEditSection;