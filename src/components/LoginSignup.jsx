
// ====== Frontend: LoginSignup.jsx ======
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './LoginSignup.css';

const LoginSignup = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email:'', password:'', role:'buyer' });
  const loc = useLocation(), nav = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(loc.search);
    if (q.get('google')==='success' && !done.current) {
      done.current = true; alert('✅ Logged in with Google');
      window.history.replaceState({},'', '/login');
      axios.get('http://localhost:5000/me',{withCredentials:true})
        .then(r=>{ localStorage.setItem('user',JSON.stringify(r.data.user)); nav('/'); })
        .catch(e=>console.error(e));
    }
  },[loc,nav]);

  const handle = e => setFormData(f=>({...f,[e.target.name]:e.target.value}));
  const submit = async e => {
    e.preventDefault();
    const ep = isLogin?'/login':'/signup';
    if (!isLogin) {
      const ex = (await axios.post('http://localhost:5000/check-gmail',{gmail:formData.email})).data.exists;
      if (ex) return alert('Account exists');
    }
    try {
      const r = await axios.post('http://localhost:5000'+ep, isLogin?{gmail:formData.email,pass:formData.password}:{name:formData.email.split('@')[0],gmail:formData.email,pass:formData.password,role:formData.role}, {withCredentials:true});
      localStorage.setItem('user',JSON.stringify(r.data.user));
      alert(r.data.message); nav('/');
    } catch(err) { alert(err.response?.data?.message||'Error'); }
  };

  return (
    <div className="form-container">
      <h2>{isLogin?'Login':'Signup'}</h2>
      <form onSubmit={submit}>
        <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handle} required/>
        <input name="password" type="password" placeholder="Password" value={formData.password} onChange={handle} required/>
        {!isLogin && <select name="role" value={formData.role} onChange={handle}><option value="buyer">Buyer</option><option value="seller">Seller</option></select>}
        <button type="submit">{isLogin?'Login':'Signup'}</button>
      </form>
      <button className="toggle-btn" onClick={()=>setIsLogin(x=>!x)}>Switch to {isLogin?'Signup':'Login'}</button>
      <hr/>
      <a className="google-btn" href="http://localhost:5000/auth/google">
        <img src="data:image/png;base64,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" alt="G" width={20} style={{marginRight:8}}/> Sign in with Google
      </a>
    </div>
  );
};
export default LoginSignup;


