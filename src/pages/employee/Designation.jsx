import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Designation = () => {
  const { hasEditPermission } = useAuth();
  const canEdit = hasEditPermission('Designation');
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchDesignations();
  }, []);

  const fetchDesignations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('designations')
        .select('*')
        .order('code', { ascending: true });
        
      if (error) throw error;
      setDesignations(data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching designations:', err);
      toast.error('Failed to load designations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setName('');
    setIsEditing(false);
    setEditingId(null);
    setIsFormVisible(true);
  };

  const handleEdit = (designation) => {
    setName(designation.name);
    setIsEditing(true);
    setEditingId(designation.id);
    setIsFormVisible(true);
  };

  const handleClose = () => {
    setIsFormVisible(false);
    setName('');
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a designation name');
      return;
    }
    
    setIsSaving(true);
    try {
      if (isEditing) {
        // Update existing
        const { error } = await supabase
          .from('designations')
          .update({ name: name.trim() })
          .eq('id', editingId);
          
        if (error) throw error;
        toast.success('Designation updated successfully');
      } else {
        // Insert new
        // First, generate code
        let newCode = 'DG0001';
        
        // fetch existing DG% codes to find max
        const { data: allData, error: fetchErr } = await supabase
          .from('designations')
          .select('code')
          .like('code', 'DG%');
          
        if (fetchErr) throw fetchErr;
        
        if (allData && allData.length > 0) {
          let maxNum = 0;
          allData.forEach(item => {
            if (item.code) {
              const numPart = parseInt(item.code.replace('DG', ''), 10);
              if (!isNaN(numPart) && numPart > maxNum) {
                maxNum = numPart;
              }
            }
          });
          newCode = 'DG' + (maxNum + 1).toString().padStart(4, '0');
        }
        
        const { error } = await supabase
          .from('designations')
          .insert([{
            code: newCode,
            name: name.trim()
          }]);
          
        if (error) {
           if (error.code === '23505') {
             toast.error('Designation name already exists');
             setIsSaving(false);
             return;
           }
           throw error;
        }
        toast.success('Designation added successfully');
      }
      
      handleClose();
      fetchDesignations();
    } catch (err) {
      console.error('Error saving designation:', err);
      toast.error('Failed to save designation');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(designations.length / ITEMS_PER_PAGE);
  const currentItems = designations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', fontSize: '14px' }}>
      
      {!isFormVisible ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #aebac9', padding: '15px 0' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#444' }}>
              Designation
            </h2>
            {canEdit && (
              <button 
                className="btn-theme"
                onClick={handleAddNew}
                style={{ 
                  padding: '8px 15px', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}
              >
                + Add New
              </button>
            )}
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: '#fff', padding: '0' }}>
            <div style={{ overflowX: 'auto', minHeight: '300px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd', color: '#333', backgroundColor: '#f9f9f9' }}>
                    <th style={{ padding: '12px 15px', fontWeight: 'bold', width: '60px' }}>SL</th>
                    <th style={{ padding: '12px 15px', fontWeight: 'bold', width: '150px' }}>Code</th>
                    <th style={{ padding: '12px 15px', fontWeight: 'bold' }}>Name</th>
                    {canEdit && <th style={{ padding: '12px 15px', fontWeight: 'bold', width: '80px', textAlign: 'right' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                  ) : designations.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No designations found</td></tr>
                  ) : (
                    currentItems.map((designation, index) => (
                      <tr key={designation.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{designation.code}</td>
                        <td style={{ padding: '12px 15px', color: '#555' }}>{designation.name}</td>
                        {canEdit && (
                          <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleEdit(designation)}
                              style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '13px' }}
                              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {!loading && designations.length > 0 && (
              <div style={{ padding: '15px', display: 'flex', gap: '5px' }}>
                <button className="btn-theme" 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || totalPages === 0}
                  style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-color)', color: (currentPage === 1 || totalPages === 0) ? 'var(--text-secondary)' : 'var(--text-primary)', borderRadius: '4px', cursor: (currentPage === 1 || totalPages === 0) ? 'not-allowed' : 'pointer' }}
                >«</button>
                
                {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(page => (
                  <button className="btn-theme" 
                    key={page}
                    onClick={() => handlePageChange(page)}
                    style={{ 
                      padding: '5px 10px', 
                      background: currentPage === page ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', 
                      border: currentPage === page ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', 
                      color: currentPage === page ? '#000' : 'var(--text-primary)', 
                      borderRadius: '4px', 
                      fontWeight: currentPage === page ? 'bold' : 'normal',
                      cursor: 'pointer'
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button className="btn-theme" 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-color)', color: (currentPage === totalPages || totalPages === 0) ? 'var(--text-secondary)' : 'var(--text-primary)', borderRadius: '4px', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
                >»</button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #aebac9', padding: '15px 0' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#444' }}>
              {isEditing ? 'Edit Designation' : 'Add Designation'}
            </h2>
          </div>

          <div style={{ backgroundColor: '#fff', border: '1px solid #eee', padding: '30px' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <label style={{ width: '100px', color: '#555', fontSize: '13px' }}>Name <span style={{ color: 'red' }}>*</span></label>
                <div style={{ flex: '1', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '5px 0', fontSize: '14px', color: '#333', background: 'transparent' }}
                    required
                    autoFocus
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', paddingLeft: '120px' }}>
                <button 
                  type="submit" 
                  className="btn-theme"
                  disabled={isSaving}
                  style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Add')}
                </button>
                <button 
                  type="button" 
                  className="btn-danger"
                  onClick={handleClose} 
                  style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </>
      )}

    </div>
  );
};

export default Designation;
