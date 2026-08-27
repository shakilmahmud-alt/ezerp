import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  ShoppingBag, 
  Layers, 
  FileSpreadsheet, 
  Briefcase, 
  CheckSquare, 
  Truck, 
  RotateCcw, 
  Trash2, 
  Gift, 
  Users, 
  Menu, 
  User, 
  Key, 
  LogOut,
  Plus,
  Minus,
  X
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const MisLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileRef = useRef(null);

  const toggleMenu = (name, e) => {
    if (e) e.preventDefault();
    setExpandedMenus(prev => {
      if (prev[name]) {
        return {};
      } else {
        return { [name]: true };
      }
    });
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/mis', icon: <Home size={18} /> },
    { 
      name: 'Sales Reports', 
      path: '/mis/sales-reports', 
      icon: <ShoppingBag size={18} />,
      subItems: [
        { name: 'Multiple Reports Sale', path: '/mis/sales-reports/multiple-reports-sale' },
        { name: 'Itemwise Sale Report', path: '/mis/sales-reports/itemwise-sale-report' },
        { name: 'Shopwise Sales Analysis Report', path: '/mis/sales-reports/shopwise-sales-analysis-report' },
        { name: 'Promotion wise Sale Report', path: '/mis/sales-reports/promotion-wise-sale-report' },
        { name: 'Itemwise Profit Report', path: '/mis/sales-reports/itemwise-profit-report' },
        { name: 'User Wise Invoice Summary Report', path: '/mis/sales-reports/user-wise-invoice-summary-report' },
        { name: 'Slow or Fast or Non Moving', path: '/mis/sales-reports/slow-fast-non-moving' },
      ]
    },
    { 
      name: 'Stock Reports', 
      path: '/mis/stock-reports', 
      icon: <Layers size={18} />,
      subItems: [
        { name: 'Current Stock Report', path: '/mis/stock-reports/current' },
        { name: 'Product Stock Journal', path: '/mis/stock-reports/journal' },
        { name: 'Warehouse Stock Report', path: '/mis/stock-reports/warehouse' },
      ]
    },
    { 
      name: 'Purchase Order Reports', 
      path: '/mis/purchase-order-reports', 
      icon: <FileSpreadsheet size={18} />,
      subItems: [
        { name: 'PO Summary Report', path: '/mis/purchase-order-reports/summary' },
        { name: 'Pending PO Report', path: '/mis/purchase-order-reports/pending' },
      ]
    },
    { 
      name: 'Purchase Reports', 
      path: '/mis/purchase-reports', 
      icon: <Briefcase size={18} />,
      subItems: [
        { name: 'Purchase Receive Report', path: '/mis/purchase-reports/receive' },
        { name: 'Vendor Purchase Report', path: '/mis/purchase-reports/vendor' },
      ]
    },
    { 
      name: 'Requisition Reports', 
      path: '/mis/requisition-reports', 
      icon: <CheckSquare size={18} />,
      subItems: [
        { name: 'Store Requisition Report', path: '/mis/requisition-reports/store' },
        { name: 'Requisition Approval Report', path: '/mis/requisition-reports/approval' },
      ]
    },
    { 
      name: 'Delivery Reports', 
      path: '/mis/delivery-reports', 
      icon: <Truck size={18} />,
      subItems: [
        { name: 'Store Delivery Report', path: '/mis/delivery-reports/store' },
        { name: 'Challan Delivery Log', path: '/mis/delivery-reports/challan' },
      ]
    },
    { 
      name: 'Purchase Return Reports', 
      path: '/mis/purchase-return-reports', 
      icon: <RotateCcw size={18} />,
      subItems: [
        { name: 'Purchase Return Summary', path: '/mis/purchase-return-reports/summary' },
        { name: 'Vendor Debit Report', path: '/mis/purchase-return-reports/debit' },
      ]
    },
    { 
      name: 'Damage and Lost Reports', 
      path: '/mis/damage-lost-reports', 
      icon: <Trash2 size={18} />,
      subItems: [
        { name: 'Damage Loss Summary', path: '/mis/damage-lost-reports/summary' },
        { name: 'Scrap & Lost Log', path: '/mis/damage-lost-reports/scrap' },
      ]
    },
    { 
      name: 'Promotional Reports', 
      path: '/mis/promotional-reports', 
      icon: <Gift size={18} />,
      subItems: [
        { name: 'Active Promo Report', path: '/mis/promotional-reports/active' },
        { name: 'Discount Circular Report', path: '/mis/promotional-reports/discount' },
      ]
    },
    { 
      name: 'CRM', 
      path: '/mis/crm-reports', 
      icon: <Users size={18} />,
      subItems: [
        { name: 'Customer Report', path: '/mis/crm-reports/customer' },
        { name: 'Point Earn Report', path: '/mis/crm-reports/points' },
      ]
    },
  ];

  const displayName = (user?.username === 'msmraqeeb@gmail.com' || user?.username === 'admin@email.com') 
    ? 'Super Admin' 
    : (user?.name || user?.username || 'Admin User');

  const displayRole = (user?.username === 'msmraqeeb@gmail.com' || user?.username === 'admin@email.com')
    ? 'Administrator'
    : (user?.designation || user?.role || 'StoreManager');

  return (
    <div className={`app-container ${isSidebarOpen ? '' : 'sidebar-closed'}`} style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      
      {/* Top Navbar with Project Brand Green Aero Glass Styling */}
      <header style={{
        height: '54px',
        background: 'linear-gradient(180deg, #3d8b52 0%, #2e6f40 48%, #1f502d 52%, #29683c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        color: '#ffffff',
        borderBottom: '1px solid #1a4427',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 3px 10px rgba(0, 0, 0, 0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0
      }}>
        {/* Left: Logo & Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div 
            onClick={() => navigate('/mis')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <img src="/EZ-ERP-LOGO-WIDE.png" alt="EZ ERP Logo" style={{ height: '36px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          </div>

          <div 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{ cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
            title="Toggle Sidebar"
          >
            <Menu size={20} color="#ffffff" />
          </div>
        </div>

        {/* Right: User Profile */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '4px 12px',
              borderRadius: '6px',
              transition: 'background-color 0.2s',
              backgroundColor: showProfileMenu ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <User size={18} color="#ffffff" />
            </div>

            <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#dcfce7' }}>
                {displayRole}
              </div>
            </div>
          </div>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              border: '1px solid #e2e8f0',
              minWidth: '200px',
              overflow: 'hidden',
              zIndex: 1000
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f0fdf4' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: '#166534' }}>{displayName}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{displayRole}</div>
              </div>

              <div 
                onClick={() => {
                  setShowPasswordModal(true);
                  setShowProfileMenu(false);
                }}
                style={{
                  padding: '11px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Key size={16} color="#2e6f40" />
                Change Password
              </div>

              <div 
                onClick={handleLogout}
                style={{
                  padding: '11px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: '#dc2626',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut size={16} color="#dc2626" />
                Logout
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Container with Sidebar + Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* Sidebar strictly matching Central Store Menu design */}
        <aside className="sidebar" style={{ 
          width: isSidebarOpen ? 'var(--sidebar-width, 260px)' : '0px',
          height: '100%',
          borderRight: isSidebarOpen ? '1px solid rgba(0,0,0,0.08)' : 'none',
          backgroundColor: '#ffffff'
        }}>
          <nav className="nav-links" style={{ minWidth: '260px' }}>
            {navItems.map((item, index) => {
              const isExpanded = expandedMenus[item.name];
              const hasSub = item.subItems && item.subItems.length > 0;
              const showToggle = hasSub;

              return (
                <div key={item.name} className="nav-item-container">
                  <div className="nav-item-wrapper">
                    <div 
                      className="nav-toggle"
                      onClick={(e) => showToggle && toggleMenu(item.name, e)}
                      style={{ visibility: showToggle ? 'visible' : 'hidden', cursor: showToggle ? 'pointer' : 'default' }}
                    >
                      {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                    </div>
                    
                    <NavLink 
                      to={item.path} 
                      className={({ isActive }) => `nav-item ${isActive && !hasSub ? 'active' : ''}`}
                      onClick={(e) => {
                        if (hasSub) {
                          e.preventDefault();
                          toggleMenu(item.name, e);
                        }
                      }}
                    >
                      <div className="nav-icon" style={{ width: 24, display: 'flex', justifyContent: 'center' }}>
                        {item.icon}
                      </div>
                      <span>{item.name}</span>
                    </NavLink>
                  </div>

                  {hasSub && isExpanded && (
                    <div className="sub-menu">
                      <div className="sub-menu-line"></div>
                      {item.subItems.map((sub, subIndex) => (
                        <NavLink 
                          key={subIndex} 
                          to={sub.path} 
                          className={({ isActive }) => `sub-nav-item ${isActive ? 'active' : ''}`}
                        >
                          <span className="sub-menu-dash"></span>
                          <span>{sub.name}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          
          {/* Breadcrumb / Title Bar */}
          <div style={{
            height: '42px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#1e293b',
            flexShrink: 0
          }}>
            {location.pathname === '/mis' ? 'Home Page' : navItems.find(m => location.pathname.startsWith(m.path))?.name || 'MIS Report'}
          </div>

          {/* Page Content View */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Outlet />
          </div>

        </main>
      </div>

      {/* Footer matching user requested format */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '10px 20px',
        textAlign: 'center',
        fontSize: '0.84rem',
        color: '#64748b',
        flexShrink: 0
      }}>
        Developed by: <a href="https://shakilmahmud.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#2e6f40', textDecoration: 'none', fontWeight: 600 }}>Shakil Mahmud</a> | Version 1.0.0.0
      </footer>

      {/* Change Password Modal */}
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
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#166534', fontWeight: 'bold' }}>Change Password</h3>
              <div onClick={() => setShowPasswordModal(false)} style={{ cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowPasswordModal(false)}
                  style={{ padding: '7px 16px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', color: '#475569', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-theme"
                  disabled={isChangingPassword}
                  style={{ padding: '7px 18px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                >
                  {isChangingPassword ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default MisLayout;
