import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import './LoginPage.css';
import dpscsSeal from '../assets/maryland_seal.png';

const LoginPage = () => {

  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth(); // Get the login function from our context

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!credentials.username || !credentials.password) {
      setError('Username and Password are required.');
      setIsLoading(false);
      return;
    }

    try {
      await login(credentials); // This will now throw an error on failure
      navigate('/search');
    } catch (err) {
      // This 'catch' block will now be correctly triggered
      setError('Invalid User ID or Password');
      setCredentials(prev => ({ ...prev, password: '' }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src={dpscsSeal} alt="DPSCS Seal" className="login-logo" />
          <div className="login-title">
            <h1>IIS</h1>
            <p>Identification Index System</p>
          </div>
        </div>
        {error && (
            <div 
                className="error-message" 
                role="alert" 
                aria-live="assertive"
            >
                {error}
            </div>
        )}
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label htmlFor="username" className="sr-only">Username</label>
            <input id="username" type="text" name="username" placeholder="Username" value={credentials.username} onChange={handleChange} disabled={isLoading} required aria-required="true" />
          </div>
          <div className="input-group">
            <label htmlFor="password" className="sr-only">Password</label>
            <input id="password" type="password" name="password" placeholder="Password" value={credentials.password} onChange={handleChange} disabled={isLoading} required aria-required="true" />
          </div>
          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;