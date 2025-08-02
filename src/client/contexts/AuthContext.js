import { h, createContext } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import { api } from '../services/api';
import { showNotification } from '../App';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.request('/auth/me');
      setUser(response.user);
      
      // Connect WebSocket for authenticated users
      api.connectWebSocket();
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.login(email, password);
      
      if (response.requires2FA) {
        // Return session token for 2FA flow
        return { requires2FA: true, sessionToken: response.sessionToken };
      }
      
      setUser(response.user);
      api.connectWebSocket();
      showNotification('Welcome back!', 'success');
      return { success: true };
    } catch (error) {
      showNotification(error.message || 'Login failed', 'error');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      api.disconnectWebSocket();
      window.navigate('/');
      showNotification('Logged out successfully', 'info');
    }
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}