import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Country, City } from 'country-state-city';
import { useAuth } from '../../context/AuthContext';
import { Search } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';

const initialFormState = {
  customer_type_id: '',
  gender: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  dob: '',
  enrollment_date: new Date().toISOString().split('T')[0],
  expire_date: '',
  contact_no: '',
  email: '',
  card_no: '',
  address: '',
  country: 'BD', // default Bangladesh
  city: '',
  postal_code: '',
  discount_percent: 0,
  special_date: '',
  special_date_note: '',
  store: '',
  credit_customer: false,
  nid: '',
  tin: '',
  vat_reg_no: ''
};

const PosCustomerManagement = () => {
  const [view, setView] = useState('list');
  const [customers, setCustomers] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [previewCustomer, setPreviewCustomer] = useState(null);
  
  const { posTerminal } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setCountries(Country.getAllCountries());
    fetchCustomerTypes();
    if (view === 'list') {
      fetchCustomers();
    }
  }, [view]);

  useEffect(() => {
    if (formData.country) {
      setCities(City.getCitiesOfCountry(formData.country));
    } else {
      setCities([]);
    }
  }, [formData.country]);

  const fetchCustomerTypes = async () => {
    try {
      const { data, error } = await supabase.from('customer_types').select('id, name');
      if (error) throw error;
      setCustomerTypes(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch Customer Types');
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          customer_type:customer_types(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch Customers');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.contact_no || !formData.address || !formData.city || !formData.gender) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsLoading(true);

    try {
      const payload = { ...formData };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });
      
      // Assign the store id to POS terminal's store
      payload.store = posTerminal?.store_id;

      // Generate Code
      let newCode = '100001';
      const { data: allRecords } = await supabase
        .from('customers')
        .select('code');
        
      if (allRecords && allRecords.length > 0) {
        let maxNum = 100000;
        allRecords.forEach(item => {
          if (item.code) {
            const num = parseInt(item.code, 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
        newCode = String(maxNum + 1);
      }
      
      payload.code = newCode;
      if (!payload.card_no) payload.card_no = newCode; 

      const { error } = await supabase
        .from('customers')
        .insert([payload]);
        
      if (error) throw error;
      toast.success('Customer added successfully');
      
      setView('list');
      setFormData(initialFormState);
    } catch (err) {
      console.error(err);
      toast.error('Error saving customer');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.contact_no?.includes(searchQuery) ||
    c.card_no?.includes(searchQuery) ||
    c.code?.includes(searchQuery)
  );

  const handlePreview = () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer first');
      return;
    }
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (customer) {
      setPreviewCustomer(customer);
    }
  };

  return (
    <div style={{ padding: '20px', height: 'calc(100vh - 65px)', backgroundColor: 'rgba(255,255,255,0.9)', overflowY: 'auto' }}>
      
      {view === 'list' && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>Customer List</h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div>
              <span 
                onClick={() => setView('add')}
                style={{ color: 'blue', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
              >
                Add Customer
              </span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '4px 10px', border: '1px solid #ccc' }} 
              />
              <button className="btn" style={{ backgroundColor: '#e0e0e0', color: '#333' }}>Search</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc' }}>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '80px' }}>ID</th>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '80px' }}>Card No</th>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '100px' }}>First Name</th>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '100px' }}>Middle Name</th>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '100px' }}>Last Name</th>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '80px' }}>Type</th>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '80px' }}>Discount(%)</th>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '100px' }}>Phone</th>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '120px' }}>Email</th>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '100px' }}>City</th>
                  <th style={{ padding: '8px', textAlign: 'left', minWidth: '100px' }}>Country</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust, idx) => (
                  <tr 
                    key={cust.id} 
                    onClick={() => setSelectedCustomerId(cust.id)}
                    style={{ 
                      backgroundColor: selectedCustomerId === cust.id ? 'rgba(46, 111, 64, 0.15)' : (idx % 2 === 0 ? '#fff' : '#fff9d6'), 
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer' 
                    }}
                  >
                    <td style={{ padding: '6px 8px' }}>{cust.code || cust.id}</td>
                    <td style={{ padding: '6px 8px' }}>{cust.card_no}</td>
                    <td style={{ padding: '6px 8px' }}>{cust.first_name}</td>
                    <td style={{ padding: '6px 8px' }}>{cust.middle_name}</td>
                    <td style={{ padding: '6px 8px' }}>{cust.last_name}</td>
                    <td style={{ padding: '6px 8px' }}>{cust.customer_type?.name}</td>
                    <td style={{ padding: '6px 8px' }}>{cust.discount_percent || '0.00'}</td>
                    <td style={{ padding: '6px 8px' }}>{cust.contact_no}</td>
                    <td style={{ padding: '6px 8px' }}>{cust.email}</td>
                    <td style={{ padding: '6px 8px' }}>{cust.city}</td>
                    <td style={{ padding: '6px 8px' }}>{cust.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn btn-theme" onClick={handlePreview}>Preview</button>
            <button className="btn btn-secondary" onClick={() => navigate('/pos')}>Close</button>
          </div>
        </div>
      )}

      {view === 'add' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div style={{ 
            backgroundColor: '#a3f0c3', // Mint green background from image
            width: '100%', 
            maxWidth: '800px', 
            borderRadius: '4px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '5px 15px', backgroundColor: '#fff', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px' }}>New Customer</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setView('list')}>✕</span>
            </div>
            
            <form onSubmit={handleSave} style={{ padding: '20px' }}>
              <h3 style={{ color: '#d32f2f', margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>Customer Entry</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 30px' }}>
                
                {/* Left Column */}
                <div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Gender</label>
                    <div style={{ flex: 1 }}>
                      <CustomSelect value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                        <option value="">--Select--</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </CustomSelect>
                    </div>
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>First Name <span style={{ color: 'red' }}>*</span></label>
                    <input type="text" required value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Last Name</label>
                    <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Address <span style={{ color: 'red' }}>*</span></label>
                    <input type="text" required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>City <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ flex: 1 }}>
                      <CustomSelect required value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}>
                        <option value="">--Select--</option>
                        {cities.map(city => <option key={city.name} value={city.name}>{city.name}</option>)}
                      </CustomSelect>
                    </div>
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Country</label>
                    <div style={{ flex: 1 }}>
                      <CustomSelect value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})}>
                        {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                      </CustomSelect>
                    </div>
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Age Range</label>
                    <div style={{ flex: 1 }}>
                      <CustomSelect>
                        <option value="">--Select--</option>
                        <option value="18-25">18-25</option>
                        <option value="26-40">26-40</option>
                      </CustomSelect>
                    </div>
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Date of Birth</label>
                    <input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Card No</label>
                    <input type="text" value={formData.card_no} onChange={(e) => setFormData({...formData, card_no: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Special Note</label>
                    <input type="text" value={formData.special_date_note} onChange={(e) => setFormData({...formData, special_date_note: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Credit Customer</label>
                    <input type="checkbox" checked={formData.credit_customer} onChange={(e) => setFormData({...formData, credit_customer: e.target.checked})} /> <span style={{fontSize: '12px', marginLeft: '5px'}}>Y/N</span>
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Customer ID</label>
                    <input type="text" disabled style={{ flex: 1, padding: '4px', backgroundColor: '#a5d6a7' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Type</label>
                    <div style={{ flex: 1 }}>
                      <CustomSelect value={formData.customer_type_id} onChange={(e) => setFormData({...formData, customer_type_id: e.target.value})}>
                        <option value="">--Select--</option>
                        {customerTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </CustomSelect>
                    </div>
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Middle Name</label>
                    <input type="text" value={formData.middle_name} onChange={(e) => setFormData({...formData, middle_name: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '32px' }}>
                    {/* Placeholder to match spacing of address */}
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Postal Code</label>
                    <input type="text" value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Phone <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', flex: 1 }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#eee', border: '1px solid #ccc', borderRight: 'none' }}>+88</span>
                      <input type="text" required value={formData.contact_no} onChange={(e) => setFormData({...formData, contact_no: e.target.value})} style={{ flex: 1, padding: '4px', border: '1px solid #ccc' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Discount (%)</label>
                    <input type="number" value={formData.discount_percent} onChange={(e) => setFormData({...formData, discount_percent: parseFloat(e.target.value)})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Date of Expire</label>
                    <input type="date" value={formData.expire_date} onChange={(e) => setFormData({...formData, expire_date: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>BIN</label>
                    <input type="text" style={{ flex: 1, padding: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', marginBottom: '8px', alignItems: 'center' }}>
                    <label style={{ width: '100px', fontSize: '13px' }}>Special Date</label>
                    <input type="date" value={formData.special_date} onChange={(e) => setFormData({...formData, special_date: e.target.value})} style={{ flex: 1, padding: '4px' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="submit" disabled={isLoading} className="btn btn-primary" style={{ padding: '8px 30px', fontWeight: 'bold' }}>
                  {isLoading ? '...' : 'Save'}
                </button>
                <button type="button" onClick={() => setView('list')} className="btn" style={{ backgroundColor: '#bc3360', color: 'white', padding: '8px 30px', fontWeight: 'bold' }}>
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', minWidth: '400px', maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Customer Preview</h3>
              <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setPreviewCustomer(null)}>✕</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
              <div><strong>Code/ID:</strong> {previewCustomer.code || previewCustomer.id}</div>
              <div><strong>Card No:</strong> {previewCustomer.card_no}</div>
              <div><strong>First Name:</strong> {previewCustomer.first_name}</div>
              <div><strong>Middle Name:</strong> {previewCustomer.middle_name}</div>
              <div><strong>Last Name:</strong> {previewCustomer.last_name}</div>
              <div><strong>Type:</strong> {previewCustomer.customer_type?.name}</div>
              <div><strong>Discount:</strong> {previewCustomer.discount_percent}%</div>
              <div><strong>Phone:</strong> {previewCustomer.contact_no}</div>
              <div><strong>Email:</strong> {previewCustomer.email}</div>
              <div><strong>City:</strong> {previewCustomer.city}</div>
              <div><strong>Country:</strong> {previewCustomer.country}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {previewCustomer.address}</div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPreviewCustomer(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PosCustomerManagement;
