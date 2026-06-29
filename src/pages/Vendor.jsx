import React, { useState, useEffect } from 'react';
import { Plus, Download, Edit, Loader } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const initialFormState = {
  name: '', address: '', postal_code: '', city: '', country: 'Bangladesh', contact_no: '', email: '', website: '',
  store_can_receive: false, vendor_type: '', owner_partner: 'Owner',
  vat_registered: false, vat_registration_no: '', nid: '', tin: '', turnover_company: false,
  
  regular_contact: { name: '', designation: '', cell: '', email: '' },
  management_contact: { name: '', designation: '', cell: '', email: '' },
  marketing_contact: { name: '', designation: '', cell: '', email: '' },
  financial_contact: { name: '', designation: '', cell: '', email: '' },
  
  trading_info: { same_as_reg: false, name: '', address: '', postal_code: '', city: '', country: 'Bangladesh', contact_no: '', email: '', website: '', member_director: 'Member' },
  
  contract_details: {
    date_of_enrollment: new Date().toISOString().split('T')[0], manage_stock: 'Yes', gross_margin_on: '', margin_rate: '', 
    payment_terms: '', commission_percent: '', supply_schedule: '', delivery_days: '',
    transport_mode: '', price_change_notice_days: '', special_discount_type: '', special_discount_percent: ''
  },
  
  bank_info: { bank_name: '', branch_name: '', routing_no: '', account_name: '', account_number: '' },
  
  adjust_specify: { damage: '', slow_moving: '', short_dated: '', expire_product: '' }
};

const SectionWrapper = ({ title, titleRight, children }) => (
  <div style={{ border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.03)', marginBottom: '20px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)' }}>
    {title && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
        {titleRight && <div>{titleRight}</div>}
      </div>
    )}
    {children}
  </div>
);

