import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';

const PosStockTransfer = () => {
  const { posTerminal } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Auto-generate transfer challan number
  const [transferChallan, setTransferChallan] = useState('');
  
  // Stores and Received Challans
  const [stores, setStores] = useState([]);
  const [transferTo, setTransferTo] = useState('central_store');
  
  const [isChallanwise, setIsChallanwise] = useState(false);
  const [receivedChallans, setReceivedChallans] = useState([]);
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
    inStock: '', // the current store stock
    transferQty: '',
  });

  useEffect(() => {
    // Generate Transfer Challan number e.g., TRN20260715xxxx
    const prefix = "TRN";
    const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randPart = Math.floor(1000 + Math.random() * 9000);
    setTransferChallan(`${prefix}${datePart}${randPart}`);
    
    fetchStores();
  }, []);

  useEffect(() => {
    if (posTerminal && posTerminal.store_name) {
      fetchReceivedChallans(posTerminal.store_name);
    }
  }, [posTerminal]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase.from('stores').select('id, name');
      if (data) {
        setStores(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReceivedChallans = async (shopName) => {
    try {
      const { data: storeData } = await supabase.from('stores').select('id').eq('name', shopName).single();
      if (!storeData) return;

      // Get challans that were received by this store
      const { data, error } = await supabase
        .from('requisitions')
        .select('id, challan_no, requisition_no')
        .eq('shop_id', storeData.id)
        .eq('status', 'Received');
        
      if (data) setReceivedChallans(data);
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
      
      const productIds = data.map(i => i.product_id);
      
      // Get current store stock for these items
      const { data: stockData } = await supabase
        .from('store_stocks')
        .select('product_id, stock_qty')
        .eq('store_id', posTerminal.store_id)
        .in('product_id', productIds);
        
      const stockMap = {};
      if (stockData) {
        stockData.forEach(s => stockMap[s.product_id] = Number(s.stock_qty || 0));
      }
      
      const mapped = data.map(item => ({
        id: item.id,
        productId: item.product_id,
        code: item.product_code || item.products?.barcode,
        barcode: item.barcode || item.products?.barcode,
        name: item.product_name || item.products?.item_name,
        receivedQty: stockMap[item.product_id] || 0, // Max qty is now the actual store stock
        transferQty: 0, // initially 0
        isSelected: false,
        uom: item.uom || 'Pcs',
        mrp: item.mrp || item.products?.mrp || 0,
        brand: item.style || '',
        category: item.category || item.products?.category_id || '',
        subCategory: item.products?.subcategory_id || ''
      }));
      setItems(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load items');
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

  const handleBarcodeScan = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!barcodeScan) return;
    
    // Find item in the list
    let found = items.find(i => i.barcode === barcodeScan || i.code === barcodeScan);
    
    if (!found && !isChallanwise) {
      // If not challanwise, fetch the product from DB and add to items
      setIsLoading(true);
      try {
        const { data: prodData, error } = await supabase
          .from('products')
          .select('id, barcode, code, item_name, mrp, category_id, subcategory_id, brand_id')
          .or(`barcode.eq.${barcodeScan},code.eq.${barcodeScan}`);
          
        if (error) throw error;
        
        if (prodData && prodData.length > 0) {
          const product = prodData[0];
          // get store stock
          const { data: stockData } = await supabase
            .from('store_stocks')
            .select('stock_qty')
            .eq('store_id', posTerminal.store_id)
            .eq('product_id', product.id)
            .single();
            
          const stock = stockData ? Number(stockData.stock_qty || 0) : 0;
          
          if (stock <= 0) {
            toast.error('Product out of stock in this store!');
          } else {
            found = {
              id: 'temp-' + Date.now(),
              productId: product.id,
              code: product.code || product.barcode,
              barcode: product.barcode,
              name: product.item_name,
              receivedQty: stock,
              transferQty: 0,
              isSelected: true,
              uom: product.uom || 'Pcs',
              mrp: product.mrp || 0,
              brand: product.brand_id || '',
              category: product.category_id || '',
              subCategory: product.subcategory_id || ''
            };
            setItems(prev => [...prev, found]);
          }
        } else {
          toast.error('Product not found in database');
        }
      } catch (err) {
        console.error(err);
        toast.error('Product not found or out of stock');
      } finally {
        setIsLoading(false);
      }
    }

    if (found) {
      setProductInfo({
        barcode: found.barcode,
        name: found.name,
        category: found.category || '',
        subCategory: found.subCategory || '',
        subSubCategory: '',
        salePrice: found.mrp,
        inStock: found.receivedQty,
        transferQty: found.transferQty > 0 ? found.transferQty : 1
      });
      
      // Auto increment transfer qty and auto select
      handleProductInfoChange('transferQty', (Number(found.transferQty) || 0) + 1, found.barcode);
      handleProductInfoChange('isSelected', true, found.barcode);
      setBarcodeScan('');
    } else if (isChallanwise) {
      toast.error('Product not found in this challan');
    }
  };

  const handleProductInfoChange = (field, value, barcodeOverride = null) => {
    setProductInfo(prev => ({ ...prev, [field]: value }));

    const targetBarcode = barcodeOverride || productInfo.barcode;
    if (targetBarcode) {
      setItems(prevItems => 
        prevItems.map(item => {
          if (item.barcode === targetBarcode || item.code === targetBarcode) {
            if (field === 'salePrice') return { ...item, mrp: value };
            if (field === 'isSelected') return { ...item, isSelected: value };
            if (field === 'transferQty') {
              let qty = Number(value);
              if (qty > item.receivedQty) {
                toast.error(`Transfer qty cannot exceed store stock (${item.receivedQty})!`);
                qty = item.receivedQty;
              }
              return { ...item, transferQty: qty };
            }
          }
          return item;
        })
      );
    }
  };

  const generatePDF = () => {
    const transferredItems = items.filter(i => i.isSelected && Number(i.transferQty) > 0);
    if (transferredItems.length === 0) return;
    
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
    doc.text('STOCK TRANSFER CHALLAN', pageWidth - 14, 15, { align: 'right' });
    
    doc.text(`CHALLAN NO # ${transferChallan}`, pageWidth - 14, 20, { align: 'right' });
    doc.text(`DATE: ${date}`, pageWidth - 14, 25, { align: 'right' });
    
    let destName = 'Central Store';
    if (transferTo !== 'central_store') {
      const st = stores.find(s => s.id === transferTo);
      if (st) destName = st.name;
    }
    doc.text(`TRANSFER TO: ${destName}`, pageWidth - 14, 30, { align: 'right' });
    
    // Left Side Info
    doc.text(`FROM STORE: ${posTerminal?.store_name || 'N/A'}`, 14, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    const printDate = new Date().toLocaleString();
    doc.text(`PRINT DATE: ${printDate}`, pageWidth - 14, 50, { align: 'right' });
    
    const tableData = transferredItems.map((i, index) => {
      const trnQty = Number(i.transferQty) || 0;
      const mrp = Number(i.mrp) || 0;
      const saleValue = trnQty * mrp;
      return [
        index + 1,
        i.barcode,
        i.name,
        `${trnQty.toFixed(2)}`,
        i.uom,
        mrp.toFixed(2),
        saleValue.toFixed(2)
      ];
    });
    
    autoTable(doc, {
      startY: 55,
      head: [['S/L', 'BARCODE', 'DISPLAY_NAME', 'TRN QTY', 'UOM', 'MRP', 'SALE VALUE']],
      body: tableData,
      theme: 'plain',
      headStyles: { fontStyle: 'bold', lineWidth: { top: 0.5, bottom: 0.5 }, lineColor: [0, 0, 0], fontSize: 8, halign: 'right' },
      bodyStyles: { fontSize: 8, halign: 'right' },
      columnStyles: { 0: { halign: 'center' }, 1: { halign: 'left' }, 2: { halign: 'left' }, 4: { halign: 'center' } },
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
    const totalTrnQty = transferredItems.reduce((sum, i) => sum + (Number(i.transferQty) || 0), 0);
    const totalSaleValue = transferredItems.reduce((sum, i) => sum + ((Number(i.transferQty) || 0) * (Number(i.mrp) || 0)), 0);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    // Draw line above totals
    doc.line(pageWidth / 2, finalY + 2, pageWidth - 14, finalY + 2);
    doc.text('SUB TOTAL:', pageWidth / 2, finalY + 7, { align: 'right' });
    doc.text(`${totalTrnQty.toFixed(2)}`, pageWidth / 2 + 20, finalY + 7, { align: 'right' });
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
    if (isChallanwise && !selectedChallan) return toast.error('Please select a reference challan');
    
    const transferredItems = items.filter(i => i.isSelected && Number(i.transferQty) > 0);
    if (transferredItems.length === 0) return toast.error('No items selected or qty is zero');

    setIsLoading(true);
    try {
      // 1. Deduct from store_stocks
      for (const item of transferredItems) {
        const qty = Number(item.transferQty);
        
        const { data: existingStock } = await supabase
          .from('store_stocks')
          .select('id, stock_qty')
          .eq('store_id', posTerminal.store_id)
          .eq('product_id', item.productId)
          .single();

        if (existingStock) {
          const newQty = Math.max(0, Number(existingStock.stock_qty || 0) - qty);
          await supabase
            .from('store_stocks')
            .update({ stock_qty: newQty })
            .eq('id', existingStock.id);
        }
      }

      // 2. Add to destination
      if (transferTo === 'central_store') {
        // Central Store => shop_transfers
        // Ensure shop exists in 'shops' table to satisfy foreign key constraint
        const { data: existingShop } = await supabase.from('shops').select('id').eq('id', posTerminal.store_id).single();
        if (!existingShop) {
          await supabase.from('shops').insert({ id: posTerminal.store_id, name: posTerminal.store_name || 'Store' });
        }

        const { data: transferObj, error: trnError } = await supabase
          .from('shop_transfers')
          .insert({
            challan_no: transferChallan,
            challan_date: date,
            shop_id: posTerminal.store_id,
            status: 'Pending'
          })
          .select('id')
          .single();

        if (trnError) throw trnError;

        const transferItemsData = transferredItems.map(item => ({
          transfer_id: transferObj.id,
          product_id: item.productId,
          qty: Number(item.transferQty),
          mrp: Number(item.mrp)
        }));

        await supabase.from('shop_transfer_items').insert(transferItemsData);
        
      } else {
        // Other Store => requisitions
        const { data: reqData, error: reqErr } = await supabase
          .from('requisitions')
          .insert({
            requisition_no: transferChallan,
            challan_no: transferChallan,
            requisition_date: date,
            status: 'Delivered', // So it shows in Store Receive
            shop_id: transferTo // the destination store
          })
          .select('id')
          .single();

        if (reqErr) throw reqErr;

        const reqItemsData = transferredItems.map(item => ({
          requisition_id: reqData.id,
          product_id: item.productId,
          product_code: item.code,
          product_name: item.name,
          barcode: item.barcode,
          mrp: item.mrp,
          request_qty: Number(item.transferQty),
          approve_qty: Number(item.transferQty),
          uom: item.uom,
          category: item.category
        }));

        await supabase.from('requisition_items').insert(reqItemsData);
      }

      toast.success('Stock Transferred successfully!');
      generatePDF();
      
      // Generate a new transfer challan number for next entry
      const prefix = "TRN";
      const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const randPart = Math.floor(1000 + Math.random() * 9000);
      setTransferChallan(`${prefix}${datePart}${randPart}`);
      
      setItems([]);
      setSelectedChallan('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save transfer: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const transferredItemsForTotals = items.filter(i => i.isSelected && Number(i.transferQty) > 0);
  const totalTransferQty = transferredItemsForTotals.reduce((sum, i) => sum + (Number(i.transferQty) || 0), 0);
  const totalSaleValue = transferredItemsForTotals.reduce((sum, i) => sum + ((Number(i.transferQty) || 0) * (Number(i.mrp) || 0)), 0);
  const totalLine = transferredItemsForTotals.length;

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Banner */}
      <div style={{ backgroundColor: '#e9ecef', padding: '10px', display: 'flex', justifyContent: 'center', borderBottom: '1px solid #ccc' }}>
        <div style={{ backgroundColor: '#4267b2', color: 'white', padding: '5px 15px', fontWeight: 'bold' }}>
          Stock Transfer
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '10px', gap: '10px' }}>
        {/* Left Side Menu */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          
          <div style={{ backgroundColor: '#fff', padding: '15px', border: '1px solid #ccc' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ width: '80px', fontSize: '0.8rem', fontWeight: 'bold' }}>Date</label>
              <input type="date" value={date} readOnly style={{ flex: 1, padding: '4px', border: '1px solid #ccc', backgroundColor: '#e9ecef' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ width: '80px', fontSize: '0.8rem', fontWeight: 'bold' }}>Challan #</label>
              <input type="text" value={transferChallan} readOnly style={{ flex: 1, padding: '4px', border: '1px solid #ccc', backgroundColor: '#e9ecef' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ width: '80px', fontSize: '0.8rem', fontWeight: 'bold' }}>Transfer To</label>
              <select 
                value={transferTo} 
                onChange={(e) => setTransferTo(e.target.value)}
                style={{ flex: 1, padding: '4px', border: '1px solid #ccc' }}
              >
                <option value="central_store">Central Store</option>
                {stores.map(s => {
                  if (s.id === posTerminal?.store_id) return null; // Don't allow transfer to self
                  return <option key={s.id} value={s.id}>{s.name}</option>;
                })}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
              <input 
                type="checkbox" 
                checked={isChallanwise} 
                onChange={e => setIsChallanwise(e.target.checked)} 
                style={{ marginRight: '5px' }} 
              />
              <label style={{ fontSize: '0.8rem', color: '#d32f2f', fontWeight: 'bold' }}>Received Challanwise Transfer</label>
            </div>
            
            {isChallanwise && (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                <label style={{ width: '80px', fontSize: '0.8rem', fontWeight: 'bold' }}>Ref. Challan</label>
                <select 
                  value={selectedChallan} 
                  onChange={(e) => handleChallanSelect(e.target.value)}
                  style={{ flex: 1, padding: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">---Select---</option>
                  {receivedChallans.map(d => (
                    <option key={d.id} value={d.id}>{d.challan_no || d.requisition_no}</option>
                  ))}
                </select>
              </div>
            )}
            
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
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Sale Price</label>
              <input 
                type="number" 
                value={productInfo.salePrice} 
                onChange={(e) => handleProductInfoChange('salePrice', e.target.value)}
                style={{ flex: 1, padding: '2px 4px', border: '1px solid #ccc' }} 
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Max Qty</label>
              <input type="text" value={productInfo.inStock} readOnly style={{ flex: 1, padding: '2px 4px', border: '1px solid #ccc', backgroundColor: '#e9ecef' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ width: '100px', fontSize: '0.8rem', textAlign: 'right', paddingRight: '10px' }}>Transfer Qty</label>
              <input 
                type="number" 
                value={productInfo.transferQty} 
                onChange={(e) => handleProductInfoChange('transferQty', e.target.value)}
                style={{ flex: 1, padding: '2px 4px', border: '1px solid #ccc' }} 
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
              <input type="checkbox" checked={isAutoScan} onChange={e=>setIsAutoScan(e.target.checked)} style={{ marginRight: '5px' }} />
              <label style={{ fontSize: '0.8rem' }}>Auto Scan</label>
            </div>
          </div>
        </div>

        {/* Right Side Table */}
        <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #ccc', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9f9f9', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: '8px 4px', textAlign: 'center', borderRight: '1px solid #eee' }}>
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setItems(prev => prev.map(i => ({...i, isSelected: checked})));
                      }}
                      checked={items.length > 0 && items.every(i => i.isSelected)}
                    />
                  </th>
                  <th style={{ padding: '8px 4px', textAlign: 'left', borderRight: '1px solid #eee' }}>Code</th>
                  <th style={{ padding: '8px 4px', textAlign: 'left', borderRight: '1px solid #eee' }}>Barcode</th>
                  <th style={{ padding: '8px 4px', textAlign: 'left', borderRight: '1px solid #eee' }}>Name</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', borderRight: '1px solid #eee', color: 'blue' }}>Transfer Qty</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', borderRight: '1px solid #eee' }}>Max Qty</th>
                  <th style={{ padding: '8px 4px', textAlign: 'center', borderRight: '1px solid #eee' }}>UOM</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right', borderRight: '1px solid #eee' }}>MRP</th>
                  <th style={{ padding: '8px 4px', textAlign: 'left', borderRight: '1px solid #eee' }}>Brand</th>
                  <th style={{ padding: '8px 4px', textAlign: 'left', borderRight: '1px solid #eee' }}>Category</th>
                  <th style={{ padding: '8px 4px', textAlign: 'left' }}>Sub Category</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan="10" style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan="10" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>{isChallanwise ? 'No reference challan selected' : 'Scan barcode to add products'}</td></tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #eee' }}>
                        <input 
                          type="checkbox" 
                          checked={item.isSelected || false}
                          onChange={(e) => handleProductInfoChange('isSelected', e.target.checked, item.barcode)}
                        />
                      </td>
                      <td style={{ padding: '6px 4px', borderRight: '1px solid #eee' }}>{item.code}</td>
                      <td style={{ padding: '6px 4px', borderRight: '1px solid #eee' }}>{item.barcode}</td>
                      <td style={{ padding: '6px 4px', borderRight: '1px solid #eee' }}>{item.name}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #eee' }}>
                        <input 
                          type="number" 
                          value={item.transferQty} 
                          onChange={(e) => handleProductInfoChange('transferQty', e.target.value, item.barcode)}
                          style={{ width: '60px', padding: '2px', textAlign: 'center', border: '1px solid #ccc' }}
                        />
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #eee' }}>{item.receivedQty}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #eee' }}>{item.uom}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right', borderRight: '1px solid #eee' }}>{item.mrp}</td>
                      <td style={{ padding: '6px 4px', borderRight: '1px solid #eee' }}>{item.brand}</td>
                      <td style={{ padding: '6px 4px', borderRight: '1px solid #eee' }}>{item.category}</td>
                      <td style={{ padding: '6px 4px' }}>{item.subCategory}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Totals & Buttons */}
          <div style={{ padding: '10px', borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={generatePDF}
                style={{ padding: '5px 15px', backgroundColor: '#e9ecef', border: '1px solid #ccc', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Preview
              </button>
              <button 
                onClick={handleSave}
                style={{ padding: '5px 15px', backgroundColor: '#e9ecef', border: '1px solid #ccc', cursor: 'pointer', fontWeight: 'bold' }}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={() => {
                  setItems([]);
                  setSelectedChallan('');
                }}
                style={{ padding: '5px 15px', backgroundColor: '#e9ecef', border: '1px solid #ccc', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Clear
              </button>
              <button 
                onClick={() => window.history.back()}
                style={{ padding: '5px 15px', backgroundColor: '#e9ecef', border: '1px solid #ccc', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Close
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '30px', color: '#d32f2f', fontWeight: 'bold' }}>
              <div>TOTAL QTY: {totalTransferQty}</div>
              <div>TOTAL VALUE: {totalSaleValue.toFixed(2)}</div>
              <div>TOTAL LINE: {totalLine}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PosStockTransfer;
