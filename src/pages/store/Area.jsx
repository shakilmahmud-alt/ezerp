import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const Area = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState({ id: null, code: '', name: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error fetching areas:', error);
      toast.error('Failed to load areas');
    } finally {
      setLoading(false);
    }
  };

  const generateNextCode = async () => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && data[0].code) {
        const lastCode = data[0].code;
        const numPart = parseInt(lastCode.replace('A', ''), 10);
        const nextNum = numPart + 1;
        return `A${nextNum.toString().padStart(4, '0')}`;
      } else {
        return 'A0001';
      }
    } catch (error) {
      console.error('Error generating code:', error);
      return 'A0001';
    }
  };

  const handleAddNew = async () => {
    const nextCode = await generateNextCode();
    setFormData({ id: null, code: nextCode, name: '' });
    setIsEditing(false);
    setIsFormVisible(true);
  };

  const handleEdit = (area) => {
    setFormData({ id: area.id, code: area.code, name: area.name });
    setIsEditing(true);
    setIsFormVisible(true);
  };

  const handleCancel = () => {
    setIsFormVisible(false);
    setFormData({ id: null, code: '', name: '' });
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('areas')
          .update({ name: formData.name })
          .eq('id', formData.id);

        if (error) throw error;
        toast.success('Area updated successfully');
      } else {
        const { error } = await supabase
          .from('areas')
          .insert([{ code: formData.code, name: formData.name }]);

        if (error) throw error;
        toast.success('Area added successfully');
      }
      
      setIsFormVisible(false);
      fetchAreas();
    } catch (error) {
      console.error('Error saving area:', error);
      toast.error('Failed to save area');
    }
  };

  return (
    <div className="page-content">
      {!isFormVisible ? (
        <>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>AREA</h2>
            <button 
              className="btn-theme" 
              onClick={handleAddNew} 
              style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
            >
              + Add New
            </button>
          </div>

          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)' }}>
            <div style={{ overflowX: 'auto', minHeight: '300px', paddingBottom: '50px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '12px 10px' }}>SL</th>
                    <th style={{ padding: '12px 10px' }}>Code</th>
                    <th style={{ padding: '12px 10px' }}>Name</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                  ) : areas.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No areas found</td></tr>
                  ) : (
                    areas.map((area, index) => (
                      <tr key={area.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 10px' }}>{index + 1}</td>
                        <td style={{ padding: '12px 10px' }}>{area.code}</td>
                        <td style={{ padding: '12px 10px' }}>{area.name}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleEdit(area)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="page-header" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              {isEditing ? 'Edit AREA' : 'Add AREA'}
            </h2>
          </div>

          <div className="form-container" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                <button 
                  type="submit" 
                  className="btn-theme" 
                  style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {isEditing ? 'Update' : 'Add'}
                </button>
                <button 
                  type="button" 
                  onClick={handleCancel} 
                  className="btn-danger" 
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

export default Area;
