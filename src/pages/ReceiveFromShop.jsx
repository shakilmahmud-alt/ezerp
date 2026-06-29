import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

const ReceiveFromShop = () => {
  const [challans, setChallans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('shop_transfers')
        .select(`
          id,
          challan_no,
          challan_date,
          status,
          shops ( name )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet, suppress error if it's the 42P01 error code, else show
        if (error.code !== '42P01') {
          throw error;
        } else {
          console.log('shop_transfers table does not exist yet.');
        }
      }
      setChallans(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load shop challans');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChallans = challans.filter(c => 
    (c.challan_no && c.challan_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.shops?.name && c.shops?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ backgroundColor: '#f9f9f9', padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Transfer Challan List
          </h2>
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px' }}>
          
          {/* Search Input */}
          <div style={{ marginBottom: '20px' }}>
            <input 
              type="text" 
              placeholder="Search by Shop Name or Challan No" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>SL</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Shop Name</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Challan No</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Challan Date</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Loading...</td>
                  </tr>
                ) : filteredChallans.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No transfer challans found.</td>
                  </tr>
                ) : (
                  filteredChallans.map((challan, index) => (
                    <tr key={challan.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 10px' }}>{index + 1}</td>
                      <td style={{ padding: '12px 10px' }}>{challan.shops?.name}</td>
                      <td style={{ padding: '12px 10px' }}>{challan.challan_no}</td>
                      <td style={{ padding: '12px 10px' }}>{challan.challan_date}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <button className="btn-theme" 
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#2196f3',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                          onClick={() => alert(`View details for Challan: ${challan.challan_no}`)}
                        >
                          View / Receive
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReceiveFromShop;
