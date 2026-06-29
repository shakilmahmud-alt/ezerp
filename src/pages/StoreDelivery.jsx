import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';

const StoreDelivery = () => {
  const [requisitions, setRequisitions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // Default to start of year
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [reqItems, setReqItems] = useState([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  
  // Add new product in modal
  const [newProductSearch, setNewProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchRequisitions();
  }, [fromDate, toDate]);

  const fetchRequisitions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('requisitions')
        .select(`
          id,
          requisition_no,
          requisition_date,
          status,
          shops ( name )
        `)
        .gte('requisition_date', fromDate)
        .lte('requisition_date', toDate)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== '42P01') throw error;
        else console.log('requisitions table does not exist yet.');
      }
      setRequisitions(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load requisitions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    if (newStatus === 'Approved') {
      // First, get all items to deduct stock
      const { data: items, error: itemsError } = await supabase
        .from('requisition_items')
        .select('product_id, approve_qty')
        .eq('requisition_id', id);

      if (itemsError) {
        toast.error('Error fetching requisition items for approval');
        return;
      }

      if (!items || items.length === 0) {
        toast.error('Cannot approve an empty requisition');
        return;
      }

      // Perform stock updates
      setIsLoading(true);
      try {
        for (const item of items) {
          const qty = Number(item.approve_qty || 0);
          if (qty > 0) {
            // Get current stock
            const { data: prodData } = await supabase
              .from('products')
              .select('wh_stock, str_stock')
              .eq('id', item.product_id)
              .single();

            if (prodData) {
              const newWhStock = Number(prodData.wh_stock || 0) - qty;
              const newStrStock = Number(prodData.str_stock || 0) + qty;
              
              await supabase
                .from('products')
                .update({ wh_stock: newWhStock, str_stock: newStrStock })
                .eq('id', item.product_id);
            }
          }
        }
      } catch (err) {
        console.error("Stock update error:", err);
        toast.error('Failed to update stock');
        setIsLoading(false);
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('requisitions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Requisition ${newStatus} successfully`);
      fetchRequisitions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Modal Logic ----

  const openViewEditModal = async (req) => {
    setSelectedReq(req);
    setIsModalOpen(true);
    setIsModalLoading(true);
    setNewProductSearch('');
    setSearchResults([]);
    try {
      const { data, error } = await supabase
        .from('requisition_items')
        .select('*, products(item_name, barcode, wh_stock, sale_vat_percent, mrp)')
        .eq('requisition_id', req.id);

      if (error) throw error;
      
      const mapped = data.map(item => ({
        ...item,
        approve_qty: item.approve_qty === null ? item.req_qty : item.approve_qty // Default approve qty to requested qty
      }));
      setReqItems(mapped || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load items');
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleApproveQtyChange = (id, val) => {
    const updated = reqItems.map(item => {
      if (item.id === id) {
        return { ...item, approve_qty: val };
      }
      return item;
    });
    setReqItems(updated);
  };

  const handleDeleteItem = (id) => {
    const updated = reqItems.filter(item => item.id !== id);
    setReqItems(updated);
  };

  const handleProductSearch = async (e) => {
    const val = e.target.value;
    setNewProductSearch(val);
    
    if (val.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, item_name, barcode, wh_stock')
        .or(`item_name.ilike.%${val}%,barcode.ilike.%${val}%`)
        .limit(10);
        
      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const addProductToReq = (product) => {
    // check if already exists
    if (reqItems.find(i => i.product_id === product.id)) {
      toast.error('Product already in the requisition list');
      return;
    }

    const newItem = {
      id: `temp-${Date.now()}`, // temp ID
      requisition_id: selectedReq.id,
      product_id: product.id,
      req_qty: 0,
      approve_qty: 1,
      products: {
        item_name: product.item_name,
        barcode: product.barcode,
        wh_stock: product.wh_stock
      },
      isNew: true
    };
    
    setReqItems([...reqItems, newItem]);
    setNewProductSearch('');
    setSearchResults([]);
  };

  const saveModalChanges = async () => {
    setIsModalLoading(true);
    try {
      // 1. Delete items that were removed
      // We know which ones were removed if they had a real UUID but are missing from reqItems
      const currentRealIds = reqItems.filter(i => !i.isNew).map(i => i.id);
      
      const { data: dbItems, error: dbError } = await supabase
        .from('requisition_items')
        .select('id')
        .eq('requisition_id', selectedReq.id);
        
      if (!dbError && dbItems) {
        const deletedIds = dbItems.map(i => i.id).filter(id => !currentRealIds.includes(id));
        if (deletedIds.length > 0) {
          await supabase.from('requisition_items').delete().in('id', deletedIds);
        }
      }

      // 2. Update existing items
      const existingItems = reqItems.filter(i => !i.isNew);
      for (const item of existingItems) {
        await supabase
          .from('requisition_items')
          .update({ approve_qty: item.approve_qty })
          .eq('id', item.id);
      }

      // 3. Insert new items
      const newItems = reqItems.filter(i => i.isNew).map(item => ({
        requisition_id: item.requisition_id,
        product_id: item.product_id,
        req_qty: item.req_qty,
        approve_qty: item.approve_qty
      }));
      
      if (newItems.length > 0) {
        await supabase.from('requisition_items').insert(newItems);
      }

      toast.success('Requisition updated successfully');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes');
    } finally {
      setIsModalLoading(false);
    }
  };


  const filteredRequisitions = requisitions.filter(r => 
    (r.requisition_no && r.requisition_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.shops?.name && r.shops?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ backgroundColor: '#fff', padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            Requisition List
          </h2>
          <button className="btn-theme" style={{ backgroundColor: '#00bcd4', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
            + New Delivery
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '20px 20px 10px', display: 'flex', gap: '30px', alignItems: 'flex-end', borderBottom: '1px dotted var(--border-color)' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ border: 'none', borderBottom: '1px dotted #ccc', outline: 'none', padding: '5px 0' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>TO Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ border: 'none', borderBottom: '1px dotted #ccc', outline: 'none', padding: '5px 0' }} />
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px' }}>
          
          {/* Search Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Search</label>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                borderBottom: '1px solid #ccc',
                padding: '5px 0',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>SL</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Shop Name</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Requisition No</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Requisition Date</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Status</th>
                  <th style={{ padding: '12px 10px', fontWeight: 'bold' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Loading...</td>
                  </tr>
                ) : filteredRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No requisitions found.</td>
                  </tr>
                ) : (
                  filteredRequisitions.map((req, index) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: req.status === 'Approved' ? '#f0fff4' : req.status === 'Rejected' ? '#fff5f5' : 'transparent' }}>
                      <td style={{ padding: '12px 10px' }}>{index + 1}</td>
                      <td style={{ padding: '12px 10px' }}>{req.shops?.name}</td>
                      <td style={{ padding: '12px 10px' }}>{req.requisition_no}</td>
                      <td style={{ padding: '12px 10px' }}>{req.requisition_date}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold', color: req.status === 'Approved' ? 'green' : req.status === 'Rejected' ? 'red' : '#ff9800' }}>
                        {req.status}
                      </td>
                      <td style={{ padding: '12px 10px', display: 'flex', gap: '8px' }}>
                        <button  
                          onClick={() => openViewEditModal(req)}
                          style={{ padding: '4px 8px', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          {req.status === 'Pending' ? 'View/Edit' : 'View'}
                        </button>
                        
                        {req.status === 'Pending' && (
                          <>
                            <button  
                              onClick={() => handleStatusUpdate(req.id, 'Approved')}
                              style={{ padding: '4px 8px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Approve
                            </button>
                            <button  
                              onClick={() => handleStatusUpdate(req.id, 'Rejected')}
                              style={{ padding: '4px 8px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* Modal for View/Edit */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', width: '800px', maxHeight: '90vh', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{selectedReq?.status === 'Pending' ? 'Edit Requisition' : 'View Requisition'} - {selectedReq?.requisition_no}</h3>
              <button className="btn-theme" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              
              {selectedReq?.status === 'Pending' && (
                <div style={{ marginBottom: '20px', position: 'relative' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Add Product to Requisition</label>
                  <input 
                    type="text" 
                    value={newProductSearch}
                    onChange={handleProductSearch}
                    placeholder="Search by Barcode or Name"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '5px' }}
                  />
                  {searchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #ccc', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                      {searchResults.map(prod => (
                        <div 
                          key={prod.id} 
                          onClick={() => addProductToReq(prod)}
                          style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        >
                          {prod.item_name} (Barcode: {prod.barcode}, Stock: {prod.wh_stock})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isModalLoading ? (
                <p>Loading items...</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Barcode</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Product Name</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Stock</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Req Qty</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Approve Qty</th>
                      {selectedReq?.status === 'Pending' && <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {reqItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No items found.</td>
                      </tr>
                    ) : (
                      reqItems.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>{item.products?.barcode}</td>
                          <td style={{ padding: '10px' }}>{item.products?.item_name}</td>
                          <td style={{ padding: '10px' }}>{item.products?.wh_stock || 0}</td>
                          <td style={{ padding: '10px' }}>{item.req_qty}</td>
                          <td style={{ padding: '10px' }}>
                            {selectedReq?.status === 'Pending' ? (
                              <input 
                                type="number" 
                                value={item.approve_qty} 
                                onChange={(e) => handleApproveQtyChange(item.id, e.target.value)}
                                style={{ width: '80px', padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}
                              />
                            ) : (
                              item.approve_qty
                            )}
                          </td>
                          {selectedReq?.status === 'Pending' && (
                            <td style={{ padding: '10px' }}>
                              <button className="btn-danger" onClick={() => handleDeleteItem(item.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '15px 20px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-theme" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 15px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
                Close
              </button>
              {selectedReq?.status === 'Pending' && (
                <button className="btn-theme" onClick={saveModalChanges} disabled={isModalLoading} style={{ padding: '8px 15px', backgroundColor: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StoreDelivery;
