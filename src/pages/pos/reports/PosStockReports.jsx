import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const PosStockReports = ({ initialTab = 'current' }) => {
  const { posTerminal } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [stockList, setStockList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
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

  const filteredStock = stockList.filter(s => 
    !searchQuery.trim() ||
    s.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '13px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>POS Stock Reports ({posTerminal?.store_name || 'Store Branch'})</h2>
        <button className="btn-secondary" onClick={fetchStockData}><RefreshCw size={14} /> Refresh Stock</button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button className={activeTab === 'current' ? 'btn-theme' : 'btn-secondary'} onClick={() => setActiveTab('current')}>
          Current Stock Report
        </button>
        <button className={activeTab === 'journal' ? 'btn-theme' : 'btn-secondary'} onClick={() => setActiveTab('journal')}>
          Product Stock Journal
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '15px', maxWidth: '350px' }}>
          <input 
            type="text" 
            placeholder="Search product name, barcode..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Barcode / Code</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Product Name</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>MRP</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>{posTerminal?.store_name || 'Branch'} Stock</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Central Stock</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.map((prod, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', color: '#64748b' }}>{prod.barcode || prod.code}</td>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{prod.item_name}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>Tk {Number(prod.mrp || 0).toFixed(2)}</td>
                <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#166534' }}>{prod.branch_stock} pcs</td>
                <td style={{ padding: '8px', textAlign: 'center', color: '#0369a1' }}>{prod.wh_stock || 0} pcs</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default PosStockReports;
