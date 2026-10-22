import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { logAuditEvent } from '../services/auditService';
import { EditSection } from './edit/EditSection';
import NameEditSection from './edit/NameEditSection';
import PersonalIdEditSection from './edit/PersonalIdEditSection';
import AliasEditSection from './edit/AliasEditSection';
import CautionEditSection from './edit/CautionEditSection';
import DobEditSection from './edit/DobEditSection';
import ScarMarkEditSection from './edit/ScarMarkEditSection';
import SocSecEditSection from './edit/SocSecEditSection';
import MiscNumEditSection from './edit/MiscNumEditSection';
import ReferenceEditSection from './edit/ReferenceEditSection';
import Pagination from './ui/Pagination';
import ConfirmationModal from './ui/ConfirmationModal';
import Notification from './ui/Notification';
import * as api from '../services/api';
import { validateAll, validateField, validateListItem, autoFormatDate, autoFormatSsn } from '../hooks/useValidation';
import { useReferenceData } from '../context/ReferenceDataContext';
import './DetailsView.css';
import ConsolidationModal from './ui/ConsolidationModal';
import { consolidateRecords } from '../services/api';
import dpscsLogo from '../assets/maryland_seal.png';
import { CRIMINAL_REF_TYPES } from '../utils/validationConstants';


const getReferencePriority = (docType) => {
    if (!docType) return 1;
    const type = docType.toUpperCase();
    const nonReportable = ['MAF', 'CIT'];
    const nonCriminal = ['ADO', 'AFB', 'AGE', 'AIN', 'APF', 'APL', 'APP', 'APR', 'APS', 'ATT', 'CCD', 'CCF', 'CJF', 'CJS', 'DCA', 'DCB', 'DCC', 'DCD', 'DCE', 'DCF', 'DCG', 'DCH', 'DCI', 'DCM', 'DCO', 'DCQ', 'DCR', 'DCS', 'DCW', 'DCX', 'DCY', 'DCZ', 'DEK', 'DEU', 'DJS', 'EMP', 'FAD', 'FFR', 'GPN', 'GPR', 'GPT', 'GPU', 'GVL', 'GVS', 'HAZ', 'IDV', 'LQF', 'LQM', 'MGN', 'MPR', 'PDL', 'PDT', 'PMD', 'PSC', 'RCS', 'REV', 'SPA', 'SPC', 'SPN', 'SPR', 'VIS'];
    const consolidated = ['XRF', 'CNS'];

    if (nonReportable.includes(type)) return 2;
    if (nonCriminal.includes(type)) return 3;
    if (consolidated.includes(type)) return 4;
    return 1;
};

const DetailItem = ({ label, value, className = '', valueClassName = '' }) => (
    <div className={`detail-item ${className}`}>
        <span className="detail-label">{label}:</span>
        <span className={`detail-value ${valueClassName}`}>{value || '--'}</span>
    </div>
);

