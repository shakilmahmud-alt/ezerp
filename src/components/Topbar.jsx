import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, User, Menu, ChevronDown, LogOut, Key } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const Topbar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const searchRef = useRef(null);
  const profileRef = useRef(null);

  const routes = [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Category', path: '/catalog/category' },
    { name: 'Subcategory', path: '/catalog/subcategory' },
    { name: 'Sub sub-category', path: '/catalog/sub-sub-category' },
    { name: 'Brand', path: '/catalog/brand' },
    { name: 'VAT Policy Setup', path: '/catalog/vat-policy' },
    { name: 'Vendor', path: '/catalog/vendor' },
    { name: 'Product', path: '/catalog/product' },
    { name: 'Product Quick Search', path: '/catalog/product-quick-search' },
    { name: 'Vendorwise Product List', path: '/catalog/vendorwise-product-list' },
    { name: 'Store Transfer Permission', path: '/catalog/store-transfer-permission' },
    { name: 'Purchase Order by Vendor', path: '/inventory/purchase-order-vendor' },
    { name: 'Purchase Receive', path: '/inventory/purchase-receive' },
    { name: 'Purchase Return', path: '/inventory/purchase-return' },
    { name: 'Receive From Shop', path: '/inventory/receive-from-shop' },
    { name: 'Damage and Lost', path: '/inventory/damage-and-lost' },
    { name: 'Store Delivery', path: '/inventory/store-delivery' },
    { name: 'Barcode Print', path: '/inventory/barcode-print' },
    { name: 'Reprint', path: '/inventory/reprint' },
    { name: 'Price Change (Excel)', path: '/promotion/price-change-excel' },
    { name: 'Promotion', path: '/promotion/promotion' },
    { name: 'Customer Type', path: '/crm/customer-type' },
    { name: 'Customer Entry', path: '/crm/customer-entry' },
    { name: 'Point Earn Policy', path: '/crm/point-earn-policy' },
    { name: 'Customer Report', path: '/crm/customer-report' },
    { name: 'Requisition Approval', path: '/approval/requisition-approval' },
    { name: 'Area', path: '/store/area' },
    { name: 'Store List', path: '/store/store-list' },
    { name: 'Terminal', path: '/store/terminal' },
    { name: 'POS Distribution', path: '/store/pos-distribution' },
    { name: 'Designation', path: '/employee/designation' },
    { name: 'Employee List', path: '/employee/employee-list' },
    { name: 'User Menu Distribution', path: '/employee/user-menu-distribution' },
    { name: 'Payment Method', path: '/employee/payment-method' }
  ];

  const filteredRoutes = routes.filter(route => 
    route.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
        setShowProfileMenu(false);
      }
    };

    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, showProfileMenu, query, filteredRoutes, navigate]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const { data, error: verifyError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', user.id)
        .eq('password', currentPassword)
        .single();
        
      if (verifyError || !data) {
        toast.error('Incorrect current password');
        setIsChangingPassword(false);
        return;
      }
      
      const { error: updateError } = await supabase
        .from('employees')
        .update({ password: newPassword })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowProfileMenu(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSelect = (path) => {
    navigate(path);
    setQuery('');
    setShowDropdown(false);
  };

  return (
    <header className="topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 'var(--topbar-height)', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {!isOpen && (
          <div style={{ cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center' }} onClick={toggleSidebar}>
            <Menu size={24} color="var(--text-primary)" />
          </div>
        )}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '8px 16px', width: '300px', border: '1px solid rgba(0,0,0,0.1)' }}>
            <Search size={18} className="text-muted" color="var(--text-secondary)" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search everywhere..." 
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontFamily: 'var(--font-body)' }}
            />
          </div>
          {showDropdown && query && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, width: '100%',
              backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
              borderRadius: '8px', marginTop: '5px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              zIndex: 1000, maxHeight: '300px', overflowY: 'auto', padding: '5px'
            }}>
              {filteredRoutes.length > 0 ? (
                filteredRoutes.map((route, i) => (
                  <div 
                    key={i}
                    onClick={() => handleSelect(route.path)}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', borderRadius: '4px',
                      color: 'var(--text-primary)', fontSize: '13px'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {route.name}
                  </div>
                ))
              ) : (
                <div style={{ padding: '8px 12px', color: 'gray', fontSize: '13px' }}>No pages found</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button className="btn-glass" style={{ width: '40px', height: '40px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={18} />
        </button>
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div 
            className="user-profile" 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                {(user?.username === 'msmraqeeb@gmail.com' || user?.username === 'admin@email.com') ? 'Super Admin' : (user?.name || 'Admin User')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {(user?.username === 'msmraqeeb@gmail.com' || user?.username === 'admin@email.com') ? 'Logged in Central Store' : 'Logged in Store'}
              </div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} color="white" />
            </div>
          </div>
          
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '10px',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              width: '180px',
              overflow: 'hidden',
              zIndex: 1000
            }}>
              <div 
                style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}
                onClick={() => {
                  setShowPasswordModal(true);
                  setShowProfileMenu(false);
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Key size={16} /> <span style={{ fontSize: '0.85rem' }}>Change Password</span>
              </div>
              <div 
                style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--danger)' }}
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut size={16} /> <span style={{ fontSize: '0.85rem' }}>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            backgroundColor: 'var(--bg-color)',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Change Password</h3>
            </div>
            
            <form onSubmit={handleChangePassword} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowPasswordModal(false)}
                  style={{ padding: '8px 15px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-theme"
                  disabled={isChangingPassword}
                  style={{ padding: '8px 15px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {isChangingPassword ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};

export default Topbar;
