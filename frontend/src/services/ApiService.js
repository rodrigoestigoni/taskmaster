import axios from 'axios';

const API_URL = '/api';


const logApiCall = (config) => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data || {});
  return config;
};

const logApiResponse = (response) => {
  console.log(`API Response: ${response.status} ${response.statusText}`, response.data);
  return response;
};

const logApiError = (error) => {
  if (error.response) {
    console.error(`API Error: ${error.response.status} ${error.response.statusText}`, error.response.data);
  } else if (error.request) {
    console.error('API Error: No response received', error.request);
  } else {
    console.error('API Error:', error.message);
  }
  return Promise.reject(error);
};

// Criar instância do axios com configuração base
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adicione os interceptors
apiClient.interceptors.request.use(logApiCall, logApiError);
apiClient.interceptors.response.use(logApiResponse, logApiError);


// Interceptor para adicionar token de autenticação
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Não precisamos mais do CSRF token com JWT
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para renovar token quando expirado
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          return Promise.reject(error);
        }
        
        // Renovar token
        const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        
        localStorage.setItem('accessToken', response.data.access);
        
        // Tentar novamente a requisição original
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;