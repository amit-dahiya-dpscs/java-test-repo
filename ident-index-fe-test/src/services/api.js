import axios from 'axios';

// Ensure this points to your Ident Index Backend Port
const API_BASE_URL ='http://localhost:8082/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // CRITICAL: This ensures HttpOnly cookies are sent/received
    headers: {
        'Content-Type': 'application/json',
    },
});

//console.log(process.env.REACT_APP_API_URL);

// Variables
let requestInterceptorId;
let responseInterceptorId;
let isLoggingOut = false;
let logoutHandler = null;

// Add a UUID generator utility at the top of the file
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : ((r & 0x3) | 0x8);
        return v.toString(16);
    });
};

export const startNewTransaction = () => {
    const correlationId = generateUUID();
    sessionStorage.setItem('currentCorrelationId', correlationId);
    return correlationId;
};

export const setupInterceptors = (logout) => {
    logoutHandler = logout;

    // 1. Eject existing interceptors to prevent duplicates
    if (requestInterceptorId !== undefined) {
        apiClient.interceptors.request.eject(requestInterceptorId);
    }
    if (responseInterceptorId !== undefined) {
        apiClient.interceptors.response.eject(responseInterceptorId);
    }

    // 2. REQUEST INTERCEPTOR (Updated)
    // We no longer attach the token manually. The browser handles the Cookie.
    requestInterceptorId = apiClient.interceptors.request.use(
        (config) => {

            if (config.method !== 'options') {
                // Fetch the active transaction ID
                let correlationId = sessionStorage.getItem('currentCorrelationId');
                
                // Fallback: If no transaction is active (e.g., initial page load), generate one
                if (!correlationId) {
                    correlationId = startNewTransaction();
                }
                
                config.headers['X-Correlation-ID'] = correlationId;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // 3. RESPONSE INTERCEPTOR
    responseInterceptorId = apiClient.interceptors.response.use(
        (response) => {
            return response;
        },
        async (error) => {
            const originalRequest = error.config;
            const status = error.response ? error.response.status : null;

            if (originalRequest.url.includes('/auth/login')) {
                return Promise.reject(error);
            }

            // A. PREVENT INFINITE LOOP (Audit Check)
            const isAuditRequest = originalRequest && originalRequest.url && originalRequest.url.includes('/audit/log');

            // B. CHECK FOR AUTH ERRORS (401/403)
            // If the backend returns 401, it means the Cookie is invalid/expired
            if (status === 401 || status === 403) {
                if (!isLoggingOut) {
                    isLoggingOut = true; 
                    console.log("Session expired. Logging out...");
                    
                    if (logoutHandler) {
                        alert("Your session has expired. Please login again.");
                        logoutHandler();
                    }
                }
                return Promise.reject(error);
            }

            // C. LOG OTHER ERRORS
            if (!isAuditRequest && status !== 0) { 
                try {
                    apiClient.post('/audit/log', {
                        event: 'API_ERROR',
                        description: `Error ${status} at ${originalRequest?.url}`,
                        details: error.message
                    }).catch(e => console.warn("Failed to log error audit", e));
                } catch (e) { /* Ignore */ }
            }

            return Promise.reject(error);
        }
    );
};

// --- AUTHENTICATION API ---
export const login = async (credentials) => {
    // The backend now sets the HttpOnly cookie in the response header
    const response = await apiClient.post('/auth/login', credentials);
    return response.data; 
};

// NEW: Call backend to clear the cookie
export const logoutUserApi = async () => {
    return await apiClient.post('/auth/logout');
};

// --- AUDIT API ---
export const createAuditLog = async (auditData) => {
    return await apiClient.post('/audit/log', auditData);
};

// --- IDENT INDEX SPECIFIC API ---
export const searchIdentRecords = async (searchCriteria, page = 0, size = 20) => {
    try {
        const response = await apiClient.post(`/ident/search?page=${page}&size=${size}`, searchCriteria);
        return response.data;
    } catch (error) {
        console.error("Search API Error:", error);
        throw error;
    }
};

export const getIdentDetail = async (systemId) => {
    try {
        const response = await apiClient.get(`/ident/${systemId}`);
        return response.data;
    } catch (error) {
        console.error("Detail API Error:", error);
        throw error;
    }
};

// --- REFERENCE DATA API ---
export const getCountries = async () => {
    const response = await apiClient.get('/reference/countries');
    return response.data;
};

export const getCautions = async () => {
    const response = await apiClient.get('/reference/cautions');
    return response.data;
};

export const getMiscPrefixes = async () => {
    const response = await apiClient.get('/reference/misc-prefixes');
    return response.data;
};

// --- UPDATE API ENDPOINTS ---
export const updateDemographics = async (systemId, data) => {
    return await apiClient.put(`/ident/update/${systemId}/demographics`, data);
};

export const updateTrueName = async (systemId, data) => {
    return await apiClient.put(`/ident/update/${systemId}/true-name`, data);
};

export const updateAliases = async (systemId, aliasList) => {
    return await apiClient.put(`/ident/update/${systemId}/aliases`, aliasList);
};

export const updateAppendedIds = async (systemId, data) => {
    return await apiClient.put(`/ident/update/${systemId}/appended`, data);
};

export const updateReferences = async (systemId, documents) => {
    return await apiClient.put(`/ident/update/${systemId}/references`, documents);
};

// --- REFERENCE DATA ---
export const getReferenceData = async (type) => {
    const response = await apiClient.get(`/reference/${type}`);
    return response.data;
};

// --- EXPUNGEMENT API ---
export const processExpungement = async (payload) => {
    const response = await apiClient.post('/expungement/process', payload);
    return response.data; 
};

// --- CONSOLIDATION API ---
export const consolidateRecords = async (sourceSid, targetSid) => {
    const response = await apiClient.post(`/ident/consolidate/${sourceSid}`, { targetSid });
    return response.data;
};

export const resetLogoutFlag = () => {
    isLoggingOut = false;
};

export { apiClient }; 
export default apiClient;