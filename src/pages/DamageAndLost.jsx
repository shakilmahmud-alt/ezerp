import React, { useState, useEffect, useRef } from 'react';
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
  
  // Dropdown state for barcode selection
  const [showBarcodeDropdown, setShowBarcodeDropdown] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  
  const barcodeInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const dmlQtyInputRef = useRef(null);

  // Left form state
  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'), // e.g. 08-Sep-2026
    referenceNo: '',
    barcode: '',
    productId: '',
    productCode: '',
    productName: '',
    salePrice: '',
    cpu: '',
    currentStock: '',
    dmlQty: '1',
    reason: 'Damage/Lost',
    autoScan: true
  });

  // Right grid state
  const [selectedItems, setSelectedItems] = useState([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        barcodeInputRef.current &&
        !barcodeInputRef.current.contains(event.target)
      ) {
        setShowBarcodeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadReferenceItems = async (refNo) => {
    const cleanRef = String(refNo || '').trim();
    if (!cleanRef) {
      setReferenceItems([]);
      return;
    }
    
    setIsLoading(true);
    try {
      // Find the purchase receive with this reference no
      let { data: prList, error: prError } = await supabase
        .from('purchase_receives')
        .select('id, reference_no, last_challan_no, delivery_to, purchase_date, vendor_id')
        .eq('reference_no', cleanRef);

      if (prError || !prList || prList.length === 0) {
        // Fallback search
        const { data: prListFallback } = await supabase
          .from('purchase_receives')
          .select('id, reference_no, last_challan_no, delivery_to, purchase_date, vendor_id')
          .ilike('reference_no', `%${cleanRef}%`);
        
        prList = prListFallback;
      }

      if (!prList || prList.length === 0) {
        toast.error('Invalid Reference No or challan not found.');
        setReferenceItems([]);
        return;
      }

      const prData = prList[0];

      // Load items for this purchase receive
      const { data: itemsData, error: itemsError } = await supabase
        .from('purchase_receive_items')
        .select('*')
        .eq('purchase_receive_id', prData.id);

      if (itemsError) throw itemsError;

      if (itemsData && itemsData.length > 0) {
        const prodIds = itemsData.map(i => i.product_id).filter(Boolean);
        const { data: prods } = await supabase
          .from('products')
          .select('id, code, item_name, barcode, user_define_barcode, wh_stock, str_stock, purchase_price, mrp, category_id, unit')
          .in('id', prodIds);

        const prodMap = {};
        if (prods) {
          prods.forEach(p => { prodMap[p.id] = p; });
        }

        const merged = itemsData.map(item => ({
          ...item,
          products: prodMap[item.product_id] || item.products || null
        }));

        setReferenceItems(merged);
        toast.success(`Found ${merged.length} items for Reference ${cleanRef}`);
      } else {
        toast.error('No items found for this Reference No.');
        setReferenceItems([]);
      }
    } catch (error) {
      console.error('Error loading reference items:', error);
      toast.error('Failed to load items for this reference no');
      setReferenceItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefNoBlur = () => {
    if (formData.referenceNo) {
      loadReferenceItems(formData.referenceNo);
    }
  };

  const handleRefNoKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadReferenceItems(formData.referenceNo);
    }
  };

  const addItemDirectly = ({ productId, barcode, productCode, productName, cpu, salePrice, currentStock, dmlQty, reason }) => {
    const qty = Number(dmlQty || 1);
    const itemCpu = Number(cpu || 0);

    setSelectedItems(prev => {
      const existingIndex = prev.findIndex(i => i.productId === productId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const newQty = Number(updated[existingIndex].dmlQty || 0) + qty;
        updated[existingIndex] = {
          ...updated[existingIndex],
          dmlQty: newQty,
          amount: Number(updated[existingIndex].cpu || 0) * newQty
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            productId,
            barcode: barcode || productCode || '',
            productCode: productCode || barcode || '',
            productName,
            cpu: itemCpu,
            salePrice: Number(salePrice || 0),
            currentStock: Number(currentStock || 0),
            dmlQty: qty,
            unit: 'PCS',
            amount: itemCpu * qty,
            reason: reason || formData.reason || 'Damage/Lost'
          }
        ];
      }
    });
  };

  const handleSelectFromDropdown = (item) => {
    const p = item.products || {};
    const bc = p.barcode || p.user_define_barcode || p.code || '';
    const cpu = Number(item.pur_price || p.purchase_price || 0);
    const salePrice = Number(item.sale_price || p.mrp || 0);
    const stock = Number(p.wh_stock ?? 0);

    setShowBarcodeDropdown(false);
    setDropdownSearch('');

    if (formData.autoScan) {
      addItemDirectly({
        productId: item.product_id,
        barcode: bc,
        productCode: p.code || '',
        productName: p.item_name || '',
        cpu: cpu,
        salePrice: salePrice,
        currentStock: stock,
        dmlQty: 1,
        reason: formData.reason || 'Damage/Lost'
      });
      setFormData(prev => ({
        ...prev,
        barcode: '',
        productId: '',
        productCode: '',
        productName: '',
        salePrice: '',
        cpu: '',
        currentStock: '',
        dmlQty: '1'
      }));
      toast.success(`Added ${p.item_name || 'Product'} (1 pcs)`);
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    } else {
      setFormData(prev => ({
        ...prev,
        barcode: bc,
        productId: item.product_id,
        productCode: p.code || '',
        productName: p.item_name || '',
        salePrice: salePrice,
        cpu: cpu,
        currentStock: stock,
        dmlQty: prev.dmlQty || '1'
      }));
      setTimeout(() => {
        dmlQtyInputRef.current?.focus();
      }, 100);
    }
  };

  const handleBarcodeChange = (e) => {
    const rawVal = e.target.value;
    setFormData(prev => ({ ...prev, barcode: rawVal }));

    // Real-time lookup if matches exact barcode
    const val = rawVal.trim().toLowerCase();
    if (val && referenceItems.length > 0) {
      const foundItem = referenceItems.find(item => {
        const p = item.products;
        if (!p) return false;
        return (
          String(p.barcode || '').trim().toLowerCase() === val ||
          String(p.user_define_barcode || '').trim().toLowerCase() === val ||
          String(p.code || '').trim().toLowerCase() === val
        );
      });

      if (foundItem) {
        const p = foundItem.products || {};
        setFormData(prev => ({
          ...prev,
          productId: foundItem.product_id,
          productCode: p.code || '',
          productName: p.item_name || '',
          salePrice: Number(foundItem.sale_price || p.mrp || 0),
          cpu: Number(foundItem.pur_price || p.purchase_price || 0),
          currentStock: Number(p.wh_stock ?? 0)
        }));
      }
    }
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawVal = formData.barcode.trim();
      
      if (!rawVal) {
        if (referenceItems.length > 0) {
          setShowBarcodeDropdown(prev => !prev);
        } else if (formData.referenceNo) {
          loadReferenceItems(formData.referenceNo);
        } else {
          toast.error('Please enter a Reference No first');
        }
        return;
      }

      if (referenceItems.length === 0) {
        toast.error('Please enter a valid Reference No first');
        return;
      }

      const val = rawVal.toLowerCase();
      const found = referenceItems.find(item => {
        const p = item.products;
        if (!p) return false;
        return (
          String(p.barcode || '').trim().toLowerCase() === val ||
          String(p.user_define_barcode || '').trim().toLowerCase() === val ||
          String(p.code || '').trim().toLowerCase() === val ||
          String(item.product_id || '').trim().toLowerCase() === val
        );
      });

      if (found) {
        handleSelectFromDropdown(found);
      } else {
        toast.error(`Barcode "${rawVal}" not found in this Reference Challan`);
      }
    }
  };

  const handleAdd = (overrideQty = null) => {
    const qty = overrideQty !== null ? overrideQty : Number(formData.dmlQty || 1);
    
    if (!formData.productId) {
      toast.error('Please select or scan a valid barcode from this reference list');
      return;
    }
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid DML quantity');
      return;
    }

    addItemDirectly({
      productId: formData.productId,
      barcode: formData.barcode,
      productCode: formData.productCode,
      productName: formData.productName,
      cpu: formData.cpu,
      salePrice: formData.salePrice,
      currentStock: formData.currentStock,
      dmlQty: qty,
      reason: formData.reason || 'Damage/Lost'
    });

    toast.success(`Added ${formData.productName} (${qty} pcs)`);

    // Clear barcode specific fields
    setFormData(prev => ({
      ...prev,
      barcode: '',
      productId: '',
      productCode: '',
      productName: '',
      salePrice: '',
      cpu: '',
      currentStock: '',
      dmlQty: '1'
    }));

    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  const handleDeleteItem = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  const handleUpdateItemQty = (index, newQty) => {
    const val = Number(newQty);
    if (isNaN(val) || val < 1) return;
    const updated = [...selectedItems];
    updated[index].dmlQty = val;
    updated[index].amount = Number(updated[index].cpu || 0) * val;
    setSelectedItems(updated);
  };

  const handleUpdateItemReason = (index, newReason) => {
    const updated = [...selectedItems];
    updated[index].reason = newReason;
    setSelectedItems(updated);
  };

  const totals = {
    count: selectedItems.length,
    value: selectedItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
    qty: selectedItems.reduce((acc, curr) => acc + (Number(curr.dmlQty) || 0), 0)
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
        barcode: item.barcode || item.productCode,
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

      // Deduct warehouse stock for each item
      for (const item of selectedItems) {
        const { data: prodData } = await supabase
          .from('products')
          .select('wh_stock')
          .eq('id', item.productId)
          .single();
          
        const currentWhStock = prodData ? Number(prodData.wh_stock || 0) : item.currentStock;
        const newStock = Math.max(0, currentWhStock - Number(item.dmlQty || 0));
        
        const { error: stockError } = await supabase
          .from('products')
          .update({ wh_stock: newStock })
          .eq('id', item.productId);
          
        if (stockError) console.error("Stock update error:", stockError);
      }

      toast.success('Damage and Lost recorded successfully!');
      generatePDF(false, false);
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
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
      referenceNo: '',
      barcode: '',
      productId: '',
      productCode: '',
      productName: '',
      salePrice: '',
      cpu: '',
      currentStock: '',
      dmlQty: '1',
      reason: 'Damage/Lost',
      autoScan: true
    });
    setReferenceItems([]);
    setShowBarcodeDropdown(false);
  };

  // Filtered list for the barcode dropdown popup
  const filteredDropdownItems = referenceItems.filter(item => {
    if (!dropdownSearch.trim()) return true;
    const q = dropdownSearch.toLowerCase().trim();
    const p = item.products || {};
    return (
      (p.item_name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.user_define_barcode || '').toLowerCase().includes(q)
    );
  });

  // PDF Generation matching Image 2 (MIS standard #2e6f40 Green Banner format)
  const generatePDF = (isDuplicate = false, isPreview = false) => {
    const duplicate = isDuplicate === true;
    const preview = isPreview === true;

    if (selectedItems.length === 0) {
      toast.error('Please add products first to preview');
      return;
    }
    
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let displayChallanNo = formData.referenceNo ? String(formData.referenceNo) : `#DML-${new Date().getTime()}`;
    if (!displayChallanNo.startsWith('#') && !displayChallanNo.startsWith('REF-')) {
      displayChallanNo = `#${displayChallanNo}`;
    }

    // 1. Top Green Banner (#2e6f40)
    doc.setFillColor(46, 111, 64);
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("EZ ERP MANAGEMENT INFORMATION SYSTEM (MIS)", 14, 11);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.text("CENTRAL INVENTORY & POS SALES ANALYTICS", 14, 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const subTitle = preview 
      ? "DAMAGE AND LOST REPORT (PREVIEW)" 
      : duplicate 
      ? "DAMAGE AND LOST REPORT (DUPLICATE)" 
      : "DAMAGE AND LOST REPORT (DETAILS)";
    doc.text(subTitle, pageWidth - 14, 14, { align: 'right' });

    const printDateStr = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    
    const loggedInUser = user || JSON.parse(localStorage.getItem('erp_user') || '{}');
    const rawUser = loggedInUser?.user_metadata?.full_name || 
      loggedInUser?.user_metadata?.name || 
      loggedInUser?.full_name || 
      loggedInUser?.name || 
      loggedInUser?.username || 
      'Super Admin';
    const preparedByName = (rawUser === 'msmraqeeb@gmail.com' || rawUser === 'admin@email.com') ? 'Super Admin' : rawUser;

    // 2. Filter Criteria Subheader
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    doc.text(`Date: ${formData.date}   |   Store Scope: Central Store   |   Reference No: ${formData.referenceNo || 'N/A'}`, 14, 30);
    doc.text(`Generated On: ${printDateStr}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

    // 3. Table Columns & Body
    const headers = [['SL', 'Reference No', 'Barcode', 'Item Name', 'CPU (Tk)', 'Sale Price (Tk)', 'DML Qty', 'Unit', 'Amount (Tk)', 'Reason']];
    const body = selectedItems.map((item, idx) => [
      idx + 1,
      formData.referenceNo || '-',
      item.barcode || item.productCode || '-',
      item.productName || '',
      Number(item.cpu || 0).toFixed(2),
      Number(item.salePrice || 0).toFixed(2),
      Number(item.dmlQty || 0),
      item.unit || 'PCS',
      Number(item.amount || 0).toFixed(2),
      item.reason || ''
    ]);

    body.push([
      'Total',
      '',
      '',
      `${selectedItems.length} Items`,
      '',
      '',
      totals.qty,
      'PCS',
      totals.value.toFixed(2),
      ''
    ]);

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle', textColor: [30, 30, 30] },
      headStyles: { fillColor: [46, 111, 64], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      didParseCell: function (data) {
        if (data.section === 'head') {
          if (data.column.index === 0 || data.column.index === 7) data.cell.styles.halign = 'center';
          else if (data.column.index === 1 || data.column.index === 2 || data.column.index === 3 || data.column.index === 9) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        } else if (data.section === 'body') {
          if (data.column.index === 0 || data.column.index === 7) data.cell.styles.halign = 'center';
          else if (data.column.index === 1 || data.column.index === 2 || data.column.index === 3 || data.column.index === 9) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        }
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 240];
          data.cell.styles.textColor = [10, 60, 20];
        }
      },
      margin: { top: 10, left: 14, right: 14 }
    });

    // 4. Signatures at bottom (Matching Image 2)
    const finalY = doc.lastAutoTable?.finalY || 120;
    const sigY = Math.max(finalY + 24, pageHeight - 24);

    doc.setDrawColor(160, 174, 192);
    doc.setLineWidth(0.4);

    // Prepared By (Left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(preparedByName, 47.5, sigY - 2.5, { align: 'center' });
    doc.line(20, sigY, 75, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared By', 47.5, sigY + 5, { align: 'center' });

    // Checked By (Middle)
    doc.line(pageWidth / 2 - 27.5, sigY, pageWidth / 2 + 27.5, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

    // Authorized Signature (Right)
    doc.line(pageWidth - 75, sigY, pageWidth - 20, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature', pageWidth - 47.5, sigY + 5, { align: 'center' });

    if (preview) {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      toast.success('Preview opened in new tab');
    } else {
      const cleanFilename = String(formData.referenceNo || 'Damage_And_Lost').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Damage_And_Lost_${cleanFilename}.pdf`);
      toast.success('PDF downloaded successfully');
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color, #f8fafc)', minHeight: '100vh', fontSize: '0.82rem' }}>
      <LoadingOverlay isLoading={isLoading} message="Processing Damage & Lost... Please wait" />
      
      <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '20px', color: 'var(--text-primary, #1e293b)', borderBottom: '2px solid var(--border-color, #e2e8f0)', paddingBottom: '10px' }}>
        Damage and Lost
      </h2>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Form Area */}
        <div style={{ width: '320px', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '6px', padding: '20px', backgroundColor: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{ borderBottom: '1px dotted var(--border-color, #cbd5e1)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Date</span>
              <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600, marginTop: '3px' }}>{formData.date}</div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Reference No <span style={{ color: 'red' }}>*</span></label>
              <input 
                type="text" 
                placeholder="e.g. REF-1787810072366"
                value={formData.referenceNo} 
                onChange={(e) => setFormData(prev => ({ ...prev, referenceNo: e.target.value }))} 
                onBlur={handleRefNoBlur}
                onKeyDown={handleRefNoKeyDown}
                className="input-animated" 
                style={{ width: '100%', border: 'none', borderBottom: '1px dotted #94a3b8', borderRadius: 0, padding: '6px 0', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            {/* Barcode Field with Dropdown on Click */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Barcode <span style={{ color: 'red' }}>*</span></label>
                {referenceItems.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                    {referenceItems.length} items loaded
                  </span>
                )}
              </div>
              
              <div style={{ position: 'relative', marginTop: '2px' }}>
                <input 
                  ref={barcodeInputRef}
                  type="text" 
                  placeholder={referenceItems.length > 0 ? "Click to pick product or scan" : "Barcode Scan"} 
                  value={formData.barcode} 
                  onChange={handleBarcodeChange} 
                  onFocus={() => {
                    if (referenceItems.length > 0) setShowBarcodeDropdown(true);
                  }}
                  onClick={() => {
                    if (referenceItems.length > 0) setShowBarcodeDropdown(true);
                  }}
                  onKeyDown={handleBarcodeKeyDown}
                  className="input-animated" 
                  style={{ width: '100%', border: 'none', borderBottom: '1px solid #0284c7', borderRadius: 0, padding: '6px 24px 6px 0', fontSize: '0.85rem', outline: 'none' }}
                />
                
                {referenceItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBarcodeDropdown(prev => !prev)}
                    title="Toggle product dropdown"
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#0284c7',
                      fontSize: '0.75rem',
                      padding: '4px'
                    }}
                  >
                    ▼
                  </button>
                )}
              </div>

              {/* Product list dropdown popup */}
              {showBarcodeDropdown && referenceItems.length > 0 && (
                <div 
                  ref={dropdownRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '360px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid #93c5fd',
                    borderRadius: '6px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 9999,
                    marginTop: '4px'
                  }}
                >
                  <div style={{ padding: '8px 10px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534' }}>
                      Reference Challan Products ({referenceItems.length})
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setShowBarcodeDropdown(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#64748b', fontWeight: 'bold' }}
                    >×</button>
                  </div>

                  <div style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input 
                      type="text" 
                      placeholder="Search name, code, barcode..."
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      style={{ width: '100%', padding: '4px 8px', fontSize: '0.78rem', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                      autoFocus
                    />
                  </div>

                  <div>
                    {filteredDropdownItems.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                        No matching products found
                      </div>
                    ) : (
                      filteredDropdownItems.map((item, idx) => {
                        const p = item.products || {};
                        const isSelected = selectedItems.some(si => si.productId === item.product_id);
                        return (
                          <div 
                            key={item.id || idx}
                            onClick={() => handleSelectFromDropdown(item)}
                            style={{
                              padding: '8px 10px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              backgroundColor: isSelected ? '#fefce8' : '#ffffff',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ecfdf5'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? '#fefce8' : '#ffffff'; }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#1e293b' }}>
                                {p.item_name || `Item #${idx + 1}`}
                              </div>
                              {isSelected && (
                                <span style={{ fontSize: '0.65rem', background: '#fef08a', color: '#854d0e', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>Added</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              <span>Barcode: <b>{p.barcode || p.user_define_barcode || p.code || 'N/A'}</b></span>
                              <span>CPU: <b>{Number(item.pur_price || p.purchase_price || 0).toFixed(2)}</b> | Sale: <b>{Number(item.sale_price || p.mrp || 0).toFixed(2)}</b></span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '1px' }}>
                              Current Stock: {Number(p.wh_stock ?? 0)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Product <span style={{ color: 'red' }}>*</span></label>
              <input 
                type="text" 
                value={formData.productName} 
                readOnly 
                placeholder="Auto populated"
                style={{ width: '100%', border: 'none', borderBottom: '1px dotted #94a3b8', padding: '6px 0', backgroundColor: 'transparent', fontSize: '0.85rem', color: '#1e293b' }} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Sale Price</label>
                <input 
                  type="number" 
                  value={formData.salePrice} 
                  readOnly 
                  style={{ width: '100%', border: 'none', borderBottom: '1px dotted #94a3b8', padding: '6px 0', backgroundColor: 'transparent', fontSize: '0.85rem', color: '#1e293b' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>CPU</label>
                <input 
                  type="number" 
                  value={formData.cpu} 
                  readOnly 
                  style={{ width: '100%', border: 'none', borderBottom: '1px dotted #94a3b8', padding: '6px 0', backgroundColor: 'transparent', fontSize: '0.85rem', color: '#1e293b' }} 
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Current Stock <span style={{ color: 'red' }}>*</span></label>
              <input 
                type="number" 
                value={formData.currentStock} 
                readOnly 
                style={{ width: '100%', border: 'none', borderBottom: '1px dotted #94a3b8', padding: '6px 0', backgroundColor: 'transparent', fontSize: '0.85rem', color: '#1e293b' }} 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>DML Quantity <span style={{ color: 'red' }}>*</span></label>
              <input 
                ref={dmlQtyInputRef}
                type="number" 
                min="1"
                value={formData.dmlQty} 
                onChange={(e) => setFormData(prev => ({ ...prev, dmlQty: e.target.value }))} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                style={{ width: '100%', border: 'none', borderBottom: '1px solid #94a3b8', padding: '6px 0', backgroundColor: 'transparent', outline: 'none', fontSize: '0.85rem' }} 
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input 
                type="checkbox" 
                id="autoScan" 
                checked={formData.autoScan} 
                onChange={(e) => setFormData(prev => ({ ...prev, autoScan: e.target.checked }))} 
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="autoScan" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                Auto Scan
              </label>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Reason <span style={{ color: 'red' }}>*</span></label>
              <input 
                type="text" 
                value={formData.reason} 
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} 
                style={{ width: '100%', border: 'none', borderBottom: '1px solid #94a3b8', padding: '6px 0', backgroundColor: 'transparent', outline: 'none', fontSize: '0.85rem' }} 
              />
            </div>

            <button 
              className="btn-theme" 
              onClick={() => handleAdd()}
              disabled={!formData.productId}
              style={{
                marginTop: '10px',
                padding: '10px',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}
            >
              Add Product
            </button>

          </div>
        </div>

        {/* Right Grid Area */}
        <div style={{ flex: 1, minWidth: '600px', backgroundColor: '#fff', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '6px', padding: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '12px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155' }}>Product Details</span>
            <div style={{ display: 'flex', gap: '20px', color: '#dc2626', fontWeight: 'bold', fontSize: '0.88rem' }}>
              <span>Item Count: {totals.count} /</span>
              <span>Damage or Lost Value: {totals.value.toFixed(2)}</span>
              <span>Damage or Lost Quantity: {totals.qty}</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', background: '#f8fafc' }}>
                  <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center' }}>SL</th>
                  <th style={{ padding: '10px 8px' }}>Code</th>
                  <th style={{ padding: '10px 8px' }}>Barcode</th>
                  <th style={{ padding: '10px 8px' }}>Product Name</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>CPU</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Sale Price</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', width: '80px' }}>DML Qty</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Unit</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '10px 8px' }}>Reason</th>
                  <th style={{ padding: '10px 8px', width: '40px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>
                      No items added yet. Enter Reference No above and pick/scan products.
                    </td>
                  </tr>
                ) : (
                  selectedItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 8px', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 500 }}>{item.productCode || item.barcode}</td>
                      <td style={{ padding: '10px 8px' }}>{item.barcode}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1e293b' }}>{item.productName}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(item.cpu || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(item.salePrice || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <input 
                          type="number" 
                          min="1" 
                          value={item.dmlQty}
                          onChange={(e) => handleUpdateItemQty(idx, e.target.value)}
                          style={{ width: '60px', padding: '3px 6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', color: '#64748b' }}>{item.unit || 'PCS'}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#0f766e' }}>{Number(item.amount || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <input 
                          type="text" 
                          value={item.reason || ''}
                          onChange={(e) => handleUpdateItemReason(idx, e.target.value)}
                          style={{ width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.78rem' }}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <button 
                          className="btn-danger" 
                          onClick={() => handleDeleteItem(idx)} 
                          title="Remove item"
                          style={{ padding: '2px 8px', fontSize: '0.85rem', lineHeight: '1' }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '35px' }}>
            <button  
              className="btn-info"
              onClick={() => generatePDF(false, true)} 
              disabled={selectedItems.length === 0} 
              style={{ padding: '9px 24px', fontWeight: 'bold' }}
            >
              Preview
            </button>
            <button  
              className="btn-theme"
              onClick={handleSave} 
              disabled={selectedItems.length === 0 || isLoading} 
              style={{ padding: '9px 28px', fontWeight: 'bold' }}
            >
              Save
            </button>
            <button  
              className="btn-secondary"
              onClick={handleClearAll} 
              style={{ padding: '9px 20px', fontWeight: 'bold' }}
            >
              Clear
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DamageAndLost;
