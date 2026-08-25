import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from '../components/CustomSelect';
import LoadingOverlay from '../components/LoadingOverlay';

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

  const generatePDF = (isDuplicate = false) => {
    if (selectedItems.length === 0) {
      toast.error('Please select products to preview');
      return;
    }
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const vendorName = vendors.find(v => String(v.id) === String(formData.vendorId))?.name || 'N/A';

    let displayChallanNo = formData.challanNo ? String(formData.challanNo) : `#PRT-${new Date().getTime()}`;
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
      docInstance.text('PURCHASE RETURN CHALLAN', pageWidth - 14, 13, { align: 'right' });

      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(30, 30, 30);
      docInstance.text(`Challan No: ${displayChallanNo}`, pageWidth - 14, 18.5, { align: 'right' });
      docInstance.text(`Return Date: ${formData.returnDate}`, pageWidth - 14, 23, { align: 'right' });

      if (isDuplicate) {
        docInstance.setFont("helvetica", "bold");
        docInstance.setFontSize(9);
        docInstance.setTextColor(220, 38, 38);
        docInstance.text('[DUPLICATE]', pageWidth - 14, 27.5, { align: 'right' });
      }

      // 3. Left Side: Vendor & Reference Info
      docInstance.setFont("helvetica", "bold");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(30, 30, 30);
      docInstance.text('Vendor Name:', 14, 18.5);
      docInstance.setFont("helvetica", "normal");
      docInstance.text(`${vendorName}`, 42, 18.5);

      docInstance.setFont("helvetica", "bold");
      docInstance.text('Reference No:', 14, 23);
      docInstance.setFont("helvetica", "normal");
      docInstance.text(`${formData.referenceNo || 'N/A'}`, 42, 23);

      // 4. Table Columns: SL, Barcode, Product Name, Return Qty, Cost Price, Sale Price, Current Stock, Amount, Reason
      const tableCols = ["SL", "Barcode", "Product Name", "Rtn. Qty", "Cost Price", "Sale Price", "Current Stock", "Amount", "Reason"];
      const tableRows = selectedItems.map((item, idx) => [
        idx + 1,
        item.barcode || '-',
        item.productName || '',
        Number(item.returnQty || 0),
        Number(item.costPrice || 0).toFixed(2),
        Number(item.salePrice || 0).toFixed(2),
        Number(item.currentStock || 0),
        Number(item.amount || 0).toFixed(2),
        item.returnReason || ''
      ]);

      tableRows.push([
        'Total', '', '', totals.qty, '', '', '', totals.value.toFixed(2), ''
      ]);

      const startY = isDuplicate ? 33 : 30;

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
          3: { halign: 'right', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 24 },
          5: { halign: 'right', cellWidth: 24 },
          6: { halign: 'right', cellWidth: 24 },
          7: { halign: 'right', cellWidth: 28 },
          8: { halign: 'left', cellWidth: 35 }
        },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
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

      // Posted By
      docInstance.line(20, sigY, 70, sigY);
      docInstance.setFont("helvetica", "bold");
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
    doc.save(`PurchaseReturn_${cleanFilename}.pdf`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <LoadingOverlay isLoading={isLoading} message="Saving Purchase Return... Please wait" />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
        Purchase Return
      </h2>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        
        {/* Left Form Area */}
        <div style={{ width: '320px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'var(--card-bg)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vendor Name <span style={{color:'red'}}>*</span></label>
              <CustomSelect 
                value={formData.vendorId} 
                onChange={(e) => loadChallansForVendor(e.target.value)} 
                className="input-animated"
              >
                <option value="">-- Select a Vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </CustomSelect>
            </div>

            <div style={{ borderBottom: '1px dotted var(--border-color)', paddingBottom: '5px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Last Return Challan</span>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', minHeight: '20px' }}></div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Challan No <span style={{color:'red'}}>*</span></label>
              <CustomSelect 
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
              </CustomSelect>
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
