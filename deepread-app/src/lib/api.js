import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const uploadPDF = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getAudit = async (fileId) => {
    const response = await api.get(`/audit/${fileId}`);
    return response.data;
};

export const getExplanation = async (text) => {
    const response = await api.post('/explain', { text });
    return response.data;
};
