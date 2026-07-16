import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../components/CustomSelect';

const StoreDelivery = () => {
  const [view, setView] = useState('list');
  const [requisitions, setRequisitions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [listFromDate, setListFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [listToDate, setListToDate] = useState(new Date().toISOString().split('T')[0]);

  // Form State
  const [isChallanWise, setIsChallanWise] = useState(false);
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedRcvChallan, setSelectedRcvChallan] = useState('');
  const [rcvChallans, setRcvChallans] = useState([]);
  
  const [selectedStore, setSelectedStore] = useState('');
  const [stores, setStores] = useState([]);
  
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [barcodeSearch, setBarcodeSearch] = useState('');
  
  const [formProduct, setFormProduct] = useState(null); // the product currently being searched
  const [deliveryQty, setDeliveryQty] = useState('');
  
  const [items, setItems] = useState([]);
  const [isAutoScan, setIsAutoScan] = useState(false);

  useEffect(() => {
    if (!isAutoScan || !barcodeSearch) return;
    
    const timeoutId = setTimeout(() => {
      handleBarcodeSearch();
    }, 400); // 400ms debounce for auto scan
    
    return () => clearTimeout(timeoutId);
  }, [barcodeSearch, isAutoScan]);

  useEffect(() => {
    if (view === 'list') {
      fetchRequisitions();
    } else {
      fetchStores();
    }
  }, [view, listFromDate, listToDate]);

  useEffect(() => {
    if (view === 'add' && isChallanWise) {
      fetchPurchaseReceives();
    }
  }, [view, isChallanWise, fromDate, toDate]);

  const fetchRequisitions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('requisitions')
        .select(`
          id,
          requisition_no,
          challan_no,
          requisition_date,
          status,
          stores ( name )
        `)
        .gte('requisition_date', listFromDate)
        .lte('requisition_date', listToDate)
        .not('requisition_no', 'like', 'SDR%')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== '42P01') throw error;
        else console.log('requisitions table does not exist yet.');
      }
      setRequisitions(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load store deliveries');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase.from('stores').select('id, name').eq('status', 'ACTIVE').order('name');
      if (data) setStores(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPurchaseReceives = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_receives')
        .select('id, reference_no, purchase_date, last_challan_no')
        .gte('purchase_date', fromDate)
        .lte('purchase_date', toDate)
        .eq('status', 'Saved');
      
      if (data) {
        const unique = [];
        const seen = new Set();
        for (const item of data) {
           if (!seen.has(item.last_challan_no)) {
             seen.add(item.last_challan_no);
             unique.push(item);
           }
        }
        setRcvChallans(unique);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarcodeSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!barcodeSearch) return;

    if (!isChallanWise) {
      toast.error('Please check "Rcv. Challan Wise Delivery" first');
      return;
    }

    if (!selectedRcvChallan) {
      toast.error('Please select a Rcv. Challan first');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Search product by barcode
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('id, item_name, barcode, purchase_price, mrp, wh_stock')
        .eq('barcode', barcodeSearch)
        .single();

      if (prodErr || !prodData) {
        toast.error('Product not found in database');
        setIsLoading(false);
        return;
      }

      // 2. Check if product exists in the selected purchase receive challan
      const { data: rcvItems, error: rcvErr } = await supabase
        .from('purchase_receive_items')
        .select('id, rcv_qty')
        .eq('purchase_receive_id', selectedRcvChallan)
        .eq('product_id', prodData.id)
        .single();

      if (rcvErr || !rcvItems) {
        toast.error('This product does not exist in the selected Purchase Challan.');
        setIsLoading(false);
        return;
      }

      setFormProduct({
        ...prodData,
        c_stock: prodData.wh_stock || 0
      });
      
      setBarcodeSearch('');
      toast.success('Product found!');
      
    } catch (err) {
      console.error(err);
      toast.error('Error finding product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDeliveryQty = () => {
    if (!formProduct) return toast.error('No product selected');
    if (!deliveryQty || isNaN(deliveryQty) || Number(deliveryQty) <= 0) return toast.error('Enter a valid delivery quantity');
    
    if (Number(deliveryQty) > formProduct.c_stock) {
      return toast.error('Delivery quantity cannot exceed Current Stock');
    }

    const newItem = {
      id: `temp-${Date.now()}`,
      product_id: formProduct.id,
      code: formProduct.barcode,
      barcode: formProduct.barcode,
      productName: formProduct.item_name,
      delQty: Number(deliveryQty),
      cStock: formProduct.c_stock,
      cpu: formProduct.purchase_price || 0,
      salePrice: formProduct.mrp || 0,
      costValue: (formProduct.purchase_price || 0) * Number(deliveryQty),
      saleValue: (formProduct.mrp || 0) * Number(deliveryQty)
    };

    setItems([...items, newItem]);
    
    // reset form
    setFormProduct(null);
    setDeliveryQty('');
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('requisitions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Delivery ${newStatus} successfully`);
      fetchRequisitions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (status = 'Pending') => {
    if (!selectedStore) return toast.error('Please select Delivery To (Store)');
    if (items.length === 0) return toast.error('No items to deliver');

    setIsLoading(true);
    try {
      // Get the shop_id for the selected store
      const { data: storeData } = await supabase.from('stores').select('id, name').eq('name', selectedStore).single();
      const shopId = storeData ? storeData.id : null;

      // Generate a new Challan No
      const todayStr = new Date().toISOString().slice(0,10).replace(/-/g,''); 
      const random3 = Math.floor(100 + Math.random() * 900);
      const challanNo = `DLV${todayStr}${random3}`;
      
      const reqNo = `REQ${todayStr}${random3}`; // fallback for requisition_no

      const { data: deliveryData, error: deliveryErr } = await supabase
        .from('requisitions')
        .insert({
          requisition_no: reqNo,
          challan_no: challanNo,
          shop_id: shopId,
          requisition_date: deliveryDate,
          status: status
        })
        .select()
        .single();

      if (deliveryErr) throw deliveryErr;

      // Insert items
      const itemPayload = items.map(item => ({
        requisition_id: deliveryData.id,
        product_id: item.product_id,
        barcode: item.barcode,
        product_code: item.code,
        product_name: item.productName,
        cpu: item.cpu,
        mrp: item.salePrice,
        req_qty: item.delQty,
        approve_qty: item.delQty,
        cost_value: item.costValue,
        bal_qty: item.cStock // mapping cStock to bal_qty just to save it
      }));

      const { error: itemsErr } = await supabase.from('requisition_items').insert(itemPayload);
      if (itemsErr) throw itemsErr;

      toast.success(`Delivery saved successfully! Challan No: ${challanNo}`);
      generatePDF(challanNo);
      handleReset();
      setView('list');

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to save delivery. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormProduct(null);
    setDeliveryQty('');
    setItems([]);
    setBarcodeSearch('');
    setSelectedRcvChallan('');
    setSelectedStore('');
    setIsChallanWise(false);
  };

  const generatePDF = (savedChallanNo) => {
    if (items.length === 0) return toast.error('No items to preview');
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text('EG ERP', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text('House:352,Lane:05,2nd floor,Baridhara DOHS,', pageWidth / 2, 20, { align: 'center' });
    doc.text('Dhaka , Dhaka-1212 Bangladesh', pageWidth / 2, 24, { align: 'center' });
    
    // Right Side Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text('STORE DELIVERY CHALLAN', pageWidth - 14, 15, { align: 'right' });
    doc.text(`CHALLAN NO # ${savedChallanNo || 'PREVIEW'}`, pageWidth - 14, 20, { align: 'right' });
    doc.text(`DELIVERY DATE: ${deliveryDate}`, pageWidth - 14, 25, { align: 'right' });
    doc.text(`DELIVERY TO: ${selectedStore || 'N/A'}`, pageWidth - 14, 30, { align: 'right' });
    if (!savedChallanNo) doc.text('(PREVIEW)', pageWidth - 14, 35, { align: 'right' });
    
    // Left Side Info
    doc.text(`STORE NAME: ${selectedStore || 'N/A'}`, 14, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const selectedChallanObj = rcvChallans.find(c => c.id === selectedRcvChallan);
    const refText = selectedChallanObj ? (selectedChallanObj.last_challan_no || selectedChallanObj.reference_no) : 'N/A';
    doc.text(`Reference/Remarks: ${refText}`, 14, 50);
    
    const printDate = new Date().toLocaleString();
    doc.text(`PRINT DATE: ${printDate}`, pageWidth - 14, 50, { align: 'right' });
    
    const tableData = items.map((i, index) => [
      index + 1,
      i.barcode,
      i.productName,
      `${Number(i.delQty).toFixed(2)} PCS`,
      `${Number(i.cStock).toFixed(2)} PCS`,
      Number(i.cpu).toFixed(2),
      Number(i.salePrice).toFixed(2),
      Number(i.costValue).toFixed(2),
      Number(i.saleValue).toFixed(2)
    ]);
    
    autoTable(doc, {
      startY: 55,
      head: [['S/L', 'BARCODE', 'DISPLAY_NAME', 'DEL QTY', 'C. STOCK', 'CPU', 'SALE PRICE', 'COST VALUE', 'SALE VALUE']],
      body: tableData,
      theme: 'plain',
      headStyles: {
        fontStyle: 'bold',
        lineWidth: { top: 0.5, bottom: 0.5 },
        lineColor: [0, 0, 0],
        fontSize: 8,
        halign: 'right'
      },
      bodyStyles: {
        fontSize: 8,
        halign: 'right'
      },
      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'left' },
        2: { halign: 'left' }
      },
      didParseCell: function (data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
          if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'left';
        }
      },
      margin: { top: 10, left: 14, right: 14 }
    });
    
    const finalY = doc.lastAutoTable.finalY || 55;
    
    // Totals
    const totalDelQty = items.reduce((sum, i) => sum + Number(i.delQty), 0);
    const totalSaleValue = items.reduce((sum, i) => sum + Number(i.saleValue), 0);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    // Draw line above totals
    doc.line(pageWidth / 2, finalY + 2, pageWidth - 14, finalY + 2);
    doc.text('SUB TOTAL:', pageWidth / 2, finalY + 7, { align: 'right' });
    doc.text(`${totalDelQty.toFixed(2)}`, pageWidth / 2 + 20, finalY + 7, { align: 'right' });
    doc.text(`${totalSaleValue.toFixed(2)}`, pageWidth - 14, finalY + 7, { align: 'right' });
    
    doc.text('DISCOUNT:', pageWidth / 2, finalY + 12, { align: 'right' });
    doc.text('0.00', pageWidth - 14, finalY + 12, { align: 'right' });
    
    doc.text('ADDITIONAL COST:', pageWidth / 2, finalY + 17, { align: 'right' });
    doc.text('0.00', pageWidth - 14, finalY + 17, { align: 'right' });
    
    doc.line(pageWidth / 2, finalY + 20, pageWidth - 14, finalY + 20);
    doc.text('NET AMOUNT:', pageWidth / 2, finalY + 25, { align: 'right' });
    doc.text(`${totalSaleValue.toFixed(2)}`, pageWidth - 14, finalY + 25, { align: 'right' });
    
    // Signatures
    const pageHeight = doc.internal.pageSize.getHeight();
    const sigY = pageHeight - 30;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setLineWidth(0.5);
    
    // Posted By
    doc.line(20, sigY, 70, sigY);
    doc.text('Admin', 45, sigY - 2, { align: 'center' });
    doc.setFont("helvetica", "bold");
    doc.text('Posted By', 45, sigY + 5, { align: 'center' });
    
    // Checked By
    doc.setFont("helvetica", "normal");
    doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
    doc.setFont("helvetica", "bold");
    doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });
    
    // Authorized Signatory
    doc.setFont("helvetica", "normal");
    doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
    doc.setFont("helvetica", "bold");
    doc.text('Authorized Signatory', pageWidth - 45, sigY + 5, { align: 'center' });
    
    doc.save(`Store_Delivery_${deliveryDate}.pdf`);
  };

  const generateExcel = () => {
    if (items.length === 0) return toast.error('No items to preview');
    
    const wsData = [
      ['Code', 'Barcode', 'Product Name', 'Del. Qty', 'C. Stock', 'CPU', 'Sale Price', 'Cost Value', 'Sale Value'],
      ...items.map(i => [i.code, i.barcode, i.productName, i.delQty, i.cStock, i.cpu, i.salePrice, i.costValue, i.saleValue])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Store Delivery");
    XLSX.writeFile(wb, `Store_Delivery_${deliveryDate}.xlsx`);
  };

  // ---------------- Render List View ----------------
  if (view === 'list') {
    return (
      <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Store Delivery
          </h2>
          <button 
            className="btn-theme" 
            onClick={() => setView('add')}
            style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + New Delivery
          </button>
        </div>

        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>From Date</label>
              <input 
                type="date" 
                value={listFromDate} 
                onChange={(e) => setListFromDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>TO Date</label>
              <input 
                type="date" 
                value={listToDate} 
                onChange={(e) => setListToDate(e.target.value)}
                style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
          <input 
            type="text" 
            placeholder="Search" 
            style={{ width: '100%', padding: '10px', border: 'none', borderBottom: '1px solid var(--border-color)', outline: 'none', marginBottom: '20px' }}
          />

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 10px' }}>SL</th>
                  <th style={{ padding: '12px 10px' }}>Shop Name</th>
                  <th style={{ padding: '12px 10px' }}>Challan No</th>
                  <th style={{ padding: '12px 10px' }}>Requisition No</th>
                  <th style={{ padding: '12px 10px' }}>Delivery Date</th>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No deliveries found.</td>
                  </tr>
                ) : (
                  requisitions.map((req, idx) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '10px' }}>{idx + 1}</td>
                      <td style={{ padding: '10px' }}>{req.stores?.name}</td>
                      <td style={{ padding: '10px' }}>{req.challan_no || '-'}</td>
                      <td style={{ padding: '10px' }}>{req.requisition_no}</td>
                      <td style={{ padding: '10px' }}>{req.requisition_date?.split('T')[0]}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem',
                          backgroundColor: req.status === 'Delivered' ? '#dcfce7' : req.status === 'Hold' ? '#fef3c7' : '#f1f5f9',
                          color: req.status === 'Delivered' ? '#166534' : req.status === 'Hold' ? '#92400e' : '#475569'
                        }}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusUpdate(req.id, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            fontSize: '0.8rem',
                            outline: 'none',
                            backgroundColor: req.status === 'Received' ? '#f3f4f6' : '#fff'
                          }}
                          disabled={req.status === 'Received'}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Hold">Hold</option>
                          <option value="Delivered">Delivered</option>
                          {req.status === 'Received' && <option value="Received">Received</option>}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Render Add View ----------------
  
  const totalQty = items.reduce((sum, i) => sum + i.delQty, 0);
  const totalValue = items.reduce((sum, i) => sum + i.saleValue, 0);

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        Store Delivery
      </h2>
      
      <div style={{ display: 'flex', gap: '20px' }}>
        
        {/* Left Sidebar Form */}
        <div style={{ width: '300px', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', marginBottom: '15px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={isChallanWise} 
              onChange={(e) => setIsChallanWise(e.target.checked)} 
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
            />
            Rcv. Challan Wise Delivery
          </label>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TO Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none' }} />
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rcv. Challan</label>
            <CustomSelect 
              value={selectedRcvChallan}
              onChange={e => setSelectedRcvChallan(e.target.value)}
              style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none', color: 'var(--accent-primary)', fontWeight: 'bold' }}
            >
              <option value="">-- Select a Challan --</option>
              {rcvChallans.map(c => (
                <option key={c.id} value={c.id}>{c.last_challan_no || c.reference_no}</option>
              ))}
            </CustomSelect>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delivery To <span style={{color: 'red'}}>*</span></label>
            <CustomSelect 
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none' }}
            >
              <option value="">-- Select a Store --</option>
              {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </CustomSelect>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delivery Date</label>
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none' }} />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <form onSubmit={handleBarcodeSearch}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Barcode</label>
              <input 
                type="text" 
                placeholder="Barcode Scan" 
                value={barcodeSearch}
                onChange={e => setBarcodeSearch(e.target.value)}
                style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none', backgroundColor: '#f9fafb' }} 
              />
            </form>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Product</label>
            <div style={{ padding: '5px 0', borderBottom: '1px dotted var(--border-color)', minHeight: '25px', fontSize: '0.85rem' }}>
              {formProduct ? formProduct.item_name : ''}
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CPU</label>
            <div style={{ padding: '5px 0', borderBottom: '1px dotted var(--border-color)', minHeight: '25px', fontSize: '0.85rem' }}>
              {formProduct ? formProduct.purchase_price : ''}
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sale Price</label>
            <div style={{ padding: '5px 0', borderBottom: '1px dotted var(--border-color)', minHeight: '25px', fontSize: '0.85rem' }}>
              {formProduct ? formProduct.mrp : ''}
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Stock</label>
            <div style={{ padding: '5px 0', borderBottom: '1px dotted var(--border-color)', minHeight: '25px', fontSize: '0.85rem' }}>
              {formProduct ? formProduct.c_stock : ''}
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Delivery Quantity</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="number" 
                value={deliveryQty}
                onChange={e => setDeliveryQty(e.target.value)}
                style={{ width: '100%', border: 'none', borderBottom: '1px dotted var(--border-color)', padding: '5px 0', outline: 'none' }} 
              />
              <button 
                onClick={handleAddDeliveryQty}
                className="btn-theme"
                style={{ padding: '4px 10px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Add
              </button>
            </div>
          </div>
          
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isAutoScan}
                onChange={(e) => setIsAutoScan(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }} 
              />
              Auto Scan
            </label>
          </div>

        </div>
        
        {/* Right Side Table area */}
        <div style={{ flex: 1, backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Top Summary Header */}
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '15px', borderBottom: '1px solid var(--border-color)', color: 'red', fontWeight: 'bold' }}>
            <div>Item Count: {items.length}</div>
            <div>Total Qty: {totalQty}</div>
            <div>Total Value: {totalValue.toFixed(2)}</div>
          </div>
          
          {/* Table */}
          <div style={{ flex: 1, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '10px' }}>Code</th>
                  <th style={{ padding: '10px' }}>Barcode</th>
                  <th style={{ padding: '10px' }}>Product Name</th>
                  <th style={{ padding: '10px' }}>Del. Qty</th>
                  <th style={{ padding: '10px' }}>C. Stock</th>
                  <th style={{ padding: '10px' }}>CPU</th>
                  <th style={{ padding: '10px' }}>Sale Price</th>
                  <th style={{ padding: '10px' }}>Cost Value</th>
                  <th style={{ padding: '10px' }}>Sale Value</th>
                  <th style={{ padding: '10px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 10px' }}>{item.code}</td>
                    <td style={{ padding: '8px 10px' }}>{item.barcode}</td>
                    <td style={{ padding: '8px 10px' }}>{item.productName}</td>
                    <td style={{ padding: '8px 10px' }}>{item.delQty}</td>
                    <td style={{ padding: '8px 10px' }}>{item.cStock}</td>
                    <td style={{ padding: '8px 10px' }}>{item.cpu}</td>
                    <td style={{ padding: '8px 10px' }}>{item.salePrice}</td>
                    <td style={{ padding: '8px 10px' }}>{item.costValue.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px' }}>{item.saleValue.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <button onClick={() => setItems(items.filter(i => i.id !== item.id))} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Action Buttons Footer */}
          <div style={{ padding: '20px', display: 'flex', gap: '10px', justifyContent: 'center', borderTop: '1px solid var(--border-color)' }}>
            <button onClick={generatePDF} style={{ padding: '8px 20px', backgroundColor: '#e5e7eb', color: '#4b5563', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Preview</button>
            <button onClick={generateExcel} style={{ padding: '8px 20px', backgroundColor: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Preview excel</button>
            <button onClick={() => handleSave('Pending')} disabled={isLoading} className="btn-theme" style={{ padding: '8px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button onClick={handleReset} style={{ padding: '8px 20px', backgroundColor: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Reset</button>
            <button onClick={() => setView('list')} className="btn-theme" style={{ padding: '8px 20px', backgroundColor: '#06b6d4', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
          </div>
          
        </div>

      </div>
    </div>
  );

};

export default StoreDelivery;
