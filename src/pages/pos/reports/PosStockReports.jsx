import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { RefreshCw, Search, ArrowUpRight, ArrowDownLeft, FileText, Package, Layers, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';

const PosStockReports = ({ initialTab = 'current' }) => {
  const { posTerminal } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [stockList, setStockList] = useState([]);
  const [journalList, setJournalList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sync activeTab dynamically on route or initialTab changes
  useEffect(() => {
    const path = location.pathname || '';
    if (path.includes('stock-journal')) {
      setActiveTab('journal');
    } else if (path.includes('stock-current')) {
      setActiveTab('current');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, location.pathname]);

  useEffect(() => {
    fetchStockData();
    fetchJournalData();
  }, []);

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:category_id (name),
          store_stocks(store_id, stock_qty)
        `)
        .order('item_name', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map(p => {
        const branchQty = p.store_stocks?.find(s => s.store_id === posTerminal?.store_id)?.stock_qty || 0;
        return {
          ...p,
          branch_stock: branchQty
        };
      });

      setStockList(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching stock data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJournalData = async () => {
    try {
      const { data: saleItems, error } = await supabase
        .from('sale_items')
        .select('*, sale:sale_id(invoice_no, sale_date, sales_executive_name, created_at)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && saleItems) {
        const journalEntries = saleItems.map(item => ({
          id: item.id,
          trx_date: item.sale?.sale_date || item.sale?.created_at || item.created_at,
          trx_no: item.invoice_no || item.sale?.invoice_no || 'N/A',
          type: 'SALE_OUT',
          barcode: item.barcode || '-',
          product_name: item.product_name || 'Product',
          change_qty: -Math.abs(Number(item.qty || 1)),
          unit_price: Number(item.unit_price || 0),
          executive: item.sale?.sales_executive_name || 'Staff'
        }));
        setJournalList(journalEntries);
      }
    } catch (err) {
      console.error("Journal fetch error:", err);
    }
  };

  const filteredStock = stockList.filter(s => 
    !searchQuery.trim() ||
    s.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredJournal = journalList.filter(j => 
    !searchQuery.trim() ||
    j.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.trx_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary Metrics for Current Stock
  const totalProductsCount = filteredStock.length;
  const totalBranchQtySum = filteredStock.reduce((sum, p) => sum + Number(p.branch_stock || 0), 0);
  const totalStockValuationMrp = filteredStock.reduce((sum, p) => sum + (Number(p.branch_stock || 0) * Number(p.mrp || 0)), 0);
  const totalStockValuationCost = filteredStock.reduce((sum, p) => sum + (Number(p.branch_stock || 0) * Number(p.purchase_price || 0)), 0);

  // Summary Metrics for Stock Journal
  const totalJournalQtyOut = filteredJournal.reduce((sum, j) => sum + Math.abs(j.change_qty), 0);

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '13px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: 'bold' }}>
            POS Stock Reports
          </h2>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
            Store Branch: <span style={{ fontWeight: 'bold', color: '#0369a1' }}>{posTerminal?.store_name || 'Main Branch'}</span>
          </div>
        </div>
        <button 
          className="btn-secondary" 
          onClick={() => { fetchStockData(); fetchJournalData(); toast.success('Stock data refreshed'); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
        >
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('current')}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 'bold',
            borderRadius: '4px',
            cursor: 'pointer',
            border: activeTab === 'current' ? '1px solid #15803d' : '1px solid #cbd5e1',
            background: activeTab === 'current' ? 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)' : '#ffffff',
            color: activeTab === 'current' ? '#ffffff' : '#334155',
            boxShadow: activeTab === 'current' ? '0 2px 6px rgba(46, 111, 64, 0.3)' : 'none'
          }}
        >
          📦 Current Stock Report
        </button>
        <button 
          onClick={() => setActiveTab('journal')}
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 'bold',
            borderRadius: '4px',
            cursor: 'pointer',
            border: activeTab === 'journal' ? '1px solid #15803d' : '1px solid #cbd5e1',
            background: activeTab === 'journal' ? 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)' : '#ffffff',
            color: activeTab === 'journal' ? '#ffffff' : '#334155',
            boxShadow: activeTab === 'journal' ? '0 2px 6px rgba(46, 111, 64, 0.3)' : 'none'
          }}
        >
          📜 Product Stock Journal (Movement Log)
        </button>
      </div>

      {/* TAB 1: CURRENT STOCK REPORT */}
      {activeTab === 'current' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Executive KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Unique Products</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{totalProductsCount} Items</div>
            </div>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Branch Stock</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534', marginTop: '4px' }}>{totalBranchQtySum} Pcs</div>
            </div>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Stock Valuation (MRP)</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0284c7', marginTop: '4px' }}>Tk {totalStockValuationMrp.toFixed(2)}</div>
            </div>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Stock Valuation (Cost)</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#475569', marginTop: '4px' }}>Tk {totalStockValuationCost.toFixed(2)}</div>
            </div>
          </div>

          {/* Current Stock Data Table */}
          <div className="glass-panel" style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <div style={{ marginBottom: '15px', maxWidth: '350px' }}>
              <input 
                type="text" 
                placeholder="Search by item name or barcode..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
                  <th style={{ padding: '9px 12px', textAlign: 'left' }}>Barcode / Code</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left' }}>Product Name</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right' }}>Cost Price (CPU)</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right' }}>MRP</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Branch Stock</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Central Stock</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right' }}>Total Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="8" style={{ padding: '24px', textAlign: 'center' }}>Loading stock snapshot...</td></tr>
                ) : filteredStock.length === 0 ? (
                  <tr><td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No stock items found</td></tr>
                ) : (
                  filteredStock.map((prod, idx) => {
                    const totalVal = Number(prod.branch_stock || 0) * Number(prod.mrp || 0);
                    return (
                      <tr key={prod.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '8px 12px', color: '#64748b', fontWeight: '500' }}>{prod.barcode || prod.code}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#0f172a' }}>{prod.item_name}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{prod.category?.name || 'General'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>Tk {Number(prod.purchase_price || 0).toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#0369a1' }}>Tk {Number(prod.mrp || 0).toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: prod.branch_stock > 0 ? '#166534' : '#dc2626' }}>
                          {prod.branch_stock} pcs
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{prod.wh_stock || 0} pcs</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>Tk {totalVal.toFixed(2)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT STOCK JOURNAL (MOVEMENT LEDGER LOG) */}
      {activeTab === 'journal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Executive KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Journal Trx Logs</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginTop: '4px' }}>{filteredJournal.length} Trx</div>
            </div>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Outward Sales Stock</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>{totalJournalQtyOut} Pcs (OUT)</div>
            </div>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Journal Status</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534', marginTop: '4px' }}>Real-time Audit</div>
            </div>
          </div>

          {/* Stock Journal Ledger Table */}
          <div className="glass-panel" style={{ padding: '16px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <div style={{ marginBottom: '15px', maxWidth: '350px' }}>
              <input 
                type="text" 
                placeholder="Search journal by invoice#, product or barcode..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
                  <th style={{ padding: '9px 12px', textAlign: 'left' }}>Date & Time</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left' }}>Reference / Invoice#</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Movement Type</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left' }}>Barcode</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left' }}>Product Name</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Stock Qty Change</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right' }}>Unit Price</th>
                  <th style={{ padding: '9px 12px', textAlign: 'left' }}>Sales Executive</th>
                </tr>
              </thead>
              <tbody>
                {filteredJournal.length === 0 ? (
                  <tr><td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No stock journal entries found</td></tr>
                ) : (
                  filteredJournal.map((j, idx) => {
                    const dtStr = j.trx_date ? new Date(j.trx_date).toLocaleString() : 'N/A';
                    return (
                      <tr key={j.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{dtStr}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#0284c7' }}>{j.trx_no}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 'bold', fontSize: '11px', border: '1px solid #fecaca' }}>
                            <ArrowUpRight size={10} style={{ display: 'inline', marginRight: '3px' }} /> SALE OUT
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{j.barcode}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#0f172a' }}>{j.product_name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>
                          {j.change_qty} pcs
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>Tk {j.unit_price.toFixed(2)}</td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>{j.executive}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default PosStockReports;
