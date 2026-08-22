import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, ShoppingCart, Package, Truck, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

const PosLayout = () => {
  const { user, posTerminal, logout, loading } = useAuth();
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [saleSubmenuOpen, setSaleSubmenuOpen] = useState(false);
  const [stockSubmenuOpen, setStockSubmenuOpen] = useState(false);

  const fileMenuRef = useRef(null);
  const hamburgerMenuRef = useRef(null);
  const inventoryMenuRef = useRef(null);
  const reportMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target)) {
        setFileMenuOpen(false);
      }
      if (hamburgerMenuRef.current && !hamburgerMenuRef.current.contains(event.target)) {
        setHamburgerMenuOpen(false);
      }
      if (inventoryMenuRef.current && !inventoryMenuRef.current.contains(event.target)) {
        setInventoryMenuOpen(false);
      }
      if (reportMenuRef.current && !reportMenuRef.current.contains(event.target)) {
        setReportMenuOpen(false);
        setSaleSubmenuOpen(false);
        setStockSubmenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading POS...</div>;
  }

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
      {/* Top Header Menu area with Windows 7 Aero Glass Styling */}
      <div style={{
        background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 46%, #1b4527 50%, #29683c 100%)',
        padding: '6px 16px',
        display: 'flex',
        gap: '15px',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '600',
        position: 'relative',
        borderBottom: '1px solid #1a4427',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 3px 10px rgba(0, 0, 0, 0.25)',
        textShadow: '0 1px 1px rgba(0, 0, 0, 0.3)'
      }}>
        <div 
          ref={fileMenuRef} 
          style={{ position: 'relative' }}
        >
          <div 
            style={{ 
              cursor: 'pointer', 
              padding: '3px 12px',
              background: fileMenuOpen ? 'linear-gradient(180deg, #ffffff 0%, #e0f2fe 50%, #bae6fd 100%)' : 'transparent',
              color: fileMenuOpen ? '#0f172a' : '#ffffff',
              borderRadius: '4px 4px 0 0',
              border: fileMenuOpen ? '1px solid #7dd3fc' : '1px solid transparent',
              borderBottom: fileMenuOpen ? 'none' : '1px solid transparent',
              boxShadow: fileMenuOpen ? 'inset 0 1px 0 #ffffff' : 'none',
              textShadow: fileMenuOpen ? 'none' : '0 1px 1px rgba(0, 0, 0, 0.3)'
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
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.96) 100%)',
              color: '#0f172a',
              minWidth: 'max-content',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 #ffffff',
              zIndex: 1000,
              padding: '4px 0',
              border: '1px solid #7dd3fc',
              borderRadius: '0 4px 6px 6px',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(10px)'
            }}>
              <div 
                style={{ padding: '6px 20px 6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} 
                className="pos-menu-item"
                onClick={handleCustomerManagementClick}
              >
                <User size={14} /> Customer Management
              </div>
              <div style={{ padding: '6px 20px 6px 32px', cursor: 'pointer' }} className="pos-menu-item">Day Close Session</div>
              <div style={{ padding: '6px 20px 6px 32px', cursor: 'pointer' }} className="pos-menu-item">Cash Return</div>
              <div style={{ padding: '6px 20px 6px 32px', cursor: 'pointer' }} className="pos-menu-item">Issue Credit Note</div>
              <div style={{ padding: '6px 20px 6px 32px', cursor: 'pointer' }} className="pos-menu-item" onClick={handleStockSearchClick}>Stock Search</div>
              <div 
                style={{ padding: '6px 20px 6px 32px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => {
                  setFileMenuOpen(false);
                  navigate('/pos/payment-type-change');
                }}
              >
                Invoice Payment Type Change
              </div>
              <div style={{ padding: '6px 20px 6px 32px', cursor: 'pointer' }} className="pos-menu-item">Manual Data Download-Upload</div>
              <div style={{ padding: '6px 20px 6px 32px', cursor: 'pointer' }} className="pos-menu-item">Change Password</div>
              <div style={{ padding: '6px 20px 6px 32px', cursor: 'pointer' }} className="pos-menu-item">Settings</div>
              <div style={{ padding: '6px 20px 6px 32px', cursor: 'pointer' }} className="pos-menu-item">Data Sync</div>
              <div style={{ padding: '6px 20px 6px 32px', cursor: 'pointer' }} className="pos-menu-item">Exit</div>
            </div>
          )}
        </div>

        <div 
          ref={inventoryMenuRef} 
          style={{ position: 'relative' }}
        >
          <div 
            style={{ 
              cursor: 'pointer', 
              padding: '3px 12px',
              background: inventoryMenuOpen ? 'linear-gradient(180deg, #ffffff 0%, #e0f2fe 50%, #bae6fd 100%)' : 'transparent',
              color: inventoryMenuOpen ? '#0f172a' : '#ffffff',
              borderRadius: '4px 4px 0 0',
              border: inventoryMenuOpen ? '1px solid #7dd3fc' : '1px solid transparent',
              borderBottom: inventoryMenuOpen ? 'none' : '1px solid transparent',
              boxShadow: inventoryMenuOpen ? 'inset 0 1px 0 #ffffff' : 'none',
              textShadow: inventoryMenuOpen ? 'none' : '0 1px 1px rgba(0, 0, 0, 0.3)'
            }}
            onClick={() => setInventoryMenuOpen(!inventoryMenuOpen)}
          >
            Inventory
          </div>
          
          {inventoryMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.96) 100%)',
              color: '#0f172a',
              minWidth: 'max-content',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 #ffffff',
              zIndex: 1000,
              padding: '4px 0',
              border: '1px solid #7dd3fc',
              borderRadius: '0 4px 6px 6px',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(10px)'
            }}>
              <div 
                style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => {
                  setInventoryMenuOpen(false);
                  navigate('/pos/requisition');
                }}
              >
                Requisition
              </div>
              <div 
                style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => {
                  setInventoryMenuOpen(false);
                  navigate('/pos/requisition-vendorwise');
                }}
              >
                Requisition (Vendorwise)
              </div>
              <div 
                style={{ padding: '4px 20px 4px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} 
                className="pos-menu-item"
                onClick={() => {
                  setInventoryMenuOpen(false);
                  navigate('/pos/stock-receive');
                }}
              >
                <Package size={14} /> Stock Receive
              </div>
              <div 
                style={{ padding: '4px 20px 4px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} 
                className="pos-menu-item"
                onClick={() => {
                  setInventoryMenuOpen(false);
                  navigate('/pos/stock-transfer');
                }}
              >
                Stock Transfer
              </div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Stock Transfer By Category</div>
              <div 
                style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => {
                  setInventoryMenuOpen(false);
                  navigate('/pos/purchase-receive');
                }}
              >
                Purchase Receive
              </div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Purchase Receive By PO</div>
              <div 
                style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => {
                  setInventoryMenuOpen(false);
                  navigate('/pos/purchase-return');
                }}
              >
                Purchase Return
              </div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Product Stock Journal</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Global Stock Search</div>
              <div style={{ padding: '4px 20px 4px 32px', cursor: 'pointer' }} className="pos-menu-item">Discount Circular Search</div>
            </div>
          )}
        </div>
        {/* Report Menu */}
        <div 
          ref={reportMenuRef} 
          style={{ position: 'relative' }}
        >
          <div 
            style={{ 
              cursor: 'pointer', 
              padding: '3px 12px',
              background: reportMenuOpen ? 'linear-gradient(180deg, #ffffff 0%, #e0f2fe 50%, #bae6fd 100%)' : 'transparent',
              color: reportMenuOpen ? '#0f172a' : '#ffffff',
              borderRadius: '4px 4px 0 0',
              border: reportMenuOpen ? '1px solid #7dd3fc' : '1px solid transparent',
              borderBottom: reportMenuOpen ? 'none' : '1px solid transparent',
              boxShadow: reportMenuOpen ? 'inset 0 1px 0 #ffffff' : 'none',
              textShadow: reportMenuOpen ? 'none' : '0 1px 1px rgba(0, 0, 0, 0.3)'
            }}
            onClick={() => setReportMenuOpen(!reportMenuOpen)}
          >
            Report
          </div>
          
          {reportMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.96) 100%)',
              color: '#0f172a',
              minWidth: '200px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 #ffffff',
              zIndex: 1000,
              padding: '4px 0',
              border: '1px solid #7dd3fc',
              borderRadius: '0 4px 6px 6px',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(10px)'
            }}>
              {/* Reprint */}
              <div 
                style={{ padding: '6px 20px 6px 24px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/reprint'); }}
              >
                Reprint
              </div>

              {/* Sale (Submenu Trigger) */}
              <div 
                style={{ position: 'relative' }}
                onMouseEnter={() => setSaleSubmenuOpen(true)}
                onMouseLeave={() => setSaleSubmenuOpen(false)}
              >
                <div 
                  style={{ padding: '6px 20px 6px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
                  className="pos-menu-item"
                  onClick={() => setSaleSubmenuOpen(!saleSubmenuOpen)}
                >
                  <span>Sale</span>
                  <span style={{ fontSize: '10px' }}>▶</span>
                </div>

                {saleSubmenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '100%',
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.96) 100%)',
                    color: '#0f172a',
                    minWidth: '220px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                    zIndex: 1010,
                    padding: '4px 0',
                    border: '1px solid #7dd3fc',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    <div className="pos-menu-item" style={{ padding: '6px 20px' }} onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/sale-daily'); }}>Daily Sale Report</div>
                    <div className="pos-menu-item" style={{ padding: '6px 20px' }} onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/sale-summary'); }}>Summary Sale Report</div>
                    <div className="pos-menu-item" style={{ padding: '6px 20px' }} onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/sale-itemwise'); }}>Itemwise Sale Report</div>
                    <div className="pos-menu-item" style={{ padding: '6px 20px' }} onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/sale-payment-type'); }}>Payment Type Sale Report</div>
                  </div>
                )}
              </div>

              {/* Receive */}
              <div 
                style={{ padding: '6px 20px 6px 24px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/receive'); }}
              >
                Receive
              </div>

              {/* Transfer */}
              <div 
                style={{ padding: '6px 20px 6px 24px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/transfer'); }}
              >
                Transfer
              </div>

              {/* Stock (Submenu Trigger) */}
              <div 
                style={{ position: 'relative' }}
                onMouseEnter={() => setStockSubmenuOpen(true)}
                onMouseLeave={() => setStockSubmenuOpen(false)}
              >
                <div 
                  style={{ padding: '6px 20px 6px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
                  className="pos-menu-item"
                  onClick={() => setStockSubmenuOpen(!stockSubmenuOpen)}
                >
                  <span>Stock</span>
                  <span style={{ fontSize: '10px' }}>▶</span>
                </div>

                {stockSubmenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '100%',
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 249, 255, 0.96) 100%)',
                    color: '#0f172a',
                    minWidth: '200px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                    zIndex: 1010,
                    padding: '4px 0',
                    border: '1px solid #7dd3fc',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    <div className="pos-menu-item" style={{ padding: '6px 20px' }} onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/stock-current'); }}>Current Stock Report</div>
                    <div className="pos-menu-item" style={{ padding: '6px 20px' }} onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/stock-journal'); }}>Product Stock Journal</div>
                  </div>
                )}
              </div>

              {/* Invoice Search */}
              <div 
                style={{ padding: '6px 20px 6px 24px', cursor: 'pointer', fontWeight: 'bold', color: '#0284c7' }} 
                className="pos-menu-item"
                onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/invoice-search'); }}
              >
                Invoice Search
              </div>

              {/* Reprint Log */}
              <div 
                style={{ padding: '6px 20px 6px 24px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/reprint-log'); }}
              >
                Reprint Log
              </div>

              {/* Discount Circular Report */}
              <div 
                style={{ padding: '6px 20px 6px 24px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => { setReportMenuOpen(false); navigate('/pos/reports/discount-circular'); }}
              >
                Discount Circular Report
              </div>
            </div>
          )}
        </div>
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
                style={{ padding: '4px 15px', cursor: 'pointer' }} 
                className="pos-menu-item"
                onClick={() => {
                  setHamburgerMenuOpen(false);
                  setPasswordModalOpen(true);
                }}
              >
                Change password
              </div>
              <div 
                style={{ padding: '4px 15px', cursor: 'pointer' }} 
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
            }}
            title="Main POS Monitor"
            onClick={() => navigate('/pos')}
          >
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
            }}
            title="Stock Receive"
            onClick={() => navigate('/pos/stock-receive')}
          >
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
            }}
            title="Stock Transfer"
            onClick={() => navigate('/pos/stock-transfer')}
          >
            <Truck size={30} color="var(--accent-primary)" />
          </div>

          <div 
            className="pos-sidebar-item"
            style={{ 
              padding: '15px 0', 
              display: 'flex', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }}
            title="Customer Management"
            onClick={() => navigate('/pos/customers')}
          >
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
