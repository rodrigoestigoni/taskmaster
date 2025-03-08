import apiClient from './ApiService';

const AuthService = {
  /**
   * Realizar login
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise} - Promessa com os tokens de acesso
   */
  login: async (email, password) => {
    // A API Django Rest Auth espera 'email' e não 'username'
    const response = await apiClient.post('/auth/login/', {
      email: email,       // Alterado de username para email
      password: password,
    });
    console.log('Login response:', response.data);  // Para debug
    return response.data;
  },
  
  /**
   * Registrar novo usuário
   * @param {Object} userData - Dados do usuário para registro
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  register: async (userData) => {
    const response = await apiClient.post('/auth/register/', userData);
    return response.data;
  },
  
  /**
   * Obter dados do usuário atual
   * @returns {Promise} - Promessa com os dados do usuário
   */
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/user/');
    return response.data;
  },
  
  /**
   * Atualizar perfil do usuário
   * @param {Object} userData - Dados atualizados do usuário
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  updateProfile: async (userData) => {
    const response = await apiClient.patch('/auth/user/', userData);
    return response.data;
  },
  
  /**
   * Solicitar redefinição de senha
   * @param {string} email - Email do usuário
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/password/reset/', { email });
    return response.data;
  },
  
  /**
   * Redefinir senha com token
   * @param {string} token - Token recebido por email
   * @param {string} newPassword - Nova senha
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  resetPassword: async (token, newPassword) => {
    const response = await apiClient.post('/auth/password/reset/confirm/', {
      token,
      new_password: newPassword,
    });
    return response.data;
  },
  
  /**
   * Verificar validade do token de acesso
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  verifyToken: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    
    try {
      const response = await apiClient.post('/auth/token/verify/', { token });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  },
};

export default AuthService;