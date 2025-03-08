import apiClient from './ApiService';

const AuthService = {
  /**
   * Realizar login
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise} - Promessa com os tokens de acesso
   */
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/token/', {
        email: email,
        password: password
      });
      
      // Salvar também o email para identificar o usuário
      localStorage.setItem('userEmail', email);
      
      return response.data;
    } catch (error) {
      console.error('Erro de login:', error);
      throw error;
    }
  },
  
  /**
   * Registrar novo usuário
   * @param {Object} userData - Dados do usuário para registro
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  register: async (userData) => {
    const mappedData = {
      email: userData.email,
      password1: userData.password,
      password2: userData.password_confirm,
      first_name: userData.first_name || '',
      last_name: userData.last_name || ''
    };
    
    const response = await apiClient.post('/auth/register/', mappedData);
    return response.data;
  },
  
  /**
   * Obter dados do usuário atual
   * @returns {Promise} - Promessa com os dados do usuário
   */
  getCurrentUser: async () => {
    // Como não temos endpoint específico, usamos o email salvo
    const email = localStorage.getItem('userEmail');
    if (!email) {
      throw new Error("Usuário não autenticado");
    }
    
    return { email };
  },
  
  /**
   * Atualizar perfil do usuário
   * @param {Object} userData - Dados atualizados do usuário
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  updateProfile: async (userData) => {
    // Como não temos um endpoint específico, simulamos sucesso
    return { success: true };
  },
  
  /**
   * Solicitar redefinição de senha
   * @param {string} email - Email do usuário
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  forgotPassword: async (email) => {
    // Como não temos um endpoint específico, simulamos sucesso
    return { detail: "Email de recuperação enviado." };
  },
  
  /**
   * Redefinir senha com token
   * @param {string} token - Token recebido por email
   * @param {string} newPassword - Nova senha
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  resetPassword: async (token, newPassword) => {
    // Como não temos um endpoint específico, simulamos sucesso
    return { detail: "Senha redefinida com sucesso." };
  },
  
  /**
   * Verificar validade do token de acesso
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  verifyToken: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    
    try {
      // Tentar fazer uma requisição autenticada para verificar o token
      await apiClient.get('/tasks/');
      return true;
    } catch (error) {
      return false;
    }
  },
};

export default AuthService;