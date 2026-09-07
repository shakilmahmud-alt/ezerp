import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/CustomSelect';
import { ShieldCheck, CheckSquare, Square } from 'lucide-react';

export const POS_MODULE_GROUPS = [
  {
    groupName: "File Menu",
    icon: "📁",
    modules: [
      "Customer Management",
      "Day Close Session",
      "Cash Return",
      "Issue Credit Note",
      "Stock Search",
      "Invoice Payment Type Change",
      "Manual Data Download-Upload",
      "Change Password",
      "Settings",
      "Data Sync"
    ]
  },
  {
    groupName: "Inventory Menu",
    icon: "📦",
    modules: [
      "Requisition",
      "Requisition (Vendorwise)",
      "Stock Receive",
      "Stock Transfer",
      "Stock Transfer By Category",
      "Purchase Receive",
      "Purchase Receive By PO",
      "Purchase Return",
      "Product Stock Journal",
      "Global Stock Search",
      "Discount Circular Search"
    ]
  },
  {
    groupName: "Report Menu",
    icon: "📊",
    modules: [
      "Reprint",
      "Daily Sale Report",
      "Summary Sale Report",
      "Itemwise Sale Report",
      "Payment Type Sale Report",
      "Receive Report",
      "Transfer Report",
      "Current Stock Report",
      "Product Stock Journal Report",
      "Invoice Search",
      "Reprint Log",
      "Discount Circular Report"
    ]
  },
  {
    groupName: "POS Operations & Actions",
    icon: "⚡",
    modules: [
      "Point of Sale",
      "Change Quantity (F2)",
      "Exchange / Debit Note (F3)",
      "Remove Item (F4)",
      "Hold Invoice (F6)",
      "Recall Invoice (F7)",
      "Return (F8)",
      "Cancel Invoice (F10)",
      "Item Level Discount (F11)",
      "Invoice Discount (F12)",
      "Promotion Details",
      "VOID Invoice",
      "Reprint Invoice",
      "Pay Now / Checkout"
    ]
  }
];

// Flat list of all modules
export const ALL_POS_MODULES = POS_MODULE_GROUPS.flatMap(g => g.modules);

const PosDistribution = () => {
  const [stores, setStores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

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
    setLoadingPerms(true);
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
      
      if (data && Array.isArray(data.permissions)) {
        setSelectedPermissions(data.permissions);
      } else {
        setSelectedPermissions([]);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
    } finally {
      setLoadingPerms(false);
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
      setSelectedPermissions(ALL_POS_MODULES);
    } else {
      setSelectedPermissions([]);
    }
  };

  const handleGroupToggle = (groupModules) => {
    const allInGroupSelected = groupModules.every(m => selectedPermissions.includes(m));
    if (allInGroupSelected) {
      // Unselect this group
      setSelectedPermissions(prev => prev.filter(p => !groupModules.includes(p)));
    } else {
      // Select all in this group
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...groupModules])));
    }
  };

  const isAllSelected = selectedPermissions.length === ALL_POS_MODULES.length && ALL_POS_MODULES.length > 0;

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
      
      toast.success('POS user permissions saved successfully!');
    } catch (err) {
      console.error('Error saving permissions:', err);
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', fontSize: '13px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #aebac9', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="var(--accent-primary, #2e6f40)" />
            POS User Menu Distribution
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '12px' }}>
            Assign menu and module authorizations for store POS users. Unchecked modules will be blocked with an authorization alert.
          </p>
        </div>
      </div>

      {/* Select Store & User Filters */}
      <div style={{ padding: '18px', backgroundColor: 'var(--card-bg, #ffffff)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', marginBottom: '25px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          
          <div style={{ minWidth: '260px', flex: '1' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#334155' }}>
              Store <span style={{ color: 'red' }}>*</span>
            </label>
            <CustomSelect 
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none', color: '#1e293b' }}
            >
              <option value="">-- Select a Store --</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </CustomSelect>
          </div>

          <div style={{ minWidth: '260px', flex: '1' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#334155' }}>
              User Name <span style={{ color: 'red' }}>*</span>
            </label>
            <CustomSelect 
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none', color: '#1e293b' }}
            >
              <option value="">-- Select a User --</option>
              {employees.map(user => (
                <option key={user.id} value={user.id}>{user.name} ({user.username})</option>
              ))}
            </CustomSelect>
          </div>

          <div style={{ minWidth: '150px', display: 'flex', alignItems: 'center', marginTop: '28px', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="selectAll"
              checked={isAllSelected}
              onChange={handleSelectAll}
              disabled={!selectedStore || !selectedUser}
              style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: 'var(--accent-primary, #2e6f40)' }}
            />
            <label htmlFor="selectAll" style={{ cursor: (!selectedStore || !selectedUser) ? 'not-allowed' : 'pointer', fontWeight: 700, color: '#1e293b' }}>
              Select All ({selectedPermissions.length}/{ALL_POS_MODULES.length})
            </label>
          </div>

        </div>
      </div>

      {/* Permissions Grid by Groups */}
      {loadingPerms ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          Loading user permissions...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {POS_MODULE_GROUPS.map((group, gIdx) => {
            const groupSelectedCount = group.modules.filter(m => selectedPermissions.includes(m)).length;
            const isGroupAllSelected = groupSelectedCount === group.modules.length;

            return (
              <div 
                key={gIdx} 
                style={{ 
                  backgroundColor: 'var(--card-bg, #ffffff)', 
                  border: '1px solid var(--border-color, #e2e8f0)', 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {/* Group Header with toggle */}
                <div style={{ 
                  backgroundColor: '#f8fafc', 
                  padding: '10px 14px', 
                  borderBottom: '1px solid #e2e8f0', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
                    {group.icon} {group.groupName}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleGroupToggle(group.modules)}
                    disabled={!selectedStore || !selectedUser}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isGroupAllSelected ? 'var(--accent-primary, #2e6f40)' : '#64748b',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: (!selectedStore || !selectedUser) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isGroupAllSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                    {isGroupAllSelected ? 'Unselect All' : 'Select All'} ({groupSelectedCount}/{group.modules.length})
                  </button>
                </div>

                {/* Modules Checkboxes */}
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {group.modules.map((moduleName, mIdx) => {
                    const isChecked = selectedPermissions.includes(moduleName);
                    return (
                      <label 
                        key={mIdx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px', 
                          cursor: (!selectedStore || !selectedUser) ? 'not-allowed' : 'pointer',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          backgroundColor: isChecked ? '#f0fdf4' : 'transparent',
                          transition: 'background-color 0.15s'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(moduleName)}
                          disabled={!selectedStore || !selectedUser}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary, #2e6f40)' }}
                        />
                        <span style={{ color: isChecked ? '#166534' : '#334155', fontWeight: isChecked ? 600 : 400 }}>
                          {moduleName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Button */}
      <div style={{ marginTop: '30px', paddingBottom: '40px' }}>
        <button 
          className="btn-theme"
          onClick={handleSave}
          disabled={isSaving || !selectedStore || !selectedUser}
          style={{ 
            padding: '10px 36px', 
            borderRadius: '4px', 
            cursor: (isSaving || !selectedStore || !selectedUser) ? 'not-allowed' : 'pointer', 
            fontWeight: 'bold',
            fontSize: '13px',
            opacity: (isSaving || !selectedStore || !selectedUser) ? 0.6 : 1
          }}
        >
          {isSaving ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>

    </div>
  );
};

export default PosDistribution;
