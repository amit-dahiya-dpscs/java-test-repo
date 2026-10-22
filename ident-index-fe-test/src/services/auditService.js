import { createAuditLog, startNewTransaction } from './api'; // Imports from the file above

export const logAuditEvent = async (action, details = {}) => {
    try {

        // This UUID will now be shared by the UI Event and all API calls that follow it.
        const correlationId = startNewTransaction();

        const user = JSON.parse(sessionStorage.getItem('user'));
        
        const formattedDetails = JSON.stringify({
            uiComponent: window.location.pathname,
            payload: details
        });

        const auditPayload = {
            username: user?.username || 'UNKNOWN',
            action: action,
            details: formattedDetails,
            correlationId: correlationId,
            timestamp: new Date().toISOString()
        };
        await createAuditLog(auditPayload);
    } catch (error) {
        console.warn("Failed to send audit log", error);
    }
};