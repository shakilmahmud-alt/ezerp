import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DamageAndLost = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [referenceItems, setReferenceItems] = useState([]);
  
  // Left form state
  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'), // e.g. 27-Jun-2026
    referenceNo: '',
    barcode: '',
    productId: '',
    productName: '',
    salePrice: '',
    cpu: '',
    currentStock: '',
    dmlQty: '',
    reason: '',
    autoScan: false
  });

  // Right grid state
  const [selectedItems, setSelectedItems] = useState([]);

  const loadReferenceItems = async (refNo) => {
    if (!refNo) {
      setReferenceItems([]);
      return;
    }
    
    setIsLoading(true);
    try {
      // Find the purchase receive with this reference no
      const { data: prData, error: prError } = await supabase
        .from('purchase_receives')
        .select('id')
        .eq('reference_no', refNo)
        .eq('status', 'Saved')
        .single();

      if (prError) {
        if (prError.code === 'PGRST116') {
          toast.error('Invalid Reference No or it is not saved yet.');
        } else {
          throw prError;
        }
        setReferenceItems([]);
        return;
      }

      // Load items for this purchase receive
      const { data, error } = await supabase
        .from('purchase_receive_items')
        .select('*, products(item_name, barcode, wh_stock)')
        .eq('purchase_receive_id', prData.id);

      if (error) throw error;
      setReferenceItems(data || []);
      if (data && data.length > 0) {
        toast.success(`Found ${data.length} items for this Reference No.`);
      } else {
        toast.error('No items found for this Reference No.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load items for this reference no');
      setReferenceItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefNoBlur = () => {
    loadReferenceItems(formData.referenceNo);
  };

  const handleRefNoKeyDown = (e) => {
    if (e.key === 'Enter') {
      loadReferenceItems(formData.referenceNo);
    }
  };

  const handleBarcodeChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, barcode: value }));
    
    // Auto lookup when barcode is typed
    if (value && referenceItems.length > 0) {
      const foundItem = referenceItems.find(item => item.products?.barcode === value);
      if (foundItem) {
        setFormData(prev => ({
          ...prev,
          barcode: value,
          productId: foundItem.product_id,
          productName: foundItem.products?.item_name || '',
          salePrice: foundItem.sale_price || '',
          cpu: foundItem.pur_price || '', // Cost price
          currentStock: foundItem.products?.wh_stock || 0
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          barcode: value,
          productId: '', productName: '', salePrice: '', cpu: '', currentStock: ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        barcode: value,
        productId: '', productName: '', salePrice: '', cpu: '', currentStock: ''
      }));
    }
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter' && formData.autoScan && formData.productId) {
      if (!formData.dmlQty) {
        setFormData(prev => ({ ...prev, dmlQty: 1 }));
        setTimeout(() => handleAdd(1), 50); // small delay to ensure state update if we pass value directly, but better to pass the qty explicitly
      } else {
        handleAdd();
      }
    }
  };

  const handleAdd = (overrideQty = null) => {
    const qty = overrideQty !== null ? overrideQty : Number(formData.dmlQty);
    
    if (!formData.productId) {
      toast.error('Please scan a valid barcode from this reference list');
      return;
    }
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid DML quantity');
      return;
    }
    if (!formData.reason && !formData.autoScan) {
      toast.error('Please enter a reason');
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
      cpu: Number(formData.cpu || 0),
      salePrice: Number(formData.salePrice || 0),
      dmlQty: qty,
      amount: Number(formData.cpu || 0) * qty,
      reason: formData.reason
    };

    setSelectedItems([...selectedItems, newItem]);

    // Clear barcode specific fields
    setFormData(prev => ({
      ...prev,
      barcode: '', productId: '', productName: '', salePrice: '', cpu: '', currentStock: '', dmlQty: '', reason: ''
    }));
  };

  const handleDeleteItem = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  const totals = {
    count: selectedItems.length,
    value: selectedItems.reduce((acc, curr) => acc + curr.amount, 0),
    qty: selectedItems.reduce((acc, curr) => acc + curr.dmlQty, 0)
  };

  const handleSave = async () => {
    if (!formData.referenceNo) {
      toast.error('Reference No is required');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('No items added');
      return;
    }

    setIsLoading(true);
    try {
      // Create Damage and Lost header
      const headerPayload = {
        reference_no: formData.referenceNo,
        dml_date: new Date().toISOString().split('T')[0],
        total_qty: totals.qty,
        total_value: totals.value
      };

      const { data: headerData, error: headerError } = await supabase
        .from('damage_and_lost')
        .insert(headerPayload)
        .select()
        .single();

      if (headerError) throw headerError;

      // Create items
      const itemsPayload = selectedItems.map(item => ({
        damage_and_lost_id: headerData.id,
        product_id: item.productId,
        barcode: item.barcode,
        cpu: item.cpu,
        sale_price: item.salePrice,
        dml_qty: item.dmlQty,
        amount: item.amount,
        reason: item.reason
      }));

      const { error: itemsError } = await supabase
        .from('damage_and_lost_items')
        .insert(itemsPayload);

      if (itemsError) throw itemsError;

      // Deduct stock for each item
      for (const item of selectedItems) {
        const { data: prodData } = await supabase
          .from('products')
          .select('wh_stock')
          .eq('id', item.productId)
          .single();
          
        const currentWhStock = prodData ? Number(prodData.wh_stock || 0) : 0;
        const newStock = currentWhStock - item.dmlQty;
        
        const { error: stockError } = await supabase
          .from('products')
          .update({ wh_stock: newStock })
          .eq('id', item.productId);
          
        if (stockError) console.error("Stock update error", stockError);
      }

      toast.success('Damage and Lost recorded successfully!');
      generatePDF();
      handleClearAll();

    } catch (err) {
      console.error(err);
      toast.error(`Error saving record: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = () => {
    setSelectedItems([]);
    setFormData({
      ...formData,
      referenceNo: '',
      barcode: '',
      productId: '',
      productName: '',
      salePrice: '',
      cpu: '',
      currentStock: '',
      dmlQty: '',
      reason: ''
    });
    setReferenceItems([]);
  };

  const generatePDF = () => {
    if (selectedItems.length === 0) return;
    
    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.text("Damage and Lost Report", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Date: ${formData.date}`, 14, 25);
    doc.text(`Reference No: ${formData.referenceNo}`, 14, 30);

    const tableCols = ["Code", "Barcode", "Product Name", "CPU", "Sale Price", "DML Qty", "Unit", "Amount", "Reason"];
    const tableRows = selectedItems.map(item => [
      '', // Code
      item.barcode,
      item.productName,
      item.cpu.toFixed(2),
      item.salePrice.toFixed(2),
      item.dmlQty,
      'PCS',
      item.amount.toFixed(2),
      item.reason || ''
    ]);

    tableRows.push([
      'Total', '', '', '', '', totals.qty, '', totals.value.toFixed(2), ''
    ]);

    autoTable(doc, {
      head: [tableCols],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [50, 50, 50] }, 
      didParseCell: function (data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`Damage_And_Lost_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
        Damage and Lost
      </h2>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Form Area */}
        <div style={{ width: '300px', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '20px', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div style={{ borderBottom: '1px dotted var(--border-color)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date</span>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '5px' }}>{formData.date}</div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reference No <span style={{color:'red'}}>*</span></label>
              <input 
                type="text" 
                value={formData.referenceNo} 
                onChange={(e) => setFormData({...formData, referenceNo: e.target.value})} 
                onBlur={handleRefNoBlur}
                onKeyDown={handleRefNoKeyDown}
                className="input-animated" 
                style={{ border: 'none', borderBottom: '1px dotted #ccc', borderRadius: 0, padding: '5px 0' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Barcode <span style={{color:'red'}}>*</span></label>
              <input 
                type="text" 
                placeholder="Barcode Scan" 
                value={formData.barcode} 
                onChange={handleBarcodeChange} 
                onKeyDown={handleBarcodeKeyDown}
                className="input-animated" 
                style={{ border: 'none', borderBottom: '1px solid #ccc', borderRadius: 0, padding: '5px 0' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Product <span style={{color:'red'}}>*</span></label>
              <input type="text" value={formData.productName} readOnly style={{ width: '100%', border: 'none', borderBottom: '1px dotted #ccc', padding: '5px 0', backgroundColor: 'transparent' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sale Price</label>
              <input type="number" value={formData.salePrice} readOnly style={{ width: '100%', border: 'none', borderBottom: '1px dotted #ccc', padding: '5px 0', backgroundColor: 'transparent' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>CPU</label>
              <input type="number" value={formData.cpu} readOnly style={{ width: '100%', border: 'none', borderBottom: '1px dotted #ccc', padding: '5px 0', backgroundColor: 'transparent' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Stock <span style={{color:'red'}}>*</span></label>
              <input type="number" value={formData.currentStock} readOnly style={{ width: '100%', border: 'none', borderBottom: '1px dotted #ccc', padding: '5px 0', backgroundColor: 'transparent' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>DML Quantity <span style={{color:'red'}}>*</span></label>
              <input type="number" value={formData.dmlQty} onChange={(e) => setFormData({...formData, dmlQty: e.target.value})} style={{ width: '100%', border: 'none', borderBottom: '1px solid #ccc', padding: '5px 0', backgroundColor: 'transparent', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
              <input 
                type="checkbox" 
                id="autoScan" 
                checked={formData.autoScan} 
                onChange={(e) => setFormData({...formData, autoScan: e.target.checked})} 
              />
              <label htmlFor="autoScan" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>Auto Scan</label>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reason <span style={{color:'red'}}>*</span></label>
              <input type="text" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} style={{ width: '100%', border: 'none', borderBottom: '1px solid #ccc', padding: '5px 0', backgroundColor: 'transparent', outline: 'none' }} />
            </div>

            <button className="btn-theme" 
              onClick={() => handleAdd()}
              disabled={!formData.productId}
              style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: formData.productId ? '#2196f3' : '#ccc',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: formData.productId ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              Add Product
            </button>

          </div>
        </div>

        {/* Right Grid Area */}
        <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Product Details</span>
            <div style={{ display: 'flex', gap: '20px', color: 'red', fontWeight: 'bold', fontSize: '0.9rem' }}>
              <span>Item Count: {totals.count} /</span>
              <span>Damage or Lost Value: {totals.value.toFixed(2)}</span>
              <span>Damage or Lost Quantity: {totals.qty}</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <th style={{ padding: '10px 5px' }}>Code</th>
                  <th style={{ padding: '10px 5px' }}>Barcode</th>
                  <th style={{ padding: '10px 5px' }}>Product Name</th>
                  <th style={{ padding: '10px 5px' }}>CPU</th>
                  <th style={{ padding: '10px 5px' }}>Sale Price</th>
                  <th style={{ padding: '10px 5px' }}>DML Qty</th>
                  <th style={{ padding: '10px 5px' }}>Unit</th>
                  <th style={{ padding: '10px 5px' }}>Expire Date</th>
                  <th style={{ padding: '10px 5px' }}>Amount</th>
                  <th style={{ padding: '10px 5px' }}>Reason</th>
                  <th style={{ padding: '10px 5px' }}></th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>No items added.</td>
                  </tr>
                ) : (
                  selectedItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 5px' }}>{item.barcode}</td>
                      <td style={{ padding: '10px 5px' }}>{item.barcode}</td>
                      <td style={{ padding: '10px 5px' }}>{item.productName}</td>
                      <td style={{ padding: '10px 5px' }}>{item.cpu.toFixed(2)}</td>
                      <td style={{ padding: '10px 5px' }}>{item.salePrice.toFixed(2)}</td>
                      <td style={{ padding: '10px 5px' }}>{item.dmlQty}</td>
                      <td style={{ padding: '10px 5px' }}>PCS</td>
                      <td style={{ padding: '10px 5px' }}></td>
                      <td style={{ padding: '10px 5px' }}>{item.amount.toFixed(2)}</td>
                      <td style={{ padding: '10px 5px' }}>{item.reason}</td>
                      <td style={{ padding: '10px 5px' }}>
                        <button className="btn-danger" onClick={() => handleDeleteItem(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>×</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '40px' }}>
            <button  
              onClick={generatePDF} 
              disabled={selectedItems.length === 0} 
              style={{ padding: '8px 20px', backgroundColor: selectedItems.length > 0 ? '#e0e0e0' : '#f5f5f5', color: selectedItems.length > 0 ? '#333' : '#aaa', border: '1px solid #ddd', borderRadius: '4px', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
            >
              Preview
            </button>
            <button  
              onClick={handleSave} 
              disabled={selectedItems.length === 0 || isLoading} 
              style={{ padding: '8px 20px', backgroundColor: selectedItems.length > 0 ? '#4caf50' : '#f5f5f5', color: selectedItems.length > 0 ? '#fff' : '#aaa', border: '1px solid #ddd', borderRadius: '4px', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
            >
              Save
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DamageAndLost;
