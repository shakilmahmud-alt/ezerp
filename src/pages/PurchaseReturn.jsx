import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PurchaseReturn = () => {
  const [vendors, setVendors] = useState([]);
  const [vendorChallans, setVendorChallans] = useState([]);
  const [currentChallanItems, setCurrentChallanItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Left form state
  const [formData, setFormData] = useState({
    vendorId: '',
    challanNo: '',
    purchaseReceiveId: '',
    returnDate: new Date().toISOString().split('T')[0],
    referenceNo: '',
    barcode: '',
    productId: '',
    productName: '',
    salePrice: '',
    costPrice: '',
    currentStock: '',
    returnQty: '',
    returnReason: ''
  });

  // Right grid state
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('vendors').select('id, name').order('name');
      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  const loadChallansForVendor = async (vendorId) => {
    setFormData(prev => ({
      ...prev, vendorId, challanNo: '', purchaseReceiveId: '', referenceNo: '',
      barcode: '', productId: '', productName: '', salePrice: '', costPrice: '', currentStock: '', returnQty: '', returnReason: ''
    }));
    setVendorChallans([]);
    setCurrentChallanItems([]);
    
    if (!vendorId) return;

    try {
      const { data, error } = await supabase
        .from('purchase_receives')
        .select('id, last_challan_no, reference_no, created_at')
        .eq('vendor_id', vendorId)
        .eq('status', 'Saved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendorChallans(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load challans');
    }
  };

  const loadChallanItems = async (purchaseReceiveId, refNo, challanNo) => {
    setFormData(prev => ({
      ...prev, purchaseReceiveId, referenceNo: refNo || '', challanNo,
      barcode: '', productId: '', productName: '', salePrice: '', costPrice: '', currentStock: '', returnQty: '', returnReason: ''
    }));
    
    if (!purchaseReceiveId) {
      setCurrentChallanItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_receive_items')
        .select('*, products(item_name, barcode, wh_stock)')
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

  const handleBarcodeChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, barcode: value }));
    
    // Auto lookup when barcode is typed
    if (value && currentChallanItems.length > 0) {
      const foundItem = currentChallanItems.find(item => item.products?.barcode === value);
      if (foundItem) {
        setFormData(prev => ({
          ...prev,
          productId: foundItem.product_id,
          productName: foundItem.products?.item_name || '',
          salePrice: foundItem.sale_price || '',
          costPrice: foundItem.pur_price || '', // It was pur_price in purchase_receive_items
          currentStock: foundItem.products?.wh_stock || 0
        }));
      } else {
        // Clear if not found
        setFormData(prev => ({
          ...prev,
          productId: '', productName: '', salePrice: '', costPrice: '', currentStock: ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        productId: '', productName: '', salePrice: '', costPrice: '', currentStock: ''
      }));
    }
  };

  const handleAdd = () => {
    if (!formData.productId) {
      toast.error('Please scan a valid barcode from this challan');
      return;
    }
    if (!formData.returnQty || Number(formData.returnQty) <= 0) {
      toast.error('Please enter a valid return quantity');
      return;
    }
    
    // Check if already added
    if (selectedItems.find(item => item.productId === formData.productId)) {
      toast.error('Product already added. Update from grid or delete first.');
      return;
    }

    const newItem = {
      productId: formData.productId,
      barcode: formData.barcode,
      productName: formData.productName,
      costPrice: Number(formData.costPrice || 0),
      salePrice: Number(formData.salePrice || 0),
      currentStock: Number(formData.currentStock || 0),
      returnQty: Number(formData.returnQty || 0),
      returnReason: formData.returnReason,
      amount: Number(formData.costPrice || 0) * Number(formData.returnQty || 0)
    };

    setSelectedItems([...selectedItems, newItem]);

    // Clear barcode specific fields
    setFormData(prev => ({
      ...prev,
      barcode: '', productId: '', productName: '', salePrice: '', costPrice: '', currentStock: '', returnQty: '', returnReason: ''
    }));
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

  const handleSave = async () => {
    if (!formData.vendorId || !formData.purchaseReceiveId) {
      toast.error('Please select Vendor and Challan');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('No items added to return');
      return;
    }

    setIsLoading(true);
    try {
      // Create Purchase Return header
      const prPayload = {
        vendor_id: formData.vendorId,
        purchase_receive_id: formData.purchaseReceiveId,
        return_date: formData.returnDate,
        challan_no: formData.challanNo,
        reference_no: formData.referenceNo,
        total_amount: totals.value
      };

      const { data: prData, error: prError } = await supabase
        .from('purchase_returns')
        .insert(prPayload)
        .select()
        .single();

      if (prError) throw prError;

      // Create items
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

      // Deduct stock for each item
      for (const item of selectedItems) {
        // Fetch current stock directly to avoid race conditions if possible
        const { data: prodData } = await supabase
          .from('products')
          .select('wh_stock')
          .eq('id', item.productId)
          .single();
          
        const currentWhStock = prodData ? Number(prodData.wh_stock || 0) : item.currentStock;
        const newStock = currentWhStock - item.returnQty;
        
        const { error: stockError } = await supabase
          .from('products')
          .update({ wh_stock: newStock })
          .eq('id', item.productId);
          
        if (stockError) console.error("Stock update error", stockError);
      }

      toast.success('Purchase Return saved successfully!');
      
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
      salePrice: '',
      costPrice: '',
      currentStock: '',
      returnQty: '',
      returnReason: ''
    });
    setVendorChallans([]);
    setCurrentChallanItems([]);
  };

  const generatePDF = () => {
    if (selectedItems.length === 0) return;
    
    const doc = new jsPDF('landscape');
    const vendorName = vendors.find(v => v.id == formData.vendorId)?.name || '';

    doc.setFontSize(16);
    doc.text("Purchase Return", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Vendor: ${vendorName}`, 14, 25);
    doc.text(`Return Date: ${formData.returnDate}`, 14, 30);
    doc.text(`Challan No: ${formData.challanNo}`, 150, 25);
    doc.text(`Reference No: ${formData.referenceNo}`, 150, 30);

    const tableCols = ["Code", "Barcode", "Product Name", "CPU", "Sale Price", "Rtn. Qty", "C. Stock", "Unit", "Amount", "Reason"];
    const tableRows = selectedItems.map(item => [
      '', // Code usually different from barcode but using barcode for now
      item.barcode,
      item.productName,
      item.costPrice.toFixed(2),
      item.salePrice.toFixed(2),
      item.returnQty,
      item.currentStock,
      'PCS',
      item.amount.toFixed(2),
      item.returnReason || ''
    ]);

    tableRows.push([
      'Total', '', '', '', '', totals.qty, '', '', totals.value.toFixed(2), ''
    ]);

    autoTable(doc, {
      head: [tableCols],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [180, 50, 50] }, // reddish for return
      didParseCell: function (data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`PurchaseReturn_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
        Purchase Return
      </h2>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Form Area */}
        <div style={{ width: '320px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'var(--card-bg)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vendor Name <span style={{color:'red'}}>*</span></label>
              <select 
                value={formData.vendorId} 
                onChange={(e) => loadChallansForVendor(e.target.value)} 
                className="input-animated"
              >
                <option value="">-- Select a Vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div style={{ borderBottom: '1px dotted var(--border-color)', paddingBottom: '5px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Last Return Challan</span>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', minHeight: '20px' }}></div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Challan No <span style={{color:'red'}}>*</span></label>
              <select 
                value={formData.purchaseReceiveId} 
                onChange={(e) => {
                  const selectedChallan = vendorChallans.find(c => c.id === e.target.value);
                  if (selectedChallan) {
                    // Assuming last_challan_no is the auto generated one
                    loadChallanItems(e.target.value, selectedChallan.reference_no, selectedChallan.last_challan_no);
                  } else {
                    loadChallanItems('', '', '');
                  }
                }} 
                className="input-animated"
              >
                <option value="">-- Select Challan --</option>
                {vendorChallans.map(c => (
                  <option key={c.id} value={c.id}>{c.last_challan_no} ({c.created_at?.split('T')[0]})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Return Date</label>
              <input type="date" value={formData.returnDate} onChange={(e) => setFormData({...formData, returnDate: e.target.value})} className="input-animated" />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reference No</label>
              <input type="text" value={formData.referenceNo} readOnly className="input-animated" style={{ backgroundColor: '#f5f5f5' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Barcode</label>
              <input 
                type="text" 
                placeholder="Barcode Scan" 
                value={formData.barcode} 
                onChange={handleBarcodeChange} 
                className="input-animated" 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Product <span style={{color:'red'}}>*</span></label>
              <input type="text" value={formData.productName} readOnly className="input-animated" style={{ backgroundColor: '#f5f5f5' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sale Price</label>
              <input type="number" value={formData.salePrice} readOnly className="input-animated" style={{ backgroundColor: '#f5f5f5' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cost Price</label>
              <input type="number" value={formData.costPrice} readOnly className="input-animated" style={{ backgroundColor: '#f5f5f5' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Stock</label>
              <input type="number" value={formData.currentStock} readOnly className="input-animated" style={{ backgroundColor: '#f5f5f5' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Return Quantity <span style={{color:'red'}}>*</span></label>
              <input type="number" value={formData.returnQty} onChange={(e) => setFormData({...formData, returnQty: e.target.value})} className="input-animated" />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Return Reason</label>
              <input type="text" value={formData.returnReason} onChange={(e) => setFormData({...formData, returnReason: e.target.value})} className="input-animated" />
            </div>

            <button className="btn-theme" 
              onClick={handleAdd}
              disabled={!formData.productId}
              style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: formData.productId ? '#4caf50' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: formData.productId ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              Add to Return
            </button>

          </div>
        </div>

        {/* Right Grid Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>Product Details</span>
            <div style={{ display: 'flex', gap: '30px', color: 'red', fontWeight: 'bold', fontSize: '0.9rem' }}>
              <span>Return Quantity: {totals.qty}</span>
              <span>Item Count: {totals.count}</span>
              <span>Return Value: {totals.value.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Code</th>
                  <th style={{ padding: '10px' }}>Barcode</th>
                  <th style={{ padding: '10px' }}>Product Name</th>
                  <th style={{ padding: '10px' }}>CPU</th>
                  <th style={{ padding: '10px' }}>Sale Price</th>
                  <th style={{ padding: '10px' }}>Rtn. Qty</th>
                  <th style={{ padding: '10px' }}>C. Stock</th>
                  <th style={{ padding: '10px' }}>Unit</th>
                  <th style={{ padding: '10px' }}>Amount</th>
                  <th style={{ padding: '10px' }}>Reason</th>
                  <th style={{ padding: '10px' }}>Act</th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No products added yet.</td>
                  </tr>
                ) : (
                  selectedItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px' }}>{item.barcode}</td>
                      <td style={{ padding: '10px' }}>{item.barcode}</td>
                      <td style={{ padding: '10px' }}>{item.productName}</td>
                      <td style={{ padding: '10px' }}>{item.costPrice.toFixed(2)}</td>
                      <td style={{ padding: '10px' }}>{item.salePrice.toFixed(2)}</td>
                      <td style={{ padding: '10px' }}>{item.returnQty}</td>
                      <td style={{ padding: '10px' }}>{item.currentStock}</td>
                      <td style={{ padding: '10px' }}>PCS</td>
                      <td style={{ padding: '10px' }}>{item.amount.toFixed(2)}</td>
                      <td style={{ padding: '10px' }}>{item.returnReason}</td>
                      <td style={{ padding: '10px' }}>
                        <button className="btn-danger" onClick={() => handleDeleteItem(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
            <button className="btn-info" onClick={generatePDF} disabled={selectedItems.length === 0} style={{ padding: '10px 20px', backgroundColor: '#e0e0e0', color: '#000', border: 'none', borderRadius: '4px', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
              Preview
            </button>
            <button  onClick={handleSave} disabled={selectedItems.length === 0 || isLoading} style={{ padding: '10px 20px', backgroundColor: selectedItems.length > 0 ? '#4caf50' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
              Save
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PurchaseReturn;
