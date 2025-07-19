import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate }        from 'react-router-dom';
import api                                from '../api';
import './LoginSignup.css';

const API_BASE = 'https://vibecart-eo6e.onrender.com/api';

export default function LoginSignup() {
  const [isLogin, setIsLogin]   = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'buyer' });
  const loc                     = useLocation();
  const nav                     = useNavigate();
  const done                    = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(loc.search);
    if (q.get('google') === 'success' && !done.current) {
      done.current = true;
      alert('✅ Logged in with Google');
      window.history.replaceState({}, '', '/login');
      api.get('/me')
        .then(r => {
          localStorage.setItem('user', JSON.stringify(r.data.user));
          nav('/');
        })
        .catch(console.error);
    }
  }, [loc, nav]);

  const handle = e =>
    setFormData(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    const endpoint = isLogin ? '/login' : '/signup';

    if (!isLogin) {
      const { exists } = (await api.post('/check-gmail', { gmail: formData.email })).data;
      if (exists) return alert('Account exists');
    }

    try {
      const payload = isLogin
        ? { gmail: formData.email, pass: formData.password }
        : {
            name:  formData.email.split('@')[0],
            gmail: formData.email,
            pass:  formData.password,
            role:  formData.role
          };
      const r = await api.post(endpoint, payload);
      localStorage.setItem('user', JSON.stringify(r.data.user));
      alert(r.data.message);
      nav('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="form-container">
      <h2>{isLogin ? 'Login' : 'Signup'}</h2>
      <form onSubmit={submit}>
        <input
          name="email" type="email" placeholder="Email"
          value={formData.email} onChange={handle} required
        />
        <input
          name="password" type="password" placeholder="Password"
          value={formData.password} onChange={handle} required
        />
        {!isLogin && (
          <select name="role" value={formData.role} onChange={handle}>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>
        )}
        <button type="submit">{isLogin ? 'Login' : 'Signup'}</button>
      </form>

      <button className="toggle-btn" onClick={() => setIsLogin(x => !x)}>
        Switch to {isLogin ? 'Signup' : 'Login'}
      </button>
      <hr />

      <a className="google-btn" href={`${API_BASE}/auth/google`}>
        Sign in with Google
      </a>
    </div>
  );
}





