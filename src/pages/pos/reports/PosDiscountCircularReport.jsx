import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { RefreshCw, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const PosDiscountCircularReport = () => {
  const { posTerminal } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error fetching discount circulars');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontSize: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Discount Circular & Promotion Report</h2>
        <button className="btn-secondary" onClick={fetchPromotions}><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(180deg, #52be72 0%, #2e6f40 100%)', color: '#fff' }}>
              <th style={{ padding: '8px' }}>Title / Circular</th>
              <th style={{ padding: '8px' }}>Start Date</th>
              <th style={{ padding: '8px' }}>End Date</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Discount %</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No active discount circulars found.</td></tr>
            ) : (
              promotions.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold', color: '#166534' }}>
                    {row.circular_name || row.title || row.circular_code || 'Circular'}
                  </td>
                  <td style={{ padding: '8px' }}>{row.valid_from || row.start_date || '-'}</td>
                  <td style={{ padding: '8px' }}>{row.valid_to || row.end_date || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>
                    {row.coupon_disc_val || row.discount_percent || 0}%
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#166534', fontSize: '10px', fontWeight: 'bold' }}>
                      {row.promotion_type || 'Active'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PosDiscountCircularReport;
