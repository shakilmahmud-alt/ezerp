import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User } from 'lucide-react';

const PosLayout = () => {
  const { user, posTerminal } = useAuth();
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Protect POS routes
  if (!user || !posTerminal) {
    return <Navigate to="/pos/login" replace />;
  }

  const handleCustomerManagementClick = () => {
    setFileMenuOpen(false);
    navigate('/pos/customers');
  };

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
        fontWeight: '500',
        position: 'relative' // Added for absolute positioning of dropdowns
      }}>
        <div 
          ref={fileMenuRef} 
          style={{ position: 'relative' }}
        >
          <div 
            style={{ 
              cursor: 'pointer', 
              padding: '2px 8px',
              backgroundColor: fileMenuOpen ? '#ffffff' : 'transparent',
              color: fileMenuOpen ? '#000000' : '#ffffff',
              borderRadius: fileMenuOpen ? '2px 2px 0 0' : '0'
            }}
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
          >
            File
          </div>
          
          {fileMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              backgroundColor: '#ffffff',
              color: '#000000',
              minWidth: 'max-content', // changed to max-content to prevent wrapping
              boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
              zIndex: 1000,
              padding: '2px 0',
              border: '1px solid #ddd',
              whiteSpace: 'nowrap' // prevent text wrapping
            }}>
              <div 
                style={{ padding: '4px 20px 4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} 
                className="pos-menu-item"
                onClick={handleCustomerManagementClick}
              >
                <User size={14} /> Customer Management
              </div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Day Close Session</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Cash Return</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Issue Credit Note</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Stock Search</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Invoice Payment Type Change</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Manual Data Download-Upload</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Change Password</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Settings</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Data Sync</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Exit</div>
              
              <style>{`
                .pos-menu-item:hover {
                  background-color: #e5f1fb;
                }
              `}</style>
            </div>
          )}
        </div>
        <div style={{ cursor: 'pointer', padding: '2px 8px' }}>Inventory</div>
        <div style={{ cursor: 'pointer', padding: '2px 8px' }}>Report</div>
        <div style={{ cursor: 'pointer', padding: '2px 8px' }}>Help</div>
        <div style={{ cursor: 'pointer', padding: '2px 8px' }}>QuickDo</div>
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
