import React from 'react';
import { useReferenceData } from '../../context/ReferenceDataContext';
import { logAuditEvent } from '../../services/auditService';
import { DeleteIcon, UndoIcon } from './EditIcons';
import './EditSection.css';

const MiscNumEditSection = ({ editData, handleListItemChange, setEditData, canDelete, errors, onConfirmDelete }) => {
    const { miscPrefixes } = useReferenceData();
    const LIST_KEY = 'appendedMiscNums';

    const handleAdd = () => {
        logAuditEvent('ADD_MISC_NUM_CLICK');
        setEditData([...editData, { id: null, idType: '', idValue: '' }]);
    };

    const handleDelete = (index, item) => {
        const isNew = item.id === null || item.id === undefined;
        const isEmpty = (!item.idType && !item.idValue);

        if (isNew && isEmpty) {
            setEditData(editData.filter((_, i) => i !== index));
            return;
        }

        const isDeleted = !!item._isMarkedForDeletion;
        const toggle = () => {
            const updated = [...editData];
            if (!isDeleted) {
                logAuditEvent('MARK_MISC_NUM_DELETE', { item });
                updated[index]._isMarkedForDeletion = true;
            } else {
                logAuditEvent('UNDO_MISC_NUM_DELETE', { item });
                delete updated[index]._isMarkedForDeletion;
                handleListItemChange(LIST_KEY, index, 'idValue', updated[index].idValue);
            }
            setEditData(updated);
        };

        if (isDeleted) {
            toggle();
        } else {
            onConfirmDelete("Mark this Misc Number for deletion? The change will be permanent when you click Save.", toggle);
        }
    };

    return (
        <div className="editable-list-container">
            {editData.map((item, index) => {
                const isDeleted = item._isMarkedForDeletion;
                
                // Get specific field errors from Parent State
                const typeErrorRaw = errors[`${LIST_KEY}[${index}].idType`];
                const valueErrorRaw = errors[`${LIST_KEY}[${index}].idValue`];
                const explicitRowError = errors[`${LIST_KEY}[${index}].rowError`];

                const ROW_ERRORS = ["Duplicate value detected.", "Both prefix and number are required."];
                
                let displayRowError = explicitRowError;
                let displayTypeError = typeErrorRaw;
                let displayValueError = valueErrorRaw;

                // 1. Promote field errors to Row Errors if they match specific messages
                if (!displayRowError) {
                    if (ROW_ERRORS.includes(typeErrorRaw)) {
                        displayRowError = typeErrorRaw;
                    }
                    else if (ROW_ERRORS.includes(valueErrorRaw)) {
                        displayRowError = valueErrorRaw;
                    }
                }

                // 2. Suppress "Both required" error if both fields are actually present
                const hasBothFields = (item.idType && item.idType.trim()) && (item.idValue && item.idValue.trim());
                if (hasBothFields && displayRowError === "Both prefix and number are required.") {
                    displayRowError = null;
                }

                if (displayRowError) {
                    displayTypeError = null;
                    displayValueError = null;
                }

                return (
                    <div 
                        key={item.id || `new-${index}`} 
                        className={`editable-list-item ${isDeleted ? 'marked-for-deletion' : ''}`}
                        style={{ flexDirection: 'column', alignItems: 'flex-start' }}
                    >
                        <div style={{ display: 'flex', width: '100%', gap: '10px', alignItems: 'flex-start' }}>
                            
                            {/* Prefix Input with Autocomplete */}
                            <div className="detail-item" style={{ flex: '0 0 120px' }}>
                                <input
                                    list={`prefix-options-${index}`}
                                    type="text"
                                    className={`detail-value-edit ${displayTypeError || displayRowError ? 'error' : ''}`}
                                    value={item.idType || ''}
                                    onChange={(e) => handleListItemChange(LIST_KEY, index, 'idType', e.target.value.toUpperCase())}
                                    placeholder="Prefix"
                                    maxLength={4} 
                                    disabled={isDeleted}
                                />
                                <datalist id={`prefix-options-${index}`}>
                                    {miscPrefixes && miscPrefixes.map(prefix => (
                                        <option key={prefix} value={prefix} />
                                    ))}
                                </datalist>
                                {/* Only show specific type error (e.g. Invalid Prefix) if no row error */}
                                {displayTypeError && <span className="field-error-text">{displayTypeError}</span>}
                            </div>

                            {/* Number Input */}
                            <div className="detail-item" style={{ flex: '1' }}>
                                <input
                                    type="text"
                                    className={`detail-value-edit ${displayValueError || displayRowError ? 'error' : ''}`}
                                    value={item.idValue || ''}
                                    onChange={(e) => handleListItemChange(LIST_KEY, index, 'idValue', e.target.value.toUpperCase())}
                                    placeholder="Number (12 digits)"
                                    maxLength={12}
                                    disabled={isDeleted}
                                />
                                {/* Only show specific value error if no row error */}
                                {displayValueError && <span className="field-error-text">{displayValueError}</span>}
                            </div>

                            {canDelete && (
                                <button 
                                    onClick={() => handleDelete(index, item)} 
                                    className={`delete-button ${isDeleted ? 'undo' : ''}`}
                                    title={isDeleted ? "Undo Deletion" : "Mark for Deletion"}
                                    style={{ marginTop: '0' }}
                                >
                                    {isDeleted ? <UndoIcon /> : <DeleteIcon />}
                                </button>
                            )}
                        </div>

                        {/* SINGLE ROW ERROR DISPLAYED AT BOTTOM */}
                        {displayRowError && (
                            <span className="field-error-text" style={{ marginTop: '5px', width: '100%' }}>
                                {displayRowError}
                            </span>
                        )}
                    </div>
                );
            })}
            <button onClick={handleAdd} className="add-button">Add Misc Number</button>
        </div>
    );
};

export default MiscNumEditSection;