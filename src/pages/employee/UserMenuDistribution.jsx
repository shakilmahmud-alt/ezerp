import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import CustomSelect from '../../components/CustomSelect';

const UserMenuDistribution = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  const [permissions, setPermissions] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const menuStructure = [
    {
      group: 'Home',
      items: [{ name: 'Home', hasEdit: false }]
    },
    {
      group: 'Dashboard',
      items: [{ name: 'Dashboard', hasEdit: false }]
    },
    {
      group: 'Settings',
      items: [
        { name: 'Category', hasEdit: true },
        { name: 'Subcategory', hasEdit: true },
        { name: 'Sub sub-category', hasEdit: true },
        { name: 'Brand', hasEdit: true },
        { name: 'VAT Policy Setup', hasEdit: true },
        { name: 'Vendor', hasEdit: true },
        { name: 'Product', hasEdit: true },
        { name: 'Measuring Unit', hasEdit: true },
        { name: 'Product Quick Search', hasEdit: true },
        { name: 'Vendorwise Product List', hasEdit: true },
        { name: 'Store Transfer Permission', hasEdit: true },
        { name: 'Product Bulk Update', hasEdit: true }
      ]
    },
    {
      group: 'Inventory',
      items: [
        { name: 'Purchase Order by Vendor', hasEdit: true },
        { name: 'Purchase Receive', hasEdit: true },
        { name: 'Purchase Receive by Vendor', hasEdit: true },
        { name: 'Purchase Return', hasEdit: true },
        { name: 'Receive From Shop', hasEdit: true },
        { name: 'Damage and Lost', hasEdit: true },
        { name: 'Store Delivery', hasEdit: true },
        { name: 'Barcode Print', hasEdit: true },
        { name: 'Reprint', hasEdit: true }
      ]
    },
    {
      group: 'Promotion',
      items: [
        { name: 'Price Change (Excel)', hasEdit: true },
        { name: 'Promotion', hasEdit: true },
        { name: 'Price Change', hasEdit: true },
        { name: 'Promotion Extend', hasEdit: true },
        { name: 'Promotion InActive', hasEdit: true }
      ]
    },
    {
      group: 'CRM',
      items: [
        { name: 'Customer Type', hasEdit: true },
        { name: 'Customer Entry', hasEdit: true },
        { name: 'Point Earn Policy', hasEdit: true },
        { name: 'Customer Report', hasEdit: true },
        { name: 'Discount Reference', hasEdit: true }
      ]
    },
    {
      group: 'Approval',
      items: [
        { name: 'Requisition Approval', hasEdit: true }
      ]
    }
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadPermissions(selectedEmployeeId);
    } else {
      setPermissions({});
    }
  }, [selectedEmployeeId]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, username')
        .not('username', 'is', null)
        .not('username', 'in', '("msmraqeeb@gmail.com","admin@email.com")')
        .order('username', { ascending: true });
        
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employees');
    }
  };

  const loadPermissions = async (empId) => {
    try {
      const { data, error } = await supabase
        .from('user_menu_permissions')
        .select('permissions')
        .eq('employee_id', empId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error; // Not found is fine
      }
      
      setPermissions(data ? data.permissions : {});
    } catch (err) {
      console.error(err);
      toast.error('Failed to load permissions');
    }
  };

  const handleCheckboxChange = (key, value) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleGroupChange = (group, checked) => {
    const newPerms = { ...permissions };
    newPerms[`group_${group}`] = checked;
    
    // Auto-check/uncheck children view perms
    const groupData = menuStructure.find(g => g.group === group);
    if (groupData) {
      groupData.items.forEach(item => {
        newPerms[`view_${item.name}`] = checked;
        if (!checked && item.hasEdit) {
           newPerms[`edit_${item.name}`] = false;
        }
      });
    }
    setPermissions(newPerms);
  };

  const savePermissions = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error: upsertErr } = await supabase
        .from('user_menu_permissions')
        .upsert({
          employee_id: selectedEmployeeId,
          permissions: permissions,
          updated_at: new Date().toISOString()
        }, { onConflict: 'employee_id' });
        
      if (upsertErr) throw upsertErr;
      toast.success('Permissions saved successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const colGroups = [
    ['Home', 'Dashboard', 'Settings'],
    ['Inventory'],
    ['Promotion', 'App Module'],
    ['CRM', 'Approval']
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', fontSize: '14px' }}>
      
      <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #aebac9', padding: '15px 0' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#444' }}>User Menu Distribution</h2>
      </div>

      <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '20px' }}>
        
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#555', marginBottom: '5px', fontWeight: 'bold' }}>User Name</label>
          <CustomSelect 
            value={selectedEmployeeId} 
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            style={{ width: '300px', padding: '5px 0', border: 'none', borderBottom: '1px dotted #ccc', outline: 'none', fontSize: '13px' }}
          >
            <option value="">-- Select a User --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.username}</option>
            ))}
          </CustomSelect>
        </div>

        {selectedEmployeeId && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
            
            {colGroups.map((colGroup, colIndex) => (
              <div key={colIndex}>
                {colGroup.map(groupName => {
                  const groupData = menuStructure.find(g => g.group === groupName);
                  if (!groupData) return null;
                  
                  return (
                    <div key={groupName} style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <input 
                          type="checkbox" 
                          id={`group-${groupName}`}
                          checked={permissions[`group_${groupName}`] || false}
                          onChange={(e) => handleGroupChange(groupName, e.target.checked)}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                        />
                        <label htmlFor={`group-${groupName}`} style={{ cursor: 'pointer', color: '#333' }}>{groupName}</label>
                      </div>

                      {groupData.items.length > 1 || groupData.items[0].name !== groupName ? (
                        <div style={{ paddingLeft: '20px' }}>
                          {groupData.items.map(item => (
                            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <input 
                                  type="checkbox" 
                                  id={`view-${item.name}`}
                                  checked={permissions[`view_${item.name}`] || false}
                                  onChange={(e) => handleCheckboxChange(`view_${item.name}`, e.target.checked)}
                                  style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                />
                                <label htmlFor={`view-${item.name}`} style={{ cursor: 'pointer', color: '#555', fontSize: '13px' }}>{item.name}</label>
                              </div>
                              
                              {item.hasEdit && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <input 
                                    type="checkbox" 
                                    id={`edit-${item.name}`}
                                    checked={permissions[`edit_${item.name}`] || false}
                                    onChange={(e) => handleCheckboxChange(`edit_${item.name}`, e.target.checked)}
                                    style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                  />
                                  <label htmlFor={`edit-${item.name}`} style={{ cursor: 'pointer', color: '#555', fontSize: '13px' }}>Edit</label>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}

          </div>
        )}

        <div style={{ marginTop: '30px', paddingLeft: '50px' }}>
          <button 
            className="btn-theme" 
            onClick={savePermissions}
            disabled={!selectedEmployeeId || isSaving}
            style={{ padding: '8px 40px', border: 'none', borderRadius: '4px', cursor: (!selectedEmployeeId || isSaving) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserMenuDistribution;
