import React from 'react';
import { ShoppingCart, Package, Truck, Settings } from 'lucide-react';

const PosDashboard = () => {
  return (
    <div style={{ height: '100%', display: 'flex' }}>
      
      {/* Left Sidebar Actions */}
      <div style={{ 
        width: '60px', 
        backgroundColor: '#fcd34d', // Yellow sidebar from the image
        display: 'flex', 
        flexDirection: 'column' 
      }}>
        
        <div style={{ 
          padding: '15px 0', 
          backgroundColor: '#fca5a5', // Light red for cart 
          display: 'flex', 
          justifyContent: 'center', 
          cursor: 'pointer',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}>
          <ShoppingCart size={30} color="#000" />
        </div>
        
        <div style={{ 
          padding: '15px 0', 
          backgroundColor: '#bef264', // Lime green for package
          display: 'flex', 
          justifyContent: 'center', 
          cursor: 'pointer',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}>
          <Package size={30} color="#000" />
        </div>

        <div style={{ 
          padding: '15px 0', 
          backgroundColor: '#86efac', // Light green for truck
          display: 'flex', 
          justifyContent: 'center', 
          cursor: 'pointer',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}>
          <Truck size={30} color="#000" />
        </div>

        <div style={{ 
          padding: '15px 0', 
          backgroundColor: '#fde047', // Yellow for settings
          display: 'flex', 
          justifyContent: 'center', 
          cursor: 'pointer'
        }}>
          <Settings size={30} color="#000" />
        </div>

      </div>

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
