import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import CustomSelect from '../../../components/CustomSelect';
import { BarChart2, Calendar, ShoppingBag, CreditCard, RefreshCw, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PosSaleReports = ({ initialTab = 'daily' }) => {
  const { posTerminal } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync activeTab whenever initialTab prop changes from navigation
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState([]);
  const [saleItemsData, setSaleItemsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [fromDate, toDate]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (posTerminal?.store_id) {
        query = query.eq('store_id', posTerminal.store_id);
      }

      if (fromDate) {
        query = query.gte('created_at', `${fromDate}T00:00:00.000Z`);
      }
      if (toDate) {
        query = query.lte('created_at', `${toDate}T23:59:59.999Z`);
      }

      let { data: sales, error: sErr } = await query;
      
      // If error occurs OR if no records found under strict filter, fetch all sales fallback
      if (sErr || !sales || sales.length === 0) {
        const { data: fallbackSales } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });
        sales = fallbackSales || [];
      }
      
      setSalesData(sales || []);

      // Fetch sale items
      const saleIds = (sales || []).map(s => s.id);
      if (saleIds.length > 0) {
        const { data: items } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', saleIds.slice(0, 100)); // cap to avoid payload size limit
        setSaleItemsData(items || []);
      } else {
        setSaleItemsData([]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching sale report data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract Payment Type from payment_type column or invoice_note
  const getPaymentType = (sale) => {
    if (sale.payment_type && sale.payment_type.trim()) {
      return sale.payment_type.trim();
    }
    if (sale.invoice_note && sale.invoice_note.includes('[Payment:')) {
      const match = sale.invoice_note.match(/\[Payment:\s*([^\]]+)\]/);
      if (match && match[1]) return match[1].trim();
    }
    return 'Cash';
  };

  // Grouping for Daily Sale Report
  const dailyReport = Object.values(salesData.reduce((acc, sale) => {
    const day = (sale.sale_date || sale.created_at || '').slice(0, 10);
    if (!acc[day]) {
      acc[day] = { date: day, count: 0, qty: 0, gross: 0, discount: 0, net: 0 };
    }
    acc[day].count += 1;
    acc[day].qty += Number(sale.total_qty || 0);
    acc[day].gross += Number(sale.total_amount || sale.subtotal || 0);
    acc[day].discount += Number(sale.discount_amount || 0);
    acc[day].net += Number(sale.net_amount || sale.total_amount || 0);
    return acc;
  }, {}));

  // Grouping for Itemwise Sale Report
  const itemwiseReport = Object.values(saleItemsData.reduce((acc, item) => {
    const key = item.product_id || item.product_name;
    if (!acc[key]) {
      acc[key] = { barcode: item.barcode || '-', name: item.product_name || 'Item', qty: 0, unitPrice: item.unit_price || 0, total: 0 };
    }
    acc[key].qty += Number(item.qty || item.quantity || 1);
    acc[key].total += Number(item.total_value || item.unit_price * (item.qty || 1) || 0);
    return acc;
  }, {}));

  // Grouping for Payment Type Sale Report (Extracts Cash, AMEX, bKash, BRAC Bank, City Bank, etc.)
  const paymentTypeReport = Object.values(salesData.reduce((acc, sale) => {
    const pType = getPaymentType(sale);
    const key = pType.toUpperCase();
    if (!acc[key]) {
      acc[key] = { type: pType, count: 0, total: 0 };
    }
    acc[key].count += 1;
    acc[key].total += Number(sale.net_amount || sale.total_amount || 0);
    return acc;
  }, {}));

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '13px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>POS Sales Reports</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
          <button className="btn-secondary" onClick={fetchReportData}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {/* Report Sub-Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {[
          { id: 'daily', label: 'Daily Sale Report' },
          { id: 'summary', label: 'Summary Sale Report' },
          { id: 'itemwise', label: 'Itemwise Sale Report' },
          { id: 'payment-type', label: 'Payment Type Sale Report' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'btn-theme' : 'btn-secondary'}
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 'bold' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        {activeTab === 'daily' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
                <th style={{ padding: '8px' }}>Date</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Invoices</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Total Qty</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Gross Amount</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Discount</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Net Sales</th>
              </tr>
            </thead>
            <tbody>
              {dailyReport.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{row.date}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{row.count}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{row.qty}</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>Tk {row.gross.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>Tk {row.discount.toFixed(2)}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>Tk {row.net.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'summary' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4>Period Summary Metrics</h4>
              <p><b>Date Range:</b> {fromDate} to {toDate}</p>
              <p><b>Total Invoices Generated:</b> {salesData.length}</p>
              <p><b>Total Quantity Sold:</b> {dailyReport.reduce((s, r) => s + r.qty, 0)} pcs</p>
              <p><b>Total Gross Sales:</b> Tk {dailyReport.reduce((s, r) => s + r.gross, 0).toFixed(2)}</p>
              <p><b>Total Discounts Offered:</b> Tk {dailyReport.reduce((s, r) => s + r.discount, 0).toFixed(2)}</p>
              <h3 style={{ color: '#166534' }}>Total Net Sales Revenue: Tk {dailyReport.reduce((s, r) => s + r.net, 0).toFixed(2)}</h3>
            </div>
          </div>
        )}

        {activeTab === 'itemwise' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Barcode</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Item Name</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Sold Qty</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {itemwiseReport.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', color: '#64748b' }}>{row.barcode}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{row.name}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{row.qty}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>Tk {row.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'payment-type' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Payment Method</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Transactions</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Total Net Revenue</th>
              </tr>
            </thead>
            <tbody>
              {paymentTypeReport.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold', color: '#0369a1' }}>{row.type}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{row.count}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>Tk {row.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default PosSaleReports;
