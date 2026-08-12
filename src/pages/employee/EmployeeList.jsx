import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Views and Modals
  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);
  
  const [showAttachStoreModal, setShowAttachStoreModal] = useState(false);
  const [selectedEmployeeForStore, setSelectedEmployeeForStore] = useState(null);
  const [employeeAttachedStores, setEmployeeAttachedStores] = useState([]);

  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedEmployeeForReset, setSelectedEmployeeForReset] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });

  const initialFormState = {
    name: '', username: '', password: '', store_id: '', designation: '',
    address: '', postal_code: '', city: '', country: '',
    contact_no: '', email: '', date_of_birth: '', date_of_join: '',
    salary: '', max_disc: '', max_special_disc: '', requisition_approval_limit: '',
    is_executive: false
  };
  const [formData, setFormData] = useState(initialFormState);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empRes, storeRes, desigRes] = await Promise.all([
        supabase.from('employees').select('*, stores(name)').not('username', 'in', '("msmraqeeb@gmail.com","admin@email.com")').order('code', { ascending: true }),
        supabase.from('stores').select('id, name'),
        supabase.from('designations').select('id, name')
      ]);

      if (empRes.error) throw empRes.error;
      if (storeRes.error) throw storeRes.error;
      if (desigRes.error) throw desigRes.error;

      setEmployees(empRes.data || []);
      setStores(storeRes.data || []);
      setDesignations(desigRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(employees.length / ITEMS_PER_PAGE);
  const currentItems = employees.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Status Toggle
  const toggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const { error } = await supabase.from('employees').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Clean up empty strings to null for numeric/date/uuid fields
      const payload = { ...formData };
      if (payload.date_of_birth === '') payload.date_of_birth = null;
      if (payload.date_of_join === '') payload.date_of_join = null;
      if (payload.salary === '') payload.salary = null;
      if (payload.max_disc === '') payload.max_disc = null;
      if (payload.max_special_disc === '') payload.max_special_disc = null;
      if (payload.requisition_approval_limit === '') payload.requisition_approval_limit = null;
      if (payload.store_id === '') payload.store_id = null;

      if (editingId) {
        if (!payload.password) delete payload.password; 
        
        const { error } = await supabase.from('employees').update(payload).eq('id', editingId);
        if (error) {
          if (error.code === '23505') {
            toast.error('Username already exists');
            setIsSaving(false);
            return;
          }
          throw error;
        }
        toast.success('Employee updated successfully');
      } else {
        // Generate Code by searching all EMP% codes
        let newCode = 'EMP0001';
        const { data: allEmpData } = await supabase.from('employees').select('code').like('code', 'EMP%');
        if (allEmpData && allEmpData.length > 0) {
          let maxNum = 0;
          allEmpData.forEach(item => {
            if (item.code) {
              const numPart = parseInt(item.code.replace('EMP', ''), 10);
              if (!isNaN(numPart) && numPart < 999900) {
                if (numPart > maxNum) maxNum = numPart;
              }
            }
          });
          newCode = 'EMP' + (maxNum + 1).toString().padStart(4, '0');
        }
        
        const { error } = await supabase.from('employees').insert([{ ...payload, code: newCode }]);
        if (error) {
          if (error.code === '23505') {
             if (error.message && error.message.includes('employees_username_key')) {
               toast.error('Username already exists');
             } else if (error.message && error.message.includes('employees_code_key')) {
               toast.error('Employee Code conflict. Please try saving again.');
             } else {
               toast.error('Username or Employee record already exists');
             }
             setIsSaving(false);
             return;
          }
          throw error;
        }
        toast.success('Employee added successfully');
      }
      setView('list');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save employee');
    } finally {
      setIsSaving(false);
    }
  };

  // Action Menu Handlers
  const handleEdit = (emp) => {
    setFormData({
      name: emp.name || '', username: emp.username || '', password: '', store_id: emp.store_id || '', designation: emp.designation || '',
      address: emp.address || '', postal_code: emp.postal_code || '', city: emp.city || '', country: emp.country || '',
      contact_no: emp.contact_no || '', email: emp.email || '', date_of_birth: emp.date_of_birth || '', date_of_join: emp.date_of_join || '',
      salary: emp.salary || '', max_disc: emp.max_disc || '', max_special_disc: emp.max_special_disc || '', requisition_approval_limit: emp.requisition_approval_limit || '',
      is_executive: emp.is_executive || false
    });
    setEditingId(emp.id);
    setView('edit');
  };

  const openAttachStore = async (emp) => {
    setSelectedEmployeeForStore(emp);
    setShowAttachStoreModal(true);
    try {
      const { data, error } = await supabase.from('employee_stores').select('store_id').eq('employee_id', emp.id);
      if (error) throw error;
      setEmployeeAttachedStores(data.map(d => d.store_id));
    } catch (err) {
      toast.error('Failed to load attached stores');
    }
  };

  const saveAttachedStores = async () => {
    try {
      // First delete all
      await supabase.from('employee_stores').delete().eq('employee_id', selectedEmployeeForStore.id);
      // Then insert new
      if (employeeAttachedStores.length > 0) {
        const inserts = employeeAttachedStores.map(storeId => ({
          employee_id: selectedEmployeeForStore.id,
          store_id: storeId
        }));
        await supabase.from('employee_stores').insert(inserts);
      }
      toast.success('Stores attached successfully');
      setShowAttachStoreModal(false);
    } catch (err) {
      toast.error('Failed to save attached stores');
    }
  };

  const toggleAttachedStore = (storeId) => {
    if (employeeAttachedStores.includes(storeId)) {
      setEmployeeAttachedStores(prev => prev.filter(id => id !== storeId));
    } else {
      setEmployeeAttachedStores(prev => [...prev, storeId]);
    }
  };

  const openResetPassword = (emp) => {
    setSelectedEmployeeForReset(emp);
    setPasswordForm({ current: '', new: '', confirm: '' });
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('New passwords do not match!');
      return;
    }
    
    try {
      // Verify current password
      const { data, error } = await supabase.from('employees').select('password').eq('id', selectedEmployeeForReset.id).single();
      if (error) throw error;
      
      if (data.password !== passwordForm.current) {
        toast.error('Current password is incorrect');
        return;
      }
      
      // Update password
      const { error: updateErr } = await supabase.from('employees').update({ password: passwordForm.new }).eq('id', selectedEmployeeForReset.id);
      if (updateErr) throw updateErr;
      
      toast.success('Password updated successfully');
      setShowResetPasswordModal(false);
    } catch (err) {
      toast.error('Failed to reset password');
    }
  };

  // UI Components
  const inputStyle = { width: '100%', padding: '5px 0', border: 'none', borderBottom: '1px dotted #ccc', outline: 'none', background: 'transparent', fontSize: '13px' };
  const labelStyle = { display: 'block', fontSize: '12px', color: '#555', marginBottom: '2px', fontWeight: 'bold' };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', fontSize: '14px' }}>
      
      {view === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #aebac9', padding: '15px 0' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#444' }}>Employee List</h2>
            <button 
              className="btn-theme"
              onClick={() => { setFormData(initialFormState); setEditingId(null); setView('add'); }}
              style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
            >
              + Add New
            </button>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: '#fff', padding: '0' }}>
            <div style={{ overflowX: 'auto', minHeight: '300px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd', color: '#333', backgroundColor: '#f9f9f9', fontSize: '13px' }}>
                    <th style={{ padding: '12px 15px' }}>SL</th>
                    <th style={{ padding: '12px 15px' }}>Code</th>
                    <th style={{ padding: '12px 15px' }}>Full Name</th>
                    <th style={{ padding: '12px 15px' }}>Designation</th>
                    <th style={{ padding: '12px 15px' }}>Contact No</th>
                    <th style={{ padding: '12px 15px' }}>Email</th>
                    <th style={{ padding: '12px 15px' }}>Status</th>
                    <th style={{ padding: '12px 15px' }}>User Name</th>
                    <th style={{ padding: '12px 15px' }}>Store Name</th>
                    <th style={{ padding: '12px 15px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                  ) : employees.length === 0 ? (
                    <tr><td colSpan="10" style={{ textAlign: 'center', padding: '20px' }}>No employees found</td></tr>
                  ) : (
                    currentItems.map((emp, index) => (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{emp.code}</td>
                        <td style={{ padding: '12px 15px', color: '#555', fontWeight: 'bold' }}>{emp.name}</td>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{emp.designation}</td>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{emp.contact_no || '0'}</td>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{emp.email}</td>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{emp.status}</td>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{emp.username}</td>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{emp.stores?.name}</td>
                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                          <div style={{ position: 'relative', display: 'inline-block' }} className="dropdown-container">
                            <button className="btn-theme" style={{ padding: '5px 10px', fontSize: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                              Action ▾
                            </button>
                            <div className="dropdown-content" style={{ display: 'none', position: 'absolute', right: 0, backgroundColor: '#f9f9f9', minWidth: '120px', boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.2)', zIndex: 1, textAlign: 'left' }}>
                              <a href="#!" onClick={(e) => { e.preventDefault(); handleEdit(emp); }} style={{ color: 'black', padding: '10px 12px', textDecoration: 'none', display: 'block', fontSize: '13px' }}>Edit</a>
                              <a href="#!" onClick={(e) => { e.preventDefault(); toggleStatus(emp.id, emp.status); }} style={{ color: emp.status === 'ACTIVE' ? '#999' : 'black', padding: '10px 12px', textDecoration: 'none', display: 'block', fontSize: '13px', pointerEvents: emp.status === 'ACTIVE' ? 'none' : 'auto' }}>Active</a>
                              <a href="#!" onClick={(e) => { e.preventDefault(); toggleStatus(emp.id, emp.status); }} style={{ color: emp.status === 'INACTIVE' ? '#999' : 'black', padding: '10px 12px', textDecoration: 'none', display: 'block', fontSize: '13px', pointerEvents: emp.status === 'INACTIVE' ? 'none' : 'auto' }}>Inactive</a>
                              <a href="#!" onClick={(e) => { e.preventDefault(); openResetPassword(emp); }} style={{ color: 'black', padding: '10px 12px', textDecoration: 'none', display: 'block', fontSize: '13px' }}>Reset password</a>
                              <a href="#!" onClick={(e) => { e.preventDefault(); openAttachStore(emp); }} style={{ color: 'black', padding: '10px 12px', textDecoration: 'none', display: 'block', fontSize: '13px' }}>Attach Store</a>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* CSS for Dropdown */}
            <style>{`
              .dropdown-container:hover .dropdown-content { display: block !important; }
              .dropdown-content a:hover { background-color: #f1f1f1; }
            `}</style>
            
            {/* Pagination */}
            {!loading && employees.length > 0 && (
              <div style={{ padding: '15px', display: 'flex', gap: '5px' }}>
                <button className="btn-theme" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || totalPages === 0} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-color)', color: (currentPage === 1 || totalPages === 0) ? 'var(--text-secondary)' : 'var(--text-primary)', borderRadius: '4px', cursor: (currentPage === 1 || totalPages === 0) ? 'not-allowed' : 'pointer' }}>«</button>
                {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(page => (
                  <button className="btn-theme" key={page} onClick={() => handlePageChange(page)} style={{ padding: '5px 10px', background: currentPage === page ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', border: currentPage === page ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', color: currentPage === page ? '#000' : 'var(--text-primary)', borderRadius: '4px', fontWeight: currentPage === page ? 'bold' : 'normal', cursor: 'pointer' }}>{page}</button>
                ))}
                <button className="btn-theme" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-color)', color: (currentPage === totalPages || totalPages === 0) ? 'var(--text-secondary)' : 'var(--text-primary)', borderRadius: '4px', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}>»</button>
              </div>
            )}
          </div>
        </>
      )}

      {view !== 'list' && (
        <>
          <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #aebac9', padding: '15px 0' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#444' }}>{editingId ? 'Edit User' : 'Add User'}</h2>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '30px' }}>
            <form onSubmit={handleSubmit}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{...labelStyle, color: 'red'}}>Name (First Name is required) *</label>
                  <input type="text" style={inputStyle} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Full Name" />
                </div>
                <div>
                  <label style={labelStyle}>User Name *</label>
                  <input type="text" style={inputStyle} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required placeholder="Username" />
                </div>
                <div>
                  <label style={labelStyle}>Password {editingId ? '(Leave blank to keep current)' : '*'}</label>
                  <input type="password" style={inputStyle} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingId} placeholder="Password" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{...labelStyle, color: 'red'}}>Store *</label>
                  <CustomSelect style={inputStyle} value={formData.store_id} onChange={e => setFormData({...formData, store_id: e.target.value})} required>
                    <option value="">-- Select a Store --</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </CustomSelect>
                </div>
                <div>
                  <label style={{...labelStyle, color: 'red'}}>Designation *</label>
                  <CustomSelect style={inputStyle} value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} required>
                    <option value="">-- Select a Designation --</option>
                    {designations.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </CustomSelect>
                </div>
                <div>
                  <label style={{...labelStyle, color: 'red'}}>Address *</label>
                  <input type="text" style={inputStyle} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{...labelStyle, color: 'red'}}>Postal Code *</label>
                  <input type="text" style={inputStyle} value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} required />
                </div>
                <div>
                  <label style={{...labelStyle, color: 'red'}}>City *</label>
                  <input type="text" style={inputStyle} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required />
                </div>
                <div>
                  <label style={{...labelStyle, color: 'red'}}>Country *</label>
                  <CustomSelect style={inputStyle} value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} required>
                    <option value="">-- Select a Country --</option>
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                  </CustomSelect>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{...labelStyle, color: 'red'}}>Contact No *</label>
                  <input type="text" style={inputStyle} value={formData.contact_no} onChange={e => setFormData({...formData, contact_no: e.target.value})} required />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" style={inputStyle} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>Date of Birth</label>
                  <input type="date" style={inputStyle} value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Date of Join</label>
                  <input type="date" style={inputStyle} value={formData.date_of_join} onChange={e => setFormData({...formData, date_of_join: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>Salary</label>
                  <input type="number" style={inputStyle} value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>Requisition Approval Limit</label>
                  <input type="number" style={inputStyle} value={formData.requisition_approval_limit} onChange={e => setFormData({...formData, requisition_approval_limit: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <label style={labelStyle}>Max Disc %</label>
                  <input type="number" step="0.01" style={inputStyle} value={formData.max_disc} onChange={e => setFormData({...formData, max_disc: e.target.value})} />
                </div>
                <div>
                  <label style={labelStyle}>Max Special Disc %</label>
                  <input type="number" step="0.01" style={inputStyle} value={formData.max_special_disc} onChange={e => setFormData({...formData, max_special_disc: e.target.value})} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '15px' }}>
                  <input type="checkbox" checked={formData.is_executive} onChange={e => setFormData({...formData, is_executive: e.target.checked})} />
                  <span style={{ fontSize: '13px', color: '#555' }}>Is Executive</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button type="submit" className="btn-theme" disabled={isSaving} style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {isSaving ? 'Saving...' : editingId ? 'Update' : 'Add'}
                </button>
                <button type="button" className="btn-danger" onClick={() => setView('list')} style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Close
                </button>
              </div>

            </form>
          </div>
        </>
      )}

      {/* Attach Store Modal */}
      {showAttachStoreModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Attach Stores for {selectedEmployeeForStore?.name}</h3>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '15px 0' }}>
              {stores.map(store => (
                <div key={store.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <input 
                    type="checkbox" 
                    id={`store-${store.id}`}
                    checked={employeeAttachedStores.includes(store.id)}
                    onChange={() => toggleAttachedStore(store.id)}
                  />
                  <label htmlFor={`store-${store.id}`} style={{ cursor: 'pointer', fontSize: '14px', color: '#333' }}>{store.name}</label>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-danger" onClick={() => setShowAttachStoreModal(false)} style={{ padding: '6px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button className="btn-theme" onClick={saveAttachedStores} style={{ padding: '6px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Reset Password</h3>
            <p style={{ fontSize: '13px', color: '#666' }}>User: {selectedEmployeeForReset?.name}</p>
            
            <form onSubmit={handleResetPassword}>
              <div style={{ margin: '15px 0' }}>
                <label style={labelStyle}>Current Password *</label>
                <input type="password" style={{...inputStyle, borderBottom: '1px solid #ccc'}} value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} required />
              </div>
              <div style={{ margin: '15px 0' }}>
                <label style={labelStyle}>New Password *</label>
                <input type="password" style={{...inputStyle, borderBottom: '1px solid #ccc'}} value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} required />
              </div>
              <div style={{ margin: '15px 0' }}>
                <label style={labelStyle}>Confirm Password *</label>
                <input type="password" style={{...inputStyle, borderBottom: '1px solid #ccc'}} value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn-danger" onClick={() => setShowResetPasswordModal(false)} style={{ padding: '6px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="btn-theme" style={{ padding: '6px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeList;