const DetailsView = ({ data, backToSearch, isModal = false, onRecordUpdate }) => {
    const { user } = useAuth();
    const { countries, cautionCodes, smtCodes, miscPrefixes, referenceTypes, addressStates, pobCodes } = useReferenceData();

    const [recordData, setRecordData] = useState(data);
    const [editingSection, setEditingSection] = useState(null);
    const [editData, setEditData] = useState(null);
    const [originalEditData, setOriginalEditData] = useState(null);
    const [errors, setErrors] = useState({});
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [confirmation, setConfirmation] = useState({ message: '', onConfirm: null });

    // Expungement State
    const [referenceToDelete, setReferenceToDelete] = useState(null);
    const [pendingExpungements, setPendingExpungements] = useState([]);

    const recordsPerPage = 10;
    const [aliasPage, setAliasPage] = useState(1);
    const [cautionPage, setCautionPage] = useState(1);
    const [dobPage, setDobPage] = useState(1);
    const [scarMarkPage, setScarMarkPage] = useState(1);
    const [socSecPage, setSocSecPage] = useState(1);
    const [miscNumPage, setMiscNumPage] = useState(1);
    const [referencePage, setReferencePage] = useState(1);
    const [referencePageSize, setReferencePageSize] = useState(10);
    const [showConsolidateModal, setShowConsolidateModal] = useState(false);

    const canEdit = user?.roles?.includes('ROLE_CCH IDENT EDIT USERS') || user?.roles?.includes('ROLE_ADMIN');

    const isExpungementUser = user?.roles?.includes('ROLE_CCH EXPUNGEMENT UNIT');
    const isDataIntegrityUser = user?.roles?.includes('ROLE_CCH DATA INTEGRITY');
    const isAdmin = user?.roles?.includes('ROLE_ADMIN');

    // Check if the user is STRICTLY an Expungement user (no Data Integrity or Admin roles)
    const isStrictlyExpungement = isExpungementUser && !isDataIntegrityUser && !isAdmin;

    // Base edit privileges for standard editors or admins
    const baseCanEdit = user?.roles?.includes('ROLE_CCH IDENT EDIT USERS') || isAdmin;

    const canViewBadges = baseCanEdit || isExpungementUser || isDataIntegrityUser;

    // 1. General sections (Name, PI, Aliases, Appended IDs) are hidden from strict Expungement users
    const canEditGeneral = baseCanEdit && !isStrictlyExpungement;

    // 2. Reference section is editable by standard edit users AND Expungement users
    const canEditReference = baseCanEdit || isExpungementUser;

    const canDelete =
        user?.roles?.includes('ROLE_CCH IDENT DELETE USERS') ||
        isAdmin ||
        isExpungementUser ||
        isDataIntegrityUser;

    const canConsolidate = isDataIntegrityUser || isAdmin;

    const primaryName = useMemo(() => recordData.namesAndAliases?.find(n => n.nameType === 'P') || {}, [recordData]);
    const currentAddr = useMemo(() => recordData.addressHistory?.find(a => a.isCurrent) || recordData.addressHistory?.[0] || {}, [recordData]);

    const aliases = useMemo(() => (recordData.namesAndAliases || [])
        .filter(n => n.nameType === 'A')
        .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)), [recordData]);

    const cautions = useMemo(() => (recordData.flags || []).filter(f => f.type === 'CAUTION'), [recordData]);
    const dobs = useMemo(() => recordData.alternateDOBs || [], [recordData]);
    const ssns = useMemo(() => recordData.ssnHistory || [], [recordData]);
    const scarsMarks = useMemo(() => recordData.scarsAndMarks || [], [recordData]);
    const miscNumbers = useMemo(() => recordData.secondaryIdentifiers || [], [recordData]);

    const references = useMemo(() => [
        ...(recordData.arrestDocuments || []),
        ...(recordData.indexDocuments || []),
        ...(recordData.generalReferences || [])
    ].sort((a, b) => {
        const pA = getReferencePriority(a.documentType);
        const pB = getReferencePriority(b.documentType);
        if (pA !== pB) return pA - pB;
        return new Date(b.documentDate) - new Date(a.documentDate);
    }), [recordData]);

    // Check for already consolidated records
    const isAlreadyConsolidated = 
        (recordData.recordType === 'T' || recordData.recordType === 'PENDING') && 
        references.some(ref => (ref.documentType || '').toUpperCase() === 'CNS');

    // Check for changes in standard edits OR pending expungements
    const hasChanges = useMemo(() => {
        if (pendingExpungements.length > 0) return true;
        if (!editData || !originalEditData) return false;
        return JSON.stringify(editData) !== JSON.stringify(originalEditData);
    }, [editData, originalEditData, pendingExpungements]);

    const paginate = (items, page, size) => items.slice((page - 1) * size, page * size);

    const currentAliases = paginate(aliases, aliasPage, recordsPerPage);
    const currentCautions = paginate(cautions, cautionPage, recordsPerPage);
    const currentDobs = paginate(dobs, dobPage, recordsPerPage);
    const currentSsns = paginate(ssns, socSecPage, recordsPerPage);
    const currentScarMarks = paginate(scarsMarks, scarMarkPage, recordsPerPage);
    const currentMiscNums = paginate(miscNumbers, miscNumPage, recordsPerPage);
    const currentReferences = paginate(references, referencePage, referencePageSize);

    const handleReferencePageSizeChange = (newSize) => {
        setReferencePageSize(newSize);
        setReferencePage(1);
    };

    const getCountryDesc = (code) => {
        if (!code) return '';
        const c = countries.find(x => x.code === code);
        return c ? c.description : code;
    };

    // --- EXPUNGEMENT HANDLERS ---
    const handleExpungementConfirm = (expungementData) => {
        setReferenceToDelete(null);

        // 1. Add to pending queue (Backend only needs this single request to do the work)
        setPendingExpungements(prev => [...prev, expungementData]);

        // 2. VISUAL UPDATE: Mark records based on Delete Type
        if (editData && editData.references) {
            const updatedRefs = editData.references.map(r => {
                const docType = (r.documentType || '').toUpperCase();

                // --- CASE A: DOWNGRADE (Bulk Highlight) ---
                // If User confirmed Downgrade, we must cross out ALL Criminal Records
                if (expungementData.deleteType === 'DOWNGRADE') {

                    // Logic: Mark it if it is Criminal AND NOT 'CNS'
                    // We EXCLUDE 'CNS' so the new record you just added stays visible/active (The Survivor)
                    if (CRIMINAL_REF_TYPES.includes(docType) && docType !== 'CNS') {
                        return {
                            ...r,
                            _isGreyedOut: true,
                            _expungementType: 'DOWNGRADE'
                        };
                    }
                    // Non-criminal (and CNS) rows remain untouched
                    return r;
                }

                // --- CASE B: Standard Single Deletion ---
                // (Cancel, Part Cancel, etc.) - Only cross out the specific item clicked
                if (r.id === expungementData.referenceId) {
                    return {
                        ...r,
                        _isGreyedOut: true,
                        _expungementType: expungementData.deleteType
                    };
                }

                return r;
            });

            setEditData({ ...editData, references: updatedRefs });
        }

        // 3. Notification
        const isDataIntegrityDowngrade = expungementData.deleteType === 'DOWNGRADE' && expungementData.requestingUnit === 'DATA_INTEGRITY';
        setNotification({
            message: isDataIntegrityDowngrade
                ? "All criminal records marked for deletion. Click 'Save' to permanently delete the records."
                : "Record marked for deletion. Click 'Save' to permanently delete the records.",
            type: 'info'
        });
    };

    const handleUndoExpungement = (item) => {
        const isDowngradeUndo = item._expungementType === 'DOWNGRADE';

        // 1. Remove from pending list
        setPendingExpungements(prev => {
            if (isDowngradeUndo) {
                // If undoing a Downgrade, remove the specific DOWNGRADE request from the queue
                return prev.filter(p => p.deleteType !== 'DOWNGRADE');
            } else {
                // Otherwise just remove the specific ID
                return prev.filter(p => p.referenceId !== item.id);
            }
        });

        // 2. Restore visual state
        if (editData && editData.references) {
            const restoredRefs = editData.references.map(r => {
                // If undoing Downgrade, restore ALL items marked as 'DOWNGRADE'
                if (isDowngradeUndo && r._expungementType === 'DOWNGRADE') {
                    const { _isGreyedOut, _expungementType, ...rest } = r;
                    return rest;
                }

                // Standard Undo for single items
                if (!isDowngradeUndo && r.id === item.id) {
                    const { _isGreyedOut, _expungementType, ...rest } = r;
                    return rest;
                }

                return r;
            });
            setEditData({ ...editData, references: restoredRefs });
        }
    };

    // --- STANDARD EDIT HANDLERS ---

    const handleEdit = (section) => {
        if (editingSection) {
            setNotification({ message: "Please save or cancel current changes first.", type: 'warning' });
            return;
        }

        logAuditEvent(`EDIT_CLICK_${section.toUpperCase()}`);
        setEditingSection(section);
        setErrors({});
        setPendingExpungements([]); // Reset expungements when starting new edit

        const clone = JSON.parse(JSON.stringify(recordData));
        let initData = null;

        if (section === 'name') {
            const last = primaryName.lastName || '';
            const first = primaryName.firstName || '';
            const middle = primaryName.middleName || '';
            const fullName = `${last}, ${first} ${middle}`.trim();
            initData = { name: fullName, ucn: clone.fbiNumber || '', sid: clone.sid, recordType: clone.recordType };
        } else if (section === 'personalIdentifiers') {
            const activeCaution = (clone.flags || []).find(f => f.type === 'CAUTION');
            initData = {
                race: clone.race, sex: clone.sex, dob: primaryName.dateOfBirth, pob: clone.placeOfBirth,
                height: clone.height, weight: clone.weight, eyes: clone.eyeColor, hair: clone.hairColor,
                skin: clone.skinTone, citizenship: clone.citizenship, comment: clone.comments,
                cautionInd: activeCaution ? activeCaution.code : '',
                patternRight: clone.patternRight, patternLeft: clone.patternLeft,
                streetNumber: currentAddr.streetNumber, streetDir: currentAddr.streetDirection,
                streetName: currentAddr.streetName, streetSuf: currentAddr.streetSuffix,
                city: currentAddr.city, state: currentAddr.state, zip: currentAddr.zip
            };
        } else if (section === 'aliases') {
            const last = primaryName.lastName || '';
            const first = primaryName.firstName || '';
            const middle = primaryName.middleName || '';
            const primaryFullName = `${last}, ${first} ${middle}`.trim();
            initData = {
                name: primaryFullName,
                aliases: (clone.namesAndAliases || []).filter(n => n.nameType === 'A').sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0)).map(a => ({
                    id: a.nameId || a.id, name: `${a.lastName}, ${a.firstName} ${a.middleName || ''}`.trim(), nameType: 'A', sequenceNumber: a.sequenceNumber
                }))
            };
        } else if (section === 'cautions') {
            initData = { appendedCautions: (clone.flags || []).filter(f => f.type === 'CAUTION').map(f => ({ id: f.id || null, cautionCode: f.code, description: f.description })) };
        } else if (section === 'dobs') {
            initData = { appendedDobs: (clone.alternateDOBs || []).map(d => ({ id: d.id || null, dob: d.dob })) };
        } else if (section === 'ssns') {
            initData = { appendedSsns: (clone.ssnHistory || []).map(s => { let val = s.ssn || ''; if (/^\d{9}$/.test(val)) { val = autoFormatSsn(val); } return { id: s.id || null, ssn: val }; }) };
        } else if (section === 'scarMarks') {
            initData = { appendedScarsMarks: (clone.scarsAndMarks || []).map(s => ({ id: s.id || null, code: s.code, description: s.description })) };
        } else if (section === 'miscNumbers') {
            initData = { appendedMiscNums: (clone.secondaryIdentifiers || []).map(m => ({ id: m.id || null, idType: m.idType, idValue: m.idValue })) };
        } else if (section === 'references') {
            initData = { references: references, recordType: clone.recordType };
        }

        setEditData(initData);
        setOriginalEditData(JSON.parse(JSON.stringify(initData)));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (name === 'referenceDate') finalValue = autoFormatDate(value);
        if (name === 'ssn') finalValue = autoFormatSsn(value);
        if (name === 'name') finalValue = value.replace(/[^a-zA-Z\s,'-]/g, '');
        if (name === 'ucn' || name === 'fbiNumber') finalValue = value.replace(/[^a-zA-Z0-9]/g, '');

        if (name === 'streetNumber' || name === 'zip') {
            finalValue = value.replace(/[^0-9]/g, '');
        }

        if (name === 'city') {
            // Allows letters, spaces, periods, apostrophes, and hyphens (e.g. "St. Louis", "O'Fallon")
            finalValue = value.replace(/[^a-zA-Z\s.'-]/g, '');
        }

        // Restrict State and Citizenship to Letters Only (Codes)
        if (name === 'state' || name === 'citizenship') {
            // Removes digits and symbols, enforcing Uppercase (e.g. "MD", "US")
            finalValue = value.replace(/[^a-zA-Z]/g, '').toUpperCase();
        }

        const newEditData = { ...editData, [name]: finalValue };
        setEditData(newEditData);

        const refData = { countryCodes: new Set(countries.map(c => c.code)) };
        const context = (editingSection === 'name') ? { isPrimaryName: true } : {};
        if (name === 'patternRight' || name === 'patternLeft') {
            // Validate BOTH fields whenever ONE changes
            const rightError = validateField('patternRight', newEditData.patternRight, newEditData, refData, context);
            const leftError = validateField('patternLeft', newEditData.patternLeft, newEditData, refData, context);

            setErrors(prev => ({
                ...prev,
                patternRight: rightError,
                patternLeft: leftError
            }));
        } else {
            // Standard behavior for single independent fields
            const error = validateField(name, finalValue, newEditData, refData, context);
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    };

    const handleListItemChange = (listName, index, field, value) => {
        let finalValue = value;
        if (listName === 'aliases' && field === 'name') finalValue = value.replace(/[^a-zA-Z0-9\s,'-]/g, '');
        if (listName === 'appendedDobs' && field === 'dob') finalValue = autoFormatDate(value);

        const updatedList = [...editData[listName]];
        updatedList[index] = { ...updatedList[index], [field]: finalValue };

        if (listName === 'references') {
            const docType = (updatedList[index].documentType || '').toUpperCase();

            if (docType === 'CNS') {
                const docNum = (updatedList[index].documentNumber || '').toUpperCase();
                updatedList[index].description = `THIS SID HAS BEEN CONSOLIDATED WITH SID ${docNum}`;
            } else if (docType === 'XRF') {
                const docNum = (updatedList[index].documentNumber || '').toUpperCase();
                updatedList[index].description = `${docNum} HAS BEEN CONSOLIDATED WITH THIS SID`;
            } else if (field === 'documentType' && ['CNS', 'XRF'].includes((editData[listName][index].documentType || '').toUpperCase())) {
                // If the user changes the type AWAY from CNS or XRF, clear the auto-generated description
                updatedList[index].description = '';
            }
        }

        if (updatedList[index]._isMarkedForDeletion) delete updatedList[index]._isMarkedForDeletion;

        const newEditData = { ...editData, [listName]: updatedList, recordType: recordData.recordType };
        setEditData(newEditData);

        setErrors(prev => {
            const newErrors = { ...prev };
            const refData = { referenceTypes: new Set(referenceTypes || []), miscPrefixes: new Set(miscPrefixes || []) };
            const error = validateListItem(field, finalValue, index, updatedList, newEditData, refData);
            newErrors[`${listName}[${index}].${field}`] = error;

            if (listName === 'appendedMiscNums') {
                delete newErrors[`${listName}[${index}].rowError`];
                const otherField = field === 'idType' ? 'idValue' : 'idType';
                const otherValue = updatedList[index][otherField];
                const otherError = validateListItem(otherField, otherValue, index, updatedList, newEditData, refData);
                newErrors[`${listName}[${index}].${otherField}`] = otherError;
                if (error && (error === "Duplicate value detected." || error === "Both prefix and number are required.")) {
                    newErrors[`${listName}[${index}].rowError`] = error;
                    newErrors[`${listName}[${index}].${field}`] = null;
                }
            }
            if (listName === 'references') {
                delete newErrors[`references[${index}].rowError`];
                if (error === "This is a duplicate of another reference record.") {
                    newErrors[`references[${index}].rowError`] = error;
                    newErrors[`${listName}[${index}].${field}`] = null;
                } else {
                    const dateVal = updatedList[index].documentDate;
                    const dateErr = validateListItem('documentDate', dateVal, index, updatedList, newEditData, refData);
                    if (dateErr === "This is a duplicate of another reference record.") {
                        newErrors[`references[${index}].rowError`] = dateErr;
                    } else if (!newErrors[`references[${index}].rowError`]) {
                        newErrors[`references[${index}].documentDate`] = dateErr;
                    }
                }
            }
            return newErrors;
        });
    };

    const handleSave = () => {
        if (!hasChanges) return;

        // Skip validation if only expunging
        const onlyExpunging = pendingExpungements.length > 0 &&
            JSON.stringify(editData) === JSON.stringify(originalEditData);

        if (!onlyExpunging) {
            let fieldsToValidate = [];
            let context = {};

            if (editingSection === 'name') {
                fieldsToValidate = ['name', 'ucn'];
                context = { isPrimaryName: true };
            } else if (editingSection === 'personalIdentifiers') {
                fieldsToValidate = ['race', 'sex', 'dob', 'pob', 'height', 'weight', 'eyes', 'hair', 'skin', 'streetDir', 'streetSuf', 'countryCode', 'patternRight', 'patternLeft'];
            } else if (editingSection === 'aliases') fieldsToValidate = ['aliases'];
            else if (editingSection === 'cautions') fieldsToValidate = ['appendedCautions'];
            else if (editingSection === 'dobs') fieldsToValidate = ['appendedDobs'];
            else if (editingSection === 'ssns') fieldsToValidate = ['appendedSsns'];
            else if (editingSection === 'scarMarks') fieldsToValidate = ['appendedScarsMarks'];
            else if (editingSection === 'miscNumbers') fieldsToValidate = ['appendedMiscNums'];
            else if (editingSection === 'references') fieldsToValidate = ['references'];

            const referenceData = {
                countryCodes: new Set(countries.map(c => c.code)),
                smtCodes: new Set(Object.keys(smtCodes || {})),
                miscPrefixes: new Set(miscPrefixes || []),
                referenceTypes: new Set(referenceTypes || []),
                addressStates: new Set(Object.keys(addressStates || {})),
                pobCodes: new Set(Object.keys(pobCodes || {}))
            };
            const validationErrors = validateAll(editData, fieldsToValidate, referenceData, context);

            if (Object.keys(validationErrors).length > 0) {
                setErrors(validationErrors);
                setNotification({ message: "Please fix validation errors before saving.", type: 'error' });
                return;
            }
        }

        if (editingSection === 'name') {
            const currentFbi = recordData.fbiNumber ? recordData.fbiNumber.trim() : '';
            const newFbi = editData.ucn ? editData.ucn.trim() : '';

            if (currentFbi && !newFbi) {
                setConfirmation({
                    message: "WARNING: You are about to remove the FBI Number. This will disconnect the record from the FBI Index. Are you sure you want to proceed?",
                    onConfirm: executeSave,
                    onCancel: () => {
                        setEditData(prev => ({ ...prev, ucn: currentFbi }));
                    }
                });
                return; // Stop here and wait for user confirmation
            }
        }

        // Custom message for Cancel Entire (FRD 4.8)
        const isCancelEntire = pendingExpungements.some(p => p.deleteType === 'CANCEL_ENTIRE');
        const confirmMsg = isCancelEntire
            ? `This will permanently delete SID ${recordData.sid}. Are you sure?`
            : "Do you want to save changes?";

        setConfirmation({
            message: confirmMsg,
            onConfirm: executeSave
        });
    };

    const executeSave = async () => {
        setConfirmation({ message: '', onConfirm: null });
        logAuditEvent(`SAVE_CLICK_${editingSection.toUpperCase()}`, { data: editData });

        try {
            const sid = recordData.systemId || recordData.sid;
            let downgradeResponse = null;

            // --- 1. Process Expungements First ---
            if (editingSection === 'references' && pendingExpungements.length > 0) {
                // Check for Cancel Entire (FRD 4.11)
                const cancelEntireReq = pendingExpungements.find(p => p.deleteType === 'CANCEL_ENTIRE');

                if (cancelEntireReq) {
                    // 1. Capture the response from the API
                    const response = await api.processExpungement({
                        systemId: sid,
                        ...cancelEntireReq
                    });

                    // 2. Determine Notification Type (Warning vs Success)
                    // If status is WARNING, we append the detail message (e.g., "REC IS FBI OWNED...")
                    const notificationData = {
                        message: response.status === 'WARNING'
                            ? `SID ${recordData.sid} has been deleted successfully. ${response.detail}.`
                            : `SID ${recordData.sid} has been deleted successfully.`,
                        type: response.status === 'WARNING' ? 'warning' : 'success'
                    };

                    // 3. Show local notification (while view is still open)
                    setNotification(notificationData);

                    // 4. Store in Session Storage for SearchPage to pick up after redirect
                    sessionStorage.setItem('expungementNotification', JSON.stringify(notificationData));

                    setTimeout(() => {
                        backToSearch();
                    }, 2000);
                    return; // Stop further processing
                }

                // Process standard expungements (Downgrade/Part Cancel)
                for (const expungeReq of pendingExpungements) {
                    const res = await api.processExpungement({
                        systemId: sid,
                        documentId: expungeReq.referenceId,
                        ...expungeReq
                    });

                    if (expungeReq.deleteType === 'DOWNGRADE') {
                        downgradeResponse = res;
                    }
                }
            }

            // --- 2. Process Standard Updates ---
            if (editingSection === 'name') {
                const nameStr = editData.name || '';
                const parts = nameStr.split(',');
                const lastName = parts[0] ? parts[0].trim() : '';
                let firstName = '';
                let middleName = '';
                if (parts.length > 1) {
                    const rest = parts[1].trim().split(/\s+/);
                    firstName = rest[0] || '';
                    middleName = rest.slice(1).join(' ') || '';
                }
                await api.updateTrueName(sid, { lastName, firstName, middleName, ucn: editData.ucn, nameType: 'P' });
            }
            else if (editingSection === 'personalIdentifiers') {
                await api.updateDemographics(sid, {
                    race: editData.race, sex: editData.sex, dob: editData.dob, height: editData.height, weight: editData.weight, citizenship: editData.citizenship,
                    placeOfBirth: editData.pob, eyeColor: editData.eyes, hairColor: editData.hair, skinTone: editData.skin, comments: editData.comment, cautionFlag: editData.cautionInd, patternRight: editData.patternRight,
                    patternLeft: editData.patternLeft, streetNumber: editData.streetNumber, streetName: editData.streetName, city: editData.city, state: editData.state, zip: editData.zip,
                    streetDirection: editData.streetDir, streetSuffix: editData.streetSuf
                });
            }
            else if (editingSection === 'aliases') {
                const aliasPayload = editData.aliases.map(a => {
                    if (a._isMarkedForDeletion) return { id: a.id, isMarkedForDeletion: true };
                    const parts = (a.name || '').split(',');
                    return {
                        id: a.id, lastName: parts[0]?.trim(), firstName: parts[1]?.trim().split(/\s+/)[0], middleName: parts[1]?.trim().split(/\s+/).slice(1).join(' '), nameType: 'A'
                    };
                });
                await api.updateAliases(sid, aliasPayload);
            }
            else if (['cautions', 'dobs', 'ssns', 'scarMarks', 'miscNumbers'].includes(editingSection)) {
                const payload = {};
                if (editingSection === 'cautions') payload.cautions = editData.appendedCautions.filter(x => !x._isMarkedForDeletion).map(x => x.cautionCode);
                else if (editingSection === 'dobs') payload.dobs = editData.appendedDobs.filter(x => !x._isMarkedForDeletion).map(x => x.dob);
                else if (editingSection === 'ssns') payload.ssns = editData.appendedSsns.filter(x => !x._isMarkedForDeletion).map(x => x.ssn);
                else if (editingSection === 'scarMarks') payload.scarsMarks = editData.appendedScarsMarks.filter(x => !x._isMarkedForDeletion).map(x => ({ code: x.code, description: smtCodes[x.code] || x.description || '' }));
                else if (editingSection === 'miscNumbers') payload.miscNumbers = editData.appendedMiscNums.filter(x => !x._isMarkedForDeletion).map(x => ({ idType: x.idType, idValue: x.idValue }));

                await api.updateAppendedIds(sid, payload);
            }
            else if (editingSection === 'references') {
                // Check if a DOWNGRADE operation is queued
                const isDowngrade = pendingExpungements.some(p => p.deleteType === 'DOWNGRADE');

                // 1. Always filter out the specifically clicked items
                const expungedIds = pendingExpungements.map(p => p.referenceId);
                let activeRefs = editData.references.filter(r => !expungedIds.includes(r.id));

                // 2. CRITICAL FIX: If Downgrade, filter out ALL remaining criminal records
                // because the backend will auto-delete them. We must not try to update them.
                if (isDowngrade) {
                    activeRefs = activeRefs.filter(r => {
                        const type = (r.documentType || '').toUpperCase();
                        // Logic: Keep record ONLY if it is NOT criminal, OR if it is 'CNS' (which survives downgrade)
                        return !CRIMINAL_REF_TYPES.includes(type) || type === 'CNS';
                    });
                }

                if (activeRefs.length > 0) {
                    await api.updateReferences(sid, activeRefs);
                }
            }

            // 1. Fetch the fresh full record
            const updated = await api.getIdentDetail(sid);
            // 2. Update Local State
            setRecordData(updated);
            // 3. NOTIFY PARENT (Search Table) OF UPDATE
            if (onRecordUpdate) {
                onRecordUpdate(updated);
            }
            setPendingExpungements([]);
            let finalMessage = 'Record Updated Successfully';
            let finalType = 'success';

            // If a Downgrade was processed, check its API response payload
            if (downgradeResponse) {
                if (downgradeResponse.status === 'WARNING') {
                    // backend detail matches: "REC IS FBI OWNED - DRS MSG NOT SENT"
                    finalMessage = `Record(s) Downgraded Successfully. ${downgradeResponse.detail}.`;
                    finalType = 'warning';
                } else {
                    finalMessage = 'Record(s) Downgraded Successfully.';
                    finalType = 'success';
                }
            }

            setNotification({ message: finalMessage, type: finalType });
            executeCancel(false);
        } catch (error) {
            console.error("Save failed", error);
            setNotification({
                message: error.response?.data?.message || "An unexpected error occurred. Please try again.",
                type: 'error'
            });
        }
    };

    const executeCancel = (isTrueCancel = false) => {
        if (editingSection && isTrueCancel) logAuditEvent(`CANCEL_EDIT_${editingSection.toUpperCase()}`);
        setEditingSection(null);
        setEditData(null);
        setOriginalEditData(null);
        setErrors({});
        setPendingExpungements([]);
        setConfirmation({ message: '', onConfirm: null });
    };

    const handleCancel = () => {
        if (hasChanges) {
            setConfirmation({
                message: "You have unsaved changes. Are you sure you want to cancel?",
                onConfirm: () => executeCancel(true)
            });
        } else {
            executeCancel(true);
        }
    };

    const handleBack = () => {
        if (hasChanges) {
            setConfirmation({
                message: "You have unsaved changes. Are you sure you want to leave?",
                onConfirm: () => {
                    setConfirmation({ message: '', onConfirm: null });
                    backToSearch();
                }
            });
        } else {
            backToSearch();
        }
    };

    if (!recordData) return null;

    const isRapbackSubscribed = recordData?.rapbackSubscriptionIndicator === 'R' ||
        recordData?.rapbackSubscriptionIndicator === 'Y';

    const isFbiOwned = recordData?.fbiOwned === true;

    const rapbackBadge = isRapbackSubscribed ? (
        <span className="rapback-badge">
            Rapback Subscribed
        </span>
    ) : null;

    const fbiOwnedBadge = isFbiOwned ? (
    <span className="fbi-owned-badge">
        FBI Owned
    </span>
    ) : null;

    const nameBadges = canViewBadges && (isRapbackSubscribed || isFbiOwned) ? (
    <div className="title-badges">
        {rapbackBadge}
        {fbiOwnedBadge}
    </div>
    ) : null;

    const handleConsolidateClick = () => {
        if (editingSection) {
            setNotification({ message: "Please save or cancel current changes first.", type: 'warning' });
            return;
        }
        
        // Intercept the click and show the Caution Message first using the existing ConfirmationModal
        setConfirmation({
            message: "You are about to consolidate this record. Ensure that you save a copy of the record before proceeding. Do you want to continue?",
            onConfirm: () => {
                // If they click 'Yes', we open the actual Consolidation Modal
                setShowConsolidateModal(true);
            }
            // If they click 'No', the ConfirmationModal's built-in cancel handler will just close the popup.
        });
    };

    const processConsolidation = async (targetSid) => {
        setShowConsolidateModal(false);
        try {
            const sid = recordData.systemId || recordData.sid;
            const res = await consolidateRecords(recordData.sid, targetSid);

            // Show Success Notification from API
            setNotification({ message: res.message, type: 'success' });

            // Reload the local Source SID to show the "Pending" status and cleared fields
            const updated = await api.getIdentDetail(sid);
            setRecordData(updated);

            if (onRecordUpdate) {
                onRecordUpdate(updated);
            }
        } catch (error) {
            console.error("Consolidation failed", error);
            setNotification({
                message: error.response?.data?.message || "Consolidation failed. An unexpected error occurred.",
                type: 'error'
            });
        }
    };

    return (
        <div className={`details-view-container ${isModal ? 'modal-view' : ''}`}>
            {notification.message && <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />}

            {confirmation.message && (
                <ConfirmationModal
                    message={confirmation.message}
                    onConfirm={() => {
                        if (confirmation.onConfirm) confirmation.onConfirm();
                        setConfirmation({ message: '', onConfirm: null, onCancel: null });
                    }}
                    onCancel={() => {
                        if (confirmation.onCancel) confirmation.onCancel();
                        setConfirmation({ message: '', onConfirm: null, onCancel: null });
                    }}
                />
            )}

            {showConsolidateModal && (
                <ConsolidationModal
                    onConfirm={processConsolidation}
                    onCancel={() => setShowConsolidateModal(false)}
                />
            )}

            <div className="details-header">
                <div className="details-title-container">
                    <img src={dpscsLogo} alt="Seal" className="details-title-logo" />
                    <h2>MD CJIS CENTRAL REPOSITORY IDENTIFICATION INDEX DETAILS</h2>
                </div>
                <div className="details-header-actions">
                    {/* Add Consolidation Button for authorized users (Data Integrity, Admins, etc.) */}
                    {canConsolidate && (
                         <button 
                            className="btn-consolidate-trigger" 
                            onClick={handleConsolidateClick}
                            disabled={isAlreadyConsolidated}
                            title={isAlreadyConsolidated ? "This record has already been consolidated." : "Consolidate Record"}
                        >
                            <i className="fas fa-random consolidate-icon"></i>
                            Consolidation
                        </button>
                    )}
                    {!isModal && (
                        <button className="back-button" onClick={handleBack}>
                            Back to Search
                        </button>
                    )}
                    {isModal && (
                        <button className="modal-close-button" onClick={handleBack} title="Close" aria-label="Close">
                            &times;
                        </button>
                    )}
                </div>
            </div>

            <div className="details-scroll-area">
                {/* NAME */}
                <EditSection title="NAME" titleAddon={nameBadges} isEditing={editingSection === 'name'} onEdit={() => handleEdit('name')} onSave={handleSave} onCancel={handleCancel} canEdit={canEditGeneral} isDisabled={!!editingSection && editingSection !== 'name'} hasChanges={hasChanges}>
                    {editingSection === 'name' ? (
                        <NameEditSection editData={editData} handleChange={handleChange} errors={errors} isRapbackSubscribed={isRapbackSubscribed} />
                    ) : (
                        <div className="details-grid top-section-grid ident-layout">
                            <div className="detail-item-name">
                                <DetailItem label="NAME" value={`${primaryName.lastName}, ${primaryName.firstName} ${primaryName.middleName || ''}`} valueClassName="primary-name-value" />
                            </div>
                            <DetailItem label="FBI / UCN" value={recordData.fbiNumber} />
                            <DetailItem label="SID" value={recordData.sid} />
                            <div className="detail-item-record-type">
                                <DetailItem label="RECORD TYPE" value={recordData.recordType} />
                            </div>
                        </div>
                    )}
                </EditSection>

                {/* PERSONAL IDENTIFIERS */}
                <EditSection title="PERSONAL IDENTIFIERS" isEditing={editingSection === 'personalIdentifiers'} onEdit={() => handleEdit('personalIdentifiers')} onSave={handleSave} onCancel={handleCancel} canEdit={canEditGeneral} isDisabled={!!editingSection && editingSection !== 'personalIdentifiers'} hasChanges={hasChanges}>
                    {editingSection === 'personalIdentifiers' ? (
                        <PersonalIdEditSection editData={editData} handleChange={handleChange} errors={errors} cautionCodes={cautionCodes} />
                    ) : (
                        <div>
                            <div className="details-grid personal-identifiers-grid">
                                <DetailItem label="RACE" value={recordData.race} /> <DetailItem label="SEX" value={recordData.sex} />
                                <DetailItem label="DOB" value={primaryName.dateOfBirth} /> <DetailItem label="POB" value={recordData.placeOfBirth} />
                                <DetailItem label="HGT" value={recordData.height} /> <DetailItem label="WGT" value={recordData.weight} />
                                <DetailItem label="EYES" value={recordData.eyeColor} /> <DetailItem label="HAIR" value={recordData.hairColor} />
                                <DetailItem label="SKIN" value={recordData.skinTone} />
                                <div className="span-two-columns"><DetailItem label="CAUTION" value={recordData.cautionFlag || ''} /></div>
                            </div>
                            <h4 className="sub-section-title">FINGERPRINT CLASSIFICATIONS</h4>
                            <div className="details-grid fingerprint-grid">
                                {/* LOGIC: Check if either pattern exists. If so, show fields. If not, show NO FP CARD. */}
                                {(recordData.patternRight || recordData.patternLeft) ? (
                                    <>
                                        <DetailItem label="PATTERN TYPE (RIGHT)" value={recordData.patternRight} />
                                        <DetailItem label="PATTERN TYPE (LEFT)" value={recordData.patternLeft} />
                                    </>
                                ) : (
                                    <div className="span-two-columns">
                                        <div className="detail-item">
                                            <span className="detail-value">
                                                NO FP CARD
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <h4 className="sub-section-title">ADDRESS</h4>
                            <div className="details-grid address-grid">
                                <DetailItem label="STREET NUMBER" value={currentAddr.streetNumber} /> <DetailItem label="STREET DIR" value={currentAddr.streetDirection} />
                                <DetailItem label="STREET NAME" value={currentAddr.streetName} /> <DetailItem label="SUF" value={currentAddr.streetSuffix} />
                            </div>
                            <div className="details-grid city-state-zip-grid">
                                <DetailItem label="CITY" value={currentAddr.city} /> <DetailItem label="STATE" value={currentAddr.state} />
                                <DetailItem label="ZIP" value={currentAddr.zip} /> <DetailItem label="COUNTRY OF CITIZENSHIP" value={getCountryDesc(recordData.citizenship)} />
                            </div>
                            <h4 className="sub-section-title">COMMENT</h4>
                            <textarea className="comment-textarea" value={recordData.comments || ''} readOnly rows="3" />
                        </div>
                    )}
                </EditSection>

                {/* ALIASES */}
                <EditSection title="ALIAS-NAME" isEditing={editingSection === 'aliases'} onEdit={() => handleEdit('aliases')} onSave={handleSave} onCancel={handleCancel} canEdit={canEditGeneral} isDisabled={!!editingSection && editingSection !== 'aliases'} hasChanges={hasChanges}>
                    {editingSection === 'aliases' ? (
                        <AliasEditSection editData={editData.aliases} handleListItemChange={handleListItemChange} setEditData={(newAliases) => setEditData({ ...editData, aliases: newAliases })} canDelete={canEdit} errors={errors} onConfirmDelete={(msg, cb) => setConfirmation({ message: msg, onConfirm: cb })} />
                    ) : (
                        <>
                            <div className="details-list">{currentAliases.length > 0 ? currentAliases.map((a, i) => <span key={i}>{a.lastName}, {a.firstName} {a.middleName}</span>) : <div className="no-data">No Aliases</div>}</div>
                            {aliases.length > recordsPerPage && <Pagination currentPage={aliasPage} totalPages={Math.ceil(aliases.length / recordsPerPage)} onPageChange={setAliasPage} />}
                        </>
                    )}
                </EditSection>

                {/* APPENDED-ID */}
                <div className="edit-section-wrapper">
                    <div className="section-header"><h3 className="section-title">APPENDED-ID</h3></div>
                    <div className="appended-id-grid-container">
                        <EditSection title="Caution" isEditing={editingSection === 'cautions'} onEdit={() => handleEdit('cautions')} onSave={handleSave} onCancel={handleCancel} canEdit={canEditGeneral} isDisabled={!!editingSection && editingSection !== 'cautions'} hasChanges={hasChanges}>
                            {editingSection === 'cautions' ? (
                                <CautionEditSection editData={editData.appendedCautions} handleListItemChange={handleListItemChange} setEditData={(newData) => setEditData({ ...editData, appendedCautions: newData })} canDelete={canDelete} errors={errors} onConfirmDelete={(msg, cb) => setConfirmation({ message: msg, onConfirm: cb })} />
                            ) : (
                                <>
                                    <div className="details-list">{currentCautions.length > 0 ? currentCautions.map((c, i) => <span key={i}>{`${c.code} - ${c.description}`}</span>) : <div className="no-data">No Cautions</div>}</div>
                                    {cautions.length > recordsPerPage && <Pagination currentPage={cautionPage} totalPages={Math.ceil(cautions.length / recordsPerPage)} onPageChange={setCautionPage} />}
                                </>
                            )}
                        </EditSection>

                        <EditSection title="Dob" isEditing={editingSection === 'dobs'} onEdit={() => handleEdit('dobs')} onSave={handleSave} onCancel={handleCancel} canEdit={canEditGeneral} isDisabled={!!editingSection && editingSection !== 'dobs'} hasChanges={hasChanges}>
                            {editingSection === 'dobs' ? (
                                <DobEditSection editData={editData.appendedDobs} handleListItemChange={handleListItemChange} setEditData={(newData) => setEditData({ ...editData, appendedDobs: newData })} canDelete={canDelete} errors={errors} onConfirmDelete={(msg, cb) => setConfirmation({ message: msg, onConfirm: cb })} />
                            ) : (
                                <>
                                    <div className="details-list">{currentDobs.length > 0 ? currentDobs.map((d, i) => <span key={i}>{d.dob}</span>) : <div className="no-data">No Records</div>}</div>
                                    {dobs.length > recordsPerPage && <Pagination currentPage={dobPage} totalPages={Math.ceil(dobs.length / recordsPerPage)} onPageChange={setDobPage} />}
                                </>
                            )}
                        </EditSection>

                        <EditSection title="Scar/Mark" isEditing={editingSection === 'scarMarks'} onEdit={() => handleEdit('scarMarks')} onSave={handleSave} onCancel={handleCancel} canEdit={canEditGeneral} isDisabled={!!editingSection && editingSection !== 'scarMarks'} hasChanges={hasChanges}>
                            {editingSection === 'scarMarks' ? (
                                <ScarMarkEditSection editData={editData.appendedScarsMarks} handleListItemChange={handleListItemChange} setEditData={(newData) => setEditData({ ...editData, appendedScarsMarks: newData })} canDelete={canDelete} errors={errors} onConfirmDelete={(msg, cb) => setConfirmation({ message: msg, onConfirm: cb })} />
                            ) : (
                                <>
                                    <div className="details-list">
                                        {currentScarMarks.length > 0 ? currentScarMarks.map((s, i) => <span key={i}>{s.code}</span>) : <div className="no-data">No Records</div>}
                                    </div>
                                    {scarsMarks.length > recordsPerPage && <Pagination currentPage={scarMarkPage} totalPages={Math.ceil(scarsMarks.length / recordsPerPage)} onPageChange={setScarMarkPage} />}
                                </>
                            )}
                        </EditSection>

                        <EditSection title="Soc-Sec" isEditing={editingSection === 'ssns'} onEdit={() => handleEdit('ssns')} onSave={handleSave} onCancel={handleCancel} canEdit={canEditGeneral} isDisabled={!!editingSection && editingSection !== 'ssns'} hasChanges={hasChanges}>
                            {editingSection === 'ssns' ? (
                                <SocSecEditSection editData={editData.appendedSsns} handleListItemChange={handleListItemChange} setEditData={(newData) => setEditData({ ...editData, appendedSsns: newData })} canDelete={canDelete} errors={errors} onConfirmDelete={(msg, cb) => setConfirmation({ message: msg, onConfirm: cb })} />
                            ) : (
                                <>
                                    <div className="details-list">{currentSsns.length > 0 ? currentSsns.map((s, i) => <span key={i}>{s.ssn}</span>) : <div className="no-data">No Records</div>}</div>
                                    {ssns.length > recordsPerPage && <Pagination currentPage={socSecPage} totalPages={Math.ceil(ssns.length / recordsPerPage)} onPageChange={setSocSecPage} />}
                                </>
                            )}
                        </EditSection>

                        <EditSection title="Misc-Number" isEditing={editingSection === 'miscNumbers'} onEdit={() => handleEdit('miscNumbers')} onSave={handleSave} onCancel={handleCancel} canEdit={canEditGeneral} isDisabled={!!editingSection && editingSection !== 'miscNumbers'} hasChanges={hasChanges}>
                            {editingSection === 'miscNumbers' ? (
                                <MiscNumEditSection editData={editData.appendedMiscNums} handleListItemChange={handleListItemChange} setEditData={(newData) => setEditData({ ...editData, appendedMiscNums: newData })} canDelete={canDelete} errors={errors} onConfirmDelete={(msg, cb) => setConfirmation({ message: msg, onConfirm: cb })} />
                            ) : (
                                <>
                                    <div className="details-list">{currentMiscNums.length > 0 ? currentMiscNums.map((m, i) => <span key={i}>{`${m.idType}${m.idValue}`}</span>) : <div className="no-data">No Records</div>}</div>
                                    {miscNumbers.length > recordsPerPage && <Pagination currentPage={miscNumPage} totalPages={Math.ceil(miscNumbers.length / recordsPerPage)} onPageChange={setMiscNumPage} />}
                                </>
                            )}
                        </EditSection>
                    </div>
                </div>

                {/* 5. REFERENCE (Modified for Expungement) */}
                <EditSection
                    title="REFERENCE"
                    isEditing={editingSection === 'references'}
                    onEdit={() => handleEdit('references')}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    canEdit={canEditReference}
                    isDisabled={!!editingSection && editingSection !== 'references'}
                    hasChanges={hasChanges}
                >
                    {editingSection === 'references' ? (
                        <ReferenceEditSection
                            editData={editData.references}
                            setEditData={(newRefList) => setEditData({ ...editData, references: newRefList })}
                            handleListItemChange={handleListItemChange}
                            errors={errors}
                            setErrors={setErrors}
                            canDelete={canDelete}
                            onConfirmDelete={(msg, cb) => setConfirmation({ message: msg, onConfirm: cb })}

                            // EXPUNGEMENT PROPS
                            onDeleteClick={(item) => {
                                setReferenceToDelete(item);
                            }}
                            pendingDeletions={pendingExpungements}
                            onUndoClick={handleUndoExpungement}
                            activeExpungementItem={referenceToDelete}

                            // INLINE MODAL PROPS
                            onExpungementClose={() => {
                                setReferenceToDelete(null);
                            }}
                            onExpungementConfirm={handleExpungementConfirm}
                            userRoles={user?.roles || []}
                            isRapbackSubscribed={isRapbackSubscribed}
                            currentFbiNumber={recordData.fbiNumber}
                            currentComments={recordData.comments}
                            currentSid={recordData.sid}
                            currentRecordType={recordData.recordType}
                        />
                    ) : (
                        <>
                            <div className="table-wrapper">
                                <table className="details-table">
                                    <thead><tr><th>DATE</th><th>TYPE</th><th>NUMBER</th><th>DESCRIPTION</th></tr></thead>
                                    <tbody>
                                        {currentReferences.map((item, idx) => (
                                            <tr key={idx}><td>{item.documentDate}</td><td>{item.documentType}</td><td>{item.documentNumber}</td><td>{item.description}</td></tr>
                                        ))}
                                        {references.length === 0 && <tr><td colSpan="4">No References found</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination currentPage={referencePage} totalPages={Math.ceil(references.length / referencePageSize)} onPageChange={setReferencePage} pageSize={referencePageSize} onPageSizeChange={handleReferencePageSizeChange} />
                        </>
                    )}
                </EditSection>
            </div>
        </div>
    );
};

export default DetailsView;