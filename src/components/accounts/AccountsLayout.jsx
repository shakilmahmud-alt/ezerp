import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Receipt, CreditCard, HandCoins, 
  TrendingDown, Users, Landmark, BarChart3, 
  LogOut, Home, ChevronRight, Menu, X, Wallet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AccountsLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { name: 'Dashboard', path: '/accounts', icon: <LayoutDashboard size={18} /> },
    { name: 'Voucher Entry', path: '/accounts/vouchers', icon: <Receipt size={18} /> },
    { name: 'Accounts Payable', path: '/accounts/payables', icon: <CreditCard size={18} /> },
    { name: 'Accounts Receivable', path: '/accounts/receivables', icon: <HandCoins size={18} /> },
    { name: 'Expense Management', path: '/accounts/expenses', icon: <TrendingDown size={18} /> },
    { name: 'Staff Salary & Payroll', path: '/accounts/payroll', icon: <Users size={18} /> },
    { name: 'Chart of Accounts & Bank', path: '/accounts/chart-of-accounts', icon: <Landmark size={18} /> },
    { name: 'Financial Reports', path: '/accounts/reports', icon: <BarChart3 size={18} /> }
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const activeItem = menuItems.find(m => m.path === location.pathname) || menuItems[0];
  const userName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name : '') || 'Accounts Manager';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
      
      {/* SIDEBAR */}
      <aside style={{
        width: sidebarOpen ? '260px' : '0px',
        minWidth: sidebarOpen ? '260px' : '0px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease, min-width 0.3s ease',
        overflow: 'hidden',
        zIndex: 50,
        boxShadow: '4px 0 15px rgba(0,0,0,0.1)'
      }}>
        {/* Brand Header */}
        <div style={{
          padding: '20px 18px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)'
          }}>
            <Wallet size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', letterSpacing: '0.5px' }}>
              EZ ERP
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
              Accounts & Finance Portal
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '6px 10px', marginBottom: '4px' }}>
            Main Menu
          </div>
          {menuItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/accounts' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/accounts'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#fff' : '#94a3b8',
                  backgroundColor: isActive ? '#2e6f40' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#1e293b';
                    e.currentTarget.style.color = '#f1f5f9';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Portal Switcher in Sidebar Footer */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #1e293b',
          backgroundColor: '#090d16'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '10px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#334155'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1e293b'}
          >
            <Home size={15} />
            Switch Portal
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {userName}
              </div>
              <div style={{ fontSize: '11px', color: '#22c55e' }}>
                ● Active Manager
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* TOP NAVBAR */}
        <header style={{
          height: '56px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                borderRadius: '4px'
              }}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Portal Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
              <span style={{ fontWeight: 600, color: '#8b5cf6' }}>Accounts Portal</span>
              <ChevronRight size={14} />
              <span style={{ color: '#0f172a', fontWeight: 600 }}>{activeItem.name}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/')}
              className="win7-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <Home size={14} />
              All Portals
            </button>
          </div>
        </header>

        {/* CONTENT VIEWPORT */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

    </div>
  );
};

export default AccountsLayout;
