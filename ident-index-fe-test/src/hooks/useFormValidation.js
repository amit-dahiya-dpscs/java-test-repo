import { useState, useCallback } from 'react';

// --- Validation logic based on the B90571 Program document ---
const validate = (name, value, allValues) => {
    switch (name) {
        
        case 'fullName':
            if (value) {
                const trimmedValue = value.trim();
                const parts = trimmedValue.split(/\s+/); // Split by one or more spaces

                // Rule: If there are multiple parts (e.g., "SMITH JOHN"), a comma is required.
                if (parts.length > 1 && !trimmedValue.includes(',')) {
                    return "A comma is required after the last name (e.g., 'SMITH, JOHN').";
                }
                
                // Rule: Comma must be followed by a space.
                if (trimmedValue.includes(',')) {
                    if ((trimmedValue.match(/,/g) || []).length > 1) {
                        return "Only one comma is allowed.";
                    }
                    if (/,\S/.test(trimmedValue)) { // Check for comma NOT followed by a space
                        return "Comma must be followed by a space.";
                    }
                }
                
                // Rule: No multiple consecutive spaces (this is handled by splitting on /\s+/)
                // but we can add an explicit check for clarity if desired.
                if (/\s\s/.test(value)) {
                    return "Cannot have multiple consecutive spaces.";
                }
            }

            // Rule: If other search fields are used, Full Name or SID becomes required.
            const { dob, race, sex, sid, typeOfRequest } = allValues;
            const otherFieldsHaveValue = !!dob || !!race || !!sex || !!typeOfRequest;
            if (!value && !sid && otherFieldsHaveValue) {
                return 'Full Name or SID is required when other fields are used.';
            }
            return null;

        case 'dob':
            if (!value) return null;

            const fullDateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d{2}$/;
            const yearOnlyRegex = /^(19|20)\d{2}$/;
            
            // Context: SDX Search (flexible validation)
            if (allValues.typeOfRequest === 'SDX') {
                if (yearOnlyRegex.test(value)) {
                    return null; // A valid YYYY is acceptable for SDX search.
                }
                // If it's not just a year, it must be a full, valid date.
                if (!fullDateRegex.test(value)) {
                    return 'Enter a valid MM/DD/YYYY or just YYYY.';
                }
            } 
            // Context: Standard Search (strict validation)
            else {
                if (value.length > 0 && value.length < 10) {
                    return 'Date is incomplete.';
                }
                if (!fullDateRegex.test(value)) {
                    return 'Date must be in MM/DD/YYYY format.';
                }
            }
            
            if (fullDateRegex.test(value)) {
                const today = new Date();
                const inputDate = new Date(value);
                today.setHours(0, 0, 0, 0);
                if (inputDate >= today) {
                    return "Date of birth cannot be today or a future date.";
                }
            }
            
            return null;
            
        case 'ssn':
            if (!value) return null; // Optional field
            const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
            // Allow partial input without showing an error
            return value.length > 0 && !ssnRegex.test(value) && value.length < 11 ? "Incomplete SSN." : null;

        
        case 'fbiNumber':
            // Rule 1: SDX Restriction (If currently on Search Page)
            // FRD Requirement: "For SDX search, only Full Name and DOB are allowed."
            if (isSearchPage && allValues.typeOfRequest === 'SDX' && trimmedValue) {
                return "FBI Number is not allowed for SDX search.";
            }

            // Rule 2: Optional Field Check
            if (!trimmedValue) return null;

            // Rule 3: Format Validation (Alphanumeric, Max 10 chars)
            // FRD Source 1095: "UCN Number" is Alphanumeric, Size 10.
            if (trimmedValue.length > 10) {
                return "FBI Number cannot exceed 10 characters.";
            }
            if (!/^[A-Z0-9]+$/i.test(trimmedValue)) {
                return "FBI Number must be alphanumeric (letters and numbers only).";
            }
            return null;

        default:
            return null; // For fields without validation (like SID, Pattern Type)
    }
};

export const useFormValidation = (initialState) => {
    const [values, setValues] = useState(initialState);
    const [errors, setErrors] = useState({});

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        
        let formattedValue = value;
        let finalValue = value; // This will hold the sanitized value

        // --- REAL-TIME INPUT SANITIZATION AND FORMATTING ---
           switch (name) {
            case 'fullName':
                // Allow letters, space, comma, hyphen, apostrophe
                // CORRECTED: Moved the hyphen to the end of the character class
                finalValue = value.replace(/[^a-zA-Z\s,'-]/g, '');
                break;

            case 'sid':
                // Allow only numbers
                finalValue = value.replace(/[^0-9]/g, '');
                break;
                
            case 'dob':
                // --- THIS IS THE NEW, SMART AUTO-FORMATTING LOGIC ---
                const onlyNumsDob = value.replace(/[^0-9]/g, '');

                // If the user is clearly entering a year, don't format.
                // We'll consider it a "year entry" if it's 4 digits and starts with 19 or 20.
                if (onlyNumsDob.length === 4 && (onlyNumsDob.startsWith('19') || onlyNumsDob.startsWith('20'))) {
                    formattedValue = onlyNumsDob;
                } 
                // Otherwise, apply the MM/DD/YYYY formatting as they type.
                else {
                    if (onlyNumsDob.length <= 2) {
                        formattedValue = onlyNumsDob;
                    } else if (onlyNumsDob.length <= 4) {
                        formattedValue = `${onlyNumsDob.slice(0, 2)}/${onlyNumsDob.slice(2)}`;
                    } else {
                        formattedValue = `${onlyNumsDob.slice(0, 2)}/${onlyNumsDob.slice(2, 4)}/${onlyNumsDob.slice(4, 8)}`;
                    }
                }
                finalValue = formattedValue;
                break;

            case 'ssn':
                // Auto-format SSN
                const onlyNumsSsn = value.replace(/[^0-9]/g, '');
                if (onlyNumsSsn.length <= 3) { formattedValue = onlyNumsSsn; }
                else if (onlyNumsSsn.length <= 5) { formattedValue = `${onlyNumsSsn.slice(0, 3)}-${onlyNumsSsn.slice(3)}`; }
                else { formattedValue = `${onlyNumsSsn.slice(0, 3)}-${onlyNumsSsn.slice(3, 5)}-${onlyNumsSsn.slice(5, 9)}`; }
                finalValue = formattedValue;
                break;
            
            default:
                finalValue = value;
                break;
        }

        const newValues = { ...values, [name]: finalValue };
        setValues(newValues);
        
        // --- REAL-TIME VALIDATION ---
        const newErrors = { ...errors };
        newErrors[name] = validate(name, finalValue, newValues);
        
        if (name === 'typeOfRequest') {
           newErrors['dob'] = validate('dob', newValues.dob, newValues);
        }
        
        // Check dependent validations
        if (name !== 'fullName' && name !== 'sid') {
           newErrors['fullName'] = validate('fullName', newValues.fullName, newValues);
        }
        setErrors(newErrors);

    }, [values, errors]);

    const resetForm = useCallback(() => {
        setValues(initialState);
        setErrors({});
    }, [initialState]);

    const hasErrors = Object.values(errors).some(error => error !== null);

    return {
        values,
        errors,
        hasErrors,
        handleChange,
        resetForm,
    };
};