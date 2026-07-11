import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Settings } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';

const StoreList = () => {
  const [stores, setStores] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const initialFormState = {
    id: null,
    name: '',
    area_id: '',
    address: '',
    shop_type: '',
    postal_code: '',
    country: 'Bangladesh',
    email: '',
    city: '',
    contact_no: '',
    date_of_enrollment: '',
    sale_on: 'MRP',
    vat_reg_no: '',
    dl_no: '',
    trade_lic_no: '',
    reference_store_code: '',
    latitude: '',
    longitude: '',
    sms_masking: '',
    web_sale: false,
    store_wise_sales_voucher: false,
    store_opening_time: '',
    store_closing_time: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchStores();
    fetchAreas();

    const handleClickOutside = (event) => {
      if (!event.target.closest('.action-dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select(`
          *,
          areas (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const handleAddNew = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setIsFormVisible(true);
  };

  const handleEdit = (store) => {
    setFormData({
      id: store.id,
      name: store.name || '',
      area_id: store.area_id || '',
      address: store.address || '',
      shop_type: store.shop_type || '',
      postal_code: store.postal_code || '',
      country: store.country || 'Bangladesh',
      email: store.email || '',
      city: store.city || '',
      contact_no: store.contact_no || '',
      date_of_enrollment: store.date_of_enrollment || '',
      sale_on: store.sale_on || 'MRP',
      vat_reg_no: store.vat_reg_no || '',
      dl_no: store.dl_no || '',
      trade_lic_no: store.trade_lic_no || '',
      reference_store_code: store.reference_store_code || '',
      latitude: store.latitude || '',
      longitude: store.longitude || '',
      sms_masking: store.sms_masking || '',
      web_sale: store.web_sale || false,
      store_wise_sales_voucher: store.store_wise_sales_voucher || false,
      store_opening_time: store.store_opening_time || '',
      store_closing_time: store.store_closing_time || ''
    });
    setIsEditing(true);
    setIsFormVisible(true);
    setActiveDropdown(null);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Store status changed to ${newStatus}`);
      fetchStores();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
    setActiveDropdown(null);
  };

  const handleCancel = () => {
    setIsFormVisible(false);
    setFormData(initialFormState);
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.area_id) {
      toast.error('Name and Area are required');
      return;
    }

    const payload = { ...formData };
    delete payload.id;

    // ensure empty strings are null for date/time if needed or just pass empty strings
    // Supabase will handle them if column is varchar, but for time/date empty string might fail
    if (!payload.date_of_enrollment) payload.date_of_enrollment = null;
    if (!payload.store_opening_time) payload.store_opening_time = null;
    if (!payload.store_closing_time) payload.store_closing_time = null;

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('stores')
          .update(payload)
          .eq('id', formData.id);

        if (error) throw error;
        toast.success('Store updated successfully');
      } else {
        const { error } = await supabase
          .from('stores')
          .insert([payload]);

        if (error) throw error;
        toast.success('Store added successfully');
      }
      
      setIsFormVisible(false);
      fetchStores();
    } catch (error) {
      console.error('Error saving store:', error);
      toast.error('Failed to save store');
    }
  };

  return (
    <div className="page-content">
      {!isFormVisible ? (
        <>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Store List</h2>
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
                    <th style={{ padding: '12px 10px' }}>AREA</th>
                    <th style={{ padding: '12px 10px' }}>Name</th>
                    <th style={{ padding: '12px 10px' }}>Contact No</th>
                    <th style={{ padding: '12px 10px' }}>Email</th>
                    <th style={{ padding: '12px 10px' }}>DOE</th>
                    <th style={{ padding: '12px 10px' }}>Status</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                  ) : stores.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No stores found</td></tr>
                  ) : (
                    stores.map((store, index) => (
                      <tr key={store.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 10px' }}>{index + 1}</td>
                        <td style={{ padding: '12px 10px' }}>{store.areas?.name}</td>
                        <td style={{ padding: '12px 10px' }}>{store.name}</td>
                        <td style={{ padding: '12px 10px' }}>{store.contact_no}</td>
                        <td style={{ padding: '12px 10px' }}>{store.email}</td>
                        <td style={{ padding: '12px 10px' }}>{store.date_of_enrollment ? new Date(store.date_of_enrollment).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : ''}</td>
                        <td style={{ padding: '12px 10px' }}>{store.status}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }} className="action-dropdown-container">
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button 
                            className="btn-primary" 
                            style={{ padding: '4px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setActiveDropdown(activeDropdown === store.id ? null : store.id)}
                          >
                            Action <span>▼</span>
                          </button>
                          {activeDropdown === store.id && (
                            <div style={{
                              position: 'absolute', right: 0, top: '100%',
                              backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)',
                              borderRadius: '4px', marginTop: '2px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                              zIndex: 10, minWidth: '100px', textAlign: 'left'
                            }}>
                              <button 
                                onClick={() => handleEdit(store)}
                                style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px' }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleStatusChange(store.id, 'ACTIVE')}
                                disabled={store.status === 'ACTIVE'}
                                style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: store.status === 'ACTIVE' ? 'not-allowed' : 'pointer', color: store.status === 'ACTIVE' ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: '13px' }}
                                onMouseEnter={(e) => { if(store.status !== 'ACTIVE') e.target.style.backgroundColor = 'rgba(0,0,0,0.05)'}}
                                onMouseLeave={(e) => { if(store.status !== 'ACTIVE') e.target.style.backgroundColor = 'transparent'}}
                              >
                                Active
                              </button>
                              <button 
                                onClick={() => handleStatusChange(store.id, 'INACTIVE')}
                                disabled={store.status === 'INACTIVE'}
                                style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: store.status === 'INACTIVE' ? 'not-allowed' : 'pointer', color: store.status === 'INACTIVE' ? 'var(--text-secondary)' : 'var(--text-primary)', fontSize: '13px' }}
                                onMouseEnter={(e) => { if(store.status !== 'INACTIVE') e.target.style.backgroundColor = 'rgba(0,0,0,0.05)'}}
                                onMouseLeave={(e) => { if(store.status !== 'INACTIVE') e.target.style.backgroundColor = 'transparent'}}
                              >
                                Inactive
                              </button>
                            </div>
                          )}
                        </div>
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
          <div className="page-header" style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              {isEditing ? 'Edit Store' : 'Add Store'}
            </h2>
          </div>

          <div className="form-container" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <form onSubmit={handleSubmit}>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} style={inputStyle} required />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>AREA</label>
                <CustomSelect name="area_id" value={formData.area_id} onChange={handleChange} style={inputStyle} required>
                  <option value="">-- Select Area --</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </CustomSelect>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Shop Type</label>
                  <CustomSelect name="shop_type" value={formData.shop_type} onChange={handleChange} style={inputStyle}>
                    <option value="">-- Select a Shop Type --</option>
                    <option value="Central Store">Central Store</option>
                    <option value="Store">Store</option>
                  </CustomSelect>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Postal Code</label>
                  <input type="text" name="postal_code" value={formData.postal_code} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Contact No</label>
                  <input type="text" name="contact_no" value={formData.contact_no} onChange={handleChange} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Country</label>
                  <CustomSelect name="country" value={formData.country} onChange={handleChange} style={inputStyle}>
                    <option value="Bangladesh">Bangladesh</option>
                  </CustomSelect>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Date of Enrollment</label>
                  <input type="date" name="date_of_enrollment" value={formData.date_of_enrollment} onChange={handleChange} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Sale on</label>
                  <CustomSelect name="sale_on" value={formData.sale_on} onChange={handleChange} style={inputStyle}>
                    <option value="MRP">MRP</option>
                  </CustomSelect>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>VAT Reg. No</label>
                  <input type="text" name="vat_reg_no" value={formData.vat_reg_no} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>D.L. No</label>
                  <input type="text" name="dl_no" value={formData.dl_no} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>SMS Masking</label>
                  <CustomSelect name="sms_masking" value={formData.sms_masking} onChange={handleChange} style={inputStyle}>
                    <option value="">-- Select a SMS Masking --</option>
                    <option value="EG ERP">EG ERP</option>
                  </CustomSelect>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Trade Lic. No</label>
                  <input type="text" name="trade_lic_no" value={formData.trade_lic_no} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Reference Store Code</label>
                  <input type="text" name="reference_store_code" value={formData.reference_store_code} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingTop: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <input type="checkbox" name="web_sale" checked={formData.web_sale} onChange={handleChange} />
                    Web Sale
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <input type="checkbox" name="store_wise_sales_voucher" checked={formData.store_wise_sales_voucher} onChange={handleChange} />
                    Store wise sales voucher
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Latitude</label>
                  <input type="text" name="latitude" value={formData.latitude} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>Longitude</label>
                  <input type="text" name="longitude" value={formData.longitude} onChange={handleChange} style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>STORE OPENING TIME</label>
                    <input type="time" name="store_opening_time" value={formData.store_opening_time} onChange={handleChange} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>STORE CLOSING TIME</label>
                    <input type="time" name="store_closing_time" value={formData.store_closing_time} onChange={handleChange} style={inputStyle} />
                  </div>
                </div>
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

const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '4px',
  border: '1px solid var(--border-color)',
  background: 'transparent',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '13px'
};

export default StoreList;