const Vendor = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentTerms, setFilterPaymentTerms] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);

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
        .from('vendors')
        .select('*')
        .order('sl', { ascending: true });
        
      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMsg(`Supabase Error: ${error.message || JSON.stringify(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || v.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTerms = filterPaymentTerms === 'ALL' || v.contract_details?.payment_terms === filterPaymentTerms;
    return matchesSearch && matchesTerms;
  });
  
  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
  const paginatedVendors = filteredVendors.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleAddOrUpdate = async () => {
    if (!formData.name || !formData.address || !formData.vendor_type) {
      setErrorMsg('Please fill in all required fields in Registration Information.');
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (editingId) {
        const { error } = await supabase
          .from('vendors')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const newSl = vendors.length > 0 ? Math.max(...vendors.map(v => v.sl || 0)) + 1 : 1;
        const newCode = `100${newSl}`;
        
        const { error } = await supabase
          .from('vendors')
          .insert([{ ...formData, sl: newSl, code: newCode }]);
          
        if (error) throw error;
      }
      
      await fetchData();
      setFormData(initialFormState);
      setEditingId(null);
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving vendor:', error);
      setErrorMsg(`Supabase Error: ${error.message || JSON.stringify(error)}`);
      setIsLoading(false);
    }
  };

  const handleEdit = (vendor) => {
    setFormData({ ...initialFormState, ...vendor });
    setEditingId(vendor.id);
    setIsAdding(true);
  };

  const toggleStatus = async (vendor) => {
    const newStatus = vendor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ status: newStatus })
        .eq('id', vendor.id);

      if (error) throw error;
      
      setVendors(vendors.map(v => v.id === vendor.id ? { ...v, status: newStatus } : v));
    } catch (error) {
      console.error('Error updating status:', error);
      setErrorMsg(`Error updating status: ${error.message}`);
    }
  };

  const exportCSV = () => {
    const headers = ['SL', 'Code', 'Name', 'Contact No', 'Email', 'Payment Method', 'Supplier Type', 'Address', 'Status'];
    const rows = vendors.map(v => [
      v.sl, v.code, v.name, v.contact_no, v.email || '', v.contract_details?.payment_terms || '', v.vendor_type, v.address.replace(/,/g, ' '), v.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "vendors.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Vendor</h2>
            {isLoading && <Loader className="animate-spin" size={20} color="var(--text-secondary)" />}
          </div>
          <button 
            className="btn btn-primary btn-theme" 
            onClick={() => {
              setFormData(initialFormState);
              setEditingId(null);
              setIsAdding(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <Plus size={16} /> Add New
          </button>
        </div>

        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
          <div style={{ padding: '15px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>Payment Terms and condition</label>
              <select 
                className="input-animated"
                value={filterPaymentTerms}
                onChange={(e) => { setFilterPaymentTerms(e.target.value); setCurrentPage(1); }}
                style={{ width: '250px' }}
              >
                <option value="ALL">ALL</option>
                <option value="After Sale">After Sale</option>
                <option value="Sale After Comm.">Sale After Comm.</option>
                <option value="Credit">Credit</option>
                <option value="Bill to Bill">Bill to Bill</option>
                <option value="Cash Purchase">Cash Purchase</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '5px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" name="exportType" defaultChecked style={{ accentColor: 'var(--accent-primary)' }} /> Excel
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                <input type="radio" name="exportType" style={{ accentColor: 'var(--accent-primary)' }} /> PDF
              </label>
            </div>
            
            <button 
              className="btn btn-primary btn-theme"
              onClick={exportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' }}
            >
              <Download size={16} /> Export Vendor List
            </button>
          </div>

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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>SL</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Code</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Contact No</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Payment Method</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Supplier Type</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Address</th>
                  <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && vendors.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Loading...
                    </td>
                  </tr>
                ) : paginatedVendors.length > 0 ? (
                  paginatedVendors.map((v) => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px' }}>{v.sl}</td>
                      <td style={{ padding: '12px' }}>{v.code}</td>
                      <td style={{ padding: '12px' }}>{v.name}</td>
                      <td style={{ padding: '12px' }}>{v.contact_no}</td>
                      <td style={{ padding: '12px' }}>{v.email}</td>
                      <td style={{ padding: '12px' }}>{v.contract_details?.payment_terms}</td>
                      <td style={{ padding: '12px' }}>{v.vendor_type}</td>
                      <td style={{ padding: '12px' }}>{v.address}</td>
                      <td style={{ padding: '12px' }}>{v.status}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button  
                          onClick={() => handleEdit(v)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Edit size={14} /> Edit
                        </button>
                        <span style={{ margin: '0 5px', color: 'var(--border-color)' }}>|</span>
                        <button 
                          onClick={() => toggleStatus(v)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          {v.status === 'ACTIVE' ? 'Inactive' : 'Active'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No vendors found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '15px', display: 'flex', gap: '5px' }}>
            <button className="btn-theme" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || totalPages === 0}
              style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-color)', color: (currentPage === 1 || totalPages === 0) ? 'var(--text-secondary)' : 'var(--text-primary)', borderRadius: '4px', cursor: (currentPage === 1 || totalPages === 0) ? 'not-allowed' : 'pointer' }}
            >«</button>
            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(page => (
              <button className="btn-theme" 
                key={page}
                onClick={() => setCurrentPage(page)}
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
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{editingId ? 'Edit Vendor' : 'Add Vendor'}</h2>
          {isLoading && <Loader className="animate-spin" size={20} color="var(--text-secondary)" />}
        </div>
        
        <div style={{ padding: '30px' }}>
          <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
            
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Registration Info */}
              <SectionWrapper title="Registration Information">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem' }}>Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="input-animated" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} disabled={isLoading} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem' }}>Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="input-animated" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} disabled={isLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Postal Code</label>
                    <input type="text" className="input-animated" value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} disabled={isLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>City</label>
                    <select className="input-animated" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} disabled={isLoading}>
                      <option value="">-- Select a City --</option>
                      <option value="Dhaka">Dhaka</option>
                      <option value="Chittagong">Chittagong</option>
                      <option value="Sylhet">Sylhet</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Country</label>
                    <select className="input-animated" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} disabled={isLoading}>
                      <option value="Bangladesh">Bangladesh</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Contact No</label>
                    <input type="text" className="input-animated" value={formData.contact_no} onChange={e => setFormData({...formData, contact_no: e.target.value})} disabled={isLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Email</label>
                    <input type="email" className="input-animated" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={isLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Website</label>
                    <input type="text" className="input-animated" placeholder="ex: http://www.example.com" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} disabled={isLoading} />
                  </div>
                  
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '20px', marginTop: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formData.store_can_receive} onChange={e => setFormData({...formData, store_can_receive: e.target.checked})} style={{ accentColor: 'var(--accent-primary)' }} />
                      Store Can Receive
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: 'auto' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input type="radio" name="owner" checked={formData.owner_partner === 'Owner'} onChange={() => setFormData({...formData, owner_partner: 'Owner'})} style={{ accentColor: 'var(--accent-primary)' }} /> Owner
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input type="radio" name="owner" checked={formData.owner_partner === 'Partner'} onChange={() => setFormData({...formData, owner_partner: 'Partner'})} style={{ accentColor: 'var(--accent-primary)' }} /> Partner
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Vendor Type <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <select className="input-animated" value={formData.vendor_type} onChange={e => setFormData({...formData, vendor_type: e.target.value})} disabled={isLoading}>
                      <option value="">-- Select --</option>
                      <option value="Local">Local</option>
                      <option value="Import">Import</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formData.vat_registered} onChange={e => setFormData({...formData, vat_registered: e.target.checked})} style={{ accentColor: 'var(--accent-primary)' }} />
                      VAT Registered
                    </label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formData.turnover_company} onChange={e => setFormData({...formData, turnover_company: e.target.checked})} style={{ accentColor: 'var(--accent-primary)' }} />
                      Turnover Company
                    </label>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem' }}>VAT Registration No</label>
                    <input type="text" className="input-animated" value={formData.vat_registration_no} onChange={e => setFormData({...formData, vat_registration_no: e.target.value})} disabled={isLoading || !formData.vat_registered} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>NID</label>
                    <input type="text" className="input-animated" value={formData.nid} onChange={e => setFormData({...formData, nid: e.target.value})} disabled={isLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>TIN</label>
                    <input type="text" className="input-animated" value={formData.tin} onChange={e => setFormData({...formData, tin: e.target.value})} disabled={isLoading} />
                  </div>

                </div>
              </SectionWrapper>

              {/* Trading Info */}
              <SectionWrapper 
                title="Trading Information" 
                titleRight={
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={formData.trading_info.same_as_reg} onChange={e => handleNestedChange('trading_info', 'same_as_reg', e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
                    Same Registration Information
                  </label>
                }
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem' }}>Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="input-animated" value={formData.trading_info.name} onChange={e => handleNestedChange('trading_info', 'name', e.target.value)} disabled={isLoading || formData.trading_info.same_as_reg} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.85rem' }}>Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input type="text" className="input-animated" value={formData.trading_info.address} onChange={e => handleNestedChange('trading_info', 'address', e.target.value)} disabled={isLoading || formData.trading_info.same_as_reg} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Postal Code</label>
                    <input type="text" className="input-animated" value={formData.trading_info.postal_code} onChange={e => handleNestedChange('trading_info', 'postal_code', e.target.value)} disabled={isLoading || formData.trading_info.same_as_reg} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>City</label>
                    <select className="input-animated" value={formData.trading_info.city} onChange={e => handleNestedChange('trading_info', 'city', e.target.value)} disabled={isLoading || formData.trading_info.same_as_reg}>
                      <option value="">-- Select a City --</option>
                      <option value="Dhaka">Dhaka</option>
                      <option value="Chittagong">Chittagong</option>
                      <option value="Sylhet">Sylhet</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Country</label>
                    <select className="input-animated" value={formData.trading_info.country} onChange={e => handleNestedChange('trading_info', 'country', e.target.value)} disabled={isLoading || formData.trading_info.same_as_reg}>
                      <option value="Bangladesh">Bangladesh</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Contact No</label>
                    <input type="text" className="input-animated" value={formData.trading_info.contact_no} onChange={e => handleNestedChange('trading_info', 'contact_no', e.target.value)} disabled={isLoading || formData.trading_info.same_as_reg} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Email</label>
                    <input type="email" className="input-animated" value={formData.trading_info.email} onChange={e => handleNestedChange('trading_info', 'email', e.target.value)} disabled={isLoading || formData.trading_info.same_as_reg} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Website</label>
                    <input type="text" className="input-animated" value={formData.trading_info.website} onChange={e => handleNestedChange('trading_info', 'website', e.target.value)} disabled={isLoading || formData.trading_info.same_as_reg} />
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '15px', marginTop: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input type="radio" name="member" checked={formData.trading_info.member_director === 'Member'} onChange={() => handleNestedChange('trading_info', 'member_director', 'Member')} style={{ accentColor: 'var(--accent-primary)' }} disabled={isLoading || formData.trading_info.same_as_reg} /> Member
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input type="radio" name="member" checked={formData.trading_info.member_director === 'Director'} onChange={() => handleNestedChange('trading_info', 'member_director', 'Director')} style={{ accentColor: 'var(--accent-primary)' }} disabled={isLoading || formData.trading_info.same_as_reg} /> Director
                    </label>
                  </div>
                </div>
              </SectionWrapper>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* Contacts Helper */}
              {['regular_contact', 'management_contact', 'marketing_contact', 'financial_contact'].map(contactKey => (
                <SectionWrapper key={contactKey} title={contactKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) + " Information"}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.85rem' }}>Name {contactKey === 'regular_contact' && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                      <input type="text" className="input-animated" value={formData[contactKey].name} onChange={e => handleNestedChange(contactKey, 'name', e.target.value)} disabled={isLoading} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: '0.85rem' }}>Designation</label>
                      <input type="text" className="input-animated" value={formData[contactKey].designation} onChange={e => handleNestedChange(contactKey, 'designation', e.target.value)} disabled={isLoading} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Cell {contactKey === 'regular_contact' && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                      <input type="text" className="input-animated" value={formData[contactKey].cell} onChange={e => handleNestedChange(contactKey, 'cell', e.target.value)} disabled={isLoading} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Email</label>
                      <input type="email" className="input-animated" value={formData[contactKey].email} onChange={e => handleNestedChange(contactKey, 'email', e.target.value)} disabled={isLoading} />
                    </div>
                  </div>
                </SectionWrapper>
              ))}
              
            </div>

            {/* Contract Details (Full Width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionWrapper title="Contract Details">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Date of Enrollment</label>
                      <input type="date" className="input-animated" value={formData.contract_details.date_of_enrollment} onChange={e => handleNestedChange('contract_details', 'date_of_enrollment', e.target.value)} disabled={isLoading} />
                    </div>
                    
                    <div>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Gross Margin On</label>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        {['MRP', 'TP', 'Average', 'As per price list'].map(opt => (
                          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input type="radio" name="gm" checked={formData.contract_details.gross_margin_on === opt} onChange={() => handleNestedChange('contract_details', 'gross_margin_on', opt)} style={{ accentColor: 'var(--accent-primary)' }} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Payment Terms and condition <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                        {['After Sale', 'Sale After Comm.', 'Credit', 'Bill to Bill', 'Cash Purchase', 'Cheque'].map(opt => (
                          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input type="radio" name="pt" checked={formData.contract_details.payment_terms === opt} onChange={() => handleNestedChange('contract_details', 'payment_terms', opt)} style={{ accentColor: 'var(--accent-primary)' }} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem' }}>Payment Matured Day(s)</label>
                        <input type="number" className="input-animated" disabled={isLoading} />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Supply Schedule</label>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        {['Daily', 'Weekly', 'Monthly', 'As per requirement'].map(opt => (
                          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input type="radio" name="ss" checked={formData.contract_details.supply_schedule === opt} onChange={() => handleNestedChange('contract_details', 'supply_schedule', opt)} style={{ accentColor: 'var(--accent-primary)' }} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Mode of transport and Load-unload-labor</label>
                      <input type="text" className="input-animated" value={formData.contract_details.transport_mode} onChange={e => handleNestedChange('contract_details', 'transport_mode', e.target.value)} disabled={isLoading} />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Price change notice before (?) day(s)</label>
                      <input type="number" className="input-animated" value={formData.contract_details.price_change_notice_days} onChange={e => handleNestedChange('contract_details', 'price_change_notice_days', e.target.value)} disabled={isLoading} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Special Discount</label>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          {['On MRP', 'On TP'].map(opt => (
                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem' }}>
                              <input type="radio" name="sd" checked={formData.contract_details.special_discount_type === opt} onChange={() => handleNestedChange('contract_details', 'special_discount_type', opt)} style={{ accentColor: 'var(--accent-primary)' }} /> {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.85rem' }}>Special Discount(%)</label>
                        <input type="number" className="input-animated" value={formData.contract_details.special_discount_percent} onChange={e => handleNestedChange('contract_details', 'special_discount_percent', e.target.value)} disabled={isLoading} />
                      </div>
                    </div>

                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Manage Stock <span style={{ color: 'var(--danger)' }}>*</span></label>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="radio" name="ms" checked={formData.contract_details.manage_stock === 'Yes'} onChange={() => handleNestedChange('contract_details', 'manage_stock', 'Yes')} style={{ accentColor: 'var(--accent-primary)' }} /> Yes
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="radio" name="ms" checked={formData.contract_details.manage_stock === 'No'} onChange={() => handleNestedChange('contract_details', 'manage_stock', 'No')} style={{ accentColor: 'var(--accent-primary)' }} /> No
                        </label>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem' }}>Margin Rate</label>
                      <input type="number" className="input-animated" value={formData.contract_details.margin_rate} onChange={e => handleNestedChange('contract_details', 'margin_rate', e.target.value)} disabled={isLoading} />
                    </div>
                    <div style={{ marginTop: '50px' }}>
                      <label style={{ fontSize: '0.85rem' }}>Commission Percent(%)</label>
                      <input type="number" className="input-animated" value={formData.contract_details.commission_percent} onChange={e => handleNestedChange('contract_details', 'commission_percent', e.target.value)} disabled={isLoading} />
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <label style={{ fontSize: '0.85rem' }}>Delivery day(s) after purchase order received</label>
                      <input type="number" className="input-animated" value={formData.contract_details.delivery_days} onChange={e => handleNestedChange('contract_details', 'delivery_days', e.target.value)} disabled={isLoading} />
                    </div>
                  </div>
                </div>
              </SectionWrapper>
            </div>

            {/* Bank Information (Full Width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionWrapper title="Bank Information">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                  <div style={{ gridColumn: '1 / 3' }}>
                    <label style={{ fontSize: '0.85rem' }}>Bank Name</label>
                    <input type="text" className="input-animated" value={formData.bank_info.bank_name} onChange={e => handleNestedChange('bank_info', 'bank_name', e.target.value)} disabled={isLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Branch Name</label>
                    <input type="text" className="input-animated" value={formData.bank_info.branch_name} onChange={e => handleNestedChange('bank_info', 'branch_name', e.target.value)} disabled={isLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Routing No</label>
                    <input type="text" className="input-animated" value={formData.bank_info.routing_no} onChange={e => handleNestedChange('bank_info', 'routing_no', e.target.value)} disabled={isLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Account Name</label>
                    <input type="text" className="input-animated" value={formData.bank_info.account_name} onChange={e => handleNestedChange('bank_info', 'account_name', e.target.value)} disabled={isLoading} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem' }}>Account Number</label>
                    <input type="text" className="input-animated" value={formData.bank_info.account_number} onChange={e => handleNestedChange('bank_info', 'account_number', e.target.value)} disabled={isLoading} />
                  </div>
                </div>
              </SectionWrapper>
            </div>

            {/* Adjust Specify (Full Width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <SectionWrapper title="Adjust Specify">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                  {['damage', 'slow_moving', 'short_dated', 'expire_product'].map(adj => (
                    <div key={adj}>
                      <label style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>{adj.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="radio" name={adj} checked={formData.adjust_specify[adj] === 'Replace'} onChange={() => handleNestedChange('adjust_specify', adj, 'Replace')} style={{ accentColor: 'var(--accent-primary)' }} /> Replace
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input type="radio" name={adj} checked={formData.adjust_specify[adj] === 'Return'} onChange={() => handleNestedChange('adjust_specify', adj, 'Return')} style={{ accentColor: 'var(--accent-primary)' }} /> Return
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionWrapper>
            </div>

            {/* Submit Actions */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
              <button  
                type="button"
                className="btn-theme"
                onClick={handleAddOrUpdate}
                disabled={isLoading}
                style={{ padding: '8px 40px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isLoading ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              <button  
                type="button"
                className="btn-danger"
                onClick={() => {
                  setFormData(initialFormState);
                  setEditingId(null);
                  setIsAdding(false);
                  setErrorMsg('');
                }}
                disabled={isLoading}
                style={{ padding: '8px 40px', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
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

export default Vendor;
