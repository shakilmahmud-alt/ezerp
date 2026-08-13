import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const success = await login(username, password);
    if (success) {
      navigate('/');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', backgroundImage: 'radial-gradient(circle at top left, #ffffff, #cbd5e1 80%)' }}>
      <div className="glass-panel" style={{ 
        width: '100%', 
        maxWidth: '420px', 
        borderRadius: '8px', 
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 249, 255, 0.8) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: 'inset 0 1px 0 #ffffff, inset 0 0 0 1px rgba(0, 0, 0, 0.05), 0 15px 35px rgba(0, 0, 0, 0.25)'
      }}>
        
        {/* Windows 7 Aero Glass Title Bar */}
        <div style={{
          background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 46%, #1b4527 50%, #29683c 100%)',
          padding: '12px 20px',
          textAlign: 'center',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '16px',
          letterSpacing: '0.5px',
          borderBottom: '1px solid #1a4427',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 2px 5px rgba(0,0,0,0.2)',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)'
        }}>
          EZ ERP SYSTEM LOGIN
        </div>

        <div style={{ padding: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <img src="/EZ-ERP-LOGO-WIDE.png" alt="EG ERP Logo" style={{ height: '55px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
            <p style={{ color: '#475569', fontSize: '13px', margin: '8px 0 0 0', fontWeight: '500' }}>Enter your credentials to access ERP</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontSize: '14px', fontWeight: '500' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}>
                  <User size={18} />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 12px 12px 40px', 
                    border: '1px solid #ddd', 
                    borderRadius: '6px', 
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontSize: '14px', fontWeight: '500' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}>
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px 12px 12px 40px', 
                    border: '1px solid #ddd', 
                    borderRadius: '6px', 
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-theme"
              style={{ 
                width: '100%', 
                padding: '14px', 
                fontSize: '16px', 
                fontWeight: '600',
                borderRadius: '6px',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
