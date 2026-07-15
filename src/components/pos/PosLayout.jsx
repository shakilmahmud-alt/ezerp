import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, ShoppingCart, Package, Truck, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

const PosLayout = () => {
  const { user, posTerminal, logout } = useAuth();
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  const fileMenuRef = useRef(null);
  const hamburgerMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target)) {
        setFileMenuOpen(false);
      }
      if (hamburgerMenuRef.current && !hamburgerMenuRef.current.contains(event.target)) {
        setHamburgerMenuOpen(false);
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

  const handleStockSearchClick = () => {
    setFileMenuOpen(false);
    navigate('/pos/stock-search');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast.error('New password and confirm password do not match');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('password')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      if (data.password !== passwords.current) {
        toast.error('Current password is incorrect');
        return;
      }
      
      const { error: updateError } = await supabase
        .from('employees')
        .update({ password: passwords.new })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      toast.success('Password changed successfully');
      setPasswordModalOpen(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error('Failed to change password');
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/pos/login');
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
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item" onClick={handleStockSearchClick}>Stock Search</div>
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
        <div 
          ref={hamburgerMenuRef}
          style={{ position: 'relative' }}
        >
          <div 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '3px', padding: '5px' }}
            onClick={() => setHamburgerMenuOpen(!hamburgerMenuOpen)}
          >
            <div style={{ width: '20px', height: '2px', backgroundColor: '#000' }}></div>
            <div style={{ width: '20px', height: '2px', backgroundColor: '#000' }}></div>
            <div style={{ width: '20px', height: '2px', backgroundColor: '#000' }}></div>
          </div>
          
          {hamburgerMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              backgroundColor: '#ffffff',
              color: '#000000',
              minWidth: '150px',
              boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
              zIndex: 1000,
              padding: '2px 0',
              border: '1px solid #ddd',
            }}>
              <div 
                style={{ padding: '8px 15px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => {
                  setHamburgerMenuOpen(false);
                  setPasswordModalOpen(true);
                }}
              >
                Change password
              </div>
              <div 
                style={{ padding: '8px 15px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={handleSignOut}
              >
                Sign Out
              </div>
            </div>
          )}
        </div>
        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
          Welcome {user.name ? user.name.toUpperCase() : user.username.toUpperCase()}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        
        {/* Global POS Left Sidebar Actions */}
        <div style={{ 
          width: '60px', 
          backgroundColor: '#ffffff', 
          borderRight: '1px solid #ddd',
          display: 'flex', 
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div 
            className="pos-sidebar-item"
            style={{ 
              padding: '15px 0', 
              display: 'flex', 
              justifyContent: 'center', 
              cursor: 'pointer',
              borderBottom: '1px solid #eee'
            }}>
            <ShoppingCart size={30} color="var(--accent-primary)" />
          </div>
          
          <div 
            className="pos-sidebar-item"
            style={{ 
              padding: '15px 0', 
              display: 'flex', 
              justifyContent: 'center', 
              cursor: 'pointer',
              borderBottom: '1px solid #eee'
            }}>
            <Package size={30} color="var(--accent-primary)" />
          </div>

          <div 
            className="pos-sidebar-item"
            style={{ 
              padding: '15px 0', 
              display: 'flex', 
              justifyContent: 'center', 
              cursor: 'pointer',
              borderBottom: '1px solid #eee'
            }}>
            <Truck size={30} color="var(--accent-primary)" />
          </div>

          <div 
            className="pos-sidebar-item"
            style={{ 
              padding: '15px 0', 
              display: 'flex', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }}>
            <Settings size={30} color="var(--accent-primary)" />
          </div>
          <style>{`
            .pos-sidebar-item {
              transition: all 0.2s;
            }
            .pos-sidebar-item:hover {
              background-color: rgba(46, 111, 64, 0.1);
            }
          `}</style>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, position: 'relative', overflow: 'auto' }}>
          <Outlet />
        </div>
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

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 2000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '350px' }}>
            <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>Current Password</label>
                <input 
                  type="password" 
                  required
                  value={passwords.current}
                  onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                  style={{ width: '100%', padding: '6px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>New Password</label>
                <input 
                  type="password" 
                  required
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  style={{ width: '100%', padding: '6px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>Confirm Password</label>
                <input 
                  type="password" 
                  required
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  style={{ width: '100%', padding: '6px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="submit" style={{ padding: '6px 15px', backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Save</button>
                <button type="button" onClick={() => setPasswordModalOpen(false)} style={{ padding: '6px 15px', backgroundColor: '#e0e0e0', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosLayout;
