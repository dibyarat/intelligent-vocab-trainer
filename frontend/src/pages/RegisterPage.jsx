import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import styles from './AuthPage.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.displayName);
      toast.success('Account created! Let\'s start learning 🚀');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🧠</div>
        <h1 className={styles.title}>Start learning</h1>
        <p className={styles.subtitle}>Build your vocabulary with spaced repetition</p>

        <form onSubmit={onSubmit} className={styles.form}>
          <div className="input-group">
            <label className="input-label">Your Name</label>
            <input id="reg-name" name="displayName" type="text" className="input-field"
              placeholder="Alex Smith" value={form.displayName} onChange={handle} required autoFocus />
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input id="reg-email" name="email" type="email" className="input-field"
              placeholder="you@example.com" value={form.email} onChange={handle} required />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input id="reg-password" name="password" type="password" className="input-field"
              placeholder="Min. 8 characters" value={form.password} onChange={handle} required minLength={8} />
          </div>

          <button id="reg-submit" type="submit" className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? <><div className="spinner" style={{width:20,height:20}}/> Creating account...</> : 'Create Free Account'}
          </button>
        </form>

        <p className={styles.switchText}>
          Already have an account? <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
