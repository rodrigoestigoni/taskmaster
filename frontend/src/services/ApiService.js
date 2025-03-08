import axios from 'axios';

const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
const domain = window.location.hostname;

const API_URL = `/api`;

// Criar instância do axios com configuração base
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 segundos
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCookie('csrftoken')
  },
});

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}


// Adicione interceptores para atualizar o CSRF token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Atualizar CSRF token a cada requisição
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptador para renovar token quando expirado
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Não tente renovar o token para rotas de autenticação
    const isAuthRoute = originalRequest.url.includes('/auth/login') || 
                       originalRequest.url.includes('/auth/register');
    
    // Se erro 401 (não autorizado) e ainda não tentamos renovar o token e não é rota de autenticação
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          // Se não tiver refresh token, logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          return Promise.reject(error);
        }
        
        // Renovar token usando o endpoint do dj-rest-auth
        const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        
        // Atualizar token no localStorage
        localStorage.setItem('accessToken', response.data.access);
        
        // Tentar novamente a requisição original
        originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Se falhar a renovação, remover tokens
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;