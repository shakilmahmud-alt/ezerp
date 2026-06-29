import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home,
  LayoutDashboard, 
  Settings, 
  Library,
  Menu,
  Grid,
  Users,
  Box,
  Plus,
  Minus
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (name, e) => {
    e.preventDefault();
    setExpandedMenus(prev => {
      // If the clicked menu is already open, close it (by returning an empty object).
      // Otherwise, open ONLY the clicked menu (closing all others).
      if (prev[name]) {
        return {};
      } else {
        return { [name]: true };
      }
    });
  };

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={20} /> },
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { 
      name: 'Catalog', 
      path: '/catalog',
      icon: <Library size={20} />, 
      subItems: [
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
      ]
    },
    { 
      name: 'Inventory', 
      path: '/inventory', 
      icon: <Menu size={20} />, 
      subItems: [
        { name: 'Purchase Order by Vendor', path: '/inventory/purchase-order-vendor' },
        { name: 'Purchase Receive', path: '/inventory/purchase-receive' },
        { name: 'Purchase Return', path: '/inventory/purchase-return' },
        { name: 'Receive From Shop', path: '/inventory/receive-from-shop' },
        { name: 'Damage and Lost', path: '/inventory/damage-and-lost' },
        { name: 'Store Delivery', path: '/inventory/store-delivery' },
        { name: 'Barcode Print', path: '/inventory/barcode-print' },
        { name: 'Reprint', path: '/inventory/reprint' }
      ]
    },
    { 
      name: 'Promotion', 
      path: '/promotion', 
      icon: <Grid size={20} />, 
      subItems: [
        { name: 'Price Change (Excel)', path: '/promotion/price-change-excel' },
        { name: 'Promotion', path: '/promotion/promotion' }
      ]
    },
    { 
      name: 'CRM', 
      path: '/crm', 
      icon: <Users size={20} />, 
      subItems: [
        { name: 'Customer Type', path: '/crm/customer-type' },
        { name: 'Customer Entry', path: '/crm/customer-entry' },
        { name: 'Point Earn Policy', path: '/crm/point-earn-policy' },
        { name: 'Customer Report', path: '/crm/customer-report' }
      ]
    },
    { 
      name: 'Approval', 
      path: '/approval', 
      icon: <Settings size={20} />, 
      subItems: [
        { name: 'Requisition Approval', path: '/approval/requisition-approval' }
      ]
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="brand">
          <img src="/EZ-ERP-LOGO-WIDE.png" alt="EZ ERP" style={{ height: '40px', objectFit: 'contain' }} />
        </div>
        <div style={{ cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center' }} onClick={toggleSidebar}>
          <Menu size={20} color="var(--text-primary)" />
        </div>
      </div>
      <nav className="nav-links" style={{ minWidth: 'var(--sidebar-width)' }}>
        {navItems.map((item, index) => {
          const isExpanded = expandedMenus[item.name];
          const hasSub = item.subItems && item.subItems.length > 0;
          const showToggle = hasSub || item.hasSubItems;

          return (
            <div key={item.name} className={`nav-item-container delay-${(index % 3 + 1) * 100}`}>
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
                      key={sub.name} 
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
      
      <div style={{ marginTop: 'auto', padding: '15px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)' }}>
        Developed by: <a href="https://shakilmahmud.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 'bold' }}>Shakil Mahmud</a>
      </div>
    </aside>
  );
};

export default Sidebar;
