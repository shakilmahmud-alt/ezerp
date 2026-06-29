import React from 'react';
import { Bell, Search, User, Menu } from 'lucide-react';

const Topbar = ({ isOpen, toggleSidebar }) => {
  return (
    <header className="topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 'var(--topbar-height)', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--glass-blur)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {!isOpen && (
          <div style={{ cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center' }} onClick={toggleSidebar}>
            <Menu size={24} color="var(--text-primary)" />
          </div>
        )}
        <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', padding: '8px 16px', width: '300px', border: '1px solid rgba(0,0,0,0.1)' }}>
        <Search size={18} className="text-muted" color="var(--text-secondary)" style={{ marginRight: '8px' }} />
        <input 
          type="text" 
          placeholder="Search everywhere..." 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontFamily: 'var(--font-body)' }}
        />
      </div>
      </div>
      
      <div className="actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button className="btn-glass" style={{ width: '40px', height: '40px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={18} />
        </button>
        <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Admin User</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>admin@eg.com.bd</div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} color="white" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
