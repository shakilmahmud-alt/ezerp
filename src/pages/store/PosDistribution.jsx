import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/CustomSelect';

const PERMISSIONS = [
  // Column 1
  "Stock Search",
  "Invoice Reprint",
  "Software Settings",
  "Global Stock Search",
  "Daily Cash Transaction",
  "Session Close",
  "Day Close Session",
  "Exchange",
  "Stock Receive",
  "Customer Management",
  "Stock Requisition",
  "Stock Transfer",
  "Point of Sale",
  "Void",
  "Cash Return",
  
  // Column 2
  "Customer Edit",
  "Point Redeem",
  "Stock Sync",
  "Cash Flow Entry",
  "Special Discount",
  "Show Cost Price",
  "Manual Data Download",
  "Daily Declaration Posting",
  "Hold Recall",
  "Other Declaration Description",
  "Issue Credit Note",
  "Product Stock Journal",
  "Cancel Invoice",
  "Credit Reconciliation",
  "Payment Type Change",
  
  // Column 3
  "Remove Item",
  "Invoice Discount",
  "Purchase Receive",
  "Purchase Return",
  "Discount Report",
  "Product Expiry",
  "Executive Wise Sale",
  "Terminal Brandwise Sale",
  "Discount Circular",
  "Vendorwise Sale",
  "Pending Sales",
  "Reprint Log",
  "Stock Adjustment Report",
  "Scan Item Update Remove Log",
  "Cash Closing Report",

  // Column 4
  "Cash Declaration Report",
  "MVAT Report",
  "Product Delivery Report",
  "Product Receive Report",
  "Invoice Search",
  "Sale Stock Report",
  "Attributewise Stock Report",
  "Stock Report",
  "VAT Report",
  "Brandwise Sale",
  "Itemwise Sale",
  "Invoicewise Sale Customer",
  "Invoicewise Sale Counter",
  "Invoicewise Sale",
  "Reprint",

  // Column 5
  "Day Close Report",
  "Inv Adjustment",
  "Inv Report View",
  "Inv Final Post",
  "Inv Scan Barcode",
  "Inv Prepare Season"
];

const PosDistribution = () => {
  const [stores, setStores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchStoresAndEmployees();
  }, []);

  // Fetch existing permissions when store or user changes
  useEffect(() => {
    if (selectedStore && selectedUser) {
      fetchExistingPermissions();
    } else {
      setSelectedPermissions([]);
    }
  }, [selectedStore, selectedUser]);

  const fetchStoresAndEmployees = async () => {
    try {
      const [storesRes, employeesRes] = await Promise.all([
        supabase.from('stores').select('id, name').order('name'),
        supabase.from('employees').select('id, name, username').not('username', 'in', '("msmraqeeb@gmail.com","admin@email.com")').order('name')
      ]);
      
      if (storesRes.data) setStores(storesRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
    } catch (err) {
      console.error('Error fetching dropdowns:', err);
      toast.error('Failed to load stores and users');
    }
  };

  const fetchExistingPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_user_permissions')
        .select('permissions')
        .eq('store_id', selectedStore)
        .eq('employee_id', selectedUser)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data && data.permissions) {
        setSelectedPermissions(data.permissions);
      } else {
        setSelectedPermissions([]);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  const handleCheckboxChange = (perm) => {
    setSelectedPermissions(prev => {
      if (prev.includes(perm)) {
        return prev.filter(p => p !== perm);
      } else {
        return [...prev, perm];
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPermissions(PERMISSIONS);
    } else {
      setSelectedPermissions([]);
    }
  };

  const isAllSelected = selectedPermissions.length === PERMISSIONS.length && PERMISSIONS.length > 0;

  const handleSave = async () => {
    if (!selectedStore || !selectedUser) {
      toast.error('Please select both Store and User Name');
      return;
    }

    setIsSaving(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('pos_user_permissions')
        .select('id')
        .eq('store_id', selectedStore)
        .eq('employee_id', selectedUser)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('pos_user_permissions')
          .update({
            permissions: selectedPermissions,
            updated_at: new Date()
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('pos_user_permissions')
          .insert([{
            store_id: selectedStore,
            employee_id: selectedUser,
            permissions: selectedPermissions
          }]);
          
        if (error) throw error;
      }
      
      toast.success('Permissions saved successfully!');
    } catch (err) {
      console.error('Error saving permissions:', err);
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  // Group permissions into 5 columns
  const colSize = 15;
  const columns = [
    PERMISSIONS.slice(0, colSize),
    PERMISSIONS.slice(colSize, colSize * 2),
    PERMISSIONS.slice(colSize * 2, colSize * 3),
    PERMISSIONS.slice(colSize * 3, colSize * 4),
    PERMISSIONS.slice(colSize * 4, PERMISSIONS.length)
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', fontSize: '13px' }}>
      
      <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #aebac9', padding: '15px 0' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#444' }}>
          POS User Menu Distribution
        </h2>
      </div>

      <div style={{ padding: '15px 0', borderBottom: '1px solid #e5e7eb', marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          <div style={{ minWidth: '250px', flex: '1' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#555' }}>Store <span style={{ color: 'red' }}>*</span></label>
            <CustomSelect 
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', color: '#333' }}
            >
              <option value="">-- Select a Store --</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </CustomSelect>
          </div>

          <div style={{ minWidth: '250px', flex: '1' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#555' }}>User Name <span style={{ color: 'red' }}>*</span></label>
            <CustomSelect 
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{ width: '100%', padding: '8px 0', border: 'none', borderBottom: '1px solid #ddd', background: 'transparent', outline: 'none', color: '#333' }}
            >
              <option value="">-- Select a User --</option>
              {employees.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </CustomSelect>
          </div>

          <div style={{ minWidth: '150px', display: 'flex', alignItems: 'center', marginTop: '25px', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="selectAll"
              checked={isAllSelected}
              onChange={handleSelectAll}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
            />
            <label htmlFor="selectAll" style={{ cursor: 'pointer', color: '#555' }}>Select All</label>
          </div>

        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {columns.map((col, colIndex) => (
          <div key={colIndex} style={{ flex: '1', minWidth: '200px' }}>
            {col.map((perm, index) => (
              <div key={index} style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id={`perm-${colIndex}-${index}`}
                  checked={selectedPermissions.includes(perm)}
                  onChange={() => handleCheckboxChange(perm)}
                  style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor={`perm-${colIndex}-${index}`} style={{ cursor: 'pointer', color: '#555' }}>
                  {perm}
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '40px', paddingBottom: '40px' }}>
        <button 
          className="btn-theme"
          onClick={handleSave}
          disabled={isSaving}
          style={{ 
            padding: '8px 30px', 
            borderRadius: '4px', 
            cursor: isSaving ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold',
            opacity: isSaving ? 0.7 : 1
          }}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

    </div>
  );
};

export default PosDistribution;
