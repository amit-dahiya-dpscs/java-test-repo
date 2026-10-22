import React, { useState } from 'react';
import CautionEditSection from './CautionEditSection';
import DobEditSection from './DobEditSection';
import ScarMarkEditSection from '../../../ScarMarkEditSection';
import SocSecEditSection from './SocSecEditSection';
import MiscNumEditSection from './MiscNumEditSection';

const AppendIdEditSection = ({ data, onSave, onCancel, isSaving }) => {
    // 1. Initialize State from Props
    const [cautions, setCautions] = useState((data.flags || []).filter(f => f.type === 'CAUTION').map(f => f.code));
    const [dobs, setDobs] = useState((data.alternateDOBs || []).map(d => d.dob));
    const [ssns, setSsns] = useState((data.ssnHistory || []).map(s => s.ssn));
    
    // Scars/Marks require Code AND Description
    const [scarsMarks, setScarsMarks] = useState((data.scarsAndMarks || []).map(s => ({ code: s.code, description: s.description })));
    
    // Misc Numbers (includes DLs that were mapped to Misc)
    const [miscNumbers, setMiscNumbers] = useState((data.secondaryIdentifiers || []).map(m => ({ 
        idType: m.idType, 
        idValue: m.idValue 
    })));

    // 2. Save Handler - Bundles everything into UpdateAppendedIdRequest DTO
    const handleSaveInternal = () => {
        const payload = {
            cautions,
            dobs,
            ssns,
            scarsMarks,
            miscNumbers
        };
        onSave(payload);
    };

    return (
        <div className="edit-form">
            <h4 className="section-title">Appended Identifiers</h4>
            
            <div className="appended-edit-grid">
                <CautionEditSection items={cautions} setItems={setCautions} />
                <DobEditSection items={dobs} setItems={setDobs} />
                <ScarMarkEditSection items={scarsMarks} setItems={setScarsMarks} />
                <SocSecEditSection items={ssns} setItems={setSsns} />
                <MiscNumEditSection items={miscNumbers} setItems={setMiscNumbers} />
            </div>

            <div className="form-actions full-width">
                <button type="button" className="save-btn" onClick={handleSaveInternal} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save All Appended IDs'}
                </button>
                <button type="button" className="cancel-btn" onClick={onCancel} disabled={isSaving}>Cancel</button>
            </div>
        </div>
    );
};

export default AppendIdEditSection;