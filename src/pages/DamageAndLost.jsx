import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAuth } from '../context/AuthContext';

const DamageAndLost = () => {
  const { user } = useAuth();
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

  const generatePDF = (isDuplicate = false, isPreview = false) => {
    const duplicate = isDuplicate === true;
    const preview = isPreview === true;

    if (selectedItems.length === 0) {
      toast.error('Please select products to preview');
      return;
    }
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let displayChallanNo = formData.referenceNo ? String(formData.referenceNo) : `#DML-${new Date().getTime()}`;
    if (!displayChallanNo.startsWith('#')) displayChallanNo = `#${displayChallanNo}`;

    const renderPageContent = (docInstance) => {
      // 1. Top Middle / Center: Company Name & Address
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(16);
      docInstance.setTextColor(46, 111, 64); // Project theme green #2e6f40
      docInstance.text('EZ ERP', pageWidth / 2, 13, { align: 'center' });

      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(70, 70, 70);
      docInstance.text('House: 352, Lane: 05, 2nd floor, Baridhara DOHS, Dhaka-1212, Bangladesh', pageWidth / 2, 18, { align: 'center' });

      // 2. Right Side: CHALLAN Header & Details
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(11);
      docInstance.setTextColor(46, 111, 64);
      docInstance.text('DAMAGE AND LOST CHALLAN', pageWidth - 14, 13, { align: 'right' });

      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(30, 30, 30);
      docInstance.text(`Challan No: ${displayChallanNo}`, pageWidth - 14, 18.5, { align: 'right' });
      docInstance.text(`Date: ${formData.date}`, pageWidth - 14, 23, { align: 'right' });

      if (duplicate) {
        docInstance.setFont("helvetica", "bold");
        docInstance.setFontSize(9);
        docInstance.setTextColor(220, 38, 38);
        docInstance.text('[DUPLICATE]', pageWidth - 14, 27.5, { align: 'right' });
      } else if (preview) {
        docInstance.setFont("helvetica", "bold");
        docInstance.setFontSize(9);
        docInstance.setTextColor(2, 132, 199);
        docInstance.text('[PREVIEW]', pageWidth - 14, 27.5, { align: 'right' });
      }

      // 3. Left Side: Reference Info
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(30, 30, 30);
      docInstance.text('Reference No:', 14, 18.5);
      docInstance.setFont("helvetica", "normal");
      docInstance.text(`${formData.referenceNo || 'N/A'}`, 42, 18.5);

      // 4. Table Columns: SL, Barcode, Product Name, CPU, Sale Price, DML Qty, Unit, Amount, Reason
      const tableCols = ["SL", "Barcode", "Product Name", "CPU", "Sale Price", "DML Qty", "Unit", "Amount", "Reason"];
      const tableRows = selectedItems.map((item, idx) => [
        idx + 1,
        item.barcode || '-',
        item.productName || '',
        Number(item.cpu || 0).toFixed(2),
        Number(item.salePrice || 0).toFixed(2),
        Number(item.dmlQty || 0),
        'PCS',
        Number(item.amount || 0).toFixed(2),
        item.reason || ''
      ]);

      tableRows.push([
        'Total', '', '', '', '', totals.qty, '', totals.value.toFixed(2), ''
      ]);

      const startY = (duplicate || preview) ? 33 : 30;

      autoTable(docInstance, {
        head: [tableCols],
        body: tableRows,
        startY: startY,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 30, 30] },
        headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255], halign: 'right' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left', cellWidth: 26 },
          2: { halign: 'left', cellWidth: 'auto' },
          3: { halign: 'right', cellWidth: 22 },
          4: { halign: 'right', cellWidth: 22 },
          5: { halign: 'right', cellWidth: 18 },
          6: { halign: 'center', cellWidth: 16 },
          7: { halign: 'right', cellWidth: 26 },
          8: { halign: 'left', cellWidth: 35 }
        },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0 || data.column.index === 6) data.cell.styles.halign = 'center';
            if (data.column.index === 1 || data.column.index === 2 || data.column.index === 8) data.cell.styles.halign = 'left';
          }
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 245, 240];
            data.cell.styles.textColor = [10, 60, 20];
          }
        },
        margin: { top: 10, left: 14, right: 14 }
      });

      const finalY = docInstance.lastAutoTable.finalY || startY + 50;

      // 5. Signatures at bottom
      const sigY = Math.max(finalY + 26, pageHeight - 20);

      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8.5);
      docInstance.setLineWidth(0.4);
      docInstance.setDrawColor(120, 120, 120);
      docInstance.setTextColor(40, 40, 40);

      const currentUserName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Admin';
      const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Admin' : currentUserName;

      // Posted By
      docInstance.line(20, sigY, 70, sigY);
      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(2, 132, 199);
      docInstance.text(displayName, 45, sigY - 2, { align: 'center' });

      docInstance.setFont("helvetica", "bold");
      docInstance.setTextColor(40, 40, 40);
      docInstance.text('Posted By', 45, sigY + 5, { align: 'center' });

      // Checked By
      docInstance.setFont("helvetica", "bold");
      docInstance.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
      docInstance.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

      // Authorized Signature
      docInstance.setFont("helvetica", "bold");
      docInstance.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
      docInstance.text('Authorized Signature', pageWidth - 45, sigY + 5, { align: 'center' });
    };

    renderPageContent(doc);
    const cleanFilename = String(displayChallanNo).replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Damage_And_Lost_${cleanFilename}.pdf`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <LoadingOverlay isLoading={isLoading} message="Saving Damage & Lost... Please wait" />
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
              onClick={() => generatePDF(false, true)} 
              disabled={selectedItems.length === 0} 
              style={{ padding: '8px 20px', backgroundColor: selectedItems.length > 0 ? '#e0e0e0' : '#f5f5f5', color: selectedItems.length > 0 ? '#333' : '#aaa', border: '1px solid #ddd', borderRadius: '4px', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
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
