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
      // Primeira tentativa com email
      try {
        const response = await apiClient.post('/auth/login/', {
          email: email,
          password: password
        });
        
        // Processar tokens e retornar
        // Código para armazenar tokens...
        
        return response.data;
      } catch (emailError) {
        // Se falhar, tenta com username
        // Assumindo que o username pode ser o email ou algo derivado do email
        console.log("Tentativa com email falhou, tentando com username...");
        
        // Extrai o username do email (parte antes do @)
        const username = email.includes('@') ? email.split('@')[0] : email;
        
        const response = await apiClient.post('/auth/login/', {
          username: email, // Tenta o email completo como username
          password: password
        });
        
        // Código para armazenar tokens...
        
        return response.data;
      }
    } catch (error) {
      console.error("Login error details:", error.response?.data);
      throw error;
    }
  },
  
  /**
   * Registrar novo usuário
   * @param {Object} userData - Dados do usuário para registro
   * @returns {Promise} - Promessa com a resposta do servidor
   */
  register: async (userData) => {
    // Mapeamento dos campos para o formato esperado pelo seu backend
    const mappedData = {
      username: userData.username,
      email: userData.email,
      password1: userData.password,         // backend espera password1
      password2: userData.password_confirm, // backend espera password2
      first_name: userData.first_name,
      last_name: userData.last_name
    };
    
    const response = await apiClient.post('/auth/register/', mappedData);
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