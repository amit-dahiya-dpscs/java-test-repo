import React from 'react';
import { useReferenceData } from '../../context/ReferenceDataContext';
import { 
    VALID_STREET_DIR_CODES, 
    VALID_STREET_SUF_CODES 
} from '../../utils/validationConstants';

import { isValidPatternInput } from '../../utils/mafisUtils';

const PersonalIdEditSection = ({ editData, handleChange, errors, cautionCodes }) => {
    
    const { races, sexes, eyeColors, hairColors, skinTones, countries, addressStates, pobCodes } = useReferenceData();

    const dirList = Array.from(VALID_STREET_DIR_CODES || []).sort();
    const sufList = Array.from(VALID_STREET_SUF_CODES || []).sort();
    const stateList = addressStates ? Object.keys(addressStates).sort() : [];
    const pobList = pobCodes ? Object.keys(pobCodes).sort() : [];

    const getCountryName = (code) => {
        if (!code) return 'NOT REPORTED';
        const c = countries.find(x => x.code === code.toUpperCase());
        return c ? c.description : 'INVALID CODE';
    };

    const renderOptions = (dataMap) => {
        if (!dataMap) return null;
        if (Array.isArray(dataMap)) {
             return dataMap.map(item => (
                <option key={item.code} value={item.code}>{item.code} - {item.description}</option>
            ));
        }
        return Object.entries(dataMap).map(([code, desc]) => (
            <option key={code} value={code}>{code} - {desc}</option>
        ));
    };

     const handlePatternChange = (e) => {
        const { name, value } = e.target;
        const upperValue = value.toUpperCase();

        if (!isValidPatternInput(upperValue)) {
            return; // Reject invalid character immediately
        }
        
        // Allow empty (removal) or valid character
        handleChange({ target: { name, value: upperValue } });
    };

    if (!editData) return null;

    return (
        <div>
            {/* --- Demographics Grid --- */}
            <div className="details-grid personal-identifiers-grid">
                
                {/* RACE */}
                <div className="detail-item">
                    <label className="detail-label">RACE:</label>
                    <select name="race" value={editData.race || ''} onChange={handleChange} className="detail-value-edit">
                        <option value="">-- Select --</option>
                        {renderOptions(races)}
                    </select>
                    {errors.race && <span className="field-error-text">{errors.race}</span>}
                </div>

                {/* SEX */}
                <div className="detail-item">
                    <label className="detail-label">SEX:</label>
                    <select name="sex" value={editData.sex || ''} onChange={handleChange} className="detail-value-edit">
                        <option value="">-- Select --</option>
                        {renderOptions(sexes)}
                    </select>
                    {errors.sex && <span className="field-error-text">{errors.sex}</span>}
                </div>

                {/* DOB */}
                <div className="detail-item">
                    <label className="detail-label">DOB:</label>
                    <input 
                        type="text" 
                        name="dob" 
                        value={editData.dob || ''} 
                        onChange={handleChange} 
                        className="detail-value-edit" 
                        placeholder="MM/DD/YYYY"
                    />
                    {errors.dob && <span className="field-error-text">{errors.dob}</span>}
                </div>

                {/* POB */}
                <div className="detail-item">
                    <label className="detail-label">POB</label>
                    <input 
                        list="pob-options"
                        type="text" 
                        name="pob" 
                        className={`detail-value-edit ${errors.pob ? 'error' : ''}`} 
                        value={editData.pob || ''} 
                        onChange={(e) => handleChange({ target: { name: 'pob', value: e.target.value.toUpperCase() }})} 
                        maxLength={2} 
                    />
                    <datalist id="pob-options">
                        {pobList.map(code => <option key={code} value={code}>{pobCodes[code]}</option>)}
                    </datalist>
                    {errors.pob && <span className="field-error-text">{errors.pob}</span>}
                </div>

                {/* HEIGHT */}
                <div className="detail-item">
                    <label className="detail-label">HGT:</label>
                    <input type="text" name="height" value={editData.height || ''} onChange={handleChange} className="detail-value-edit" />
                    {errors.height && <span className="field-error-text">{errors.height}</span>}
                </div>

                {/* WEIGHT */}
                <div className="detail-item">
                    <label className="detail-label">WGT:</label>
                    <input type="text" name="weight" value={editData.weight || ''} onChange={handleChange} className="detail-value-edit" />
                    {errors.weight && <span className="field-error-text">{errors.weight}</span>}
                </div>

                {/* EYES */}
                <div className="detail-item">
                    <label className="detail-label">EYES:</label>
                    <select name="eyes" value={editData.eyes || ''} onChange={handleChange} className="detail-value-edit">
                        <option value="">-- Select --</option>
                        {renderOptions(eyeColors)}
                    </select>
                </div>

                {/* HAIR */}
                <div className="detail-item">
                    <label className="detail-label">HAIR:</label>
                    <select name="hair" value={editData.hair || ''} onChange={handleChange} className="detail-value-edit">
                        <option value="">-- Select --</option>
                        {renderOptions(hairColors)}
                    </select>
                </div>

                {/* SKIN */}
                <div className="detail-item">
                    <label className="detail-label">SKIN:</label>
                    <select name="skin" value={editData.skin || ''} onChange={handleChange} className="detail-value-edit">
                        <option value="">-- Select --</option>
                        {renderOptions(skinTones)}
                    </select>
                </div>

                {/* CAUTION */}
                <div className="span-two-columns detail-item">
                    <label className="detail-label">CAUTION INDICATOR:</label>
                    <select name="cautionInd" value={editData.cautionInd || ''} onChange={handleChange} className="detail-value-edit">
                        <option value="">-- Select --</option>
                        {cautionCodes && Object.entries(cautionCodes).map(([code, desc]) => (
                             <option key={code} value={code}>{code} - {desc}</option>
                        ))}
                    </select>
                </div>
            </div>
                            
            <h4 className="sub-section-title">FINGERPRINT CLASSIFICATIONS</h4>
            <div className="edit-row wrap">
                <div className="detail-item">
                    <label className="detail-label">PATTERN TYPE (RIGHT)</label>
                    <input 
                        type="text" 
                        name="patternRight"
                        // REMOVED: read-only-in-edit, disabled
                        className={`detail-value-edit ${errors.patternRight ? 'error' : ''}`} 
                        value={editData.patternRight || ''} 
                        onChange={handlePatternChange}
                        maxLength={5}
                        placeholder="A W / \ X U ?"
                    />
                </div>
                <div className="detail-item">
                    <label className="detail-label">PATTERN TYPE (LEFT)</label>
                    <input 
                        type="text" 
                        name="patternLeft"
                        // REMOVED: read-only-in-edit, disabled
                        className={`detail-value-edit ${errors.patternLeft ? 'error' : ''}`} 
                        value={editData.patternLeft || ''} 
                        onChange={handlePatternChange}
                        maxLength={5}
                        placeholder="A W / \ X U ?"
                    />
                </div>
                {(errors.patternRight || errors.patternLeft) && (
                     <div className="shared-row-error">
                        <span className="field-error-text">
                            {errors.patternRight || errors.patternLeft}
                        </span>
                     </div>
                )}
            </div>

            <h4 className="sub-section-title">ADDRESS</h4>
            <div className="details-grid address-grid">
                <div className="detail-item">
                    <label className="detail-label">STREET NUMBER:</label>
                    <input type="text" name="streetNumber" value={editData.streetNumber || ''} onChange={handleChange} className="detail-value-edit" />
                </div>
                <div className="detail-item">
                    <label className="detail-label">STREET DIR</label>
                    <input 
                        list="dir-options"
                        type="text" 
                        name="streetDir" 
                        className={`detail-value-edit ${errors.streetDir ? 'error' : ''}`} 
                        value={editData.streetDir || ''} 
                        onChange={(e) => handleChange({ target: { name: 'streetDir', value: e.target.value.toUpperCase() }})} 
                        maxLength={2} 
                    />
                    <datalist id="dir-options">
                        {dirList.map(code => <option key={code} value={code} />)}
                    </datalist>
                    {errors.streetDir && <span className="field-error-text">{errors.streetDir}</span>}
                </div>
                <div className="detail-item">
                    <label className="detail-label">STREET NAME:</label>
                    <input type="text" name="streetName" value={editData.streetName || ''} onChange={handleChange} className="detail-value-edit" />
                </div>
                <div className="detail-item">
                    <label className="detail-label">SUF</label>
                    <input 
                        list="suf-options"
                        type="text" 
                        name="streetSuf" 
                        className={`detail-value-edit ${errors.streetSuf ? 'error' : ''}`} 
                        value={editData.streetSuf || ''} 
                        onChange={(e) => handleChange({ target: { name: 'streetSuf', value: e.target.value.toUpperCase() }})} 
                        maxLength={4} 
                    />
                    <datalist id="suf-options">
                        {sufList.map(code => <option key={code} value={code} />)}
                    </datalist>
                    {errors.streetSuf && <span className="field-error-text">{errors.streetSuf}</span>}
                </div>
            </div>

            <div className="details-grid city-state-zip-grid">
                <div className="detail-item">
                    <label className="detail-label">CITY:</label>
                    <input type="text" name="city" value={editData.city || ''} onChange={handleChange} className="detail-value-edit" />
                </div>
                <div className="detail-item">
                    <label className="detail-label">STATE</label>
                    <input 
                        list="state-options"
                        type="text" 
                        name="state" 
                        className={`detail-value-edit ${errors.state ? 'error' : ''}`} 
                        value={editData.state || ''} 
                        onChange={(e) => handleChange({ target: { name: 'state', value: e.target.value.toUpperCase() }})} 
                        maxLength={2} 
                    />
                    <datalist id="state-options">
                        {stateList.map(code => <option key={code} value={code}>{addressStates[code]}</option>)}
                    </datalist>
                    {errors.state && <span className="field-error-text">{errors.state}</span>}
                </div>
                <div className="detail-item">
                    <label className="detail-label">ZIP:</label>
                    <input type="text" name="zip" value={editData.zip || ''} onChange={handleChange} className="detail-value-edit" />
                </div>
                <div className="detail-item">
                    <label className="detail-label">COUNTRY OF CITIZENSHIP:</label>
                    {/* FIXED: Added flexWrap: 'wrap' for mobile responsiveness */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <input 
                            type="text" 
                            name="citizenship" 
                            value={editData.citizenship || ''} 
                            onChange={handleChange} 
                            className="detail-value-edit" 
                            style={{ width: '60px', textAlign: 'center' }} 
                            maxLength={2}
                        />
                        <span className="read-only-in-edit" style={{ whiteSpace: 'nowrap' }}>
                            {getCountryName(editData.citizenship)}
                        </span>
                    </div>
                    {errors.countryCode && <span className="field-error-text">{errors.countryCode}</span>}
                </div>
            </div>

            <h4 className="sub-section-title">COMMENT</h4>
            <div className="detail-item full-width">
                <textarea 
                    name="comment" 
                    value={editData.comment || ''} 
                    onChange={handleChange} 
                    className="detail-value-edit comment-textarea"
                    rows="3"
                />
            </div>
        </div>
    );
};

export default PersonalIdEditSection;