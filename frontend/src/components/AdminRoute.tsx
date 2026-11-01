import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function AdminRoute({ children }: { children: (email: string) => ReactNode }) {
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    api.adminSession().then(session => { if (active && session.authenticated) setEmail(session.email); else if (active) navigate('/admin/login', { replace: true }); })
      .catch(() => { if (active) navigate('/admin/login', { replace: true }); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [navigate]);
  if (checking || !email) return <div className="auth-check"><span className="spinner"/> Checking administrator session…</div>;
  return <>{children(email)}</>;
}
