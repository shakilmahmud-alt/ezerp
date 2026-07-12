import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const PosLogin = () => {
  const [terminalId, setTerminalId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { posLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!terminalId || !username || !password) {
      toast.error('All fields are required');
      return;
    }
    
    setIsSubmitting(true);
    
    const success = await posLogin(username, password, terminalId);
    if (success) {
      navigate('/pos');
    }
    
    setIsSubmitting(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'url(/pos-home.jpeg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        width: '600px',
        backgroundColor: '#ffffff', // changed to white
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'var(--accent-primary)', // Theme green
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#ffffff',
          fontWeight: 'bold'
        }}>
          <div style={{ flex: 1, textAlign: 'center', fontSize: '18px' }}>
            CLOUD POS
          </div>
          <div style={{ fontSize: '12px' }}>
            Version 2.2.2.7
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '30px', display: 'flex' }}>
          
          {/* Left Side (Logo) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-color)', paddingRight: '20px' }}>
            <img src="/EZ-ERP-LOGO.png" alt="Logo" style={{ maxWidth: '150px', maxHeight: '150px', objectFit: 'contain' }} />
          </div>

          {/* Right Side (Form) */}
          <div style={{ flex: 1, paddingLeft: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
               <img src="/EZ-ERP-LOGO-WIDE.png" alt="Cloud POS" style={{ height: '40px' }} />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '80px', fontSize: '14px', fontWeight: 'bold' }}>Terminal</label>
                <input 
                  type="text" 
                  value={terminalId}
                  onChange={(e) => setTerminalId(e.target.value)}
                  style={{ flex: 1, padding: '5px', border: '1px solid #ccc' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '80px', fontSize: '14px', fontWeight: 'bold' }}>User Name</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ flex: 1, padding: '5px', border: '1px solid #ccc' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '80px', fontSize: '14px', fontWeight: 'bold' }}>Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ flex: 1, padding: '5px', border: '1px solid #ccc' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  style={{ 
                    backgroundColor: 'var(--accent-primary)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '8px 25px', 
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 15px rgba(46, 111, 64, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                  }}
                >
                  {isSubmitting ? '...' : 'Login'}
                </button>
                <button 
                  type="button" 
                  onClick={() => navigate('/')}
                  style={{ 
                    backgroundColor: 'var(--danger)', 
                    color: 'white', 
                    border: 'none', 
                    padding: '8px 25px', 
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 15px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                  }}
                >
                  Close
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          backgroundColor: '#f3f4f6',
          padding: '10px 20px',
          fontSize: '11px',
          fontWeight: 'bold',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          Developed by: <a href="https://shakilmahmud.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Shakil Mahmud</a> | Version 1.0.0.0
        </div>
      </div>
    </div>
  );
};

export default PosLogin;
