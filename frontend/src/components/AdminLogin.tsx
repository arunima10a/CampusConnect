import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../services/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setFieldError('');
    if (!email.trim() || !password) { setFieldError('Enter your administrator email and password.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFieldError('Enter a valid administrator email address.'); return; }
    setBusy(true);
    try { await api.login(email.trim(), password); navigate('/admin', { replace: true }); }
    catch (err) { setError(err instanceof ApiError ? (err.message === 'Invalid email or password' ? 'Invalid email or password.' : err.message) : 'Could not reach the sign-in service. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="auth-page"><div className="auth-card"><div className="auth-mark"><Sparkles size={22}/></div><div className="eyebrow">CAMPUSCONNECT · MANAGEMENT</div><h1>Welcome back</h1><p className="auth-subtitle">Sign in to manage campus events.</p><form onSubmit={submit} noValidate><label htmlFor="admin-email">Administrator email</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@college.edu" required/><label htmlFor="admin-password">Password</label><div className="password-field"><input id="admin-password" type={showPassword?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>{fieldError&&<p className="inline-error">{fieldError}</p>}{error&&<p className="inline-error" role="alert">{error}</p>}<button className="btn primary auth-submit" disabled={busy}>{busy?<><span className="spinner"/> Signing in…</>:<>Sign in securely <ArrowRight size={16}/></>}</button></form><div className="auth-security"><LockKeyhole size={14}/> Protected administrator access</div></div><p className="auth-foot">CampusConnect · Student and campus life, connected.</p></section>
}
