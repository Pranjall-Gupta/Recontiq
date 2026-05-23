import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper for multipart/form-data
export const uploadInvoices = async ({ file, source }: { file: File; source: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source', source);
    return apiClient.post('/invoices/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const getDashboardStats = () => apiClient.get('/invoices/summary');
export const getInvoices = (params: any) => apiClient.get('/invoices', { params });
export const getInvoiceDetail = (id: string) => apiClient.get(`/invoices/${id}`);
export const runReconciliation = () => apiClient.post('/reconcile/run');
export const getReconciliationStatus = (jobId: string) => apiClient.get(`/reconcile/status/${jobId}`);
export const getMismatches = (params: any) => apiClient.get('/reconcile/mismatches', { params });
export const resolveMismatch = (id: string, note: string, resolvedBy: string = 'Priya') =>
    apiClient.patch(`/reconcile/mismatches/${id}/resolve`, { resolutionNote: note, resolvedBy });
export const writeOffMismatch = (id: string, note: string, resolvedBy: string = 'Priya') =>
    apiClient.patch(`/reconcile/mismatches/${id}/write-off`, { resolutionNote: note, resolvedBy });
export const escalateMismatch = (id: string, note: string, resolvedBy: string = 'Priya') =>
    apiClient.patch(`/reconcile/mismatches/${id}/escalate`, { resolutionNote: note, resolvedBy });

export const draftEmail = (id: string) => apiClient.post(`/agent/draft-email/${id}`);
export const explainRisk = (id: string) => apiClient.post(`/agent/explain-risk/${id}`);
export const suggestAction = (id: string) => apiClient.post(`/agent/suggest-action/${id}`);

export const getFraudNodes = (maxTrustScore?: number) => apiClient.get('/fraud/suspicious-vendors', { params: { maxTrustScore, minMismatchCount: 1 } });
export const getFraudGraph = (maxTrustScore?: number) => apiClient.get('/fraud/graph', { params: { maxTrustScore } });

export const vendorChat = (message: string) => apiClient.post('/agent/vendor-chat', { message });


