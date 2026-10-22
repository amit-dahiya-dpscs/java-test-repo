import { VALID_HAIR_CODES, VALID_EYE_CODES, VALID_SKIN_CODES, VALID_SCAR_MARK_CODES, VALID_MISC_NUM_PREFIXES, VALID_STREET_DIR_CODES, VALID_STREET_SUF_CODES, VALID_RACE_CODES, VALID_SEX_CODES } from '../utils/validationConstants';

// --- HELPER FUNCTIONS ---

export const autoFormatDate = (value) => {
    const onlyNums = value.replace(/[^0-9]/g, '');
    if (onlyNums.length <= 2) return onlyNums;
    if (onlyNums.length <= 4) return `${onlyNums.slice(0, 2)}/${onlyNums.slice(2)}`;
    return `${onlyNums.slice(0, 2)}/${onlyNums.slice(2, 4)}/${onlyNums.slice(4, 8)}`;
};

export const autoFormatSsn = (value) => {
    const onlyNums = value.replace(/[^0-9]/g, '');
    if (onlyNums.length <= 3) return onlyNums;
    if (onlyNums.length <= 5) return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3)}`;
    return `${onlyNums.slice(0, 3)}-${onlyNums.slice(3, 5)}-${onlyNums.slice(5, 9)}`;
};

export const isMiscNumRowDuplicate = (currentItem, currentIndex, allItems) => {
    // UPDATED: Use 'idType' and 'idValue'
    const type = (currentItem.idType || '').trim().toUpperCase();
    const val = (currentItem.idValue || '').trim().toUpperCase();

    if (!type || !val) return false; 

    const firstIndex = allItems.findIndex((item, index) =>
        !item._isMarkedForDeletion &&
        (item.idType || '').trim().toUpperCase() === type &&
        (item.idValue || '').trim().toUpperCase() === val
    );
    return firstIndex !== -1 && firstIndex !== currentIndex;
};

export const isReferenceRowDuplicate = (currentItem, currentIndex, allItems) => {
    const firstIndex = allItems.findIndex((item, index) =>
        !item._isMarkedForDeletion &&
        index !== currentIndex &&
        // Match DTO Field Names: documentDate, documentType, documentNumber
        item.documentDate === currentItem.documentDate &&
        (item.documentType || '').trim().toUpperCase() === (currentItem.documentType || '').trim().toUpperCase() &&
        (item.documentNumber || '').trim().toUpperCase() === (currentItem.documentNumber || '').trim().toUpperCase()
    );
    return firstIndex !== -1;
};

// --- CENTRAL VALIDATION FUNCTION ---

export const validateField = (name, value, allValues = {}, referenceData = {}, context = {}) => {
    
    const trimmedValue = value ? value.trim() : '';
    const isSearchPage = allValues.hasOwnProperty('typeOfRequest');

    switch (name) {
        case 'fullName':
        case 'name': 
            if (isSearchPage && allValues.typeOfRequest === 'SDX' && !trimmedValue) {
                return "Full Name is required for an SDX search.";
            }
            if (!trimmedValue) {
                if (isSearchPage) {
                    const { dob, race, sex, sid } = allValues;
                    const otherFieldsHaveValue = !!dob || !!race || !!sex;
                    if (!sid && otherFieldsHaveValue) { 
                        return 'Full Name or SID/FBI/SSN/DL is required when other fields are used.';
                    }
                    return null; 
                } else {
                    return "Name cannot be blank.";
                }
            }
            if (/\s\s/.test(value)) return "Cannot have multiple consecutive spaces.";
            if (!trimmedValue.includes(',')) return "Name must contain a comma (e.g., 'LastName, FirstName Middle' or 'LastName,').";
            if ((trimmedValue.match(/,/g) || []).length > 1) return "Only one comma is allowed.";
            if (trimmedValue.includes(',') && /,\S/.test(trimmedValue)) return "Comma must be followed by a space.";
            if (/ ,/.test(trimmedValue)) return "No space allowed before the comma.";

            if (context.isPrimaryName && allValues.aliases) {
                const currentNameUpper = trimmedValue.toUpperCase();
                if (allValues.aliases.some(alias => !alias._isMarkedForDeletion && alias.name && alias.name.toUpperCase() === currentNameUpper)) {
                    return 'This name is already used as an alias.';
                }
            }
            return null;

        case 'fbiNumber':
        case 'ucn':
            if (isSearchPage && allValues.typeOfRequest === 'SDX' && trimmedValue) {
                return "UCN is not allowed for SDX search.";
            }
            if (!trimmedValue) return null;
            if (!/^[A-Z0-9]+$/i.test(trimmedValue)) return "UCN must be alphanumeric only.";
            return null;

        case 'dlNumber':
            if (!trimmedValue) return null;
            const cleanDL = trimmedValue.replace(/\s/g, '');
            const validAlphaStart = /^[A-Z][0-9]*$/.test(cleanDL);
            const validHyphenStart = /^-[0-9]*$/.test(cleanDL);
            if (!validAlphaStart && !validHyphenStart) {
                return "DL must start with a letter or hyphen, followed by numbers only.";
            }
            return null;

        case 'dob':
        case 'documentDate':
            if (!trimmedValue) {
                if (isSearchPage) return null;
                if (name === 'dob') return "Date of Birth cannot be blank.";
                if (name === 'referenceDate') return "Date cannot be blank.";
            }
            if (!trimmedValue) {
                if (isSearchPage) return null;
                if (name === 'dob') return "Date of Birth cannot be blank.";
                return "Date cannot be blank.";
            }
            const isSdx = isSearchPage && allValues.typeOfRequest === 'SDX';
            if (name === 'dob' && isSdx && /^\d{4}$/.test(trimmedValue)) {
                const year = parseInt(trimmedValue, 10);
                const currentYear = new Date().getFullYear();
                if (year > currentYear) return "Invalid Year";
                return null;
            }
            const fullDateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
            
            if (!fullDateRegex.test(trimmedValue)) {
                return (name === 'dob' && isSdx) ? "Date must be in MM/DD/YYYY or YYYY format" : "Date must be in MM/DD/YYYY format.";
            }
            const [mm, dd, yyyy] = trimmedValue.split('/').map(Number);
            const dateObj = new Date(yyyy, mm - 1, dd);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (dateObj.getFullYear() !== yyyy || dateObj.getMonth() + 1 !== mm || dateObj.getDate() !== dd) return "Invalid Date";
            if (name === 'dob') {
                if (dateObj >= today) return "Date cannot be today or a future date.";
            } else {
                if (dateObj > today) return "Date cannot be a future date.";
            }
            if (!isSearchPage && yyyy < 1900) {
                return "Year is less than 1900";
            }
            return null;

        case 'socSec':
        case 'ssn':
            if (!trimmedValue) {
                if (!allValues.hasOwnProperty('typeOfRequest')) return "SSN cannot be blank.";
                return null;
            }
            // Normalize: Remove non-digits for length check
            const rawSsn = trimmedValue.replace(/[^0-9]/g, '');
            // Must have exactly 9 digits
            if (rawSsn.length !== 9) return "Incomplete SSN.";
            
            // Standard regex for XXX-XX-XXXX format if hyphens are present
            if (trimmedValue.includes('-') && !/^\d{3}-\d{2}-\d{4}$/.test(trimmedValue)) {
                return "Invalid SSN format.";
            }
            return null;

        case 'pob':
            if (!trimmedValue) return null;
            if (referenceData.pobCodes && !referenceData.pobCodes.has(trimmedValue.toUpperCase())) {
                return "Invalid POB code.";
            }
            return null;

        case 'state':
            if (!trimmedValue) return null;
            if (referenceData.addressStates && !referenceData.addressStates.has(trimmedValue.toUpperCase())) {
                return "Invalid State code.";
            }
            return null;

        case 'height':
            if (!trimmedValue) return null;
            // Height range: 400 - 711
            const hgtNum = parseInt(trimmedValue, 10);
            if (isNaN(hgtNum)) return "Height must be numeric.";
            if (hgtNum < 400 || hgtNum > 711) {
                return "Height must be greater than 399 and less than 712";
            }
            return null;

        case 'weight':
            if (!trimmedValue) return null;
            // Weight range: 050 - 499 (interpreted as 50 to 499)
            const wgtNum = parseInt(trimmedValue, 10);
            if (isNaN(wgtNum)) return "Weight must be a number.";
            if (wgtNum < 50 || wgtNum > 499) {
                return "Weight must be between 49 – 500.";
            }
            return null;

        case 'countryCode':
            if (!trimmedValue) return null;
            if (referenceData.countryCodes && !referenceData.countryCodes.has(trimmedValue.toUpperCase())) {
                return "Invalid Country Code.";
            }
            return null;

        case 'scarMark':
        case 'code': // Scar/Mark Code
            if (!trimmedValue) return "Scar/Mark cannot be blank.";
            if (trimmedValue.length > 10) return "Code cannot exceed 10 characters.";
            // FIX: Prioritize Dynamic Reference Data Check
            if (referenceData.smtCodes && referenceData.smtCodes.size > 0) {
                if (!referenceData.smtCodes.has(trimmedValue.toUpperCase())) {
                    return "Invalid Scar/Mark code.";
                }
            } else if (!VALID_SCAR_MARK_CODES.has(trimmedValue.toUpperCase())) {
                // Fallback to static constant if ref data not loaded
                return "Invalid Scar/Mark code.";
            }
            return null;

        case 'race': return VALID_RACE_CODES.has(trimmedValue.toUpperCase()) ? null : "Invalid Race code.";
        case 'sex': return VALID_SEX_CODES.has(trimmedValue.toUpperCase()) ? null : "Invalid Sex code.";
        case 'hair': return VALID_HAIR_CODES.has(trimmedValue.toUpperCase()) ? null : "Invalid Hair code.";
        case 'eyes': return VALID_EYE_CODES.has(trimmedValue.toUpperCase()) ? null : "Invalid Eye code.";
        case 'skin': return VALID_SKIN_CODES.has(trimmedValue.toUpperCase()) ? null : "Invalid Skin code.";

        case 'streetDir':
            if (trimmedValue && !VALID_STREET_DIR_CODES.has(trimmedValue.toUpperCase())) return "Invalid Street Direction code.";
            return null;

        case 'streetSuf':
            if (trimmedValue && !VALID_STREET_SUF_CODES.has(trimmedValue.toUpperCase())) return "Invalid Street Suffix code.";
            return null;

        case 'prefix':
        case 'idType': // UPDATED: Handle 'idType' field
            if (referenceData.miscPrefixes && referenceData.miscPrefixes.size > 0) {
                if (!referenceData.miscPrefixes.has(trimmedValue.toUpperCase())) {
                    return "Invalid Prefix.";
                }
            }
            else if (trimmedValue && !VALID_MISC_NUM_PREFIXES.has(trimmedValue.toUpperCase())) {
                return "Invalid Prefix.";
            }
            return null;

        case 'documentType': 
            if (!trimmedValue) return "This field cannot be blank.";
            // Validate against the list from context
            if (referenceData.referenceTypes && referenceData.referenceTypes.size > 0) {
                if (!referenceData.referenceTypes.has(trimmedValue.toUpperCase())) {
                    return "Invalid Reference Type.";
                }
            }
            if (trimmedValue.toUpperCase() === 'CNS') {
                const recType = (allValues.recordType || '').toUpperCase();
                if (recType !== 'T' && recType !== 'PENDING') {
                    return "CNS can only be added to a Pending record (remove FBI Number & Pattern Type first).";
                }
            }
            return null;
        
        case 'documentNumber':
        case 'description':
        case 'idValue':
            if (!trimmedValue) return "This field cannot be blank.";
            return null;

        case 'cautionCode':
            if (!trimmedValue) return "A valid caution must be selected.";
            return null;

        case 'patternRight':
            // 1. Cross-field validation: If Right is populated, Left must not be empty (and vice versa)
            // Note: We perform the same check for both fields to ensure the error appears on both or clears on both.
            var leftVal = (allValues.patternLeft || '').trim();
            var rightVal = trimmedValue; // trimmedValue is the current field's value

            if ((rightVal && !leftVal) || (!rightVal && leftVal)) {
                return "Both Pattern Types must be populated or cleared together.";
            }
            return null;

        case 'patternLeft':
            var rVal = (allValues.patternRight || '').trim();
            var lVal = trimmedValue;

            if ((lVal && !rVal) || (!lVal && rVal)) {
                return "Both Pattern Types must be populated or cleared together.";
            }
            return null;

        default: return null;
    }
};

/**
 * Validates a single Reference Row.
 * Returns errors for individual fields AND a row-level error if duplicate.
 */
export const validateReferenceRow = (item, index, allItems, referenceData, allValues = {}) => {
    let dateError = null;
    let typeError = null;
    let numError = null;
    let descError = null;
    let rowError = null;

    // 1. Basic Field Validation (Only if New Record - Existing are ReadOnly/Trusted)
    // However, Description is editable for existing records.
    const isNew = !item.id;

    if (isNew) {
        dateError = validateField('documentDate', item.documentDate, allValues, referenceData);
        typeError = validateField('documentType', item.documentType, allValues, referenceData);
        numError = validateField('documentNumber', item.documentNumber, allValues, referenceData);
    }
    

    // 2. Duplicate Check (Row Level) - Only for New Records
    if (isNew && item.documentDate && item.documentType && item.documentNumber) {
        // If basic fields are valid, check for duplicates
        if (!dateError && !typeError && !numError) {
            if (isReferenceRowDuplicate(item, index, allItems)) {
                rowError = "This is a duplicate of another reference record.";
            }
        }
    }

    return { dateError, typeError, numError, descError, rowError };
};

/**
 * Validates a single miscellaneous number row.
 */
export const validateMiscNumRow = (item, index, allItems) => {
    // UPDATED: Use 'idType' and 'idValue' to match DetailsView
    const type = (item.idType || '').trim();
    const val = (item.idValue || '').trim();
    let prefixError = null;
    let numberError = null;
    let rowError = null;

    if ((type && !val) || (!type && val)) {
        rowError = "Both prefix and number are required.";
    }

    if (type && !VALID_MISC_NUM_PREFIXES.has(type.toUpperCase())) {
        prefixError = "Invalid Prefix.";
    }

    if (type && val && !rowError && isMiscNumRowDuplicate(item, index, allItems)) {
        rowError = "Duplicate value detected.";
    }

    return { prefixError, numberError, rowError };
};

export const validateAll = (data, fieldsToValidate, referenceData = {}, context = {}) => {
    const errors = {};
    if (!data || !fieldsToValidate) return errors;

    fieldsToValidate.forEach(key => {
        // --- 1. Handle Top-Level Simple Fields ---
        if (!['aliases', 'appendedCautions', 'appendedDobs', 'appendedScarsMarks', 'appendedSsns', 'appendedMiscNums', 'references', 'patternRight', 'patternLeft'].includes(key)) {
            const error = validateField(key, data[key], data, referenceData, context);
            if (error) {
                errors[key] = error;
            }
        }

        // --- 2. Handle Nested Array Validations ---
        if (key === 'aliases' && data.aliases) {
            data.aliases.forEach((item, index) => {
                const error = validateListItem('name', item.name, index, data.aliases, data);
                if (error) { errors[`aliases[${index}].name`] = error; }
            });
        }
        if (key === 'appendedCautions' && data.appendedCautions) {
            data.appendedCautions.forEach((item, index) => {
                const error = validateListItem('cautionCode', item.cautionCode, index, data.appendedCautions);
                if (error) { errors[`appendedCautions[${index}].cautionCode`] = error; }
            });
        }
        if (key === 'appendedDobs' && data.appendedDobs) {
            data.appendedDobs.forEach((item, index) => {
                const error = validateListItem('dob', item.dob, index, data.appendedDobs);
                if (error) { errors[`appendedDobs[${index}].dob`] = error; }
            });
        }

        if (key === 'appendedSsns' && data.appendedSsns) {
            data.appendedSsns.forEach((item, index) => {
                // UPDATED: Check 'ssn' property, NOT 'socSec'
                const ssnValue = (item.ssn || '').trim();
                if (!ssnValue) {
                    errors[`appendedSsns[${index}].ssn`] = "SSN cannot be blank.";
                    return; 
                }
                const error = validateListItem('ssn', item.ssn, index, data.appendedSsns);
                if (error) { errors[`appendedSsns[${index}].ssn`] = error; }
            });
        }

        if (key === 'appendedMiscNums' && data.appendedMiscNums) {
            data.appendedMiscNums.forEach((item, index) => {
                if (item._isMarkedForDeletion) return;

                const { prefixError, numberError, rowError } = validateMiscNumRow(item, index, data.appendedMiscNums);

                // UPDATED: Error keys map to idType/idValue
                if (prefixError) {
                    errors[`appendedMiscNums[${index}].idType`] = prefixError;
                }
                if (numberError) {
                    errors[`appendedMiscNums[${index}].idValue`] = numberError;
                }
                if (rowError) {
                    errors[`appendedMiscNums[${index}].rowError`] = rowError;
                }
            });
        }

        if (key === 'references' && data.references) {
            data.references.forEach((item, index) => {
                if (item._isMarkedForDeletion) return;

                const { dateError, typeError, numError, descError, rowError } = validateReferenceRow(item, index, data.references, referenceData, data);

                if (dateError) errors[`references[${index}].documentDate`] = dateError;
                if (typeError) errors[`references[${index}].documentType`] = typeError;
                if (numError) errors[`references[${index}].documentNumber`] = numError;
                if (descError) errors[`references[${index}].description`] = descError;
                
                // Assign Row Error to a specific key
                if (rowError) errors[`references[${index}].rowError`] = rowError;
            });
        }

        if (key === 'appendedScarsMarks' && data.appendedScarsMarks) {
            data.appendedScarsMarks.forEach((item, index) => {
                // UPDATED: Check 'code' property, NOT 'scarMark'
                const codeValue = item.code ? item.code.trim().toUpperCase() : '';
                let errorMessage = '';

                if (!codeValue) {
                    errors[`appendedScarsMarks[${index}].code`] = "Scar/Mark cannot be blank.";
                    return; 
                }

                if (codeValue) {
                    const firstIndex = data.appendedScarsMarks.findIndex((innerItem, innerIndex) =>
                        !innerItem._isMarkedForDeletion &&
                        innerItem.code &&
                        innerItem.code.trim().toUpperCase() === codeValue
                    );
                    if (firstIndex !== -1 && firstIndex !== index) {
                        errorMessage = "Duplicate value detected.";
                    }
                }

                if (codeValue && !VALID_SCAR_MARK_CODES.has(codeValue)) {
                    const invalidCodeError = "Invalid Scar/Mark code.";
                    errorMessage = errorMessage ? `${errorMessage} ${invalidCodeError}` : invalidCodeError;
                }

                if (errorMessage) {
                    errors[`appendedScarsMarks[${index}].code`] = errorMessage;
                }
            });
        }
    });

    return errors;
};

export const validateListItem = (fieldName, value, index, array, allValues = {}, referenceData = {}) => {
    
    // Check if it's a Reference Field
    if (['documentDate', 'documentType', 'documentNumber', 'description'].includes(fieldName)) {
        const item = { ...array[index], [fieldName]: value }; // Simulate updated item
        // Update array for duplication check context
        const tempArray = [...array];
        tempArray[index] = item;

        const { dateError, typeError, numError, descError, rowError } = validateReferenceRow(item, index, tempArray, referenceData, allValues);

        // Return specific field error if exists
        if (fieldName === 'documentDate' && dateError) return dateError;
        if (fieldName === 'documentType' && typeError) return typeError;
        if (fieldName === 'documentNumber' && numError) return numError;
        if (fieldName === 'description' && descError) return descError;

        // Return Row Error (Duplicate) if no field error
        if (rowError) return rowError;
        return null;
    }

    if (fieldName === 'idType' || fieldName === 'idValue') {
        const item = array[index];
        // Use the centralized row validation logic
        const { prefixError, rowError } = validateMiscNumRow(item, index, array);
        
        // If this specific field has a direct error, return it
        if (fieldName === 'idType' && prefixError) return prefixError;
        // Note: We don't return numberError here because "Both required" is treated as a rowError in validateMiscNumRow
        
        // If there is a Row Error (Duplicate or Both Required), return it.
        // This effectively assigns the "Duplicate" message to the field being edited.
        if (rowError) return rowError;
        
        return null;
    }

    const fieldError = validateField(fieldName, value, allValues, referenceData);
    if (fieldError) return fieldError;

    if (fieldName === 'name') {
        const valueToCheck = (value || '').trim().toUpperCase();
        const primaryName = (allValues.name || '').trim().toUpperCase();
        if (valueToCheck && valueToCheck === primaryName) {
            return 'An alias cannot be the same as the primary name.';
        }
    }
    
    if (!value) return null;
    const trimmedValue = value.trim().toUpperCase();
    if (!trimmedValue) return null;

    const firstIndex = array.findIndex((item, innerIndex) => 
        !item._isMarkedForDeletion &&
        index !== innerIndex && 
        item[fieldName] && 
        item[fieldName].trim().toUpperCase() === trimmedValue
    );

    if (firstIndex !== -1 && firstIndex !== index) {
        return "Duplicate value detected.";
    }

    return null;
};