import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Pages
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import VocabListPage from './pages/VocabListPage.jsx';
import DictionaryPage from './pages/DictionaryPage.jsx';
import OCRPage from './pages/OCRPage.jsx';

// Layout
import Layout from './components/Layout.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
      <div className="spinner" style={{ width:48, height:48 }} />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      {/* Ambient background orbs */}
      <div className="bg-orb" style={{
        width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
        top: '-200px', left: '-200px',
        animationDelay: '0s',
      }} />
      <div className="bg-orb" style={{
        width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
        bottom: '-150px', right: '-150px',
        animationDelay: '4s',
      }} />

      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected routes */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="review"     element={<ReviewPage />} />
          <Route path="vocab"      element={<VocabListPage />} />
          <Route path="dictionary" element={<DictionaryPage />} />
          <Route path="ocr"        element={<OCRPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
