import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const testAccounts = [
    {
      email: 'admin@school.edu',
      role: 'ADMIN',
      department: 'All Departments',
      access: 'Full system access'
    },
    {
      email: 'math.head@school.edu',
      role: 'DEPARTMENT_HEAD',
      department: 'Mathematics',
      access: 'Department management'
    },
    {
      email: 'science.head@school.edu',
      role: 'DEPARTMENT_HEAD',
      department: 'Science',
      access: 'Department management'
    },
    {
      email: 'english.head@school.edu',
      role: 'DEPARTMENT_HEAD',
      department: 'English',
      access: 'Department management'
    },
    {
      email: 'alice.smith@school.edu',
      role: 'TEACHER',
      department: 'Mathematics',
      access: 'Course scheduling & resources'
    },
    {
      email: 'bob.wilson@school.edu',
      role: 'TEACHER',
      department: 'Science',
      access: 'Course scheduling & resources'
    },
    {
      email: 'user@school.edu',
      role: 'USER',
      department: 'Mathematics',
      access: 'Basic access & reporting'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(credentials.email, credentials.password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = (email) => {
    setCredentials({
      email: email,
      password: 'password'
    });
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="login-container">
      <div className="login-form-section">
        <div className="login-form">
          <div className="login-header">
            <h1>School Budget Management</h1>
            <p>Enhanced System with AI-Powered Optimization</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={credentials.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      <div className="test-accounts-section">
        <div className="test-accounts">
          <h2>🔑 Test Accounts</h2>
          <p className="test-accounts-subtitle">
            Click any account below to auto-fill login credentials
          </p>
          <p className="password-note">
            <strong>Password for all accounts:</strong> <code>password</code>
          </p>

          <div className="accounts-grid">
            {testAccounts.map((account, index) => (
              <div 
                key={index} 
                className={`account-card ${account.role.toLowerCase()}`}
                onClick={() => handleTestLogin(account.email)}
              >
                <div className="account-role">{account.role}</div>
                <div className="account-email">{account.email}</div>
                <div className="account-department">{account.department}</div>
                <div className="account-access">{account.access}</div>
              </div>
            ))}
          </div>

          <div className="role-hierarchy">
            <h3>Role Hierarchy & Permissions</h3>
            <ul>
              <li><strong>ADMIN:</strong> Complete system access, all departments, optimization algorithms</li>
              <li><strong>DEPARTMENT_HEAD:</strong> Department budget management, course oversight, reporting</li>
              <li><strong>TEACHER:</strong> Course scheduling, resource requests, availability management</li>
              <li><strong>USER:</strong> Basic reporting, limited resource viewing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
