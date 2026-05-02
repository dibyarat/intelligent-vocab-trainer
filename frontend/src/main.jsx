import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a35',
            color: '#f0f0ff',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0a0a14' } },
          error:   { iconTheme: { primary: '#f43f5e', secondary: '#0a0a14' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
