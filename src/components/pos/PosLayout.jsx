import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PosLayout = () => {
  const { user, posTerminal } = useAuth();

  // Protect POS routes
  if (!user || !posTerminal) {
    return <Navigate to="/pos/login" replace />;
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex', 
      flexDirection: 'column',
      backgroundImage: 'url(/pos-home.jpeg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: 'sans-serif'
    }}>
      {/* Top Header Menu area, like in the second image */}
      <div style={{
        backgroundColor: 'var(--accent-primary)', // changed from lime green
        padding: '5px 15px',
        display: 'flex',
        gap: '20px',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        <div style={{ cursor: 'pointer' }}>File</div>
        <div style={{ cursor: 'pointer' }}>Inventory</div>
        <div style={{ cursor: 'pointer' }}>Report</div>
        <div style={{ cursor: 'pointer' }}>Help</div>
        <div style={{ cursor: 'pointer' }}>QuickDo</div>
      </div>
      
      {/* Welcome Bar */}
      <div style={{
        backgroundColor: '#fff',
        padding: '5px 15px',
        borderBottom: '2px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ width: '20px', height: '2px', backgroundColor: '#000' }}></div>
          <div style={{ width: '20px', height: '2px', backgroundColor: '#000' }}></div>
          <div style={{ width: '20px', height: '2px', backgroundColor: '#000' }}></div>
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
          Welcome {user.name ? user.name.toUpperCase() : user.username.toUpperCase()}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Outlet />
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: 'var(--accent-primary)', // changed from lime green
        padding: '5px 15px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#ffffff'
      }}>
        <div>
          Developed by: <a href="https://shakilmahmud.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#ffffff', textDecoration: 'none' }}>Shakil Mahmud</a> | Version 1.0.0.0
        </div>
        <div>
          Terminal: {posTerminal.counter_id} | Store: {posTerminal.store_name}
        </div>
      </div>
    </div>
  );
};

export default PosLayout;
