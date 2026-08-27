import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trash2, Search, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/CustomSelect';

const PosPurchaseReturn = () => {
  const { posTerminal, user } = useAuth();

  const [vendors, setVendors] = useState([]);
  const [vendorChallans, setVendorChallans] = useState([]);
  const [currentChallanItems, setCurrentChallanItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storeName, setStoreName] = useState('Store Branch');

  // Modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const returnQtyRef = useRef(null);
  const barcodeInputRef = useRef(null);

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
      const { data: itemsData, error } = await supabase
        .from('purchase_receive_items')
        .select('*')
        .eq('purchase_receive_id', purchaseReceiveId);

      if (error) throw error;

      if (itemsData && itemsData.length > 0) {
        const prodIds = itemsData.map(i => i.product_id).filter(Boolean);
        const { data: prods } = await supabase
          .from('products')
          .select('id, code, item_name, barcode, user_define_barcode, wh_stock, str_stock, purchase_price, mrp')
          .in('id', prodIds);

        const prodMap = {};
        if (prods) {
          prods.forEach(p => { prodMap[p.id] = p; });
        }

        const merged = itemsData.map(item => ({
          ...item,
          products: prodMap[item.product_id] || item.products || null
        }));

        setCurrentChallanItems(merged);
      } else {
        setCurrentChallanItems([]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load challan items');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto lookup product by barcode from current challan items
  const handleBarcodeChange = async (e) => {
    const rawVal = e.target.value;
    const value = rawVal.trim();
    setFormData(prev => ({ ...prev, barcode: rawVal }));
    
    if (value && currentChallanItems.length > 0) {
      const foundItem = currentChallanItems.find(item => {
        const p = item.products;
        if (!p) return false;
        return (
          String(p.barcode || '').trim() === value ||
          String(p.user_define_barcode || '').trim() === value ||
          String(p.code || '').trim().toLowerCase() === value.toLowerCase()
        );
      });

      if (foundItem) {
        const prod = foundItem.products;
        // Fetch branch store stock for this product
        let branchStock = 0;
        if (posTerminal?.store_id) {
          const { data: sStock } = await supabase
            .from('store_stocks')
            .select('stock_qty')
            .eq('store_id', posTerminal.store_id)
            .eq('product_id', foundItem.product_id)
            .single();
          branchStock = Number(sStock?.stock_qty) || 0;
        } else {
          branchStock = Number(foundItem.rcv_qty) || Number(prod?.wh_stock) || 0;
        }

        setFormData(prev => ({
          ...prev,
          productId: foundItem.product_id,
          productName: prod?.item_name || '',
          productCode: prod?.code || '',
          salePrice: foundItem.sale_price || prod?.mrp || '',
          costPrice: foundItem.pur_price || prod?.purchase_price || '',
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

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!formData.purchaseReceiveId) {
        toast.error('Please select a Challan No first');
        return;
      }
      setShowProductModal(true);
      setModalSearch('');
    }
  };

  const selectModalProduct = (item) => {
    const prod = item.products;
    let branchStock = 0;
    if (posTerminal?.store_id) {
      // Find branch store stock
      const sStock = prod?.store_stocks?.find(s => s.store_id === posTerminal.store_id);
      branchStock = Number(sStock?.stock_qty) || 0;
    } else {
      branchStock = Number(item.rcv_qty) || Number(prod?.wh_stock) || 0;
    }

    setFormData(prev => ({
      ...prev,
      productId: item.product_id,
      productName: prod?.item_name || '',
      productCode: prod?.code || '',
      barcode: prod?.barcode || prod?.user_define_barcode || '',
      salePrice: item.sale_price || prod?.mrp || '',
      costPrice: item.pur_price || prod?.purchase_price || '',
      currentStock: branchStock
    }));
    setShowProductModal(false);
    setTimeout(() => {
      returnQtyRef.current?.focus();
    }, 100);
  };

  const filteredModalItems = currentChallanItems.filter(item => {
    if (!modalSearch.trim()) return true;
    const query = modalSearch.toLowerCase().trim();
    const p = item.products;
    return (
      (p?.item_name || '').toLowerCase().includes(query) ||
      (p?.code || '').toLowerCase().includes(query) ||
      (p?.barcode || '').toLowerCase().includes(query) ||
      (p?.user_define_barcode || '').toLowerCase().includes(query)
    );
  });

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

  const generatePDF = (isDuplicate = false, isPreview = false) => {
    const duplicate = isDuplicate === true;
    const preview = isPreview === true;

    if (selectedItems.length === 0) {
      toast.error('Please select products to preview');
      return;
    }
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const vendorName = vendors.find(v => v.id === formData.vendorId)?.name || 'N/A';

    let displayChallanNo = formData.challanNo ? String(formData.challanNo) : `#PRT-${new Date().getTime()}`;
    if (!displayChallanNo.startsWith('#')) displayChallanNo = `#${displayChallanNo}`;

    // 1. Center: Company Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(46, 111, 64);
    doc.text('EZ ERP', pageWidth / 2, 13, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text('House: 352, Lane: 05, 2nd floor, Baridhara DOHS, Dhaka-1212, Bangladesh', pageWidth / 2, 18, { align: 'center' });

    // 2. Right: Header Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(46, 111, 64);
    doc.text('STORE PURCHASE RETURN CHALLAN', pageWidth - 14, 13, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(`Challan No: ${displayChallanNo}`, pageWidth - 14, 18.5, { align: 'right' });
    doc.text(`Return Date: ${formData.returnDate}`, pageWidth - 14, 23, { align: 'right' });
    doc.text(`Store: ${storeName}`, pageWidth - 14, 27.5, { align: 'right' });

    if (duplicate) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38);
      doc.text('[DUPLICATE]', pageWidth - 14, 32, { align: 'right' });
    } else if (preview) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(2, 132, 199);
      doc.text('[PREVIEW]', pageWidth - 14, 32, { align: 'right' });
    }

    // 3. Left: Vendor & Ref
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text('Vendor Name:', 14, 18.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${vendorName}`, 42, 18.5);

    doc.setFont("helvetica", "bold");
    doc.text('Reference No:', 14, 23);
    doc.setFont("helvetica", "normal");
    doc.text(`${formData.referenceNo || 'N/A'}`, 42, 23);

    // 4. Table
    const tableCols = ["SL", "Code", "Barcode", "Product Name", "Rtn. Qty", "Cost Price", "Sale Price", "Current Stock", "Amount", "Reason"];
    const tableRows = selectedItems.map((item, idx) => [
      idx + 1,
      item.productCode || '-',
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
      'Total', '', '', '', totals.qty, '', '', '', totals.value.toFixed(2), ''
    ]);

    const startY = (duplicate || preview) ? 36 : 32;

    autoTable(doc, {
      head: [tableCols],
      body: tableRows,
      startY: startY,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 30, 30] },
      headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255], halign: 'right' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 25 },
        2: { halign: 'left', cellWidth: 28 },
        3: { halign: 'left' },
        4: { halign: 'right', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 22 },
        6: { halign: 'right', cellWidth: 22 },
        7: { halign: 'right', cellWidth: 20 },
        8: { halign: 'right', cellWidth: 25 },
        9: { halign: 'left', cellWidth: 35 }
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          if (data.column.index <= 3 || data.column.index === 9) {
            data.cell.styles.halign = data.column.index === 0 ? 'center' : 'left';
          }
        }
      }
    });

    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
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
            <CustomSelect 
              value={formData.vendorId} 
              onChange={(e) => loadChallansForVendor(e.target.value)}
            >
              <option value="">-- Select Vendor --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </CustomSelect>
          </div>

          {/* Last Return Challan */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Last Return Challan</label>
            <input type="text" value={lastReturnChallan} readOnly style={{ width: '100%', padding: '5px 8px', border: '1px dashed #ccc', backgroundColor: '#f8fafc', color: '#64748b', borderRadius: '4px' }} />
          </div>

          {/* Challan No Dropdown (Filtered for THIS STORE!) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#d32f2f', marginBottom: '4px' }}>Challan No *</label>
            <CustomSelect 
              value={formData.purchaseReceiveId} 
              onChange={(e) => {
                const selectedChallan = vendorChallans.find(c => c.id === e.target.value);
                loadChallanItems(e.target.value, selectedChallan?.reference_no, selectedChallan?.last_challan_no);
              }}
            >
              <option value="">-- Select Challan --</option>
              {vendorChallans.map(c => (
                <option key={c.id} value={c.id}>
                  {c.last_challan_no || c.id}
                </option>
              ))}
            </CustomSelect>
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
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <input 
                ref={barcodeInputRef}
                type="text" 
                placeholder="Barcode Scan or Press Enter..." 
                value={formData.barcode} 
                onChange={handleBarcodeChange}
                onKeyDown={handleBarcodeKeyDown}
                style={{ flex: 1, padding: '6px 8px', border: '1px solid #00bcd4', borderRadius: '4px', fontWeight: 'bold' }} 
              />
              <button
                type="button"
                onClick={() => {
                  if (!formData.purchaseReceiveId) {
                    toast.error('Please select a Challan No first');
                    return;
                  }
                  setShowProductModal(true);
                  setModalSearch('');
                }}
                title="Browse challan products"
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#00bcd4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Search size={14} />
              </button>
            </div>
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
              ref={returnQtyRef}
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
              onClick={() => generatePDF(false, true)}
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

      {/* Product Selection Modal */}
      {showProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            width: '850px',
            maxWidth: '95%',
            maxHeight: '85vh',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '15px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', fontWeight: 600 }}>
                  Select Product from Challan ({formData.challanNo || 'Selected Challan'})
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Click on any product row to select it for return (Single Selection)
                </span>
              </div>
              <X 
                size={20} 
                style={{ cursor: 'pointer', color: '#64748b' }} 
                onClick={() => setShowProductModal(false)} 
              />
            </div>
            
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Search size={18} style={{ color: '#64748b' }} />
              <input 
                type="text" 
                placeholder="Search products by code, barcode, or name..." 
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px' }}>Select</th>
                    <th style={{ padding: '10px 8px' }}>Code</th>
                    <th style={{ padding: '10px 8px' }}>Barcode</th>
                    <th style={{ padding: '10px 8px' }}>Product Name</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Rcv. Qty</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>CPU</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModalItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        No matching products found in this challan.
                      </td>
                    </tr>
                  ) : (
                    filteredModalItems.map((item, idx) => {
                      const prod = item.products;
                      const isSelected = formData.productId === item.product_id;
                      return (
                        <tr 
                          key={idx}
                          onClick={() => selectModalProduct(item)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(0,188,212,0.1)' : 'transparent',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? 'rgba(0,188,212,0.1)' : 'transparent';
                          }}
                        >
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <input 
                              type="radio" 
                              name="selectedModalProductPos"
                              checked={isSelected}
                              readOnly
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{prod?.code || '-'}</td>
                          <td style={{ padding: '10px 8px' }}>{prod?.barcode || prod?.user_define_barcode || '-'}</td>
                          <td style={{ padding: '10px 8px' }}>{prod?.item_name || '-'}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{item.rcv_qty || 0}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(item.pur_price || prod?.purchase_price || 0).toFixed(2)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(item.sale_price || prod?.mrp || 0).toFixed(2)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', color: '#0369a1' }}>
                            {Number(prod?.wh_stock) || 0}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#ffffff' }}>
              <button 
                type="button"
                onClick={() => setShowProductModal(false)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: 'transparent',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PosPurchaseReturn;
