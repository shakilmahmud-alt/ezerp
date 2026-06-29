import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Check, X, ChevronDown, Printer, Edit } from 'lucide-react';
import { Country, City } from 'country-state-city';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  alt_contact_no: '',
  email: '',
  card_no: '',
  address: '',
  shipping_address: '',
  country: 'BD', // default Bangladesh
  city: '',
  postal_code: '',
  discount_percent: 0,
  special_date: '',
  special_date_note: '',
  salesperson: '',
  store: '',
  wholesale_customer: false,
  sale_without_vat: false,
  credit_customer: false,
  store_customer: false,
  inactive: false,
  vat_reg_no: '',
  nid: '',
  tin: '',
  ref_person_name: '',
  ref_company: '',
  ref_designation: ''
};

const CustomerEntry = () => {
  const [view, setView] = useState('list');
  const [customers, setCustomers] = useState([]);
  const [customerTypes, setCustomerTypes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [printingCustomer, setPrintingCustomer] = useState(null);
  
  const barcodeRef = useRef(null);
  const printCardRef = useRef(null);

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

  useEffect(() => {
    if (printingCustomer && barcodeRef.current) {
      JsBarcode(barcodeRef.current, printingCustomer.card_no || printingCustomer.code || '0000', {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: false
      });
      generatePDF();
    }
  }, [printingCustomer]);

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
    if (!formData.first_name || !formData.contact_no || !formData.address || !formData.city || !formData.gender || !formData.store) {
      toast.error('Please fill all required fields');
      return;
    }
    setIsLoading(true);

    try {
      const payload = { ...formData };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });
      
      if (editingId) {
        payload.updated_at = new Date();
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('Customer updated successfully');
      } else {
        // Generate Code
        let newCode = '100001';
        const { data: lastRecord } = await supabase
          .from('customers')
          .select('code')
          .order('code', { ascending: false })
          .limit(1);
          
        if (lastRecord && lastRecord.length > 0 && lastRecord[0].code) {
          const lastNum = parseInt(lastRecord[0].code, 10);
          if (!isNaN(lastNum)) {
            newCode = String(lastNum + 1);
          }
        }
        
        payload.code = newCode;
        if (!payload.card_no) payload.card_no = newCode; // Default card no to code if empty

        const { error } = await supabase
          .from('customers')
          .insert([payload]);
          
        if (error) throw error;
        toast.success('Customer added successfully');
      }
      setView('list');
      setEditingId(null);
      setFormData(initialFormState);
    } catch (err) {
      console.error(err);
      toast.error('Error saving customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (customer) => {
    setActiveDropdown(null);
    const formValues = { ...customer };
    delete formValues.id;
    delete formValues.code;
    delete formValues.created_at;
    delete formValues.updated_at;
    delete formValues.customer_type;
    
    // Convert nulls to empty strings
    Object.keys(formValues).forEach(key => {
      if (formValues[key] === null) formValues[key] = '';
    });
    
    setFormData(formValues);
    setEditingId(customer.id);
    setView('add');
  };

  const handlePrintCard = (customer) => {
    setActiveDropdown(null);
    setPrintingCustomer(customer);
  };

  const generatePDF = async () => {
    try {
      toast.loading('Generating Card PDF...', { id: 'pdf-toast' });
      const element = printCardRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54] // CR80 standard card size
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 54);
      pdf.save(`${printingCustomer.first_name}_Card.pdf`);
      toast.success('Card downloaded!', { id: 'pdf-toast' });
      setPrintingCustomer(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF', { id: 'pdf-toast' });
      setPrintingCustomer(null);
    }
  };

  const BooleanText = ({ value }) => (
    <span>{value ? 'true' : 'false'}</span>
  );

  const inputStyle = {
    width: '100%',
    border: 'none',
    borderBottom: '1px dotted #ccc',
    borderRadius: '0',
    padding: '4px 0',
    backgroundColor: 'transparent',
    outline: 'none',
    fontSize: '0.85rem',
    color: 'var(--text-primary)'
  };
  
  const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    color: '#555',
    marginBottom: '2px'
  };

  const checkboxContainerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    marginTop: '15px'
  };

  if (view === 'add') {
    return (
      <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #ddd', overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #ddd', backgroundColor: '#fff' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333', margin: 0 }}>
              {editingId ? 'Edit Customer' : 'Add Customer'}
            </h2>
          </div>
          
          <form onSubmit={handleSave} style={{ padding: '20px 30px' }}>
            
            {/* Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Customer Type</label>
                <select style={inputStyle} value={formData.customer_type_id} onChange={e => setFormData({...formData, customer_type_id: e.target.value})}>
                  <option value="">Select a Type</option>
                  {customerTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Gender <span style={{ color: 'red' }}>*</span></label>
                <select style={inputStyle} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} required>
                  <option value="">Select a Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>First Name <span style={{ color: 'red' }}>*</span></label>
                <input type="text" style={inputStyle} value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
              </div>
              <div>
                <label style={labelStyle}>Middle Name</label>
                <input type="text" style={inputStyle} value={formData.middle_name} onChange={e => setFormData({...formData, middle_name: e.target.value})} />
              </div>
            </div>

            {/* Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input type="text" style={inputStyle} value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Date Of Birth</label>
                <input type="date" style={inputStyle} value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Date Of Enrollment</label>
                <input type="date" style={inputStyle} value={formData.enrollment_date} onChange={e => setFormData({...formData, enrollment_date: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Date Of Ex{"\u200B"}pire</label>
                <input type="date" autoComplete="off" id="customer_validity_end" name="customer_validity_end" style={inputStyle} value={formData.expire_date} onChange={e => setFormData({...formData, expire_date: e.target.value})} />
              </div>
            </div>

            {/* Row 3 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Contact No <span style={{ color: 'red' }}>*</span></label>
                <input type="text" style={inputStyle} value={formData.contact_no} onChange={e => setFormData({...formData, contact_no: e.target.value})} required />
              </div>
              <div>
                <label style={labelStyle}>Alternative Contact No</label>
                <input type="text" style={inputStyle} value={formData.alt_contact_no} onChange={e => setFormData({...formData, alt_contact_no: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" style={inputStyle} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Card No</label>
                <input type="text" style={inputStyle} value={formData.card_no} onChange={e => setFormData({...formData, card_no: e.target.value})} />
              </div>
            </div>

            {/* Row 4 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Address <span style={{ color: 'red' }}>*</span></label>
                <input type="text" style={inputStyle} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
              </div>
              <div>
                <label style={labelStyle}>Shipping Address</label>
                <input type="text" style={inputStyle} value={formData.shipping_address} onChange={e => setFormData({...formData, shipping_address: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>City <span style={{ color: 'red' }}>*</span></label>
                <select style={inputStyle} value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required>
                  <option value="">--Select a City--</option>
                  {cities.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Postal Code</label>
                <input type="text" style={inputStyle} value={formData.postal_code} onChange={e => setFormData({...formData, postal_code: e.target.value})} />
              </div>
            </div>

            {/* Row 5 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Country</label>
                <select style={inputStyle} value={formData.country} onChange={e => {setFormData({...formData, country: e.target.value, city: ''})}}>
                  <option value="">Select a Country</option>
                  {countries.map(c => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Discount Percent</label>
                <input type="number" step="0.01" style={inputStyle} value={formData.discount_percent} onChange={e => setFormData({...formData, discount_percent: parseFloat(e.target.value)||0})} />
              </div>
              <div>
                <label style={labelStyle}>Salesperson</label>
                <select style={inputStyle} value={formData.salesperson} onChange={e => setFormData({...formData, salesperson: e.target.value})}>
                  <option value="">Select a Employee</option>
                  <option value="Emp 1">Emp 1</option>
                  <option value="Emp 2">Emp 2</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Store <span style={{ color: 'red' }}>*</span></label>
                <select style={inputStyle} value={formData.store} onChange={e => setFormData({...formData, store: e.target.value})} required>
                  <option value="">-- Select a Store --</option>
                  <option value="Central Store">Central Store</option>
                  <option value="Shop">Shop</option>
                </select>
              </div>
            </div>

            {/* Row 6 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Special Date</label>
                <input type="date" style={inputStyle} value={formData.special_date} onChange={e => setFormData({...formData, special_date: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Special Date Note</label>
                <input type="text" style={inputStyle} value={formData.special_date_note} onChange={e => setFormData({...formData, special_date_note: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Age Range</label>
                <select style={inputStyle}>
                  <option value="">Select Age Range</option>
                </select>
              </div>
              <div>
                <label style={checkboxContainerStyle}>
                  <input type="checkbox" checked={formData.wholesale_customer} onChange={e => setFormData({...formData, wholesale_customer: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Wholesale Customer
                </label>
              </div>
            </div>

            {/* Row 7 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px', marginBottom: '20px' }}>
              <div>
                <label style={checkboxContainerStyle}>
                  <input type="checkbox" checked={formData.sale_without_vat} onChange={e => setFormData({...formData, sale_without_vat: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Sale Without VAT
                </label>
              </div>
              <div>
                <label style={checkboxContainerStyle}>
                  <input type="checkbox" checked={formData.credit_customer} onChange={e => setFormData({...formData, credit_customer: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Credit Customer
                </label>
              </div>
              <div>
                <label style={checkboxContainerStyle}>
                  {formData.store_customer ? <Check size={18} color="#00bcd4" /> : <div style={{ width: '16px', height: '16px', border: '1px solid #ccc', backgroundColor: '#fff' }}></div>}
                  <input type="checkbox" checked={formData.store_customer} onChange={e => setFormData({...formData, store_customer: e.target.checked})} style={{ position: 'absolute', opacity: 0 }} />
                  Store Customer
                </label>
              </div>
              <div>
                <label style={checkboxContainerStyle}>
                  <input type="checkbox" checked={formData.inactive} onChange={e => setFormData({...formData, inactive: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Inactive
                </label>
              </div>
            </div>

            {/* Row 8 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>VAT Registration No</label>
                <input type="text" style={inputStyle} value={formData.vat_reg_no} onChange={e => setFormData({...formData, vat_reg_no: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>NID</label>
                <input type="text" style={inputStyle} value={formData.nid} onChange={e => setFormData({...formData, nid: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>TIN</label>
                <input type="text" style={inputStyle} value={formData.tin} onChange={e => setFormData({...formData, tin: e.target.value})} />
              </div>
              <div></div>
            </div>

            {/* Row 9 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Reference Person Name</label>
                <input type="text" style={inputStyle} value={formData.ref_person_name} onChange={e => setFormData({...formData, ref_person_name: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Reference Company</label>
                <input type="text" style={inputStyle} value={formData.ref_company} onChange={e => setFormData({...formData, ref_company: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Reference Designation</label>
                <input type="text" style={inputStyle} value={formData.ref_designation} onChange={e => setFormData({...formData, ref_designation: e.target.value})} />
              </div>
              <div></div>
            </div>
              
            <div style={{ display: 'flex', gap: '10px', marginTop: '30px', paddingLeft: '25%' }}>
              <button 
                type="submit" 
                className="btn-theme"
                disabled={isLoading}
                style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isLoading ? 'Saving...' : editingId ? 'Update' : 'Save'}
              </button>
              <button 
                type="button" 
                className="btn-danger"
                onClick={() => { setView('list'); setEditingId(null); setFormData(initialFormState); }}
                disabled={isLoading}
                style={{ padding: '8px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Close
              </button>
            </div>

          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      {/* Hidden Print Container */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
        {printingCustomer && (
          <div 
            ref={printCardRef}
            style={{ 
              width: '85.6mm', 
              height: '54mm', 
              backgroundColor: '#fff', 
              position: 'relative',
              padding: '5mm',
              boxSizing: 'border-box',
              fontFamily: 'sans-serif',
              border: '1px solid #ccc' // for reference before html2canvas
            }}
          >
            {/* Logo */}
            <div style={{ position: 'absolute', top: '5mm', left: '5mm', width: '25mm', height: '25mm', borderRadius: '50%', backgroundColor: '#000', overflow: 'hidden' }}>
              <img src="/EZ-ERP-LOGO.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            
            {/* Top Right Header */}
            <div style={{ position: 'absolute', top: '5mm', right: '5mm', textAlign: 'right' }}>
              <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {printingCustomer.first_name} {printingCustomer.last_name || ''}
              </h1>
              <h2 style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', marginTop: '2mm' }}>
                {printingCustomer.customer_type?.name || 'REGULAR'}
              </h2>
            </div>
            
            {/* Barcode */}
            <div style={{ position: 'absolute', top: '22mm', right: '5mm', textAlign: 'right' }}>
              <svg ref={barcodeRef}></svg>
            </div>
            
            {/* Customer Details */}
            <div style={{ position: 'absolute', bottom: '5mm', right: '5mm', textAlign: 'right' }}>
              <p style={{ margin: '2mm 0 0 0', fontSize: '10px', fontWeight: 'bold' }}>
                Contact No: <span style={{ fontWeight: 'normal' }}>{printingCustomer.contact_no}</span>
              </p>
              <p style={{ margin: '1mm 0 0 0', fontSize: '10px', fontWeight: 'bold' }}>
                Address: <span style={{ fontWeight: 'normal' }}>{printingCustomer.address}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Customer List</h2>
        <button 
          className="btn-theme" 
          onClick={() => { setFormData(initialFormState); setEditingId(null); setView('add'); }}
          style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
        >
          + Add New
        </button>
      </div>

      <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--card-bg)' }}>
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <input type="text" placeholder="Search..." style={{ padding: '8px', width: '200px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
        </div>
        
        <div style={{ overflowX: 'auto', minHeight: '300px', paddingBottom: '50px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left', minWidth: '1500px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '12px 10px' }}>SL</th>
                <th style={{ padding: '12px 10px' }}>Code</th>
                <th style={{ padding: '12px 10px' }}>Card No</th>
                <th style={{ padding: '12px 10px' }}>First Name</th>
                <th style={{ padding: '12px 10px' }}>Middle Name</th>
                <th style={{ padding: '12px 10px' }}>Last Name</th>
                <th style={{ padding: '12px 10px' }}>Phone</th>
                <th style={{ padding: '12px 10px' }}>Email</th>
                <th style={{ padding: '12px 10px' }}>City</th>
                <th style={{ padding: '12px 10px' }}>Customer Type</th>
                <th style={{ padding: '12px 10px' }}>Dis. Percent</th>
                <th style={{ padding: '12px 10px' }}>Postal Code</th>
                <th style={{ padding: '12px 10px' }}>Wholesale Customer</th>
                <th style={{ padding: '12px 10px' }}>Zero VAT Sale</th>
                <th style={{ padding: '12px 10px' }}>Credit Customer</th>
                <th style={{ padding: '12px 10px' }}>Credit Limit</th>
                <th style={{ padding: '12px 10px' }}>Status</th>
                <th style={{ padding: '12px 10px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{idx + 1}</td>
                  <td style={{ padding: '10px' }}>{c.code}</td>
                  <td style={{ padding: '10px' }}>{c.card_no}</td>
                  <td style={{ padding: '10px' }}>{c.first_name}</td>
                  <td style={{ padding: '10px' }}>{c.middle_name}</td>
                  <td style={{ padding: '10px' }}>{c.last_name}</td>
                  <td style={{ padding: '10px' }}>{c.contact_no}</td>
                  <td style={{ padding: '10px' }}>{c.email}</td>
                  <td style={{ padding: '10px' }}>{c.city}</td>
                  <td style={{ padding: '10px' }}>{c.customer_type?.name}</td>
                  <td style={{ padding: '10px' }}>{c.discount_percent}</td>
                  <td style={{ padding: '10px' }}>{c.postal_code}</td>
                  <td style={{ padding: '10px' }}><BooleanText value={c.wholesale_customer} /></td>
                  <td style={{ padding: '10px' }}><BooleanText value={c.sale_without_vat} /></td>
                  <td style={{ padding: '10px' }}><BooleanText value={c.credit_customer} /></td>
                  <td style={{ padding: '10px' }}>{c.credit_limit}</td>
                  <td style={{ padding: '10px' }}>{c.inactive ? 'INACTIVE' : 'ACTIVE'}</td>
                  
                  {/* Action dropdown on far right */}
                  <td style={{ padding: '10px', textAlign: 'right', position: 'relative' }}>
                    <button 
                      className="btn-theme"
                      onClick={() => setActiveDropdown(activeDropdown === c.id ? null : c.id)}
                      style={{ padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
                    >
                      Action <ChevronDown size={14} />
                    </button>
                    {activeDropdown === c.id && (
                      <div style={{ position: 'absolute', right: '10px', top: '100%', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '120px' }}>
                        <div 
                          onClick={() => handleEdit(c)}
                          style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                        >
                          <Edit size={14} /> Edit
                        </div>
                        <div 
                          onClick={() => handlePrintCard(c)}
                          style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}
                        >
                          <Printer size={14} /> Print Card
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan="18" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                    No Customers Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerEntry;
