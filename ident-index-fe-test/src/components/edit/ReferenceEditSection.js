import React, { useState } from 'react';
import { useReferenceData } from '../../context/ReferenceDataContext';
import { logAuditEvent } from '../../services/auditService';
import { DeleteIcon, UndoIcon } from './EditIcons';
import { autoFormatDate } from '../../hooks/useValidation';
import ExpungementModal from '../ui/ExpungementModal'; 
import './EditSection.css';
import { CRIMINAL_REF_TYPES } from '../../utils/validationConstants';

const ReferenceEditSection = ({
    editData,
    handleListItemChange,
    setEditData,
    errors,
    setErrors,
    canDelete,
    onDeleteClick,
    pendingDeletions = [],
    onUndoClick,
    activeExpungementItem,
    onExpungementClose,
    onExpungementConfirm,
    userRoles,
    isRapbackSubscribed,
    currentFbiNumber,
    currentComments,
    currentSid,
    currentRecordType
}) => {
    const { referenceTypes } = useReferenceData();
    const [previewDeleteType, setPreviewDeleteType] = useState(null);

    const handleModalClose = () => {
        setPreviewDeleteType(null);
        onExpungementClose();
    };

    const handleModalConfirm = (data) => {
        setPreviewDeleteType(null);
        onExpungementConfirm(data);
    };

    const handleAdd = () => {
        logAuditEvent('ADD_REFERENCE_CLICK');
        setEditData([...editData, { id: null, documentDate: '', documentType: '', documentNumber: '', description: '' }]);
    };

    const handleDeleteNew = (index, item) => {
        if (item.id) return;
        
        // 1. Remove the item from the data array
        setEditData(editData.filter((_, i) => i !== index));

        // 2. Clean up and shift the errors object
        if (setErrors) {
            setErrors(prevErrors => {
                const newErrors = {};
                Object.keys(prevErrors).forEach(key => {
                    // Match keys like "references[1].documentType"
                    const match = key.match(/^references\[(\d+)\]\.(.*)$/);
                    if (match) {
                        const errIndex = parseInt(match[1], 10);
                        const errField = match[2];
                        
                        if (errIndex < index) {
                            // Errors before the deleted row stay exactly where they are
                            newErrors[key] = prevErrors[key];
                        } else if (errIndex > index) {
                            // Errors after the deleted row shift down by 1 to match their new array index
                            newErrors[`references[${errIndex - 1}].${errField}`] = prevErrors[key];
                        }
                        // If errIndex === index, it is intentionally omitted (deleted)
                    } else {
                        // Keep errors belonging to other sections (like Name, DOB, etc.)
                        newErrors[key] = prevErrors[key];
                    }
                });
                return newErrors;
            });
        }
    };

    const isPendingDeletion = (item) => {
        if (!item?.id || !pendingDeletions) return false;
        return pendingDeletions.some(p => p.referenceId === item.id);
    };

    // 1. Filter to get only records that are NOT currently marked for deletion (including Downgraded records)
    const activeRecords = editData.filter(item => !isPendingDeletion(item) && !item._isGreyedOut);

    // 2. Check the state of the remaining active records
    const activeCount = activeRecords.length;
    
    // NEW: Count how many active CNS events exist and check if record is pending
    const activeCnsCount = activeRecords.filter(r => (r.documentType || '').toUpperCase() === 'CNS').length;
    const activeXrfCount = activeRecords.filter(r => (r.documentType || '').toUpperCase() === 'XRF').length;

    const isExpungementUser = userRoles?.includes('ROLE_CCH EXPUNGEMENT UNIT');
    const isDataIntegrityUser = userRoles?.includes('ROLE_CCH DATA INTEGRITY');
    const isAdmin = userRoles?.includes('ROLE_ADMIN');
    
    // Check if the user is strictly an Expungement user
    const isStrictlyExpungement = isExpungementUser && !isDataIntegrityUser && !isAdmin;

    return (
        <div className="editable-table-container">
            {/* Header Row */}
            <div className="editable-record-row reference-grid header-row">
                <span className="detail-label">DATE</span>
                <span className="detail-label">TYPE</span>
                <span className="detail-label">NUMBER</span>
                <span className="detail-label">DESCRIPTION</span>
                <div className="delete-action-cell" />
            </div>

            {/* --- INLINE ACTION PANEL --- */}
            {activeExpungementItem && (
                <ExpungementModal
                    isOpen={true}
                    variant="inline" 
                    onClose={handleModalClose}
                    onConfirm={handleModalConfirm}
                    referenceItem={activeExpungementItem}
                    userRoles={userRoles}
                    isRapbackSubscribed={isRapbackSubscribed}
                    currentFbiNumber={currentFbiNumber}
                    currentComments={currentComments}
                    allReferences={editData}
                    currentSid={currentSid}
                    currentRecordType={currentRecordType}                
                    onDeleteTypeChange={setPreviewDeleteType}    
                />
            )}

            {/* Data Rows */}
            {editData.map((item, index) => {
                const isExisting = !!item.id;
                const isDeleted = isPendingDeletion(item) || item._isGreyedOut;
                const isActive = activeExpungementItem && activeExpungementItem.id === item.id;

                let isPreviewTarget = false;
                
                if (previewDeleteType === 'DOWNGRADE') {
                    const docType = (item.documentType || '').toUpperCase();
                    if (CRIMINAL_REF_TYPES.includes(docType) && docType !== 'CNS') {
                        isPreviewTarget = true;
                    }
                }

                const dateError = errors[`references[${index}].documentDate`];
                const typeError = errors[`references[${index}].documentType`];
                const numError = errors[`references[${index}].documentNumber`];
                const descError = errors[`references[${index}].description`];
                const rowError = errors[`references[${index}].rowError`];

               // --- NEW LOGIC FOR DISABLING BUTTONS & FIELDS ---
                const docType = (item.documentType || '').toUpperCase();
                const isCnsOrXrfEvent = ['CNS', 'XRF'].includes(docType);
                
                let blockConsolidationDelete = false;

                if (isCnsOrXrfEvent) {
                    if (activeCnsCount >= 1 && activeXrfCount >= 1) {
                        // Scenario 4 (Expungement) & Scenario 1 (DI): Both exist on the same SID.
                        // Allow both roles to delete (will use 'Cancel').
                        blockConsolidationDelete = false;
                    } else if (activeCount === 1) {
                        // Scenarios 1 & 2 (Expungement) & Scenario 2 (DI): It is the ONLY event left on the record.
                        if (isStrictlyExpungement) {
                            // ALLOW for Expungement Users (Will be processed via Cancel Entire).
                            blockConsolidationDelete = false;
                        } else {
                            // BLOCK for Data Integrity Users.
                            blockConsolidationDelete = true;
                        }
                    } else {
                        // Scenario 3 (Expungement): CNS/XRF exists alongside other events.
                        // BLOCK for everyone.
                        blockConsolidationDelete = true;
                    }
                }

                // Rule 3: Non-Criminal Protections
                const isNonCriminal = !CRIMINAL_REF_TYPES.includes(docType);
                const isExpungementAllowedNonCriminal = ['MAF', 'CIT', 'XRF'].includes(docType);
                const blockNonCriminalDelete = isStrictlyExpungement && isNonCriminal && !isExpungementAllowedNonCriminal;

                const disableKeyFields = isExisting || isDeleted; 

                // Hide the delete button based on the Scenarios
                const hideDeleteButton = !isDeleted && isExisting && (
                    blockConsolidationDelete || 
                    blockNonCriminalDelete
                );

                const disableDescription = isDeleted || isCnsOrXrfEvent;

                return (
                    <div
                        key={item.id || `new-${index}`}
                        className={`editable-record-row reference-grid 
                            ${isDeleted ? 'marked-for-deletion' : ''} 
                            ${isActive ? 'pending-deletion-highlight' : ''}
                            ${isPreviewTarget ? 'pending-deletion-highlight' : ''}`
                        }
                    >
                        <div className="detail-item">
                            <input type="text" className={`detail-value-edit ${dateError || rowError ? 'error' : ''} ${disableKeyFields ? 'read-only-in-edit' : ''}`}
                                value={item.documentDate || ''} onChange={(e) => { const val = autoFormatDate(e.target.value); handleListItemChange('references', index, 'documentDate', val); }}
                                placeholder="MM/DD/YYYY" maxLength={10} disabled={disableKeyFields} />
                            {dateError && !rowError && <span className="field-error-text">{dateError}</span>}
                        </div>
                        <div className="detail-item">
                            <input list={`ref-types-${index}`} type="text" className={`detail-value-edit ${typeError || rowError ? 'error' : ''} ${disableKeyFields ? 'read-only-in-edit' : ''}`}
                                value={item.documentType || ''} onChange={(e) => handleListItemChange('references', index, 'documentType', e.target.value.toUpperCase())}
                                placeholder="Type" maxLength={3} disabled={disableKeyFields} />
                            <datalist id={`ref-types-${index}`}>{referenceTypes && referenceTypes.map(t => <option key={t} value={t} />)}</datalist>
                            {typeError && !rowError && <span className="field-error-text">{typeError}</span>}
                        </div>
                        <div className="detail-item">
                            <input type="text" className={`detail-value-edit ${numError || rowError ? 'error' : ''} ${disableKeyFields ? 'read-only-in-edit' : ''}`}
                                value={item.documentNumber || ''} onChange={(e) => handleListItemChange('references', index, 'documentNumber', e.target.value.toUpperCase())}
                                placeholder="Number" maxLength={12} disabled={disableKeyFields} />
                            {numError && !rowError && <span className="field-error-text">{numError}</span>}
                        </div>
                       <div className="detail-item">
                            {/* Notice disableDescription logic applied, and maxLength increased to 80 to fit the CNS sentence */}
                            <input type="text" className={`detail-value-edit ${descError || rowError ? 'error' : ''} ${disableDescription ? 'read-only-in-edit' : ''}`}
                                value={item.description || ''} onChange={(e) => handleListItemChange('references', index, 'description', e.target.value.toUpperCase())}
                                placeholder="Description" maxLength={80} disabled={disableDescription} />
                            {descError && !rowError && <span className="field-error-text">{descError}</span>}
                        </div>

                        {/* Actions */}
                        <div className="delete-action-cell">
                            {isDeleted ? (
                                <button onClick={() => onUndoClick(item)} className="delete-button undo icon-button" title="Undo"><UndoIcon /></button>
                            ) : (
                                hideDeleteButton ? null : (
                                    !isExisting ? (
                                        <button onClick={() => handleDeleteNew(index, item)} className="delete-button icon-button" title="Remove"><DeleteIcon /></button>
                                    ) : (
                                        canDelete && (
                                            <button onClick={() => onDeleteClick(item)} className="delete-button icon-button" title="Delete"><DeleteIcon /></button>
                                        )
                                    )
                                )
                            )}
                        </div>
                        {rowError && <div className="reference-error-container"><span className="field-error-text">{rowError}</span></div>}
                    </div>
                );
            })}
            <button onClick={handleAdd} className="add-button">Add New Reference</button>
        </div>
    );
};

export default ReferenceEditSection;