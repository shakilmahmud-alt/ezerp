import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const PosStockSearch = () => {
  const [searchName, setSearchName] = useState('');
  const [searchBarcode, setSearchBarcode] = useState('');
  const [showZero, setShowZero] = useState(false);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const nameInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const navigate = useNavigate();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        nameInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setShowZero((prev) => !prev);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSearchName('');
        setSearchBarcode('');
        setShowZero(false);
        setProducts([]);
        navigate('/pos'); // Assuming ESC closes the page
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Effect to trigger search on changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 500); // debounce for 500ms

    return () => clearTimeout(delayDebounceFn);
  }, [searchName, searchBarcode, showZero]);

  const fetchProducts = async () => {
    // If no search criteria, clear results
    if (!searchName.trim() && !searchBarcode.trim()) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          category:category_id (name),
          vendor:vendor_id (name)
        `)
        .limit(100);

      if (searchName.trim()) {
        query = query.ilike('item_name', `%${searchName.trim()}%`);
      }

      if (searchBarcode.trim()) {
        query = query.or(`barcode.ilike.%${searchBarcode.trim()}%,code.ilike.%${searchBarcode.trim()}%`);
      }

      if (!showZero) {
        query = query.gt('wh_stock', 0); // Assuming central store stock is wh_stock
      }

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error searching stock:", error);
      toast.error("Failed to search stock");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      height: 'calc(100vh - 65px)', 
      backgroundColor: '#fff', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'sans-serif'
    }}>
      {/* Top Search Bar */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid #ccc' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>Search</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <label style={{ fontWeight: 'bold' }}>Search [<span style={{ color: 'red' }}>F1</span>]:</label>
            <input 
              ref={nameInputRef}
              type="text" 
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              style={{ width: '250px', padding: '4px', border: '1px solid #999' }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <label style={{ fontWeight: 'bold' }}>By Barcode [<span style={{ color: 'red' }}>F3</span>]:</label>
            <input 
              ref={barcodeInputRef}
              type="text" 
              value={searchBarcode}
              onChange={(e) => setSearchBarcode(e.target.value)}
              style={{ width: '250px', padding: '4px', border: '1px solid #999' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input 
              type="checkbox" 
              checked={showZero}
              onChange={(e) => setShowZero(e.target.checked)}
              id="showZero"
            />
            <label htmlFor="showZero" style={{ fontWeight: 'bold', cursor: 'pointer' }}>
              Show with zero(0) [<span style={{ color: 'red' }}>F2</span>]
            </label>
          </div>

          <div style={{ marginLeft: 'auto', color: 'red', fontWeight: 'bold', fontSize: '12px' }}>
            Press ESC to Close
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', borderBottom: '1px solid #ccc', zIndex: 1 }}>
            <tr>
              <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #ddd', minWidth: '100px' }}>Barcode</th>
              <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #ddd', minWidth: '120px' }}>User Barcode</th>
              <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #ddd', minWidth: '200px' }}>Name</th>
              <th style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #ddd', minWidth: '80px' }}>CPU</th>
              <th style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #ddd', minWidth: '80px' }}>MRP</th>
              <th style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #ddd', minWidth: '80px' }}>Balance</th>
              <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #ddd', minWidth: '150px' }}>Vendor Name</th>
              <th style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #ddd', minWidth: '80px' }}>UOM</th>
              <th style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #ddd', minWidth: '80px' }}>VAT(%)</th>
              <th style={{ padding: '8px', textAlign: 'left', minWidth: '120px' }}>Category</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="10" style={{ padding: '20px', textAlign: 'center' }}>Searching...</td>
              </tr>
            ) : products.length > 0 ? (
              products.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #eee' }}>{p.code}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #eee' }}>{p.barcode}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #eee' }}>{p.item_name}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #eee' }}>{p.purchase_price}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #eee' }}>{p.mrp}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #eee' }}>{p.wh_stock || 0}</td>
                  <td style={{ padding: '6px 8px', borderRight: '1px solid #eee' }}>{p.vendor?.name}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', borderRight: '1px solid #eee' }}>{p.uom || 'Pcs'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: '1px solid #eee' }}>{p.sale_vat_percent || 0}</td>
                  <td style={{ padding: '6px 8px' }}>{p.category?.name}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                  No products found. Start typing to search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PosStockSearch;
