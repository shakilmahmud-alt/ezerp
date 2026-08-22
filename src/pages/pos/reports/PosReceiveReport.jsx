import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { Package, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const PosReceiveReport = () => {
  const { posTerminal } = useAuth();
  const [receives, setReceives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchReceives();
  }, []);

  const fetchReceives = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_receives')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceives(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching stock receive report');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Stock Receive Report ({posTerminal?.store_name || 'Store'})</h2>
        <button className="btn-secondary" onClick={fetchReceives}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
              <th style={{ padding: '8px' }}>Challan No</th>
              <th style={{ padding: '8px' }}>Date</th>
              <th style={{ padding: '8px' }}>Reference No</th>
              <th style={{ padding: '8px' }}>Delivery To</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            {receives.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{row.last_challan_no || row.id}</td>
                <td style={{ padding: '8px' }}>{row.purchase_date || (row.created_at ? row.created_at.slice(0, 10) : '-')}</td>
                <td style={{ padding: '8px' }}>{row.reference_no || '-'}</td>
                <td style={{ padding: '8px', color: '#0369a1', fontWeight: 'bold' }}>{row.delivery_to || posTerminal?.store_name || 'Store'}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#166534' }}>Tk {Number(row.net_amount || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PosReceiveReport;
