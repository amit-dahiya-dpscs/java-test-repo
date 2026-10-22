import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ReferenceDataProvider } from './context/ReferenceDataContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ReferenceDataProvider>
        <Router>
          <App />
        </Router>
      </ReferenceDataProvider>
    </AuthProvider>
  </React.StrictMode>
);