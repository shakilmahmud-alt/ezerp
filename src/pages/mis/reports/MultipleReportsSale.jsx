import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Calendar, RefreshCw, FileText, Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const MultipleReportsSale = () => {
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedReportType, setSelectedReportType] = useState('Invoice Wise Summary');

  const [stores, setStores] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    'Invoice Wise Summary',
    'Invoice Wise Details',
    'Sale Basket',
    'Hourly Sale',
    'Sub Category wise Summary',
    'Barcode wise Sale Report',
    'Multiple Barcode wise Sale Report',
    'Invoice wise Exchange Report',
    'Invoice wise Return Report',
    'Single Invoice Details'
  ];

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, shop_type')
        .order('name');
      if (error) throw error;
      setStores(data || []);
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  const handleShow = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select('*')
        .gte('created_at', `${fromDate}T00:00:00.000Z`)
        .lte('created_at', `${toDate}T23:59:59.999Z`)
        .order('created_at', { ascending: false });

      if (selectedStore) {
        query = query.eq('store_id', selectedStore);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReportData(data || []);
      toast.success(`${selectedReportType} generated (${data?.length || 0} records)`);
    } catch (err) {
      console.error('Error generating report:', err);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleReload = () => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
    setToDate(today);
    setStoreType('ALL');
    setSelectedStore('');
    setSelectedReportType('Invoice Wise Summary');
    setReportData(null);
    toast.success('Form reloaded');
  };

  return (
    <div style={{ padding: '20px 24px', backgroundColor: '#ffffff', minHeight: '100%' }}>
      {/* Title */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '20px', letterSpacing: '-0.2px' }}>
        Multiple Report on Sales
      </h2>

      {/* Main Filter Card */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        padding: '24px 28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: '25px'
      }}>
        
        {/* Top Filters Grid: 2 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '60px', rowGap: '16px', marginBottom: '24px' }}>
          
          {/* Row 1: From Date & To Date */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '130px', fontSize: '0.84rem', color: '#334155', flexShrink: 0 }}>From Date</label>
            <div style={{ flex: 1, position: 'relative' }}>
              <input 
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '110px', fontSize: '0.84rem', color: '#334155', flexShrink: 0 }}>To Date</label>
            <div style={{ flex: 1, position: 'relative' }}>
              <input 
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Row 2: Store Type & Store */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '130px', fontSize: '0.84rem', color: '#334155', flexShrink: 0 }}>Store Type</label>
            <div style={{ flex: 1 }}>
              <select
                value={storeType}
                onChange={e => setStoreType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="ALL">ALL</option>
                <option value="Retail">Retail</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Outlet">Outlet</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '110px', fontSize: '0.84rem', color: '#334155', flexShrink: 0 }}>Store</label>
            <div style={{ flex: 1 }}>
              <select
                value={selectedStore}
                onChange={e => setSelectedStore(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="">Select Store</option>
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Report Type Section */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
            Report Type
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reportTypes.map((type, idx) => {
              const isChecked = selectedReportType === type;
              return (
                <label 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: '#334155'
                  }}
                >
                  <input 
                    type="radio" 
                    name="reportType" 
                    checked={isChecked}
                    onChange={() => setSelectedReportType(type)}
                    style={{
                      accentColor: '#e11d48',
                      width: '15px',
                      height: '15px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? '#0f172a' : '#475569' }}>
                    {type}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Print Type Section & Action Buttons */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
            Print Type
          </h3>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleShow}
              disabled={loading}
              style={{
                padding: '5px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #f43f5e',
                color: '#f43f5e',
                borderRadius: '3px',
                fontSize: '0.84rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f43f5e';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#f43f5e';
              }}
            >
              {loading ? 'Loading...' : 'Show'}
            </button>

            <button
              onClick={handleReload}
              style={{
                padding: '5px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #f43f5e',
                color: '#f43f5e',
                borderRadius: '3px',
                fontSize: '0.84rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#f43f5e';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#f43f5e';
              }}
            >
              Reload
            </button>
          </div>
        </div>

      </div>

      {/* Generated Report Data Results View */}
      {reportData && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 'bold' }}>{selectedReportType}</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>Date Range: {fromDate} to {toDate}</p>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 'bold' }}>
              Total Records: {reportData.length}
            </div>
          </div>

          {reportData.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
              No sales records found for the selected criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Invoice No</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Date & Time</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: '#475569', fontWeight: 600 }}>Total (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: '#475569', fontWeight: 600 }}>Discount (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', color: '#475569', fontWeight: 600 }}>Payable (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Payment Method</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{item.invoice_no || `INV-${item.id}`}</td>
                      <td style={{ padding: '9px 12px', color: '#334155' }}>{new Date(item.created_at).toLocaleString()}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{(item.total_amount || 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626' }}>{(item.discount_amount || 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{(item.final_amount || item.payable_amount || item.total_amount || 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{item.payment_method || 'Cash'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default MultipleReportsSale;
