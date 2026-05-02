import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🧠</div>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Continue your vocabulary journey</p>

        <form onSubmit={onSubmit} className={styles.form}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={handle}
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={handle}
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? <><div className="spinner" style={{width:20,height:20}}/> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <p className={styles.switchText}>
          Don't have an account?{' '}
          <Link to="/register" className={styles.link}>Create one free</Link>
        </p>
      </div>
    </div>
  );
}
