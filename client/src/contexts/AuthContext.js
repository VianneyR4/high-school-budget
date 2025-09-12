import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const idpToken = localStorage.getItem('idp_access_token');
    const idpUser = localStorage.getItem('idp_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    } else if (idpToken && idpUser) {
      // Handle IDP authentication
      setToken(idpToken);
      setUser(JSON.parse(idpUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:3001/api/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        setToken(token);
        setUser(user);
        
        return { success: true, user };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const loginWithIdp = (idpUser, idpTokens) => {
    // Store IDP tokens and user data
    localStorage.setItem('idp_access_token', idpTokens.access_token);
    if (idpTokens.refresh_token) {
      localStorage.setItem('idp_refresh_token', idpTokens.refresh_token);
    }
    localStorage.setItem('idp_user', JSON.stringify(idpUser));
    
    // Set the current session
    setToken(idpTokens.access_token);
    setUser(idpUser);
    
    return { success: true, user: idpUser };
  };

  const logout = () => {
    // Clear both regular and IDP tokens
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('idp_access_token');
    localStorage.removeItem('idp_refresh_token');
    localStorage.removeItem('idp_user');
    
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const isAdmin = () => user?.role === 'ADMIN';
  const isDepartmentHead = () => user?.role === 'DEPARTMENT_HEAD';

  const value = {
    user,
    token,
    loading,
    login,
    loginWithIdp,
    logout,
    isAuthenticated: !!token,
    isAdmin,
    isDepartmentHead
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
