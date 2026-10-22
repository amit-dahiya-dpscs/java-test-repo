import React, { useState, useEffect } from 'react';
import './ExpungementModal.css'; 
import { 
    CRIMINAL_REF_TYPES
} from '../../utils/validationConstants';

const ExpungementModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    referenceItem, 
    userRoles = [], 
    isRapbackSubscribed = false,
    currentFbiNumber = '',
    currentComments = '',
    currentSid = '',
    variant = 'modal',
    currentRecordType,
    onDeleteTypeChange,
    allReferences = [] // REQUIRED: Full list for validation counts
}) => {
    const [step, setStep] = useState('SELECT_TYPE');
    const [deleteType, setDeleteType] = useState('');
    const [validationError, setValidationError] = useState('');
    
    const [formData, setFormData] = useState({
        reason: '', cogentPcn: '', cogentPcn2: '', courtCaseNumber: '', 
        charge: '', identification: '', ucn: '', comments: ''
    });
    const [isValid, setIsValid] = useState(false);

    const isExpungementUser = userRoles.includes('ROLE_CCH EXPUNGEMENT UNIT');
    const isDataIntegrityUser = userRoles.includes('ROLE_CCH DATA INTEGRITY');
    
    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('SELECT_TYPE');
            setDeleteType('');
            setValidationError('');
            setFormData({ 
                reason: '', cogentPcn: '', cogentPcn2: '', courtCaseNumber: '', 
                charge: '', identification: '', ucn: '', comments: '' 
            });
        }
    }, [isOpen, referenceItem]); 

    // --- REAL-TIME VALIDATION HELPERS ---
    const getCounts = () => {
        // Filter out rows already marked for deletion in the UI
        const activeRefs = allReferences.filter(r => !r._isMarkedForDeletion);
        
        const crimCount = activeRefs.filter(r => 
            CRIMINAL_REF_TYPES.includes((r.documentType || '').toUpperCase())
        ).length;
        
        const totalCount = activeRefs.length;
        const nonCrimCount = totalCount - crimCount;

        const cnsCount = activeRefs.filter(r => (r.documentType || '').toUpperCase() === 'CNS').length;
        const xrfCount = activeRefs.filter(r => (r.documentType || '').toUpperCase() === 'XRF').length;

        return { crimCount, nonCrimCount, cnsCount, xrfCount };
    };

    const handleTypeSelect = (type) => {
        setValidationError(''); 
        const { crimCount, nonCrimCount } = getCounts();
        const totalCount = crimCount + nonCrimCount;
        const isSoleCns = totalCount === 1 && (referenceItem?.documentType || '').toUpperCase() === 'CNS';
        const isSoleXrf = totalCount === 1 && (referenceItem?.documentType || '').toUpperCase() === 'XRF';
        const isSoleConsolidation = isSoleCns || isSoleXrf;

        const isTargetCriminal = CRIMINAL_REF_TYPES.includes((referenceItem?.documentType || '').toUpperCase());

        // 1. CANCEL ENTIRE Rules (FRD 4.3 / Legacy II0500C)
        if (type === 'CANCEL_ENTIRE') {
            if (!isSoleConsolidation) {
                if (!isTargetCriminal) {
                    setValidationError("CANNOT PERFORM A CANCEL ENTIRE ON A NON-CRIMINAL EVENT.");
                    return;
                }
                if (crimCount > 1) {
                    setValidationError("MULTIPLE ARREST EVENTS EXIST – CAN NOT PERFORM A CANCEL ENTIRE ON THIS RECORD. USE CANCEL OR PART CANCEL OR PARTIAL.");
                    return;
                }
                if (nonCrimCount > 0 || crimCount === 0) {
                    setValidationError("NON-CRIMINAL EVENTS EXIST - CAN NOT PERFORM A CANCEL ENTIRE ON THIS RECORD!");
                    return;
                }
            }
        }

        // 2. DOWNGRADE Rules (FRD 5.3 / 6.3)
        if (type === 'DOWNGRADE') {

            if (!isTargetCriminal) {
                setValidationError("CANNOT PERFORM DOWNGRADE ON A NON-CRIMINAL EVENT.");
                return;
            }

            const isCns = (referenceItem?.documentType || '').toUpperCase() === 'CNS';
            if (isDataIntegrityUser && isCns) {
                setValidationError("CANNOT PERFORM DOWNGRADE ON A CNS EVENT.");
                return;
            }

            if (isDataIntegrityUser && crimCount >= 1) {
                // Determine if we have the required "Anchor" records
                const hasCns = allReferences.some(r => !r._isMarkedForDeletion && r.documentType === 'CNS');
                const hasNonCrim = allReferences.some(r => !r._isMarkedForDeletion && !CRIMINAL_REF_TYPES.includes(r.documentType));

                // Check Record Type (Handle 'T', 'PENDING', or mapped value)
                // Assuming 'T' or 'PENDING' string. Adjust based on your API response.
                const isPending = ['T', 'PENDING'].includes((currentRecordType || '').toUpperCase());

                if (isPending) {
                    if (!hasCns) {
                        setValidationError("ADD A CNS REFERENCE EVENT FOR A PENDING RECORD TO PROCEED WITH THE DOWNGRADE.");
                        return;
                    }
                    else if(hasNonCrim){
                        setValidationError("PLEASE REMOVE THE NON-CRIMINAL EVENT(S) FOR A PENDING RECORD TO PROCEED WITH THE DOWNGRADE.");
                        return;
                    }
                } else {
                    if (!hasNonCrim) {
                        setValidationError("MUST HAVE AN EXISTING NON-CRIMINAL EVENT TO PERFORM THIS DOWNGRADE FUNCTION.");
                        return;
                    }
                }
            }

            if (crimCount === 0) {
                setValidationError("MUST HAVE AN EXISTING CRIMINAL EVENT TO PERFORM THIS DOWNGRADE FUNCTION.");
                return;
            }
            if (crimCount > 1 && isExpungementUser) {
                setValidationError("MULTIPLE ARREST EVENTS EXIST – CAN NOT PERFORM A DOWNGRADE ON THIS RECORD. USE CANCEL OR PART CANCEL OR PARTIAL.");
                return;
            }
            if (nonCrimCount === 0 && isExpungementUser) {
                setValidationError("MUST HAVE AN EXISTING NON-CRIMINAL EVENT TO PERFORM THIS DOWNGRADE FUNCTION.");
                return;
            }
        }

        // 3. PART CANCEL Rules 
        if (type === 'PART_CANCEL') {

            if (crimCount === 0 && nonCrimCount >= 2) {
                setValidationError("CANNOT PERFORM PART CANCEL WHEN ONLY NON-CRIMINAL EVENTS EXIST. USE 'CANCEL'.");
                return;
            }

            if (!isTargetCriminal && crimCount === 1 && nonCrimCount === 1) {
                setValidationError("CANNOT PERFORM A PART CANCEL ON THIS NON-CRIMINAL EVENT WHEN A CRIMINAL EVENT EXISTS. USE 'CANCEL'.");
                return;
            }

            if (!isTargetCriminal && nonCrimCount === 1 && crimCount === 0) {
                setValidationError("CANNOT PERFORM A PART CANCEL ON A LAST NON-CRIMINAL EVENT.");
                return;
            }

            if (isTargetCriminal && crimCount <= 1) {
                setValidationError("CANNOT DELETE THE LAST CRIMINAL EVENT VIA PART CANCEL. USE 'CANCEL ENTIRE OR DOWNGRADE'.");
                return;
            }
        }

        // 4. PARTIAL Rules
        if (type === 'PARTIAL') {

            if (crimCount === 0 && nonCrimCount >= 2) {
                setValidationError("CANNOT PERFORM PARTIAL WHEN ONLY NON-CRIMINAL EVENTS EXIST. USE 'CANCEL'.");
                return;
            }

            if (!isTargetCriminal && crimCount === 1 && nonCrimCount === 1) {
                setValidationError("CANNOT PERFORM A PARTIAL ON THIS NON-CRIMINAL EVENT WHEN A CRIMINAL EVENT EXISTS. USE 'CANCEL'.");
                return;
            }
             
             if (!isTargetCriminal && nonCrimCount === 1 && crimCount === 0) {
                setValidationError("CANNOT PERFORM A PARTIAL ON A LAST NON-CRIMINAL EVENT.");
                return;
            }

             // Rule: Cannot Partial Expunge the last criminal record if it deletes the row
             if (isTargetCriminal && crimCount <= 1) {
                setValidationError("CANNOT DELETE THE LAST CRIMINAL EVENT VIA PARTIAL. USE 'CANCEL ENTIRE OR DOWNGRADE'.");
                return;
             }
        }

        // 5. CANCEL Rules
        if (type === 'CANCEL') {
             if (!isTargetCriminal && nonCrimCount === 1 && crimCount === 0) {
                setValidationError("CANNOT PERFORM A CANCEL ON A LAST NON-CRIMINAL EVENT.");
                return;
            }

            // SCENARIO 4 (EXP) & SCENARIO 1 (DI) BYPASS:
            const docType = (referenceItem?.documentType || '').toUpperCase();
            const isCnsOrXrf = docType === 'CNS' || docType === 'XRF';
            const { cnsCount, xrfCount } = getCounts();
            const hasBothCnsAndXrf = cnsCount >= 1 && xrfCount >= 1;
            const isConsolidationBypass = isCnsOrXrf && hasBothCnsAndXrf;

            if (isTargetCriminal && crimCount <= 1) {
                if (!isConsolidationBypass) {
                    if (isExpungementUser) {
                        setValidationError("CANNOT DELETE THE LAST CRIMINAL EVENT VIA CANCEL. USE 'CANCEL ENTIRE OR DOWNGRADE'.");
                    } else {
                        setValidationError("CANNOT DELETE THE LAST CRIMINAL EVENT VIA CANCEL.");
                    }
                    return;
                }
            }
        }

        // Proceed if validation passes
        setDeleteType(type);
        setStep('DETAILS');

        if (onDeleteTypeChange) {
            onDeleteTypeChange(type);
        }
        
        // Pre-populate fields based on type
        if (type === 'DOWNGRADE' || type === 'CANCEL_ENTIRE') {
            setFormData(prev => ({ ...prev, ucn: currentFbiNumber || '' }));
        }
        // Comments Logic (FRD 3.5 / 5.5 / 7.4)
        if (currentComments && (type === 'DOWNGRADE' || type === 'PART_CANCEL' || type === 'CANCEL')) {
             setFormData(prev => ({ ...prev, comments: currentComments }));
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // --- FORM VALIDATION ---
    useEffect(() => {
        if (step !== 'DETAILS') return;
        let valid = true;
        let newValidationError = ''

        // 1. Reason required for ALL types
        if (!formData.reason || !formData.reason.trim()) valid = false;

        // 2. Complex Fields required for specific types
        const requiresComplexFields = 
            (deleteType === 'PART_CANCEL' || deleteType === 'PARTIAL') ||
            (deleteType === 'DOWNGRADE' && isExpungementUser);

        if (requiresComplexFields) {
            if (!formData.cogentPcn.trim()) valid = false;
            if (!formData.courtCaseNumber.trim()) valid = false;
            if (!formData.charge.trim()) valid = false;
        }

        // 3. Downgrade UCN Logic (FRD 5.5 / 6.5)
        if (deleteType === 'DOWNGRADE' || deleteType === 'CANCEL_ENTIRE') {
            if (!isDataIntegrityUser && !isRapbackSubscribed) {

                const inputUcn = formData.ucn ? formData.ucn.trim() : '';
                const originalUcn = currentFbiNumber ? currentFbiNumber.trim() : '';
                // Non-Rapback: Must CLEAR the UCN field
                if (inputUcn !== '' && inputUcn !== originalUcn) {
                    newValidationError = "You cannot enter a new FBI Number. You may only clear it or keep the existing one.";
                    valid = false;
                }
            } 
        }

        if (newValidationError) {
             setValidationError(newValidationError); // Show the specific error
        } else if (valid) {
             setValidationError(''); // Clear error if valid
        }

        setIsValid(valid);
    }, [formData, deleteType, step, isExpungementUser, isDataIntegrityUser, isRapbackSubscribed, currentFbiNumber]);

    if (!isOpen) return null;

    const handleBack = () => {
        // 1. Reset Local State
        setStep('SELECT_TYPE');
        setDeleteType(''); // Clear the selected type so validations reset
        
        // 2. Notify Parent to Clear Highlights (The Fix)
        if (onDeleteTypeChange) {
            onDeleteTypeChange(null); 
        }
    };

    const handleConfirm = () => {
        if (!isValid) return;

        let requestingUnit = 'EXPUNGEMENT_UNIT';
        if (isDataIntegrityUser && !isExpungementUser) {
            requestingUnit = 'DATA_INTEGRITY';
        }

        if (deleteType === 'DOWNGRADE' && !showComplexFields) {
             requestingUnit = 'DATA_INTEGRITY';
        }

        onConfirm({ deleteType, referenceId: referenceItem?.id, requestingUnit, ...formData });
    };

    // --- VISIBILITY FLAGS ---
    const showComplexFields = 
        (deleteType === 'PART_CANCEL' || deleteType === 'PARTIAL') ||
        (deleteType === 'DOWNGRADE' && isExpungementUser);

    const showUcnField = currentFbiNumber && 
                         (deleteType === 'DOWNGRADE') && 
                         !isDataIntegrityUser;

    const isUcnEditable = !isRapbackSubscribed;
    
    // Partial: Comments NOT editable (FRD 8.4)
    const showCommentsField = currentComments && (
        deleteType === 'DOWNGRADE' ||
        deleteType === 'PART_CANCEL' ||
        deleteType === 'CANCEL'
    );
    const isCommentsEditable = deleteType !== 'PARTIAL';

    const isCancelEntire = deleteType === 'CANCEL_ENTIRE';

    // RENDER CONTENT
    const renderContent = () => (
        <div className={`modal-content expungement-modal ${variant === 'inline' ? 'inline-panel' : ''}`}>
            <div className="modal-header">
                <h3>{step === 'SELECT_TYPE' ? 'SELECT A DELETE TYPE TO PROCEED' : `CONFIRM ${deleteType.replace(/_/g, ' ')}`}</h3>
                <button onClick={onClose} className="modal-close">&times;</button>
            </div>

            <div className="modal-body">
                {/* Validation Error Banner */}
                {validationError && (
                    <div className="search-error-message" style={{ margin: '0 0 15px 0' }}>
                        {validationError}
                    </div>
                )}

                {step === 'SELECT_TYPE' && (
                    <div className="delete-type-grid">
                        {(isExpungementUser || isDataIntegrityUser) && (
                            <>
                                <button className="type-btn" onClick={() => handleTypeSelect('CANCEL')}>Cancel</button>
                                <button className="type-btn" onClick={() => handleTypeSelect('DOWNGRADE')}>Downgrade</button>
                            </>
                        )}
                        {isExpungementUser && (
                            <>
                                <button className="type-btn" onClick={() => handleTypeSelect('PART_CANCEL')}>Part Cancel</button>
                                <button className="type-btn" onClick={() => handleTypeSelect('CANCEL_ENTIRE')}>Cancel Entire</button>
                                <button className="type-btn" onClick={() => handleTypeSelect('PARTIAL')}>Partial</button>
                            </>
                        )}
                    </div>
                )}

                {step === 'DETAILS' && (
                    <div className="exp-form-grid">
                        
                        {/* --- UPDATED DISPLAY LOGIC --- */}
                        {isCancelEntire ? (
                            // CANCEL ENTIRE: Show ONLY SID
                            <div className="info-row">
                                <div className="info-item">
                                    <span className="info-label">SID Number</span>
                                    <span className="info-value">{currentSid || 'N/A'}</span>
                                </div>
                            </div>
                        ) : !(isDataIntegrityUser && deleteType === 'DOWNGRADE') && (
                            // OTHER TYPES: Show Event Date, Type, Doc Number
                            // HIDDEN FOR: Data Integrity Downgrade
                            <div className="info-row">
                                <div className="info-item">
                                    <span className="info-label">Date</span>
                                    <span className="info-value">{referenceItem?.documentDate || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Type</span>
                                    <span className="info-value">{referenceItem?.documentType || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Number</span>
                                    <span className="info-value">{referenceItem?.documentNumber || 'N/A'}</span>
                                </div>
                            </div>
                        )}

                        {(showUcnField || showCommentsField) && (
                            <div className="form-row">
                                {showUcnField && (
                                    <div className="form-group">
                                        <label>UCN / FBI Number</label>
                                        <input 
                                            type="text" 
                                            value={formData.ucn} 
                                            onChange={(e) => handleChange('ucn', e.target.value)} 
                                            disabled={!isUcnEditable} 
                                        />
                                        {isUcnEditable 
                                            ? <div className="form-hint" style={{color: '#f1c40f', fontSize: '0.8rem'}}>* Clearing this field will delete the Name Section <b>FBI/UCN</b>.</div> 
                                            : <div className="error-text">RAPBACK SUBSCRIBED</div>
                                        }
                                    </div>
                                )}

                                {showCommentsField && (
                                    <div className="form-group">
                                        <label>Comments</label>
                                        <input 
                                            type="text" 
                                            value={formData.comments} 
                                            onChange={(e) => handleChange('comments', e.target.value)} 
                                            disabled={!isCommentsEditable}
                                         />
                                        <div className="form-hint" style={{color: '#f1c40f', fontSize: '0.8rem'}}>* Clearing this field will delete the Personal Identifier Section <b>COMMENT</b>.</div> 
                                    </div>
                                )}
                            </div>
                        )}

                        {showComplexFields && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cogent PCN *</label>
                                    <input type="text" value={formData.cogentPcn} onChange={(e) => handleChange('cogentPcn', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Cogent PCN 2</label>
                                    <input type="text" value={formData.cogentPcn2} onChange={(e) => handleChange('cogentPcn2', e.target.value)} />
                                </div>
                            </div>
                        )}

                        {showComplexFields && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Court Case Number *</label>
                                    <input type="text" value={formData.courtCaseNumber} onChange={(e) => handleChange('courtCaseNumber', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Charge *</label>
                                    <input type="text" value={formData.charge} onChange={(e) => handleChange('charge', e.target.value)} />
                                </div>
                            </div>
                        )}

                        <div className="form-group full-width">
                            <label>Reason for Deletion *</label>
                            <textarea rows="2" placeholder="A reason is required to proceed" value={formData.reason} onChange={(e) => handleChange('reason', e.target.value)} />
                        </div>
                    </div>
                )}
            </div>

            <div className="modal-footer">
                {step === 'DETAILS' ? (
                    <button className="btn-cancel" onClick={handleBack}>Back</button>
                ) : (
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                )}
                {step === 'DETAILS' && (
                    <button className="btn-confirm" onClick={handleConfirm} disabled={!isValid}>Confirm</button>
                )}
            </div>
        </div>
    );

    if (variant === 'inline') {
        return <div className="inline-expungement-wrapper">{renderContent()}</div>;
    }

    return (
        <div className="modal-overlay">
            {renderContent()}
        </div>
    );
};

export default ExpungementModal;