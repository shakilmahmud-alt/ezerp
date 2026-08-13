import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, Trash2, Send, Building, FileText } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';

const PosRequisitionVendorwise = () => {
  const { posTerminal, user } = useAuth();

  const [requisitionNo, setRequisitionNo] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [storeDetails, setStoreDetails] = useState({ id: '', name: '' });
  const [centralStoreId, setCentralStoreId] = useState(null);

  // Vendor List & Selection
  const [vendorsList, setVendorsList] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Product Search & Selection
  const [productSearchInput, setProductSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reqQty, setReqQty] = useState(1);
  const [stockInfo, setStockInfo] = useState({ central: 0, local: 0 });

  // Requisition List Items
  const [reqItems, setReqItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentRequisitions, setRecentRequisitions] = useState([]);

  useEffect(() => {
    const today = new Date();
    setCurrentDate(today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    
    fetchStoreInfo();
    fetchVendors();
    generateRequisitionNo();
  }, [posTerminal]);

  useEffect(() => {
    if (storeDetails.id || storeDetails.name) {
      fetchRecentRequisitions();
    }
  }, [storeDetails]);

  // Fetch Store and Central Store Info
  const fetchStoreInfo = async () => {
    try {
      const { data: stores } = await supabase.from('stores').select('*');
      if (stores) {
        const central = stores.find(s => s.name?.toLowerCase().includes('central') || s.is_central);
        if (central) setCentralStoreId(central.id);

        const current = stores.find(s => s.id === posTerminal?.store_id) || stores[0];
        if (current) {
          setStoreDetails({ id: current.id, name: current.name });
        } else if (posTerminal?.store_name) {
          setStoreDetails({ id: posTerminal.store_id || 'store-1', name: posTerminal.store_name });
        }
      }
    } catch (err) {
      console.error("Error fetching stores:", err);
      if (posTerminal?.store_name) {
        setStoreDetails({ id: posTerminal.store_id || 'store-1', name: posTerminal.store_name });
      }
    }
  };

  // Fetch Vendors
  const fetchVendors = async () => {
    try {
      const { data } = await supabase
        .from('vendors')
        .select('id, name, code')
        .eq('status', 'ACTIVE')
        .order('name');
      if (data) setVendorsList(data);
    } catch (e) {
      console.error("Error fetching vendors:", e);
    }
  };

  // Generate Requisition Number
  const generateRequisitionNo = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `REQ-V${todayStr}`;

      const { data } = await supabase
        .from('store_requisitions')
        .select('requisition_no')
        .ilike('requisition_no', `${prefix}%`)
        .order('requisition_no', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].requisition_no) {
        const num = parseInt(data[0].requisition_no.slice(-3), 10);
        if (!isNaN(num)) {
          setRequisitionNo(`${prefix}${String(num + 1).padStart(3, '0')}`);
          return;
        }
      }
      setRequisitionNo(`${prefix}001`);
    } catch (e) {
      setRequisitionNo(`REQ-V${Date.now().toString().slice(-6)}`);
    }
  };

  // Fetch Recent Store Requisitions from store_requisitions
  const fetchRecentRequisitions = async () => {
    try {
      let query = supabase
        .from('store_requisitions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);

      if (storeDetails.name) {
        query = query.or(`shop_name.ilike.%${storeDetails.name}%,shop_id.eq.${storeDetails.id}`);
      }

      const { data, error } = await query;
      if (!error && data) {
        setRecentRequisitions(data);
      } else {
        const { data: allData } = await supabase
          .from('store_requisitions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(15);
        if (allData) setRecentRequisitions(allData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Vendor Selection Change
  const handleVendorChange = (vId) => {
    setSelectedVendorId(vId);
    const vend = vendorsList.find(v => v.id === vId);
    setSelectedVendor(vend || null);
    setSelectedProduct(null);
    setProductSearchInput('');
    setSearchResults([]);
    setReqItems([]);
  };

  // Search Products Filtered by Vendor
  useEffect(() => {
    if (!productSearchInput.trim()) {
      setSearchResults([]);
      return;
    }

    const searchProducts = async () => {
      try {
        let query = supabase
          .from('products')
          .select(`
            *,
            vendor:vendor_id (name),
            store_stocks(store_id, stock_qty)
          `)
          .or(`item_name.ilike.%${productSearchInput.trim()}%,barcode.ilike.%${productSearchInput.trim()}%,code.ilike.%${productSearchInput.trim()}%`)
          .limit(10);

        if (selectedVendorId) {
          query = query.eq('vendor_id', selectedVendorId);
        }

        const { data } = await query;
        setSearchResults(data || []);
      } catch (err) {
        console.error("Search error:", err);
      }
    };

    const timer = setTimeout(searchProducts, 250);
    return () => clearTimeout(timer);
  }, [productSearchInput, selectedVendorId, storeDetails, centralStoreId]);

  // Select Product and calculate Central Stock & Local Stock
  const handleSelectProduct = (prod) => {
    setSelectedProduct(prod);
    setSearchResults([]);
    setProductSearchInput(prod.item_name);

    const centralStock = prod.store_stocks?.find(s => s.store_id === centralStoreId)?.stock_qty || prod.wh_stock || 0;
    const localStock = prod.store_stocks?.find(s => s.store_id === storeDetails.id)?.stock_qty || 0;

    setStockInfo({
      central: centralStock,
      local: localStock
    });
  };

  // Add Item to Requisition Table
  const handleAddItemToReq = () => {
    if (!selectedProduct) {
      toast.error('Please select a product first');
      return;
    }
    const qty = Number(reqQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Enter valid requisition quantity');
      return;
    }

    const cpu = Number(selectedProduct.purchase_price || 0);
    const mrp = Number(selectedProduct.mrp || 0);

    const existingIdx = reqItems.findIndex(i => i.product_id === selectedProduct.id);
    if (existingIdx > -1) {
      const updated = [...reqItems];
      const newQ = updated[existingIdx].req_qty + qty;
      updated[existingIdx] = {
        ...updated[existingIdx],
        req_qty: newQ,
        cost_value: newQ * cpu
      };
      setReqItems(updated);
    } else {
      const newItem = {
        product_id: selectedProduct.id,
        barcode: selectedProduct.barcode || selectedProduct.code,
        product_code: selectedProduct.code || selectedProduct.barcode,
        product_name: selectedProduct.item_name,
        vendor_name: selectedProduct.vendor?.name || selectedVendor?.name || 'N/A',
        cpu: cpu,
        mrp: mrp,
        central_stock: stockInfo.central,
        local_stock: stockInfo.local,
        req_qty: qty,
        cost_value: cpu * qty
      };
      setReqItems([...reqItems, newItem]);
    }

    setSelectedProduct(null);
    setProductSearchInput('');
    setReqQty(1);
    setStockInfo({ central: 0, local: 0 });
    toast.success('Item added');
  };

  // Remove Item
  const handleRemoveItem = (index) => {
    const updated = reqItems.filter((_, idx) => idx !== index);
    setReqItems(updated);
  };

  // Submit Requisition
  const handleSubmitRequisition = async () => {
    if (reqItems.length === 0) {
      toast.error('Requisition list is empty');
      return;
    }

    setIsSubmitting(true);
    const totalQty = reqItems.reduce((sum, i) => sum + i.req_qty, 0);
    const totalCost = reqItems.reduce((sum, i) => sum + i.cost_value, 0);
    const preparedByName = user?.name || user?.username || 'BANANI';
    const shopName = storeDetails.name || posTerminal?.store_name || 'BANANI MODEL TOWN';
    const vendorName = selectedVendor?.name || 'Multiple Vendors';

    const reqPayload = {
      requisition_no: requisitionNo,
      shop_name: shopName,
      requisition_date: new Date().toISOString().slice(0, 10),
      vendor: vendorName,
      prepared_by: preparedByName,
      status: 'Pending',
      total_qty: totalQty,
      total_value: totalCost,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data: sReqData, error: sReqErr } = await supabase
        .from('store_requisitions')
        .insert([reqPayload])
        .select()
        .single();

      if (sReqErr) {
        console.error("store_requisitions insert error:", sReqErr);
        toast.error(`Error submitting: ${sReqErr.message}`);
        setIsSubmitting(false);
        return;
      }

      const reqId = sReqData?.id;

      const itemPayloads = reqItems.map(item => ({
        requisition_id: reqId,
        barcode: item.barcode,
        product_code: item.product_code,
        product_name: item.product_name,
        cpu: item.cpu,
        mrp: item.mrp,
        bal_qty: item.local_stock,
        stock_in_cs: item.central_stock,
        req_qty: item.req_qty,
        app_qty: item.req_qty,
        cost_value: item.cost_value,
        is_approved: true
      }));

      await supabase.from('store_requisition_items').insert(itemPayloads);

      // Dual insert into requisitions
      try {
        const { data: rData } = await supabase.from('requisitions').insert([{
          shop_id: storeDetails.id,
          requisition_no: requisitionNo,
          requisition_date: new Date().toISOString().slice(0, 10),
          status: 'Pending',
          created_at: new Date().toISOString()
        }]).select().single();

        if (rData) {
          const rItems = reqItems.map(item => ({
            requisition_id: rData.id,
            product_id: item.product_id,
            req_qty: item.req_qty,
            approve_qty: item.req_qty,
            barcode: item.barcode,
            product_code: item.product_code,
            product_name: item.product_name,
            cpu: item.cpu,
            mrp: item.mrp,
            cost_value: item.cost_value,
            bal_qty: item.local_stock
          }));
          await supabase.from('requisition_items').insert(rItems);
        }
      } catch (e) {
        console.warn("Dual insert note:", e);
      }

      toast.success(`Vendor Requisition ${requisitionNo} submitted to Central Store!`, { duration: 4000 });

      setReqItems([]);
      await generateRequisitionNo();
      await fetchRecentRequisitions();
    } catch (err) {
      console.error(err);
      toast.error('Error submitting vendor requisition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCostCalculated = reqItems.reduce((sum, i) => sum + i.cost_value, 0);
  const totalQtyCalculated = reqItems.reduce((sum, i) => sum + i.req_qty, 0);

  return (
    <div style={{ padding: '20px', backgroundColor: 'var(--bg-primary, #f8fafc)', minHeight: '100%', fontSize: '13px' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building size={24} color="var(--accent-primary, #2e6f40)" />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary, #1e293b)' }}>Store Requisition (Vendorwise)</h2>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Create vendor-specific stock requisitions for Central Store approval</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#64748b', fontSize: '11px' }}>Requisition No : </span>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-primary, #2e6f40)', fontSize: '14px' }}>{requisitionNo}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#64748b', fontSize: '11px' }}>Branch Store : </span>
            <span style={{ fontWeight: 'bold', color: '#0d47a1' }}>{(storeDetails.name || posTerminal?.store_name || 'STORE').toUpperCase()}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#64748b', fontSize: '11px' }}>Date : </span>
            <span style={{ fontWeight: 'bold' }}>{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Vendor Selection & Product Search Box */}
      <div style={{ backgroundColor: '#fff', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        
        {/* Vendor Selector Dropdown */}
        <div style={{ marginBottom: '16px', maxWidth: '400px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#0d47a1' }}>Select Vendor / Supplier :</label>
          <CustomSelect 
            value={selectedVendorId} 
            onChange={(e) => handleVendorChange(e.target.value)}
          >
            <option value="">-- Select Vendor (or Search All) --</option>
            {vendorsList.map(v => (
              <option key={v.id} value={v.id}>{v.code ? `${v.code} - ${v.name}` : v.name}</option>
            ))}
          </CustomSelect>
        </div>

        <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', color: 'var(--accent-primary, #2e6f40)' }}>
          Search & Add Vendor Products
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: '15px', alignItems: 'flex-start', position: 'relative' }}>
          
          {/* Product Input */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Product Name / Barcode :</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={productSearchInput}
                onChange={(e) => {
                  setProductSearchInput(e.target.value);
                  setSelectedProduct(null);
                }}
                placeholder={selectedVendor ? `Search items for ${selectedVendor.name}...` : "Type product name or barcode..."}
                style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                {searchResults.map(prod => (
                  <div 
                    key={prod.id}
                    onClick={() => handleSelectProduct(prod)}
                    style={{ padding: '8px 12px', borderBottom: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                    className="req-search-item"
                  >
                    <span style={{ fontWeight: 'bold' }}>{prod.item_name} ({prod.barcode})</span>
                    <span style={{ color: 'var(--accent-primary, #2e6f40)' }}>MRP: Tk {prod.mrp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Req Qty */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Req Qty :</label>
            <input 
              type="number" 
              min="1"
              value={reqQty}
              onChange={(e) => setReqQty(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}
            />
          </div>

          {/* Add Button */}
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={handleAddItemToReq}
              style={{ 
                width: '100%',
                padding: '8px 16px', 
                backgroundColor: 'var(--accent-primary, #2e6f40)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Add Item
            </button>
          </div>

        </div>

        {/* Live Stock Breakdown Display */}
        {selectedProduct && (
          <div style={{ marginTop: '12px', padding: '10px 14px', backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: '4px', display: 'flex', gap: '25px', fontSize: '12px' }}>
            <div>
              <span style={{ fontWeight: 'bold', color: '#0369a1' }}>Product: </span>
              <span style={{ fontWeight: 'bold' }}>{selectedProduct.item_name}</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold', color: '#2e6f40' }}>Central Store Stock: </span>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#15803d' }}>{stockInfo.central} Pcs</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold', color: '#0d47a1' }}>{storeDetails.name || posTerminal?.store_name} Stock: </span>
              <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1d4ed8' }}>{stockInfo.local} Pcs</span>
            </div>
          </div>
        )}

      </div>

      {/* Requisition Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px', color: 'var(--text-primary, #1e293b)' }}>
          Vendor Requisition Items List ({reqItems.length})
        </div>

        <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Barcode</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Product Name</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Vendor</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>CPU</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>MRP</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: '#15803d', fontWeight: 'bold' }}>Central Stock</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: '#1d4ed8', fontWeight: 'bold' }}>This Store Stock</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>Req Qty</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>Cost Value</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reqItems.length === 0 ? (
                <tr><td colSpan="10" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No items added yet. Select a vendor and search products above.</td></tr>
              ) : (
                reqItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px' }}>{item.barcode}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{item.product_name}</td>
                    <td style={{ padding: '8px 12px' }}>{item.vendor_name}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>Tk {item.cpu}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>Tk {item.mrp}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#15803d' }}>{item.central_stock}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#1d4ed8' }}>{item.local_stock}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>{item.req_qty}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: '#2e6f40' }}>Tk {item.cost_value.toFixed(2)}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleRemoveItem(idx)}
                        style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary & Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
            <span>Total Items: <strong>{reqItems.length}</strong></span>
            <span>Total Qty: <strong>{totalQtyCalculated} Pcs</strong></span>
            <span>Total Cost Value: <strong style={{ color: 'var(--accent-primary, #2e6f40)', fontSize: '15px' }}>Tk {totalCostCalculated.toFixed(2)}</strong></span>
          </div>

          <button 
            disabled={isSubmitting || reqItems.length === 0}
            onClick={handleSubmitRequisition}
            style={{ 
              backgroundColor: 'var(--accent-primary, #2e6f40)', 
              color: '#fff', 
              border: 'none', 
              padding: '10px 24px', 
              borderRadius: '6px', 
              fontWeight: 'bold', 
              cursor: reqItems.length === 0 ? 'not-allowed' : 'pointer',
              opacity: reqItems.length === 0 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(46, 111, 64, 0.3)'
            }}
          >
            <Send size={16} /> {isSubmitting ? 'Submitting...' : 'Submit Vendor Requisition'}
          </button>
        </div>

      </div>

      {/* Recent Requisitions List */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '16px 20px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px', color: 'var(--text-primary, #1e293b)' }}>
          Recent Store Requisitions Status
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Requisition No</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Shop Name</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Qty</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost Value</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentRequisitions.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>No requisitions submitted yet.</td></tr>
            ) : (
              recentRequisitions.map((req) => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold', color: 'var(--accent-primary, #2e6f40)' }}>{req.requisition_no}</td>
                  <td style={{ padding: '8px 12px' }}>{req.requisition_date ? req.requisition_date.slice(0, 10) : ''}</td>
                  <td style={{ padding: '8px 12px' }}>{req.shop_name || 'N/A'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold' }}>{req.total_qty || 0}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>Tk {req.total_value || req.total_cost_value || 0}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '3px 10px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      backgroundColor: req.status === 'Pending' ? '#fef3c7' : '#dcfce7',
                      color: req.status === 'Pending' ? '#b45309' : '#15803d'
                    }}>
                      {req.status}
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

export default PosRequisitionVendorwise;
