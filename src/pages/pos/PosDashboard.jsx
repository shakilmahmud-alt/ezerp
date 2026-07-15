import React from 'react';
const PosDashboard = () => {
  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* Main Center Area */}
      <div style={{ flex: 1, padding: '20px' }}>
        <button style={{
          backgroundColor: '#fbbf24', // Yellowish orange button 'Standard'
          border: 'none',
          padding: '10px 40px',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#fff',
          borderRadius: '4px',
          cursor: 'pointer',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          Standard
        </button>
      </div>

    </div>
  );
};

export default PosDashboard;
