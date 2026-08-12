import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PosPurchaseReturn = () => {
  const { posTerminal, user } = useAuth();

  const [vendors, setVendors] = useState([]);
  const [vendorChallans, setVendorChallans] = useState([]);
  const [currentChallanItems, setCurrentChallanItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storeName, setStoreName] = useState('Store Branch');

  // Left Sidebar Form State
  const [formData, setFormData] = useState({
    vendorId: '',
    challanNo: '',
    purchaseReceiveId: '',
    returnDate: new Date().toISOString().split('T')[0],
    referenceNo: '',
    barcode: '',
    productId: '',
    productName: '',
    productCode: '',
    salePrice: '',
    costPrice: '',
    currentStock: 0,
    returnQty: '',
    returnReason: ''
  });

  // Right Table State
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastReturnChallan, setLastReturnChallan] = useState('PR20260811001');

  useEffect(() => {
    fetchInitialData();
  }, [posTerminal]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: vData } = await supabase.from('vendors').select('id, name').order('name');
      setVendors(vData || []);

      const currentStore = posTerminal?.store_name || 'BANANI MODEL TOWN';
      setStoreName(currentStore);

      // Generate Last Return Challan prefix
      const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      setLastReturnChallan(`PR${todayStr}001`);

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Challans Received specifically by THIS Store Branch!
  const loadChallansForVendor = async (vendorId) => {
    setFormData(prev => ({
      ...prev, vendorId, challanNo: '', purchaseReceiveId: '', referenceNo: '',
      barcode: '', productId: '', productName: '', productCode: '', salePrice: '', costPrice: '', currentStock: 0, returnQty: '', returnReason: ''
    }));
    setVendorChallans([]);
    setCurrentChallanItems([]);
    
    if (!vendorId) return;

    try {
      const currentStore = posTerminal?.store_name || 'BANANI MODEL TOWN';
      
      // Query purchase_receives filtered by vendor AND this specific store!
      let query = supabase
        .from('purchase_receives')
        .select('id, last_challan_no, reference_no, delivery_to, created_at')
        .eq('vendor_id', vendorId)
        .eq('status', 'Saved')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Filter by storeName matching delivery_to
      const filteredChallans = (data || []).filter(c => 
        !c.delivery_to || 
        c.delivery_to.toLowerCase().includes(currentStore.toLowerCase()) || 
        currentStore.toLowerCase().includes(c.delivery_to.toLowerCase())
      );

      setVendorChallans(filteredChallans.length > 0 ? filteredChallans : data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load store receive challans');
    }
  };

  // Load Items for Selected Challan
  const loadChallanItems = async (purchaseReceiveId, refNo, challanNo) => {
    setFormData(prev => ({
      ...prev, purchaseReceiveId, referenceNo: refNo || '', challanNo,
      barcode: '', productId: '', productName: '', productCode: '', salePrice: '', costPrice: '', currentStock: 0, returnQty: '', returnReason: ''
    }));
    
    if (!purchaseReceiveId) {
      setCurrentChallanItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_receive_items')
        .select('*, products(id, code, item_name, barcode, wh_stock, store_stocks(store_id, stock_qty))')
        .eq('purchase_receive_id', purchaseReceiveId);

      if (error) throw error;
      setCurrentChallanItems(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load challan items');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto lookup product by barcode from current challan items
  const handleBarcodeChange = async (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, barcode: value }));
    
    if (value && currentChallanItems.length > 0) {
      const foundItem = currentChallanItems.find(item => 
        item.products?.barcode === value || 
        item.products?.code === value
      );

      if (foundItem) {
        // Fetch branch store stock for this product
        let branchStock = 0;
        if (posTerminal?.store_id) {
          const { data: sStock } = await supabase
            .from('store_stocks')
            .select('stock_qty')
            .eq('store_id', posTerminal.store_id)
            .eq('product_id', foundItem.product_id)
            .single();
          branchStock = sStock?.stock_qty || 0;
        } else {
          branchStock = foundItem.rcv_qty || 0;
        }

        setFormData(prev => ({
          ...prev,
          productId: foundItem.product_id,
          productName: foundItem.products?.item_name || '',
          productCode: foundItem.products?.code || '',
          salePrice: foundItem.sale_price || '',
          costPrice: foundItem.pur_price || '',
          currentStock: branchStock
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          productId: '', productName: '', productCode: '', salePrice: '', costPrice: '', currentStock: 0
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        productId: '', productName: '', productCode: '', salePrice: '', costPrice: '', currentStock: 0
      }));
    }
  };

  // Add Item to Return List
  const handleAdd = () => {
    if (!formData.productId) {
      toast.error('Please scan or select a valid barcode from this challan');
      return;
    }
    const rQty = Number(formData.returnQty);
    if (isNaN(rQty) || rQty <= 0) {
      toast.error('Please enter a valid return quantity');
      return;
    }
    
    if (selectedItems.find(item => item.productId === formData.productId)) {
      toast.error('Product already added to return list');
      return;
    }

    const newItem = {
      productId: formData.productId,
      barcode: formData.barcode,
      productCode: formData.productCode,
      productName: formData.productName,
      costPrice: Number(formData.costPrice || 0),
      salePrice: Number(formData.salePrice || 0),
      currentStock: Number(formData.currentStock || 0),
      returnQty: rQty,
      returnReason: formData.returnReason || 'Defective / Excess',
      amount: Number(formData.costPrice || 0) * rQty
    };

    setSelectedItems([...selectedItems, newItem]);

    setFormData(prev => ({
      ...prev,
      barcode: '', productId: '', productName: '', productCode: '', salePrice: '', costPrice: '', currentStock: 0, returnQty: '', returnReason: ''
    }));
    toast.success('Product added to return list');
  };

  const handleDeleteItem = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  const totals = {
    qty: selectedItems.reduce((acc, curr) => acc + curr.returnQty, 0),
    count: selectedItems.length,
    value: selectedItems.reduce((acc, curr) => acc + curr.amount, 0)
  };

  // Save Purchase Return & Update Store Stock
  const handleSave = async () => {
    if (!formData.vendorId || !formData.purchaseReceiveId) {
      toast.error('Please select Vendor and Challan No');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('No items added to return');
      return;
    }

    setIsLoading(true);
    try {
      const prPayload = {
        vendor_id: formData.vendorId,
        purchase_receive_id: formData.purchaseReceiveId,
        return_date: formData.returnDate,
        challan_no: formData.challanNo,
        reference_no: formData.referenceNo,
        store_name: storeName,
        store_id: posTerminal?.store_id || null,
        total_amount: totals.value,
        created_at: new Date().toISOString()
      };

      const { data: prData, error: prError } = await supabase
        .from('purchase_returns')
        .insert([prPayload])
        .select()
        .single();

      if (prError) throw prError;

      const itemsPayload = selectedItems.map(item => ({
        purchase_return_id: prData.id,
        product_id: item.productId,
        return_qty: item.returnQty,
        cost_price: item.costPrice,
        sale_price: item.salePrice,
        line_amount: item.amount,
        return_reason: item.returnReason
      }));

      const { error: itemsError } = await supabase
        .from('purchase_return_items')
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      // Deduct stock for each item from THIS SPECIFIC BRANCH STORE (store_stocks) ONLY!
      for (const item of selectedItems) {
        if (posTerminal?.store_id) {
          const { data: sStock } = await supabase
            .from('store_stocks')
            .select('stock_qty')
            .eq('store_id', posTerminal.store_id)
            .eq('product_id', item.productId)
            .single();

          const currentStoreStock = sStock ? Number(sStock.stock_qty || 0) : item.currentStock;
          const newStoreStock = Math.max(0, currentStoreStock - item.returnQty);

          await supabase
            .from('store_stocks')
            .update({ stock_qty: newStoreStock })
            .eq('store_id', posTerminal.store_id)
            .eq('product_id', item.productId);
        }
      }

      toast.success('Store Purchase Return saved successfully!', { duration: 4000 });
      
      generatePDF();
      handleClearAll();

    } catch (err) {
      console.error(err);
      toast.error(`Error saving return: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = () => {
    setSelectedItems([]);
    setFormData({
      vendorId: '',
      challanNo: '',
      purchaseReceiveId: '',
      returnDate: new Date().toISOString().split('T')[0],
      referenceNo: '',
      barcode: '',
      productId: '',
      productName: '',
      productCode: '',
      salePrice: '',
      costPrice: '',
      currentStock: 0,
      returnQty: '',
      returnReason: ''
    });
    setVendorChallans([]);
    setCurrentChallanItems([]);
  };

  const generatePDF = () => {
    if (selectedItems.length === 0) return;
    
    const doc = new jsPDF('landscape');
    const vendorName = vendors.find(v => v.id === formData.vendorId)?.name || '';

    doc.setFontSize(16);
    doc.text("STORE PURCHASE RETURN CHALLAN", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Store: ${storeName}`, 14, 25);
    doc.text(`Vendor: ${vendorName}`, 14, 30);
    doc.text(`Return Date: ${formData.returnDate}`, 14, 35);
    doc.text(`Challan No: ${formData.challanNo}`, 180, 25);
    doc.text(`Reference No: ${formData.referenceNo}`, 180, 30);

    const tableCols = ['Code', 'Barcode', 'Product Name', 'CPU', 'Sale Price', 'Rtn. Qty', 'Amount', 'Reason'];
    const tableRows = selectedItems.map(item => [
      item.productCode || 'N/A',
      item.barcode || '',
      item.productName,
      item.costPrice,
      item.salePrice,
      item.returnQty,
      item.amount.toFixed(2),
      item.returnReason || ''
    ]);

    tableRows.push([
      'TOTAL', '', '', '', '', totals.qty, totals.value.toFixed(2), ''
    ]);

    autoTable(doc, {
      head: [tableCols],
      body: tableRows,
      startY: 45,
      theme: 'grid'
    });

    doc.save(`PurchaseReturn_${formData.challanNo || 'Draft'}.pdf`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color, #f8fafc)', minHeight: '100vh', fontSize: '13px' }}>
      
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 20px 0', color: 'var(--text-primary, #1e293b)' }}>Purchase Return</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        
        {/* Left Form Panel */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          
          {/* Vendor Name */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#d32f2f', marginBottom: '4px' }}>Vendor Name *</label>
            <select 
              value={formData.vendorId} 
              onChange={(e) => loadChallansForVendor(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #00bcd4', borderRadius: '4px', backgroundColor: '#e0f7fa', fontWeight: 'bold' }}
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          {/* Last Return Challan */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Last Return Challan</label>
            <input type="text" value={lastReturnChallan} readOnly style={{ width: '100%', padding: '5px 8px', border: '1px dashed #ccc', backgroundColor: '#f8fafc', color: '#64748b', borderRadius: '4px' }} />
          </div>

          {/* Challan No Dropdown (Filtered for THIS STORE!) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#d32f2f', marginBottom: '4px' }}>Challan No *</label>
            <select 
              value={formData.purchaseReceiveId} 
              onChange={(e) => {
                const selectedChallan = vendorChallans.find(c => c.id === e.target.value);
                loadChallanItems(e.target.value, selectedChallan?.reference_no, selectedChallan?.last_challan_no);
              }}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #00bcd4', borderRadius: '4px', backgroundColor: '#e0f7fa', fontWeight: 'bold' }}
            >
              <option value="">-- Select Challan --</option>
              {vendorChallans.map(c => (
                <option key={c.id} value={c.id}>
                  {c.last_challan_no} ({c.created_at ? c.created_at.slice(0, 10) : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Return Date */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Return Date</label>
            <input 
              type="date" 
              value={formData.returnDate} 
              onChange={(e) => setFormData(prev => ({ ...prev, returnDate: e.target.value }))}
              style={{ width: '100%', padding: '5px 8px', border: '1px solid #ccc', borderRadius: '4px' }} 
            />
          </div>

          {/* Reference No */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Reference No</label>
            <input type="text" value={formData.referenceNo} readOnly style={{ width: '100%', padding: '5px 8px', border: '1px solid #ccc', backgroundColor: '#f1f5f9', borderRadius: '4px' }} />
          </div>

          {/* Barcode Scan */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Barcode</label>
            <input 
              type="text" 
              placeholder="Barcode Scan..." 
              value={formData.barcode} 
              onChange={handleBarcodeChange}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #00bcd4', borderRadius: '4px', fontWeight: 'bold' }} 
            />
          </div>

          {/* Product Name */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#d32f2f', marginBottom: '4px' }}>Product *</label>
            <input type="text" value={formData.productName} readOnly placeholder="Scanned Product Name" style={{ width: '100%', padding: '5px 8px', border: '1px solid #ccc', backgroundColor: '#f8fafc', fontWeight: 'bold', borderRadius: '4px' }} />
          </div>

          {/* Sale Price */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Sale Price</label>
            <input type="text" value={formData.salePrice} readOnly style={{ width: '100%', padding: '5px 8px', border: '1px solid #ccc', backgroundColor: '#f8fafc', borderRadius: '4px' }} />
          </div>

          {/* Cost Price */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Cost Price</label>
            <input type="text" value={formData.costPrice} readOnly style={{ width: '100%', padding: '5px 8px', border: '1px solid #ccc', backgroundColor: '#f8fafc', borderRadius: '4px' }} />
          </div>

          {/* Current Stock */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#0d47a1', fontWeight: 'bold', marginBottom: '4px' }}>{storeName} Stock</label>
            <input type="text" value={formData.currentStock} readOnly style={{ width: '100%', padding: '5px 8px', border: '1px solid #7dd3fc', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 'bold', borderRadius: '4px' }} />
          </div>

          {/* Return Quantity */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#d32f2f', marginBottom: '4px' }}>Return Quantity *</label>
            <input 
              type="number" 
              min="1"
              value={formData.returnQty} 
              onChange={(e) => setFormData(prev => ({ ...prev, returnQty: e.target.value }))}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold', textAlign: 'center' }} 
            />
          </div>

          {/* Return Reason */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Return Reason</label>
            <input 
              type="text" 
              placeholder="Reason for return..." 
              value={formData.returnReason} 
              onChange={(e) => setFormData(prev => ({ ...prev, returnReason: e.target.value }))}
              style={{ width: '100%', padding: '5px 8px', border: '1px solid #ccc', borderRadius: '4px' }} 
            />
          </div>

          {/* Add to Return Button */}
          <button 
            className="btn-theme"
            onClick={handleAdd}
            style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 'bold' }}
          >
            Add to Return
          </button>

        </div>

        {/* Right Details Panel */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          
          <div>
            {/* Header Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>Product Details</h3>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#d32f2f', display: 'flex', gap: '20px' }}>
                <span>Return Quantity: {totals.qty}</span>
                <span>Item Count: {totals.count}</span>
                <span>Return Value: Tk {totals.value.toFixed(2)}</span>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Code</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>CPU</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sale Price</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>Rtn. Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', color: '#0369a1' }}>C. Stock</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Unit</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#2e6f40' }}>Amount</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Reason</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Act</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        No products added yet. Select a vendor & challan, scan barcode, and click 'Add to Return'.
                      </td>
                    </tr>
                  ) : (
                    selectedItems.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 10px' }}>{item.productCode || 'N/A'}</td>
                        <td style={{ padding: '8px 10px' }}>{item.barcode}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{item.productName}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>Tk {item.costPrice}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>Tk {item.salePrice}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold' }}>{item.returnQty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0369a1' }}>{item.currentStock}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>Pcs</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#2e6f40' }}>Tk {item.amount.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px' }}>{item.returnReason}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button 
                            className="btn-danger"
                            onClick={() => handleDeleteItem(idx)}
                            style={{ padding: '4px 8px' }}
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

          </div>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
            <button 
              className="btn-info" 
              onClick={generatePDF}
              disabled={selectedItems.length === 0}
              style={{ padding: '8px 28px', fontSize: '13px', fontWeight: 'bold' }}
            >
              Preview
            </button>
            <button 
              className="btn-theme" 
              onClick={handleSave}
              disabled={isLoading || selectedItems.length === 0}
              style={{ padding: '8px 28px', fontSize: '13px', fontWeight: 'bold' }}
            >
              Save
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default PosPurchaseReturn;
