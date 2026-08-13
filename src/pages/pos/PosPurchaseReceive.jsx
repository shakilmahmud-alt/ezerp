import React, { useState, useEffect } from 'react';
import { Check, Trash2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/CustomSelect';

const SectionWrapper = ({ title, children, rightContent }) => (
  <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', padding: '20px', backgroundColor: '#ffffff', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
    {(title || rightContent) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)', margin: 0 }}>
          {title}
        </h3>
        {rightContent}
      </div>
    )}
    {children}
  </div>
);

const PosPurchaseReceive = () => {
  const { posTerminal, user } = useAuth();

  const [vendors, setVendors] = useState([]);
  const [vendorPOs, setVendorPOs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storeName, setStoreName] = useState('Store Branch');

  // Main Form Header Data
  const [headerData, setHeaderData] = useState({
    vendorId: '',
    purchaseOrderId: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    purchaseDate: new Date().toISOString().split('T')[0],
    lastChallanNo: '',
    referenceNo: '',
    deliveryTo: '',
    additionalDiscount: 0,
    additionalCost: 0
  });

  const [selectedItems, setSelectedItems] = useState([]);
  const [printTwoCopy, setPrintTwoCopy] = useState(false);
  const [receiveId, setReceiveId] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, [posTerminal]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: vData } = await supabase.from('vendors').select('id, name').order('name');
      setVendors(vData || []);

      if (posTerminal?.store_id) {
        const { data: sData } = await supabase.from('stores').select('name').eq('id', posTerminal.store_id).single();
        const currentStore = sData?.name || posTerminal?.store_name || 'STORE BRANCH';
        setStoreName(currentStore);
        setHeaderData(prev => ({ ...prev, deliveryTo: currentStore }));
      } else {
        const currentStore = posTerminal?.store_name || 'BANANI MODEL TOWN';
        setStoreName(currentStore);
        setHeaderData(prev => ({ ...prev, deliveryTo: currentStore }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load POs for Selected Vendor
  const loadPOsForVendor = async (vendorId) => {
    try {
      const { data: heldReceives } = await supabase
        .from('purchase_receives')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('status', 'Hold')
        .order('created_at', { ascending: false })
        .limit(1);

      if (heldReceives && heldReceives.length > 0) {
        const heldPR = heldReceives[0];
        setReceiveId(heldPR.id);
        setHeaderData(prev => ({
          ...prev,
          vendorId: vendorId,
          purchaseOrderId: heldPR.purchase_order_id || '',
          fromDate: heldPR.from_date || prev.fromDate,
          toDate: heldPR.to_date || prev.toDate,
          purchaseDate: heldPR.purchase_date || prev.purchaseDate,
          lastChallanNo: heldPR.last_challan_no || '',
          referenceNo: heldPR.reference_no || '',
          deliveryTo: storeName,
          additionalDiscount: heldPR.additional_discount || 0,
          additionalCost: heldPR.additional_cost || 0
        }));

        const { data: itemsData } = await supabase
          .from('purchase_receive_items')
          .select('*, products(item_name, barcode, sale_vat_percent, wh_stock, str_stock)')
          .eq('purchase_receive_id', heldPR.id);

        if (itemsData) {
          const mappedItems = itemsData.map(item => ({
            id: item.product_id,
            item_name: item.products?.item_name,
            barcode: item.products?.barcode,
            sale_vat_percent: item.products?.sale_vat_percent,
            wh_stock: item.products?.wh_stock || 0,
            str_stock: item.products?.str_stock || 0,
            poQty: item.po_qty,
            rcvQty: item.rcv_qty,
            purPrice: item.pur_price,
            salePrice: item.sale_price,
            discPercent: item.disc_percent,
            freeQty: item.free_qty,
            lineAmount: item.line_amount
          }));
          setSelectedItems(mappedItems);
        }
      } else {
        setReceiveId(null);
        setSelectedItems([]);
      }

      const { data: posData } = await supabase
        .from('purchase_orders')
        .select('id, po_number, created_at')
        .eq('vendor_id', vendorId)
        .neq('status', 'Received')
        .order('created_at', { ascending: false });

      setVendorPOs(posData || []);

    } catch (error) {
      console.error('Error loading POs:', error);
    }
  };

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setHeaderData(prev => ({ ...prev, [name]: value }));

    if (name === 'vendorId') {
      if (value) {
        loadPOsForVendor(value);
      } else {
        setVendorPOs([]);
        setSelectedItems([]);
      }
    } else if (name === 'purchaseOrderId') {
      if (value) {
        loadItemsForPO(value);
      }
    }
  };

  // Load Items for PO
  const loadItemsForPO = async (poId) => {
    try {
      const { data: poItems } = await supabase
        .from('purchase_order_items')
        .select('*, products(*)')
        .eq('purchase_order_id', poId);

      if (poItems) {
        const mapped = poItems.map(item => ({
          id: item.product_id,
          item_name: item.products?.item_name || item.product_name,
          barcode: item.products?.barcode || item.barcode,
          sale_vat_percent: item.products?.sale_vat_percent || 0,
          wh_stock: item.products?.wh_stock || 0,
          str_stock: item.products?.str_stock || 0,
          poQty: item.quantity,
          rcvQty: item.quantity,
          purPrice: item.pur_price || item.unit_price,
          salePrice: item.mrp || item.products?.mrp || 0,
          discPercent: item.disc_percent || 0,
          freeQty: item.free_qty || 0,
          uom: 'Pcs'
        }));
        setSelectedItems(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  const calculateRow = (item) => {
    const rcvQty = Number(item.rcvQty || 0);
    const purPrice = Number(item.purPrice || 0);
    const discPercent = Number(item.discPercent || 0);
    const vatPercent = Number(item.sale_vat_percent || 0);

    const value = purPrice * rcvQty;
    const discAmt = value * (discPercent / 100);
    const vatAmt = (value - discAmt) * (vatPercent / 100);
    const amount = value - discAmt + vatAmt;
    
    return { value, discAmt, vatAmt, amount };
  };

  const getTotals = () => {
    let totalValue = 0;
    let totalDiscount = 0;
    let totalVat = 0;
    let subTotal = 0;
    
    selectedItems.forEach(item => {
      const calc = calculateRow(item);
      totalValue += calc.value;
      totalDiscount += calc.discAmt;
      totalVat += calc.vatAmt;
      subTotal += calc.amount;
    });

    const addDisc = Number(headerData.additionalDiscount || 0);
    const addCost = Number(headerData.additionalCost || 0);
    const netAmount = subTotal - addDisc + addCost;

    return { totalValue, totalDiscount, totalVat, subTotal, netAmount };
  };

  const totals = getTotals();

  // Save Purchase Receive & Update Stock (Central & Store Specific)
  const handleSave = async (type) => {
    if (!headerData.vendorId) {
      toast.error('Please select a Vendor');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Please select products/PO');
      return;
    }

    setIsLoading(true);
    try {
      const status = type === 'hold' ? 'Hold' : 'Saved';
      
      let finalChallanNo = headerData.lastChallanNo;
      let finalReferenceNo = headerData.referenceNo;

      if (status === 'Saved') {
        if (!finalChallanNo) {
          const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
          const prefix = `CN${todayStr}`;
          
          const { data: lastChallans } = await supabase
            .from('purchase_receives')
            .select('last_challan_no')
            .like('last_challan_no', `${prefix}%`)
            .order('last_challan_no', { ascending: false })
            .limit(1);
            
          let nextSeq = 1;
          if (lastChallans && lastChallans.length > 0 && lastChallans[0].last_challan_no) {
            const lastNumStr = lastChallans[0].last_challan_no.replace(prefix, '');
            nextSeq = parseInt(lastNumStr, 10) + 1;
          }
          finalChallanNo = `${prefix}${String(nextSeq).padStart(3, '0')}`;
        }
        if (!finalReferenceNo) {
          finalReferenceNo = finalChallanNo;
        }
      }

      const prPayload = {
        vendor_id: headerData.vendorId,
        purchase_order_id: headerData.purchaseOrderId || null,
        from_date: headerData.fromDate,
        to_date: headerData.toDate,
        purchase_date: headerData.purchaseDate,
        last_challan_no: finalChallanNo,
        reference_no: finalReferenceNo,
        delivery_to: storeName, // Auto Store Name!
        status: status,
        total_value: totals.totalValue,
        total_discount: totals.totalDiscount,
        free_amount: 0,
        vat_amount: totals.totalVat,
        sub_total: totals.subTotal,
        additional_discount: headerData.additionalDiscount,
        additional_cost: headerData.additionalCost,
        net_amount: totals.netAmount
      };

      if (receiveId) prPayload.id = receiveId;

      // 1. Save in purchase_receives table (Central Store global visibility!)
      const { data: prData, error: prError } = await supabase
        .from('purchase_receives')
        .upsert(prPayload)
        .select()
        .single();

      if (prError) throw prError;
      const newReceiveId = prData.id;

      // 2. Delete & insert purchase_receive_items
      await supabase.from('purchase_receive_items').delete().eq('purchase_receive_id', newReceiveId);

      const itemsPayload = selectedItems.map(item => ({
        purchase_receive_id: newReceiveId,
        product_id: item.id,
        po_qty: item.poQty,
        rcv_qty: item.rcvQty,
        pur_price: item.purPrice,
        sale_price: item.salePrice,
        disc_percent: item.discPercent,
        free_qty: item.freeQty,
        line_amount: calculateRow(item).amount
      }));

      await supabase.from('purchase_receive_items').insert(itemsPayload);

      // 3. Update Stocks (Both Global / CS and Specific Store Branch!)
      // 3. Update Branch Store Stock ONLY (Do NOT modify Central Store wh_stock)
      if (status === 'Saved') {
        for (const item of selectedItems) {
          const rcvQty = Number(item.rcvQty || 0);
          if (rcvQty > 0 && posTerminal?.store_id) {
            // Specific Store Stock Update in store_stocks!
            const { data: sStock } = await supabase
              .from('store_stocks')
              .select('stock_qty')
              .eq('store_id', posTerminal.store_id)
              .eq('product_id', item.id)
              .single();

            if (sStock) {
              const newStoreQty = (sStock.stock_qty || 0) + rcvQty;
              await supabase
                .from('store_stocks')
                .update({ stock_qty: newStoreQty })
                .eq('store_id', posTerminal.store_id)
                .eq('product_id', item.id);
            } else {
              await supabase.from('store_stocks').insert([{
                store_id: posTerminal.store_id,
                product_id: item.id,
                stock_qty: rcvQty
              }]);
            }
          }
        }

        if (headerData.purchaseOrderId) {
          await supabase.from('purchase_orders').update({ status: 'Received' }).eq('id', headerData.purchaseOrderId);
        }
      }

      toast.success(`Purchase Receive ${status === 'Hold' ? 'held' : 'saved'} successfully! ${status === 'Saved' ? `Challan No: ${finalChallanNo}` : ''}`, { duration: 4000 });
      
      if (status === 'Saved') {
        generatePDF(finalChallanNo, finalReferenceNo);
      }

      handleClear();

    } catch (err) {
      console.error(err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedItems([]);
    setReceiveId(null);
    setHeaderData({
      vendorId: '',
      purchaseOrderId: '',
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      purchaseDate: new Date().toISOString().split('T')[0],
      lastChallanNo: '',
      referenceNo: '',
      deliveryTo: storeName,
      additionalDiscount: 0,
      additionalCost: 0
    });
  };

  // PDF Challan Generation
  const generatePDF = (challanNo, refNo) => {
    const doc = new jsPDF();
    const vendorName = vendors.find(v => v.id === headerData.vendorId)?.name || 'Vendor';

    doc.setFontSize(16);
    doc.text('PURCHASE RECEIVE CHALLAN', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Store: ${storeName}`, 14, 25);
    doc.text(`Vendor: ${vendorName}`, 14, 30);
    doc.text(`Date: ${headerData.purchaseDate}`, 14, 35);

    doc.text(`Challan No: ${challanNo || headerData.lastChallanNo}`, 140, 25);
    doc.text(`Ref No: ${refNo || headerData.referenceNo}`, 140, 30);
    doc.text(`Delivery To: ${storeName}`, 140, 35);

    const tableCols = ['Item Name', 'Barcode', 'Rcv Qty', 'Pur Price', 'Discount %', 'VAT %', 'Amount'];
    const tableRows = selectedItems.map(item => [
      item.item_name,
      item.barcode,
      item.rcvQty,
      item.purPrice,
      item.discPercent,
      item.sale_vat_percent || 0,
      calculateRow(item).amount.toFixed(2)
    ]);

    tableRows.push([
      'NET TOTAL', '', '', '', '', '', totals.netAmount.toFixed(2)
    ]);

    autoTable(doc, {
      head: [tableCols],
      body: tableRows,
      startY: 45,
      theme: 'grid'
    });

    doc.save(`PurchaseReceive_${challanNo || 'Draft'}.pdf`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color, #f8fafc)', minHeight: '100vh', fontSize: '13px' }}>
      
      <SectionWrapper title="Purchase Receive">
        
        {/* Form Inputs Grid matching 1st Image */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginBottom: '20px', alignItems: 'flex-end' }}>
          
          <div>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>Vendor Name *</label>
            <CustomSelect 
              name="vendorId" 
              value={headerData.vendorId} 
              onChange={handleHeaderChange}
            >
              <option value="">-- Select a Vendor --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </CustomSelect>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>From Date</label>
            <input type="date" name="fromDate" value={headerData.fromDate} onChange={handleHeaderChange} style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>To Date</label>
            <input type="date" name="toDate" value={headerData.toDate} onChange={handleHeaderChange} style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>Purchase Order *</label>
            <CustomSelect 
              name="purchaseOrderId" 
              value={headerData.purchaseOrderId} 
              onChange={handleHeaderChange}
            >
              <option value="">-- Select PO --</option>
              {vendorPOs.map(po => <option key={po.id} value={po.id}>{po.po_number}</option>)}
            </CustomSelect>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Purchase Date</label>
            <input type="date" name="purchaseDate" value={headerData.purchaseDate} onChange={handleHeaderChange} style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Last Challan No</label>
            <input type="text" name="lastChallanNo" value={headerData.lastChallanNo} onChange={handleHeaderChange} placeholder="Auto Generated" style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Reference No</label>
            <input type="text" name="referenceNo" value={headerData.referenceNo} onChange={handleHeaderChange} placeholder="Ref No" style={{ width: '100%', padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>

          {/* Delivery To: Auto Store Branch Name (read-only) */}
          <div>
            <label style={{ fontSize: '0.85rem', color: '#0d47a1', fontWeight: 'bold' }}>Delivery To</label>
            <input 
              type="text" 
              readOnly 
              value={storeName} 
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #00bcd4', backgroundColor: '#e0f7fa', fontWeight: 'bold', color: '#0d47a1', borderRadius: '4px' }} 
            />
          </div>

        </div>

      </SectionWrapper>

      {/* Product Details Section */}
      <SectionWrapper title="Product Details" rightContent={
        <div style={{ fontSize: '11px', color: '#d32f2f', fontWeight: 'bold', display: 'flex', gap: '15px' }}>
          <span>Item Selected: {selectedItems.length}</span>
          <span>Challan Quantity: {selectedItems.reduce((sum, i) => sum + Number(i.rcvQty || 0), 0)}</span>
          <span>Challan Total: Tk {totals.netAmount.toFixed(2)}</span>
        </div>
      }>
        
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '8px', textAlign: 'center' }}>Selected</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Barcode</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>WH STK</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>STR STK</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>PO Qty</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Sale VAT(%)</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>UOM</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#d32f2f' }}>Pur. Price</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#d32f2f' }}>Sale Price</th>
                <th style={{ padding: '8px', textAlign: 'right', color: '#d32f2f', fontWeight: 'bold' }}>Rcv Qty</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Free Qty</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Disc(%)</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    Select a Vendor and Purchase Order above to load products.
                  </td>
                </tr>
              ) : (
                selectedItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <Check size={16} color="var(--accent-primary, #2e6f40)" />
                    </td>
                    <td style={{ padding: '6px' }}>{item.barcode}</td>
                    <td style={{ padding: '6px', fontWeight: 'bold' }}>{item.item_name}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: '#15803d' }}>{item.wh_stock}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: '#1d4ed8' }}>{item.str_stock}</td>
                    <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{item.poQty}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{item.sale_vat_percent || 0}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>Pcs</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>
                      <input type="number" value={item.purPrice} onChange={(e) => handleItemChange(idx, 'purPrice', e.target.value)} style={{ width: '60px', textAlign: 'right', padding: '2px' }} />
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>
                      <input type="number" value={item.salePrice} onChange={(e) => handleItemChange(idx, 'salePrice', e.target.value)} style={{ width: '60px', textAlign: 'right', padding: '2px' }} />
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>
                      <input type="number" value={item.rcvQty} onChange={(e) => handleItemChange(idx, 'rcvQty', e.target.value)} style={{ width: '60px', textAlign: 'right', padding: '2px', fontWeight: 'bold', border: '1px solid #00bcd4' }} />
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>
                      <input type="number" value={item.freeQty} onChange={(e) => handleItemChange(idx, 'freeQty', e.target.value)} style={{ width: '50px', textAlign: 'right', padding: '2px' }} />
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>
                      <input type="number" value={item.discPercent} onChange={(e) => handleItemChange(idx, 'discPercent', e.target.value)} style={{ width: '50px', textAlign: 'right', padding: '2px' }} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Live Calculation Totals & Standardized Buttons Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', alignItems: 'center', borderTop: '1px dashed #ccc', paddingTop: '15px' }}>
          
          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Total Value *</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{totals.totalValue.toFixed(2)}</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Total Discount *</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{totals.totalDiscount.toFixed(2)}</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Free Amount *</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>0.00</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>VAT *</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{totals.totalVat.toFixed(2)}</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Sub-Total *</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{totals.subTotal.toFixed(2)}</div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Additional Discount</div>
            <input type="number" name="additionalDiscount" value={headerData.additionalDiscount} onChange={handleHeaderChange} style={{ width: '80px', padding: '3px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>Additional Cost *</div>
            <input type="number" name="additionalCost" value={headerData.additionalCost} onChange={handleHeaderChange} style={{ width: '80px', padding: '3px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#d32f2f', fontWeight: 'bold' }}>Net Amount *</div>
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#d32f2f' }}>Tk {totals.netAmount.toFixed(2)}</div>
          </div>

        </div>

        {/* Buttons Row with Purchase Order Class Hover Effects */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', marginRight: '10px' }}>
            <input type="checkbox" checked={printTwoCopy} onChange={(e) => setPrintTwoCopy(e.target.checked)} />
            Print two copy
          </label>

          <button className="btn-theme" onClick={() => handleSave('save')} disabled={isLoading} style={{ padding: '8px 24px', fontSize: '13px', fontWeight: 'bold' }}>
            Save
          </button>
          <button className="btn-danger" onClick={() => handleSave('hold')} disabled={isLoading} style={{ padding: '8px 24px', fontSize: '13px', fontWeight: 'bold' }}>
            Hold
          </button>
          <button className="btn-info" onClick={() => generatePDF(headerData.lastChallanNo, headerData.referenceNo)} style={{ padding: '8px 24px', fontSize: '13px', fontWeight: 'bold' }}>
            Preview
          </button>
          <button className="btn-secondary" onClick={handleClear} style={{ padding: '8px 24px', fontSize: '13px', fontWeight: 'bold' }}>
            Clear Temp
          </button>
        </div>

      </SectionWrapper>

    </div>
  );
};

export default PosPurchaseReceive;
