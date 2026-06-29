import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, User, Menu } from 'lucide-react';

const Topbar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

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
    { name: 'Requisition Approval', path: '/approval/requisition-approval' }
  ];

  const filteredRoutes = routes.filter(route => 
    route.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
