import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/CustomSelect';

const PosStockReceive = () => {
  const { posTerminal } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [receiveChallan, setReceiveChallan] = useState('');
  const [deliveries, setDeliveries] = useState([]);
  const [selectedChallan, setSelectedChallan] = useState('');
  
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoScan, setIsAutoScan] = useState(true);
  
  // product info state
  const [barcodeScan, setBarcodeScan] = useState('');
  const [productInfo, setProductInfo] = useState({
    barcode: '',
    name: '',
    category: '',
    subCategory: '',
    subSubCategory: '',
    salePrice: '',
    challanQty: '',
    receivingQty: '',
  });

  useEffect(() => {
    // Generate Receive Challan number e.g., SDR20260715xxxx
    const prefix = "SDR";
    const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    setReceiveChallan(`${prefix}${datePart}${randPart}`);
  }, []);

  useEffect(() => {
    if (posTerminal && posTerminal.store_name) {
      fetchDeliveries(posTerminal.store_name);
    }
  }, [posTerminal]);

  const fetchDeliveries = async (shopName) => {
    try {
      // Find the shop ID
      const { data: storeData } = await supabase.from('stores').select('id').eq('name', shopName).single();
      if (!storeData) return;

      const { data, error } = await supabase
        .from('requisitions')
        .select('id, challan_no, requisition_no')
        .eq('shop_id', storeData.id)
        .eq('status', 'Delivered'); // pending receive at store
        
      if (data) {
        const unique = [];
        const seen = new Set();
        for (const item of data) {
           if (!seen.has(item.challan_no)) {
             seen.add(item.challan_no);
             unique.push(item);
           }
        }
        setDeliveries(unique);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChallanSelect = async (challanId) => {
    setSelectedChallan(challanId);
    if (!challanId) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('requisition_items')
        .select('*, products(item_name, barcode, mrp, category_id, subcategory_id)')
        .eq('requisition_id', challanId);

      if (error) throw error;
      
      const mapped = data.map(item => ({
        id: item.id,
        productId: item.product_id,
        code: item.product_code || item.products?.barcode,
        barcode: item.barcode || item.products?.barcode,
        name: item.product_name || item.products?.item_name,
        challanQty: item.approve_qty,
        rcvQty: item.approve_qty,
        remainQty: 0,
        uom: item.uom || 'Pcs',
        mrp: item.mrp || item.products?.mrp,
        brand: item.style || '',
        category: item.category || item.products?.category_id || '',
        subCategory: item.products?.subcategory_id || ''
      }));
      setItems(mapped);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAutoScan && barcodeScan && barcodeScan.length >= 3) {
      const timer = setTimeout(() => {
        handleBarcodeScan();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [barcodeScan, isAutoScan]);

  const handleBarcodeScan = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!barcodeScan) return;
    
    // Find item in the list
    const found = items.find(i => i.barcode === barcodeScan || i.code === barcodeScan);
    if (found) {
      setProductInfo({
        barcode: found.barcode,
        name: found.name,
        category: found.category || '',
        subCategory: found.subCategory || '',
        subSubCategory: '',
        salePrice: found.mrp,
        challanQty: found.challanQty,
        receivingQty: found.rcvQty
      });
      setBarcodeScan('');
    } else {
      toast.error('Product not found in this challan');
    }
  };

  const handleProductInfoChange = (field, value) => {
    setProductInfo(prev => ({ ...prev, [field]: value }));

    if (productInfo.barcode) {
      setItems(prevItems => 
        prevItems.map(item => {
          if (item.barcode === productInfo.barcode || item.code === productInfo.barcode) {
            if (field === 'salePrice') return { ...item, mrp: value };
            if (field === 'receivingQty') {
              const rcvQty = Number(value);
              const challanQty = Number(item.challanQty);
              return { ...item, rcvQty: value, remainQty: challanQty - rcvQty };
            }
          }
          return item;
        })
      );
    }
  };

  const generatePDF = () => {
    if (items.length === 0) return;
    
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
    doc.text('STORE RECEIVE CHALLAN', pageWidth - 14, 15, { align: 'right' });
    const selectedChallanObj = deliveries.find(c => c.id === selectedChallan);
    const refText = selectedChallanObj ? (selectedChallanObj.challan_no || selectedChallanObj.requisition_no) : 'N/A';
    
    doc.text(`CHALLAN NO # ${receiveChallan}`, pageWidth - 14, 20, { align: 'right' });
    doc.text(`REF CHALLAN # ${refText}`, pageWidth - 14, 25, { align: 'right' });
    doc.text(`RECEIVE DATE: ${date}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`RECEIVE FROM: Central Store`, pageWidth - 14, 35, { align: 'right' });
    
    // Left Side Info
    doc.text(`STORE NAME: ${posTerminal?.store_name || 'N/A'}`, 14, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    const printDate = new Date().toLocaleString();
    doc.text(`PRINT DATE: ${printDate}`, pageWidth - 14, 50, { align: 'right' });
    
    const tableData = items.map((i, index) => {
      const rcvQty = Number(i.rcvQty) || 0;
      const mrp = Number(i.mrp) || 0;
      const saleValue = rcvQty * mrp;
      return [
        index + 1,
        i.barcode,
        i.name,
        `${rcvQty.toFixed(2)}`,
        i.uom,
        mrp.toFixed(2),
        saleValue.toFixed(2)
      ];
    });
    
    autoTable(doc, {
      startY: 55,
      head: [['S/L', 'BARCODE', 'DISPLAY_NAME', 'RCV QTY', 'UOM', 'MRP', 'SALE VALUE']],
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
        2: { halign: 'left' },
        4: { halign: 'center' }
      },
      didParseCell: function (data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
          if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'left';
          if (data.column.index === 4) data.cell.styles.halign = 'center';
        }
      },
      margin: { top: 10, left: 14, right: 14 }
    });
    
    const finalY = doc.lastAutoTable.finalY || 55;
    
    // Totals
    const totalRcvQty = items.reduce((sum, i) => sum + (Number(i.rcvQty) || 0), 0);
    const totalSaleValue = items.reduce((sum, i) => sum + ((Number(i.rcvQty) || 0) * (Number(i.mrp) || 0)), 0);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    // Draw line above totals
    doc.line(pageWidth / 2, finalY + 2, pageWidth - 14, finalY + 2);
    doc.text('SUB TOTAL:', pageWidth / 2, finalY + 7, { align: 'right' });
    doc.text(`${totalRcvQty.toFixed(2)}`, pageWidth / 2 + 20, finalY + 7, { align: 'right' });
    doc.text(`${totalSaleValue.toFixed(2)}`, pageWidth - 14, finalY + 7, { align: 'right' });
    
    doc.line(pageWidth / 2, finalY + 12, pageWidth - 14, finalY + 12);
    doc.text('NET AMOUNT:', pageWidth / 2, finalY + 17, { align: 'right' });
    doc.text(`${totalSaleValue.toFixed(2)}`, pageWidth - 14, finalY + 17, { align: 'right' });
    
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
    
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleSave = async () => {
    if (!selectedChallan) return toast.error('Please select a challan');
    if (items.length === 0) return toast.error('No items to receive');

    setIsLoading(true);
    try {
      // For each item, update central stock (wh_stock) and store stock (str_stock)
      for (const item of items) {
        const qty = Number(item.rcvQty || 0);
        if (qty > 0) {
          const { data: prodData } = await supabase
            .from('products')
            .select('wh_stock')
            .eq('id', item.productId)
            .single();

          if (prodData) {
            const newWhStock = Number(prodData.wh_stock || 0) - qty;
            
            await supabase
              .from('products')
              .update({ 
                wh_stock: newWhStock,
                mrp: item.mrp
              })
              .eq('id', item.productId);
              
            // Update store_stocks
            const { data: existingStock } = await supabase
              .from('store_stocks')
              .select('id, stock_qty')
              .eq('store_id', posTerminal.store_id)
              .eq('product_id', item.productId)
              .single();

            const newStoreQty = existingStock 
              ? Number(existingStock.stock_qty || 0) + qty 
              : qty;

            if (existingStock) {
              await supabase
                .from('store_stocks')
                .update({ stock_qty: newStoreQty })
                .eq('id', existingStock.id);
            } else {
              await supabase
                .from('store_stocks')
                .insert({
                  store_id: posTerminal.store_id,
                  product_id: item.productId,
                  stock_qty: newStoreQty
                });
            }

            // Also sync str_stock on products table (used by POS stock view)
            const { data: freshProd } = await supabase
              .from('products')
              .select('str_stock')
              .eq('id', item.productId)
              .single();
            const newStrStock = Number(freshProd?.str_stock || 0) + qty;
            await supabase
              .from('products')
              .update({ str_stock: newStrStock })
              .eq('id', item.productId);
          }
        }
      }

      // Update challan status to Received
      await supabase
        .from('requisitions')
        .update({ status: 'Received' })
        .eq('id', selectedChallan);

      // Create new SDR challan in requisitions
      const selectedChallanObj = deliveries.find(c => c.id === selectedChallan);
      const refChallanNo = selectedChallanObj ? (selectedChallanObj.challan_no || selectedChallanObj.requisition_no) : '';
      
      const { data: newReq, error: reqErr } = await supabase
        .from('requisitions')
        .insert({
          requisition_no: receiveChallan,
          challan_no: refChallanNo,
          requisition_date: date,
          status: 'Receive Challan',
          shop_id: posTerminal.store_id
        })
        .select('id')
        .single();
        
      if (!reqErr && newReq) {
        const receivedItemsForDb = items.filter(i => Number(i.rcvQty) > 0).map(item => ({
          requisition_id: newReq.id,
          product_id: item.productId,
          product_code: item.code,
          product_name: item.name,
          barcode: item.barcode,
          mrp: item.mrp,
          req_qty: Number(item.rcvQty),
          approve_qty: Number(item.rcvQty)
        }));
        await supabase.from('requisition_items').insert(receivedItemsForDb);
      }

      toast.success('Stock Received successfully!');
      
      // Auto generate and download PDF
      generatePDF();
      
      // reset
      setSelectedChallan('');
      setItems([]);
      setProductInfo({
        barcode: '', name: '', category: '', subCategory: '', subSubCategory: '', salePrice: '', challanQty: '', receivingQty: ''
      });
      
      // Generate new receive challan number for next
      const prefix = "SDR";
      const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const randPart = Math.floor(1000 + Math.random() * 9000);
      setReceiveChallan(`${prefix}${datePart}${randPart}`);
      
      // refresh deliveries
      if (posTerminal && posTerminal.store_name) {
        fetchDeliveries(posTerminal.store_name);
      }

    } catch (err) {
      console.error(err);
      toast.error('Failed to save stock receive');
    } finally {
      setIsLoading(false);
    }
  };

  const totalQty = items.reduce((sum, i) => sum + Number(i.rcvQty || 0), 0);
  const totalValue = items.reduce((sum, i) => sum + (Number(i.rcvQty || 0) * Number(i.mrp || 0)), 0);

  return (
    <div className="pos-content-area" style={{ padding: '15px', backgroundColor: '#f0f2f5', minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Store Receive</h2>
      </div>

      <div style={{ display: 'flex', gap: '15px', flex: 1 }}>
        
        {/* Left Panel */}
        <div style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ backgroundColor: '#fff', padding: '15px', border: '1px solid #ccc' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ width: '80px', fontSize: '0.8rem', fontWeight: 'bold' }}>Date</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ flex: 1, padding: '4px', border: '1px solid #ccc' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ width: '80px', fontSize: '0.8rem', fontWeight: 'bold' }}>Challan #</label>
              <select 
                value={selectedChallan} 
                onChange={(e) => handleChallanSelect(e.target.value)}
                style={{ flex: 1, padding: '4px', border: '1px solid #ccc' }}
              >
                <option value="">---Select---</option>
                {deliveries.map(d => (
                  <option key={d.id} value={d.id}>{d.challan_no || d.requisition_no}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '80px', fontSize: '0.8rem', fontWeight: 'bold' }}>Receive From</label>
              <input type="text" value="Central Store" readOnly style={{ flex: 1, padding: '4px', border: '1px solid #ccc', backgroundColor: '#e9ecef' }} />
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '15px', border: '1px solid #ccc' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Product Information</div>
            
            <form onSubmit={handleBarcodeScan} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Barcode</label>
              <input type="text" value={barcodeScan} onChange={e=>setBarcodeScan(e.target.value)} style={{ flex: 1, padding: '2px 4px', border: '1px solid #ccc' }} />
            </form>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Name</label>
              <input type="text" value={productInfo.name} readOnly style={{ flex: 1, padding: '2px 4px', border: '1px solid #ccc', backgroundColor: '#e9ecef' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Category</label>
              <input type="text" value={productInfo.category} readOnly style={{ flex: 1, padding: '2px 4px', border: '1px solid #ccc', backgroundColor: '#e9ecef' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Sub Category</label>
              <input type="text" value={productInfo.subCategory} readOnly style={{ flex: 1, padding: '2px 4px', border: '1px solid #ccc', backgroundColor: '#e9ecef' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Sub Category</label> {/* Kept duplicate as per original UI */}
              <input type="text" value={productInfo.subSubCategory} readOnly style={{ flex: 1, padding: '2px 4px', border: '1px solid #ccc', backgroundColor: '#e9ecef' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Sale Price</label>
              <input 
                type="number" 
                value={productInfo.salePrice} 
                onChange={(e) => handleProductInfoChange('salePrice', e.target.value)}
                style={{ flex: 1, padding: '2px 4px', border: '1px solid #ccc' }} 
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Challan Qty</label>
              <input type="text" value={productInfo.challanQty} readOnly style={{ flex: 1, padding: '2px 4px', border: '1px solid #ccc', backgroundColor: '#e9ecef' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Receiving Qty</label>
              <input 
                type="number" 
                value={productInfo.receivingQty} 
                onChange={(e) => handleProductInfoChange('receivingQty', e.target.value)}
                style={{ width: '60px', padding: '2px 4px', border: '1px solid #ccc' }} 
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={isAutoScan}
                  onChange={(e) => setIsAutoScan(e.target.checked)}
                  style={{ width: '14px', height: '14px' }} 
                />
                Auto Scan
              </label>
            </div>
          </div>
        </div>
        
        {/* Right Panel Table */}
        <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #ccc', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'left' }}>Code</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'left' }}>Barcode</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'right' }}>Rcv. Qty</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'right' }}>Remain Qty</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'center' }}>UOM</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'right' }}>MRP</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'left' }}>Brand</th>
                  <th style={{ padding: '8px', borderRight: '1px solid #ccc', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Sub Category</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 8px', borderRight: '1px dotted #ccc' }}>{item.code}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px dotted #ccc' }}>{item.barcode}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px dotted #ccc' }}>{item.name}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px dotted #ccc', textAlign: 'right' }}>{item.rcvQty}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px dotted #ccc', textAlign: 'right' }}>{item.remainQty}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px dotted #ccc', textAlign: 'center' }}>{item.uom}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px dotted #ccc', textAlign: 'right' }}>{item.mrp}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px dotted #ccc' }}>{item.brand}</td>
                    <td style={{ padding: '6px 8px', borderRight: '1px dotted #ccc' }}>{item.category}</td>
                    <td style={{ padding: '6px 8px' }}>{item.subCategory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ borderTop: '2px solid #ccc', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ padding: '6px 12px', border: '1px solid #ccc', backgroundColor: '#e9ecef', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>MRP Difference</button>
              <button style={{ padding: '6px 12px', border: '1px solid #ccc', backgroundColor: '#e9ecef', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Preview</button>
              <button onClick={handleSave} disabled={isLoading} style={{ padding: '6px 12px', border: '1px solid #ccc', backgroundColor: '#e9ecef', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>{isLoading ? 'Saving...' : 'Save'}</button>
              <button onClick={() => window.history.back()} style={{ padding: '6px 12px', border: '1px solid #ccc', backgroundColor: '#e9ecef', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
            </div>
            
            <div style={{ color: 'red', fontWeight: 'bold', display: 'flex', gap: '40px' }}>
              <div>
                <div>TOTAL QTY: {totalQty}</div>
                <div>TOTAL VALUE: {totalValue.toFixed(2)}</div>
              </div>
              <div>
                TOTAL LINE: {items.length}
              </div>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default PosStockReceive;
