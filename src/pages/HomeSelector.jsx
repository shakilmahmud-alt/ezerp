import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MonitorSmartphone, BarChart3 } from 'lucide-react';

const HomeSelector = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f2f5',
      backgroundImage: 'radial-gradient(circle at top left, #ffffff, #f0f2f5 70%)',
      padding: '20px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <img src="/EZ-ERP-LOGO-WIDE.png" alt="EG ERP Logo" style={{ height: '70px', marginBottom: '15px' }} />
        <p style={{ color: '#666', fontSize: '1.1rem', margin: 0 }}>Select your portal to continue</p>
      </div>

      <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1050px' }}>
        
        {/* Central Store Option */}
        <div 
          onClick={() => navigate('/dashboard')}
          style={{
            backgroundColor: 'var(--card-bg)',
            padding: '35px 25px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            width: '270px',
            transition: 'transform 0.3s, box-shadow 0.3s',
            border: '2px solid transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-10px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)';
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <div style={{ 
            width: '76px', 
            height: '76px', 
            borderRadius: '50%', 
            backgroundColor: 'rgba(46, 111, 64, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Store size={38} color="var(--accent-primary)" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: 'var(--text-primary)' }}>Central Store</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Manage inventory, catalog, HR, and operations for the network.
            </p>
          </div>
        </div>

        {/* POS Option */}
        <div 
          onClick={() => navigate('/pos')}
          style={{
            backgroundColor: 'var(--card-bg)',
            padding: '35px 25px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            width: '270px',
            transition: 'transform 0.3s, box-shadow 0.3s',
            border: '2px solid transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-10px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)';
            e.currentTarget.style.borderColor = '#10b981';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <div style={{ 
            width: '76px', 
            height: '76px', 
            borderRadius: '50%', 
            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <MonitorSmartphone size={38} color="#10b981" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: 'var(--text-primary)' }}>POS</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Point of Sale counter terminal system for retail branches.
            </p>
          </div>
        </div>

        {/* MIS Option */}
        <div 
          onClick={() => navigate('/mis')}
          style={{
            backgroundColor: 'var(--card-bg)',
            padding: '35px 25px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            width: '270px',
            transition: 'transform 0.3s, box-shadow 0.3s',
            border: '2px solid transparent'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-10px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)';
            e.currentTarget.style.borderColor = '#0284c7';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.08)';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <div style={{ 
            width: '76px', 
            height: '76px', 
            borderRadius: '50%', 
            backgroundColor: 'rgba(2, 132, 199, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <BarChart3 size={38} color="#0284c7" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: 'var(--text-primary)' }}>MIS</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Management Information System & Comprehensive Analytics Reports.
            </p>
          </div>
        </div>

      </div>
      
      <div style={{ marginTop: '50px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        Developed by: MSM-WEB | Version 1.3.0.0
      </div>
    </div>
  );
};

export default HomeSelector;
