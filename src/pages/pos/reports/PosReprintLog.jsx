import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { RefreshCw, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const PosReprintLog = () => {
  const { posTerminal } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reprint_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('reprint_logs query notice:', error.message);
        setLogs([]);
      } else {
        setLogs(data || []);
      }
    } catch (err) {
      console.warn('reprint_logs error:', err);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>POS Invoice Reprint Log</h2>
        <button className="btn-secondary" onClick={fetchLogs}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
              <th style={{ padding: '8px' }}>Invoice No</th>
              <th style={{ padding: '8px' }}>Reprint Date & Time</th>
              <th style={{ padding: '8px' }}>Reprinted By</th>
              <th style={{ padding: '8px' }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No reprint logs recorded yet.</td></tr>
            ) : (
              logs.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold', color: '#2e6f40' }}>{row.invoice_no}</td>
                  <td style={{ padding: '8px' }}>{row.printed_at ? new Date(row.printed_at).toLocaleString() : (row.created_at ? new Date(row.created_at).toLocaleString() : '-')}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{row.reprinted_by || 'Cashier'}</td>
                  <td style={{ padding: '8px', color: '#64748b' }}>{row.reason || 'Customer Request'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PosReprintLog;
