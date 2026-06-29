import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const PointEarnPolicy = () => {
  const [customerTypes, setCustomerTypes] = useState([]);
  const [globalPolicy, setGlobalPolicy] = useState({
    id: null,
    spend_amount: 0,
    redeem_point_value: 0,
    min_redeem_point: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch Customer Types
      const { data: ctData, error: ctError } = await supabase
        .from('customer_types')
        .select('*')
        .order('name');
      
      if (ctError) throw ctError;
      setCustomerTypes(ctData || []);

      // Fetch Global Policy
      const { data: gpData, error: gpError } = await supabase
        .from('point_earn_policy')
        .select('*')
        .limit(1);

      if (gpError) {
        if (gpError.code === '42P01') {
          console.warn('point_earn_policy table not found yet');
        } else {
          throw gpError;
        }
      }

      if (gpData && gpData.length > 0) {
        setGlobalPolicy(gpData[0]);
      } else {
        // Defaults if table is empty
        setGlobalPolicy({
          id: null,
          spend_amount: 100,
          redeem_point_value: 0,
          min_redeem_point: 2000
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Error fetching data');
    }
  };

  const handleCustomerTypeChange = (id, field, value) => {
    const parsedValue = parseFloat(value) || 0;
    setCustomerTypes(prev => 
      prev.map(ct => ct.id === id ? { ...ct, [field]: parsedValue } : ct)
    );
  };

  const handleGlobalChange = (field, value) => {
    setGlobalPolicy({ ...globalPolicy, [field]: parseFloat(value) || 0 });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save global policy
      if (globalPolicy.id) {
        const { error } = await supabase
          .from('point_earn_policy')
          .update({
            spend_amount: globalPolicy.spend_amount,
            redeem_point_value: globalPolicy.redeem_point_value,
            min_redeem_point: globalPolicy.min_redeem_point,
            updated_at: new Date()
          })
          .eq('id', globalPolicy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('point_earn_policy')
          .insert([{
            spend_amount: globalPolicy.spend_amount,
            redeem_point_value: globalPolicy.redeem_point_value,
            min_redeem_point: globalPolicy.min_redeem_point
          }]);
        if (error) throw error;
      }

      // Save customer types earning points
      const updatePromises = customerTypes.map(ct => {
        return supabase
          .from('customer_types')
          .update({ earning_point: ct.earning_point || 0 })
          .eq('id', ct.id);
      });

      await Promise.all(updatePromises);
      
      toast.success('Point Earn Policy saved successfully');
      fetchData(); // Refresh to get the created globalPolicy id if new
    } catch (err) {
      console.error(err);
      toast.error('Error saving policy. Ensure point_earn_policy table and earning_point column exist.');
    } finally {
      setIsLoading(false);
    }
  };

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid var(--border-color)',
    fontSize: '0.85rem'
  };

  const inputStyle = {
    padding: '6px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    width: '100%',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-primary)',
    outline: 'none'
  };

  const headingStyle = {
    backgroundColor: 'var(--accent-primary)',
    fontWeight: 'bold',
    color: '#fff'
  };

  const lightHeadingStyle = {
    backgroundColor: 'rgba(46, 111, 64, 0.1)', // Light version of accent-primary
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Point Earning Policy</h2>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ border: '1px solid var(--border-color)' }}>
            
            {/* SPEND AMOUNT */}
            <div style={{ ...rowStyle, ...headingStyle }}>
              <div>SPEND AMOUNT</div>
              <div>
                <input 
                  type="number" 
                  value={globalPolicy.spend_amount} 
                  onChange={(e) => handleGlobalChange('spend_amount', e.target.value)}
                  style={{...inputStyle, backgroundColor: 'transparent', border: 'none', fontWeight: 'bold', padding: 0, color: 'inherit'}} 
                />
              </div>
            </div>

            {/* Headers */}
            <div style={{ ...rowStyle, ...lightHeadingStyle }}>
              <div>Name</div>
              <div>Earning Point</div>
            </div>

            {/* Customer Types Loop */}
            {customerTypes.map((ct) => (
              <div key={ct.id} style={rowStyle}>
                <div>{ct.name}</div>
                <div>
                  <input 
                    type="number" 
                    value={ct.earning_point || 0}
                    onChange={(e) => handleCustomerTypeChange(ct.id, 'earning_point', e.target.value)}
                    style={{...inputStyle, border: 'none', padding: 0}} 
                  />
                </div>
              </div>
            ))}

            {/* Global Rules */}
            <div style={{ ...rowStyle, ...headingStyle }}>
              <div>1 redeem point = (?) Tk.</div>
              <div>
                <input 
                  type="number" 
                  value={globalPolicy.redeem_point_value} 
                  onChange={(e) => handleGlobalChange('redeem_point_value', e.target.value)}
                  style={{...inputStyle, backgroundColor: 'transparent', border: 'none', fontWeight: 'bold', padding: 0, color: 'inherit'}} 
                />
              </div>
            </div>
            
            <div style={{ ...rowStyle, ...headingStyle, borderBottom: 'none' }}>
              <div>Minimum point for redeem</div>
              <div>
                <input 
                  type="number" 
                  value={globalPolicy.min_redeem_point} 
                  onChange={(e) => handleGlobalChange('min_redeem_point', e.target.value)}
                  style={{...inputStyle, backgroundColor: 'transparent', border: 'none', fontWeight: 'bold', padding: 0, color: 'inherit'}} 
                />
              </div>
            </div>

          </div>

          <div style={{ marginTop: '20px', paddingLeft: '20px' }}>
            <button 
              onClick={handleSave} 
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                padding: '8px 25px',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default PointEarnPolicy;
