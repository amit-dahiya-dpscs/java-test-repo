import React from 'react';
import { logAuditEvent } from '../../services/auditService';
import { DeleteIcon, UndoIcon } from './EditIcons';
import './EditSection.css';

const DobEditSection = ({ editData, handleListItemChange, setEditData, canDelete, errors, onConfirmDelete }) => {
    const handleAdd = () => {
        logAuditEvent('ADD_DOB_CLICK');
        setEditData([...editData, { id: null, dob: '' }]);
    };

    const handleDelete = (index, item) => {
        const isNew = item.id === null;
        if (isNew && !item.dob) {
            setEditData(editData.filter((_, i) => i !== index));
            return;
        }
        const isDeleted = !!item._isMarkedForDeletion;
        const toggle = () => {
            const updated = [...editData];
            if (!isDeleted) {
                logAuditEvent('MARK_DOB_DELETE', { item });
                updated[index]._isMarkedForDeletion = true;
            } else {
                logAuditEvent('UNDO_DOB_DELETE', { item });
                delete updated[index]._isMarkedForDeletion;
                handleListItemChange('appendedDobs', index, 'dob', updated[index].dob);
            }
            setEditData(updated);
        };

        if (isDeleted) toggle();
        else onConfirmDelete("Mark this DOB for deletion?", toggle);
    };

    return (
        <div className="editable-list-container">
            {editData.map((item, index) => {
                const isDeleted = item._isMarkedForDeletion;
                return (
                    <div key={item.id || `new-${index}`} className={`editable-list-item ${isDeleted ? 'marked-for-deletion' : ''}`}>
                        <div className="detail-item full-width">
                            <input
                                type="text"
                                className={`detail-value-edit ${errors[`appendedDobs[${index}].dob`] ? 'error' : ''}`}
                                value={item.dob || ''}
                                onChange={(e) => handleListItemChange('appendedDobs', index, 'dob', e.target.value)}
                                placeholder="MM/DD/YYYY"
                                disabled={isDeleted}
                            />
                            {errors[`appendedDobs[${index}].dob`] && <span className="field-error-text">{errors[`appendedDobs[${index}].dob`]}</span>}
                        </div>
                        {canDelete && (
                            <button onClick={() => handleDelete(index, item)} className={`delete-button ${isDeleted ? 'undo' : ''}`}>
                                {isDeleted ? <UndoIcon /> : <DeleteIcon />}
                            </button>
                        )}
                    </div>
                );
            })}
            <button onClick={handleAdd} className="add-button">Add DOB</button>
        </div>
    );
};
export default DobEditSection;