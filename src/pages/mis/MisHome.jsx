import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
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
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MisHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const reportCategories = [
    { title: 'Sales Reports', path: '/mis/sales-reports', icon: <ShoppingBag size={28} color="#2e6f40" />, desc: 'Daily, summary, item-wise & payment analytics' },
    { title: 'Stock Reports', path: '/mis/stock-reports', icon: <Layers size={28} color="#2e6f40" />, desc: 'Current store stocks, warehouse & stock journal' },
    { title: 'Purchase Order Reports', path: '/mis/purchase-order-reports', icon: <FileSpreadsheet size={28} color="#2e6f40" />, desc: 'Vendor purchase orders and pending requisition logs' },
    { title: 'Purchase Reports', path: '/mis/purchase-reports', icon: <Briefcase size={28} color="#2e6f40" />, desc: 'Purchase receives, supplier invoices and history' },
    { title: 'Requisition Reports', path: '/mis/requisition-reports', icon: <CheckSquare size={28} color="#2e6f40" />, desc: 'Store to central requisition statuses and approvals' },
    { title: 'Delivery Reports', path: '/mis/delivery-reports', icon: <Truck size={28} color="#2e6f40" />, desc: 'Store delivery challans, dispatches and transfers' },
    { title: 'Purchase Return Reports', path: '/mis/purchase-return-reports', icon: <RotateCcw size={28} color="#2e6f40" />, desc: 'Vendor returns, credit adjustments and debits' },
    { title: 'Damage and Lost Reports', path: '/mis/damage-lost-reports', icon: <Trash2 size={28} color="#2e6f40" />, desc: 'Inventory write-offs, product scrap & loss tracking' },
    { title: 'Promotional Reports', path: '/mis/promotional-reports', icon: <Gift size={28} color="#2e6f40" />, desc: 'Discount schemes, active promos & price changes' },
    { title: 'CRM Reports', path: '/mis/crm-reports', icon: <Users size={28} color="#2e6f40" />, desc: 'Customer loyalty, point earns and demographic metrics' },
  ];

  const displayName = (user?.username === 'msmraqeeb@gmail.com' || user?.username === 'admin@email.com') 
    ? 'Super Admin' 
    : (user?.name || user?.username || 'Executive');

  return (
    <div style={{
      minHeight: '100%',
      width: '100%',
      position: 'relative',
      backgroundImage: 'url(/mis-home-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: '24px 30px 40px 30px',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }}>
      {/* Subtle glass overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 1
      }} />

      {/* Content wrapper - Full width */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
        
        {/* Welcome Header */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          padding: '22px 28px',
          borderRadius: '12px',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          marginBottom: '24px',
          width: '100%'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2e6f40', fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            <TrendingUp size={18} />
            Management Information System (MIS)
          </div>
          <h1 style={{ margin: '6px 0 4px 0', fontSize: '1.5rem', color: '#0f172a', fontWeight: 'bold' }}>
            Welcome back, {displayName}
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
            Real-time executive summaries, store performance reports, and inventory intelligence across all branches.
          </p>
        </div>

        {/* Report Categories Grid - 4 Columns per Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '20px',
          width: '100%'
        }}>
          {reportCategories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => navigate(cat.path)}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.94)',
                borderRadius: '12px',
                padding: '22px 20px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
                cursor: 'pointer',
                transition: 'all 0.25s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '140px',
                gap: '14px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(46, 111, 64, 0.16)';
                e.currentTarget.style.borderColor = '#2e6f40';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {cat.icon}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#0f172a', fontWeight: 600 }}>{cat.title}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>{cat.desc}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#2e6f40', fontSize: '0.8rem', fontWeight: 600, gap: '4px' }}>
                View Reports <ArrowRight size={14} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default MisHome;
