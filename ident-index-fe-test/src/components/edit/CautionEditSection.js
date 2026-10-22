import React from 'react';
import { useReferenceData } from '../../context/ReferenceDataContext';
import { logAuditEvent } from '../../services/auditService';
import { DeleteIcon, UndoIcon } from './EditIcons.js';
import './EditSection.css'; // Import shared styles

const CautionEditSection = ({ editData, handleListItemChange, setEditData, canDelete, errors, onConfirmDelete }) => {
    // Get the caution codes map from context (e.g., { "A": "ARMED", "B": "DANGEROUS" })
    const { cautionCodes } = useReferenceData();

    const handleAdd = () => {
        logAuditEvent('ADD_CAUTION_CLICK');
        // Initialize with empty cautionCode
        setEditData([...editData, { id: null, cautionCode: '' }]);
    };

    const handleDelete = (index, record) => {
        // 1. New & Empty: Remove immediately
        const isNew = record.id === null || record.id === undefined;
        const isEmpty = !record.cautionCode || !record.cautionCode.trim();

        if (isNew && isEmpty) {
            setEditData(editData.filter((_, i) => i !== index));
            return;
        }

        // 2. Existing: Toggle Deletion Mark
        const isCurrentlyMarked = !!record._isMarkedForDeletion;

        const executeToggleDeletion = () => {
            const updatedData = [...editData];
            if (!isCurrentlyMarked) {
                logAuditEvent('MARK_CAUTION_FOR_DELETION', { record });
                updatedData[index]._isMarkedForDeletion = true;
            } else {
                logAuditEvent('UNDO_DELETE_CAUTION', { record });
                delete updatedData[index]._isMarkedForDeletion;
                // Re-validate on undo
                handleListItemChange('appendedCautions', index, 'cautionCode', updatedData[index].cautionCode);
            }
            setEditData(updatedData);
        };
        
        if (isCurrentlyMarked) {
            executeToggleDeletion();
        } else {
            onConfirmDelete(
                "Do you want to mark this Caution for deletion? The change will be permanent when you click Save.",
                executeToggleDeletion
            );
        }
    };

    return (
        <div className="editable-list-container">
            {editData && editData.length > 0 ? (
                editData.map((caution, index) => {
                    const isDeleted = caution._isMarkedForDeletion;
                    
                    return (
                        <div
                            key={caution.id || `new-${index}`}
                            className={`editable-list-item ${isDeleted ? 'marked-for-deletion' : ''}`}
                        >
                            <div className="detail-item full-width">
                                <select
                                    className={`detail-value-edit ${errors[`appendedCautions[${index}].cautionCode`] ? 'error' : ''}`}
                                    value={caution.cautionCode || ''}
                                    onChange={(e) => handleListItemChange('appendedCautions', index, 'cautionCode', e.target.value)}
                                    disabled={isDeleted}
                                >
                                    <option value="">-- Select Caution --</option>
                                    {cautionCodes && Object.entries(cautionCodes).map(([code, description]) => (
                                        <option key={code} value={code}>
                                            {code} - {description}
                                        </option>
                                    ))}
                                </select>
                                
                                {errors[`appendedCautions[${index}].cautionCode`] && (
                                    <span className="field-error-text">
                                        {errors[`appendedCautions[${index}].cautionCode`]}
                                    </span>
                                )}
                            </div>

                            {canDelete && (
                                <button
                                    onClick={() => handleDelete(index, caution)}
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
                <p className="no-records-text">No cautions exist for this record.</p>
            )}
            
            <button onClick={handleAdd} className="add-button">
                Add New Caution
            </button>
        </div>
    );
};

export default CautionEditSection;