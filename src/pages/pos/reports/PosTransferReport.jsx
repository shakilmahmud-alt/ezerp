import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const PosTransferReport = () => {
  const { posTerminal } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('shop_transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (posTerminal?.store_id) {
        query = query.eq('shop_id', posTerminal.store_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTransfers(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching stock transfer report');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Stock Transfer Report ({posTerminal?.store_name || 'Store'})</h2>
        <button className="btn-secondary" onClick={fetchTransfers}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
              <th style={{ padding: '8px' }}>Challan No</th>
              <th style={{ padding: '8px' }}>Challan Date</th>
              <th style={{ padding: '8px' }}>From Store</th>
              <th style={{ padding: '8px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{row.challan_no}</td>
                <td style={{ padding: '8px' }}>{row.challan_date || (row.created_at ? row.created_at.slice(0, 10) : '-')}</td>
                <td style={{ padding: '8px' }}>{posTerminal?.store_name || 'Branch Store'}</td>
                <td style={{ padding: '8px' }}><span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#e2e8f0', fontSize: '10px', fontWeight: 'bold' }}>{row.status || 'Completed'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PosTransferReport;
