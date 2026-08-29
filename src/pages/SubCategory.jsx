import React, { useState, useEffect } from 'react';
import { Plus, Download, Edit, Image as ImageIcon, Loader } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import CustomSelect from '../components/CustomSelect';
import { useAuth } from '../context/AuthContext';

const SubCategory = () => {
  const { hasEditPermission } = useAuth();
  const canEdit = hasEditPermission('Subcategory');
  const [isAdding, setIsAdding] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form State
  const [newSubcategory, setNewSubcategory] = useState({
    category_name: '',
    name: '',
    description: ''
  });
  
  // Edit State
  const [editingCode, setEditingCode] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Set to 15 to match the screenshot

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [subRes, catRes] = await Promise.all([
        supabase.from('subcategories').select('*').order('sl', { ascending: true }),
        supabase.from('categories').select('name').order('name', { ascending: true })
      ]);
      
      if (subRes.error) throw subRes.error;
      if (catRes.error) throw catRes.error;
      
      setSubcategories(subRes.data || []);
      setCategories(catRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMsg(`Supabase Error: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSubcategories = subcategories.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filteredSubcategories.length / itemsPerPage);
  const paginatedSubcategories = filteredSubcategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAddOrUpdate = async () => {
    if (!newSubcategory.name || !newSubcategory.category_name) return;
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (editingCode) {
        // Update in Supabase
        const { error } = await supabase
          .from('subcategories')
          .update({ 
            category_name: newSubcategory.category_name,
            name: newSubcategory.name, 
            description: newSubcategory.description 
          })
          .eq('code', editingCode);

        if (error) throw error;
      } else {
        // Add to Supabase
        const newSl = subcategories.length > 0 ? Math.max(...subcategories.map(c => c.sl || 0)) + 1 : 1;
        // Basic code generation just for demo
        const newCode = `0020${newSl.toString().padStart(3, '0')}`;
        
        const { error } = await supabase
          .from('subcategories')
          .insert([{ 
            sl: newSl, 
            code: newCode, 
            category_name: newSubcategory.category_name,
            name: newSubcategory.name, 
            description: newSubcategory.description
          }]);
          
        if (error) throw error;
      }
      
      await fetchData();
      
      setNewSubcategory({ category_name: '', name: '', description: '' });
      setEditingCode(null);
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving subcategory:', error);
      setErrorMsg(`Supabase Error: ${error.message || JSON.stringify(error)}`);
      setIsLoading(false);
    }
  };

  const handleEdit = (subcat) => {
    setNewSubcategory({ 
      category_name: subcat.category_name || '', 
      name: subcat.name, 
      description: subcat.description || '' 
    });
    setEditingCode(subcat.code);
    setIsAdding(true);
  };

  const exportCSV = () => {
    const headers = ['SL', 'Category', 'Code', 'Name'];
    const rows = subcategories.map(c => [c.sl, c.category_name, c.code, c.name]);
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "subcategories.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const isFormValid = newSubcategory.name.trim() !== '' && newSubcategory.category_name.trim() !== '';

  if (!isAdding) {
    return (
      <div style={{ padding: '20px', color: 'var(--text-primary)' }}>
        {errorMsg && (
          <div style={{ padding: '15px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', marginBottom: '20px', borderRadius: '4px', border: '1px solid var(--danger)' }}>
            {errorMsg}
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'var(--card-bg)', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Sub Category</h2>
            {isLoading && <Loader className="animate-spin" size={20} color="var(--text-secondary)" />}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {canEdit && (
              <button 
                className="btn btn-primary btn-theme" 
                onClick={() => {
                  setNewSubcategory({ category_name: '', name: '', description: '' });
                  setEditingCode(null);
                  setIsAdding(!isAdding);
                }}
              >
                <Plus size={18} style={{ marginRight: '5px' }} /> {isAdding ? 'Cancel' : 'Add New'}
              </button>
            )}
            <button className="btn btn-secondary btn-glass" style={{ display: 'flex', alignItems: 'center' }} onClick={exportCSV}>
              <Download size={18} style={{ marginRight: '5px' }} /> Export
            </button>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
          <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)' }}>
            <input 
              type="text" 
              placeholder="Search" 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)', width: '250px' }}
            />
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)', fontWeight: 600, color: 'var(--text-secondary)' }}>SL</th>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)', fontWeight: 600, color: 'var(--text-secondary)' }}>Code</th>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</th>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</th>
                  {canEdit && <th style={{ padding: '12px 15px', borderBottom: '2px solid var(--border-color)', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', width: '80px' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading && subcategories.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '36px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <img src="https://ik.imagekit.io/eg7u6xcn0u/Shopping-Cart.gif" alt="Loading..." style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-primary, #2e6f40)' }}>Loading subcategories...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedSubcategories.length > 0 ? (
                  paginatedSubcategories.map((sub) => (
                    <tr key={sub.code || sub.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 15px' }}>{sub.sl}</td>
                      <td style={{ padding: '12px 15px' }}>{sub.code}</td>
                      <td style={{ padding: '12px 15px', color: 'var(--text-primary)' }}>{sub.name}</td>
                      <td style={{ padding: '12px 15px', color: 'var(--text-primary)' }}>{sub.category_name}</td>
                      {canEdit && (
                        <td style={{ padding: '12px 15px', textAlign: 'right' }}>
                          <button 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', padding: '5px' }}
                            onClick={() => handleEdit(sub)}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No subcategories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
        </div>
      </div>
    );
  }

  // Render Add Form
  return (
    <div style={{ padding: '20px', color: 'var(--text-primary)' }}>
      {errorMsg && (
        <div style={{ padding: '15px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', marginBottom: '20px', borderRadius: '4px', border: '1px solid var(--danger)' }}>
          {errorMsg}
        </div>
      )}
      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{editingCode ? 'Edit Sub Category' : 'Add Sub Category'}</h2>
          {isLoading && <Loader className="animate-spin" size={20} color="var(--text-secondary)" />}
        </div>
        
        <div style={{ padding: '40px' }}>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem' }}>Category Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <CustomSelect 
                className="input-animated"
                value={newSubcategory.category_name}
                onChange={(e) => setNewSubcategory({...newSubcategory, category_name: e.target.value})}
                disabled={isLoading}
              >
                <option value="" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-color)' }}>-- Select a Category --</option>
                {categories.map((c, i) => (
                  <option key={i} value={c.name} style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-color)' }}>{c.name}</option>
                ))}
              </CustomSelect>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem' }}>Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input 
                type="text" 
                className="input-animated"
                value={newSubcategory.name}
                onChange={(e) => setNewSubcategory({...newSubcategory, name: e.target.value})}
                disabled={isLoading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem' }}>Description</label>
              <input 
                type="text" 
                className="input-animated"
                value={newSubcategory.description}
                onChange={(e) => setNewSubcategory({...newSubcategory, description: e.target.value})}
                disabled={isLoading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem' }}>Sub Category Image</label>
              <div style={{ width: '60px', height: '60px', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                <ImageIcon size={24} color="rgba(255,255,255,0.4)" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>
              <button  
                type="button"
                onClick={handleAddOrUpdate}
                disabled={!isFormValid || isLoading}
                className="btn-theme"
              >
                {isLoading ? 'Saving...' : editingCode ? 'Update' : 'Add'}
              </button>
              <button  
                type="button"
                onClick={() => {
                  setNewSubcategory({ category_name: '', name: '', description: '' });
                  setEditingCode(null);
                  setIsAdding(false);
                  setErrorMsg('');
                }}
                disabled={isLoading}
                className="btn-danger"
              >
                Close
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default SubCategory;
