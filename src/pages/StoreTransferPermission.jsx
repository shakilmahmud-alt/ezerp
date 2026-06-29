import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';

const SectionWrapper = ({ title, children }) => (
  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'var(--card-bg)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
    {title && (
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
      </div>
    )}
    {children}
  </div>
);

// Dummy Store Data
const STORES = [
  { id: 1, name: 'Central Store', contact: '01711-000000', address: 'Main Office', email: 'central@bd.com' },
  { id: 2, name: 'JAMUNA FUTURE PARK', contact: '01726-499168', address: 'Shop No:026-031,Block-B Level-1, North Court Bashundhara', email: 'info@bd.com' },
  { id: 3, name: 'KIDS PARADISE (DHANMONDI)', contact: '0', address: 'ANZ Square Situated in Space on Ground Floor, Plot No : 53, Satmasjid Road,Zigatola Bus Stand', email: 'a@gmail.com' },
  { id: 4, name: 'KIDS PARADISE (SKS Tower)', contact: '01332-121048', address: 'SKS Tower, 3rd Floor, Shop no: 4-5 7 VIP Road, Mohakhali', email: 'a@gmail.com' },
  { id: 5, name: 'KIDS PARADISE (UTTARA)', contact: '01713460607', address: 'GRAND ZAM ZAM TOWER Shop No:501-503,Level-4 Sonargaon-Janapath Road Sector-13,Uttara', email: 'sgfg@gmail.com' }
];

const StoreTransferPermission = () => {
  // Mock Auth State (for demonstration)
  const [isAdmin, setIsAdmin] = useState(true);

  const [selectedFromStore, setSelectedFromStore] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  // permissions[fromStoreId] = array of toStoreIds
  const [permissions, setPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load dummy permissions from localStorage if available
    const saved = localStorage.getItem('storePermissions');
    if (saved) {
      setPermissions(JSON.parse(saved));
    } else {
      setPermissions({ 1: [2, 4, 5] }); // Default some permissions
    }
  }, []);

  const handleTogglePermission = (toStoreId) => {
    if (!isAdmin) return;
    
    setPermissions(prev => {
      const currentPerms = prev[selectedFromStore] || [];
      const newPerms = currentPerms.includes(toStoreId)
        ? currentPerms.filter(id => id !== toStoreId)
        : [...currentPerms, toStoreId];
      
      return { ...prev, [selectedFromStore]: newPerms };
    });
  };

  const handleSave = () => {
    if (!isAdmin) return;
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem('storePermissions', JSON.stringify(permissions));
      setIsSaving(false);
      toast.success('Permissions saved successfully!');
    }, 500);
  };

  const availableToStores = STORES.filter(s => s.id !== selectedFromStore && s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentPermissions = permissions[selectedFromStore] || [];

  if (!isAdmin) {
    return (
      <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '10px' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)' }}>You do not have permission to view or edit this page.</p>
          <button className="btn-theme" onClick={() => setIsAdmin(true)} style={{ marginTop: '20px', padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Switch to Admin Mode (Demo)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)' }}>
      {/* Mock Admin Switch */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
          Admin Mode
        </label>
      </div>

      <SectionWrapper title="Store Transfer Permission">
        <div style={{ marginBottom: '30px', maxWidth: '300px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', color: 'var(--accent-primary)' }}>Delivery From</label>
          <select 
            className="input-animated"
            value={selectedFromStore} 
            onChange={(e) => setSelectedFromStore(Number(e.target.value))}
            style={{ borderBottomColor: 'var(--accent-primary)' }}
          >
            <option value="" disabled>-- Select a Store --</option>
            {STORES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '20px', color: 'var(--text-primary)' }}>Permission Details</h4>
          
          <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
            <input 
              type="text" 
              placeholder="Search" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-animated"
              style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px 10px 10px 35px' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-secondary)' }} />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px', width: '50px' }}>SL</th>
                  <th style={{ padding: '12px', width: '50px' }}><input type="checkbox" disabled /></th>
                  <th style={{ padding: '12px' }}>Delivery To</th>
                  <th style={{ padding: '12px' }}>Contact No</th>
                  <th style={{ padding: '12px' }}>Address</th>
                  <th style={{ padding: '12px' }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {availableToStores.map((store, index) => {
                  const isChecked = currentPermissions.includes(store.id);
                  return (
                    <tr key={store.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isChecked ? 'rgba(46, 111, 64, 0.02)' : 'transparent' }}>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{index + 1}</td>
                      <td style={{ padding: '12px' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleTogglePermission(store.id)}
                          style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-primary)' }}>{store.name}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{store.contact}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{store.address}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{store.email}</td>
                    </tr>
                  );
                })}
                {availableToStores.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No matching stores found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '20px' }}>
            <button className="btn-theme" 
              onClick={handleSave}
              disabled={isSaving}
              style={{ padding: '10px 30px', backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
};

export default StoreTransferPermission;
