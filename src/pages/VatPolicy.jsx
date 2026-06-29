import React, { useState, useEffect } from 'react';
import { Plus, Download, Edit, Loader } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const VatPolicy = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form State
  const [newPolicy, setNewPolicy] = useState({
    sdc_vat_code: '',
    sdc_sd_code: '',
    vat_rate: '',
    sd_rate: ''
  });
  
  // Edit State
  const [editingId, setEditingId] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('vat_policies')
        .select('*')
        .order('sl', { ascending: true });
        
      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMsg(`Supabase Error: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPolicies = policies.filter(p => p.sdc_vat_code?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sdc_sd_code?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(filteredPolicies.length / itemsPerPage);
  const paginatedPolicies = filteredPolicies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAddOrUpdate = async () => {
    if (!newPolicy.sdc_vat_code) return;
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      const vatRateNum = parseFloat(newPolicy.vat_rate) || 0;
      const sdRateNum = parseFloat(newPolicy.sd_rate) || 0;

      if (editingId) {
        // Update
        const { error } = await supabase
          .from('vat_policies')
          .update({ 
            sdc_vat_code: newPolicy.sdc_vat_code, 
            sdc_sd_code: newPolicy.sdc_sd_code,
            vat_rate: vatRateNum,
            sd_rate: sdRateNum
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Add
        const newSl = policies.length > 0 ? Math.max(...policies.map(p => p.sl || 0)) + 1 : 1;
        
        const { error } = await supabase
          .from('vat_policies')
          .insert([{ 
            sl: newSl, 
            sdc_vat_code: newPolicy.sdc_vat_code, 
            sdc_sd_code: newPolicy.sdc_sd_code,
            vat_rate: vatRateNum,
            sd_rate: sdRateNum
          }]);
          
        if (error) throw error;
      }
      
      await fetchData();
      setNewPolicy({ sdc_vat_code: '', sdc_sd_code: '', vat_rate: '', sd_rate: '' });
      setEditingId(null);
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving vat policy:', error);
      setErrorMsg(`Supabase Error: ${error.message || JSON.stringify(error)}`);
      setIsLoading(false);
    }
  };

  const handleEdit = (policy) => {
    setNewPolicy({ 
      sdc_vat_code: policy.sdc_vat_code, 
      sdc_sd_code: policy.sdc_sd_code || '',
      vat_rate: policy.vat_rate,
      sd_rate: policy.sd_rate
    });
    setEditingId(policy.id);
    setIsAdding(true);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const isFormValid = newPolicy.sdc_vat_code.trim() !== '';

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
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Vat policy</h2>
            {isLoading && <Loader className="animate-spin" size={20} color="var(--text-secondary)" />}
          </div>
          <button 
            className="btn btn-primary btn-theme" 
            onClick={() => {
              setNewPolicy({ sdc_vat_code: '', sdc_sd_code: '', vat_rate: '', sd_rate: '' });
              setEditingId(null);
              setIsAdding(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Plus size={16} /> Add New
          </button>
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
                  <th style={{ textAlign: 'left', padding: '12px 15px', fontWeight: 600 }}>SL</th>
                  <th style={{ textAlign: 'left', padding: '12px 15px', fontWeight: 600 }}>SDC VAT CODE</th>
                  <th style={{ textAlign: 'left', padding: '12px 15px', fontWeight: 600 }}>SDC SD CODE</th>
                  <th style={{ textAlign: 'left', padding: '12px 15px', fontWeight: 600 }}>Vat rate</th>
                  <th style={{ textAlign: 'left', padding: '12px 15px', fontWeight: 600 }}>SD rate</th>
                  <th style={{ textAlign: 'center', padding: '12px 15px', fontWeight: 600 }}></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && policies.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Loading...
                    </td>
                  </tr>
                ) : paginatedPolicies.length > 0 ? (
                  paginatedPolicies.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 15px' }}>{p.sl}</td>
                      <td style={{ padding: '12px 15px' }}>{p.sdc_vat_code}</td>
                      <td style={{ padding: '12px 15px' }}>{p.sdc_sd_code}</td>
                      <td style={{ padding: '12px 15px' }}>{p.vat_rate}</td>
                      <td style={{ padding: '12px 15px' }}>{p.sd_rate}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                        <button  
                          onClick={() => handleEdit(p)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Edit size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No vat policies found.
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

  return (
    <div style={{ padding: '20px', color: 'var(--text-primary)' }}>
      {errorMsg && (
        <div style={{ padding: '15px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', marginBottom: '20px', borderRadius: '4px', border: '1px solid var(--danger)' }}>
          {errorMsg}
        </div>
      )}
      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Add</h2>
          {isLoading && <Loader className="animate-spin" size={20} color="var(--text-secondary)" />}
        </div>
        
        <div style={{ padding: '40px' }}>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem' }}>SDC VAT CODE <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input 
                type="text" 
                className="input-animated"
                value={newPolicy.sdc_vat_code}
                onChange={(e) => setNewPolicy({...newPolicy, sdc_vat_code: e.target.value})}
                disabled={isLoading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem' }}>SDC SD CODE</label>
              <input 
                type="text" 
                className="input-animated"
                value={newPolicy.sdc_sd_code}
                onChange={(e) => setNewPolicy({...newPolicy, sdc_sd_code: e.target.value})}
                disabled={isLoading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem' }}>VAT RATE</label>
              <input 
                type="number"
                step="0.01" 
                className="input-animated"
                value={newPolicy.vat_rate}
                onChange={(e) => setNewPolicy({...newPolicy, vat_rate: e.target.value})}
                disabled={isLoading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem' }}>SD RATE</label>
              <input 
                type="number"
                step="0.01" 
                className="input-animated"
                value={newPolicy.sd_rate}
                onChange={(e) => setNewPolicy({...newPolicy, sd_rate: e.target.value})}
                disabled={isLoading}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button  
                type="button"
                onClick={handleAddOrUpdate}
                disabled={!isFormValid || isLoading}
                className="btn-theme"
              >
                {isLoading ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              <button  
                type="button"
                onClick={() => {
                  setNewPolicy({ sdc_vat_code: '', sdc_sd_code: '', vat_rate: '', sd_rate: '' });
                  setEditingId(null);
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

export default VatPolicy;
