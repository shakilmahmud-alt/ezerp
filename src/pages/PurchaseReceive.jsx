import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SectionWrapper = ({ title, children, rightContent }) => (
  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'var(--card-bg)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
    {(title || rightContent) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
        {rightContent}
      </div>
    )}
    {children}
  </div>
);

const PurchaseReceive = () => {
  const [vendors, setVendors] = useState([]);
  const [vendorPOs, setVendorPOs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Main page state
  const [headerData, setHeaderData] = useState({
    vendorId: '',
    purchaseOrderId: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    purchaseDate: new Date().toISOString().split('T')[0],
    lastChallanNo: '',
    referenceNo: '',
    deliveryTo: 'Central Store',
    additionalDiscount: 0,
    additionalCost: 0
  });

  const [selectedItems, setSelectedItems] = useState([]);
  const [printTwoCopy, setPrintTwoCopy] = useState(false);
  const [receiveId, setReceiveId] = useState(null); // Used if we loaded a Held receive

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

  const loadPOsForVendor = async (vendorId) => {
    try {
      // First check if there is a Held receive for this vendor
      const { data: heldReceives, error: holdError } = await supabase
        .from('purchase_receives')
        .select('*')
        .eq('vendor_id', vendorId)
        .eq('status', 'Hold')
        .order('created_at', { ascending: false })
        .limit(1);

      if (holdError) throw holdError;

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
          deliveryTo: heldPR.delivery_to || 'Central Store',
          additionalDiscount: heldPR.additional_discount || 0,
          additionalCost: heldPR.additional_cost || 0
        }));

        // Load items for this held receive
        const { data: itemsData, error: itemsError } = await supabase
          .from('purchase_receive_items')
          .select('*, products(item_name, barcode, sale_vat_percent, wh_stock, str_stock)')
          .eq('purchase_receive_id', heldPR.id);

        if (itemsError) throw itemsError;

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
        toast('Loaded held purchase receive', { icon: '📦' });
        
        // Also fetch POs to populate dropdown just in case
        fetchPOs(vendorId);
      } else {
        // No held receive, just load the POs for this vendor
        setReceiveId(null);
        setSelectedItems([]);
        setHeaderData(prev => ({
          ...prev, vendorId, purchaseOrderId: '', additionalDiscount: 0, additionalCost: 0
        }));
        fetchPOs(vendorId);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error checking held receive');
    }
  };

  const fetchPOs = async (vendorId) => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, reference_no, order_date')
        .eq('vendor_id', vendorId)
        .eq('status', 'Saved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendorPOs(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load purchase orders');
    }
  };

  const loadPOItems = async (poId) => {
    if (!poId) {
      setSelectedItems([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*, products(item_name, barcode, sale_vat_percent, mrp, wh_stock, str_stock)')
        .eq('purchase_order_id', poId);

      if (error) throw error;

      // Fetch previous receives to calculate left qty
      const { data: prevReceives } = await supabase
        .from('purchase_receives')
        .select('id')
        .eq('purchase_order_id', poId)
        .eq('status', 'Saved');
        
      let prevRcvQtyByProduct = {};
      if (prevReceives && prevReceives.length > 0) {
        const receiveIds = prevReceives.map(r => r.id);
        const { data: prevItems } = await supabase
          .from('purchase_receive_items')
          .select('product_id, rcv_qty')
          .in('purchase_receive_id', receiveIds);
          
        if (prevItems) {
          prevItems.forEach(pi => {
            prevRcvQtyByProduct[pi.product_id] = (prevRcvQtyByProduct[pi.product_id] || 0) + Number(pi.rcv_qty || 0);
          });
        }
      }

      if (data) {
        const mappedItems = data.map(item => {
          const prevRcv = prevRcvQtyByProduct[item.product_id] || 0;
          const leftQty = Math.max(0, item.qty - prevRcv);
          
          return {
            id: item.product_id,
            item_name: item.products?.item_name,
            barcode: item.products?.barcode,
            sale_vat_percent: item.products?.sale_vat_percent,
            wh_stock: item.products?.wh_stock || 0,
            str_stock: item.products?.str_stock || 0,
            poQty: leftQty,
            rcvQty: leftQty,
            purPrice: item.pur_price,
            salePrice: item.products?.mrp || item.mrp_price,
            discPercent: item.disc_percent,
            freeQty: item.free_qty,
            lineAmount: 0 
          };
        }).filter(item => item.poQty > 0);
        
        setSelectedItems(mappedItems);
        setReceiveId(null); // Not a held one, fresh from PO
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load PO items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'vendorId') {
      loadPOsForVendor(value);
    } else if (name === 'purchaseOrderId') {
      setHeaderData({ ...headerData, [name]: value });
      loadPOItems(value);
    } else {
      setHeaderData({ ...headerData, [name]: value });
    }
  };

  const updateItem = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    setSelectedItems(updated);
  };

  // Calculations
  const calculateRow = (item) => {
    const rcvQty = Number(item.rcvQty || 0);
    const purPrice = Number(item.purPrice || 0);
    const discPercent = Number(item.discPercent || 0);
    const vatPercent = Number(item.sale_vat_percent || 0);

    const value = purPrice * rcvQty;
    const discAmt = value * (discPercent / 100);
    const vatAmt = (value - discAmt) * (vatPercent / 100);
    const amount = value - discAmt + vatAmt;
    
    return {
      value,
      discAmt,
      vatAmt,
      amount
    };
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
        delivery_to: headerData.deliveryTo,
        status: status,
        total_value: totals.totalValue,
        total_discount: totals.totalDiscount,
        free_amount: 0, // Mock
        vat_amount: totals.totalVat,
        sub_total: totals.subTotal,
        additional_discount: headerData.additionalDiscount,
        additional_cost: headerData.additionalCost,
        net_amount: totals.netAmount
      };

      if (receiveId) prPayload.id = receiveId;

      const { data: prData, error: prError } = await supabase
        .from('purchase_receives')
        .upsert(prPayload)
        .select()
        .single();

      if (prError) throw prError;
      const newReceiveId = prData.id;

      // Delete existing items if any
      const { error: delError } = await supabase
        .from('purchase_receive_items')
        .delete()
        .eq('purchase_receive_id', newReceiveId);
      if (delError) throw delError;

      // Insert new items
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

      const { error: itemsError } = await supabase
        .from('purchase_receive_items')
        .insert(itemsPayload);
      if (itemsError) throw itemsError;

      // If 'Save', update stock and hide PO
      if (status === 'Saved') {
        let allReceived = true;
        for (const item of selectedItems) {
          const rcvQty = Number(item.rcvQty || 0);
          if (rcvQty > 0) {
            const newStock = Number(item.wh_stock || 0) + rcvQty;
            const { error: stockError } = await supabase
              .from('products')
              .update({ wh_stock: newStock })
              .eq('id', item.id);
            if (stockError) console.error("Stock update error for product", item.id, stockError);
          }
          if (Number(item.poQty) - rcvQty > 0) {
            allReceived = false;
          }
        }

        if (headerData.purchaseOrderId && allReceived) {
          await supabase
            .from('purchase_orders')
            .update({ status: 'Received' })
            .eq('id', headerData.purchaseOrderId);
        }
      }

      toast.success(`Purchase Receive ${status === 'Hold' ? 'held' : 'saved'} successfully! ${status === 'Saved' ? `Challan No: ${finalChallanNo}` : ''}`);
      
      if (status === 'Saved') {
        generatePDF(finalChallanNo, finalReferenceNo);
      }

      handleClear();
      fetchPOs(headerData.vendorId); // Refresh PO list

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
      deliveryTo: 'Central Store',
      additionalDiscount: 0,
      additionalCost: 0
    });
  };

  const generatePDF = (challanNo, refNo) => {
    if (selectedItems.length === 0) return;
    
    const doc = new jsPDF('landscape');
    const vendorName = vendors.find(v => v.id == headerData.vendorId)?.name || '';

    const cNo = challanNo || headerData.lastChallanNo;
    const rNo = refNo || headerData.referenceNo;

    doc.setFontSize(16);
    doc.text("Purchase Receive", 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Vendor: ${vendorName}`, 14, 25);
    doc.text(`Purchase Date: ${headerData.purchaseDate}`, 14, 30);
    doc.text(`Challan No: ${cNo}`, 14, 35);
    doc.text(`Reference No: ${rNo}`, 150, 25);
    doc.text(`Delivery To: ${headerData.deliveryTo}`, 150, 30);

    const tableCols = ["Name", "Barcode", "PO Qty", "Rcv Qty", "Pur. Price", "Disc(%)", "Value", "VAT", "Amount"];
    const tableRows = selectedItems.map(item => {
      const calc = calculateRow(item);
      return [
        item.item_name || '',
        item.barcode || '',
        item.poQty,
        item.rcvQty,
        Number(item.purPrice).toFixed(2),
        item.discPercent,
        calc.value.toFixed(2),
        calc.vatAmt.toFixed(2),
        calc.amount.toFixed(2)
      ];
    });

    tableRows.push([
      'Total', '', '', '', '', '',
      totals.totalValue.toFixed(2),
      totals.totalVat.toFixed(2),
      totals.netAmount.toFixed(2)
    ]);

    autoTable(doc, {
      head: [tableCols],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [46, 111, 64] },
      didParseCell: function (data) {
        if (data.row.index === tableRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    doc.save(`PurchaseReceive_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      <SectionWrapper title="Purchase Receive">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vendor Name <span style={{color:'red'}}>*</span></label>
            <select name="vendorId" value={headerData.vendorId} onChange={handleHeaderChange} className="input-animated">
              <option value="">-- Select a Vendor --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>From Date</label>
            <input type="date" name="fromDate" value={headerData.fromDate} onChange={handleHeaderChange} className="input-animated" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To Date</label>
            <input type="date" name="toDate" value={headerData.toDate} onChange={handleHeaderChange} className="input-animated" />
          </div>
          
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Purchase Order <span style={{color:'red'}}>*</span></label>
            <select name="purchaseOrderId" value={headerData.purchaseOrderId} onChange={handleHeaderChange} className="input-animated">
              <option value="">-- Select --</option>
              {vendorPOs.map(po => (
                <option key={po.id} value={po.id}>{po.reference_no || 'PO'} - {po.order_date}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Purchase Date</label>
            <input type="date" name="purchaseDate" value={headerData.purchaseDate} onChange={handleHeaderChange} className="input-animated" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Last Challan No</label>
            <input type="text" name="lastChallanNo" value={headerData.lastChallanNo} onChange={handleHeaderChange} className="input-animated" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reference No</label>
            <input type="text" name="referenceNo" value={headerData.referenceNo} onChange={handleHeaderChange} className="input-animated" />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Delivery To</label>
            <select name="deliveryTo" value={headerData.deliveryTo} onChange={handleHeaderChange} className="input-animated">
              <option value="Central Store">Central Store</option>
              <option value="Shop">Shop</option>
            </select>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper 
        title="Product Details" 
        rightContent={
          <div style={{display:'flex', gap:'20px', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <span>Item Selected: {selectedItems.length}</span>
            <span>Challan Quantity: {selectedItems.reduce((acc, curr) => acc + Number(curr.rcvQty || 0), 0)}</span>
            <span>Challan Total: {totals.netAmount.toFixed(2)}</span>
          </div>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left', minWidth: '1800px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px' }}>Selected</th>
                <th style={{ padding: '8px' }}>Barcode</th>
                <th style={{ padding: '8px' }}>Name</th>
                <th style={{ padding: '8px' }}>WH<br/>STK</th>
                <th style={{ padding: '8px' }}>STR<br/>STK</th>
                <th style={{ padding: '8px' }}>PO Qty</th>
                <th style={{ padding: '8px' }}>Sale VAT(%)</th>
                <th style={{ padding: '8px' }}>UOM</th>
                <th style={{ padding: '8px', color: 'var(--danger)' }}>Pur. Price</th>
                <th style={{ padding: '8px', color: 'var(--danger)' }}>Sale Price</th>
                <th style={{ padding: '8px', color: 'var(--danger)' }}>Rcv Qty</th>
                <th style={{ padding: '8px' }}>Free Qty</th>
                <th style={{ padding: '8px' }}>Disc(%)</th>
                <th style={{ padding: '8px', color: 'var(--danger)' }}>Amount</th>
                <th style={{ padding: '8px' }}>Line Notes</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((item, index) => {
                const calc = calculateRow(item);
                return (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <Check size={16} color="var(--accent-primary)" />
                    </td>
                    <td style={{ padding: '8px' }}>{item.barcode}</td>
                    <td style={{ padding: '8px', maxWidth: '150px' }}>{item.item_name}</td>
                    <td style={{ padding: '8px' }}>{item.wh_stock}</td>
                    <td style={{ padding: '8px' }}>{item.str_stock}</td>
                    <td style={{ padding: '8px' }}>{item.poQty}</td>
                    <td style={{ padding: '8px' }}>{item.sale_vat_percent}</td>
                    <td style={{ padding: '8px' }}>PCS</td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={item.purPrice} onChange={(e) => updateItem(index, 'purPrice', e.target.value)} style={{ width: '60px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={item.salePrice} onChange={(e) => updateItem(index, 'salePrice', e.target.value)} style={{ width: '60px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={item.rcvQty} onChange={(e) => updateItem(index, 'rcvQty', e.target.value)} style={{ width: '60px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={item.freeQty} onChange={(e) => updateItem(index, 'freeQty', e.target.value)} style={{ width: '50px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input type="number" value={item.discPercent} onChange={(e) => updateItem(index, 'discPercent', e.target.value)} style={{ width: '50px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                    <td style={{ padding: '8px' }}>{calc.amount.toFixed(2)}</td>
                    <td style={{ padding: '8px' }}>
                      <input type="text" value={item.lineNotes || ''} onChange={(e) => updateItem(index, 'lineNotes', e.target.value)} style={{ width: '100px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', paddingTop: '20px', borderTop: '2px dotted var(--border-color)', fontSize: '0.85rem' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>Total Value <span style={{color:'red'}}>*</span></div>
            <div style={{ fontWeight: 'bold' }}>{totals.totalValue.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>Total Discount <span style={{color:'red'}}>*</span></div>
            <div style={{ fontWeight: 'bold' }}>{totals.totalDiscount.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>Free Amount <span style={{color:'red'}}>*</span></div>
            <div style={{ fontWeight: 'bold' }}>0.00</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>VAT <span style={{color:'red'}}>*</span></div>
            <div style={{ fontWeight: 'bold' }}>{totals.totalVat.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>Sub-Total <span style={{color:'red'}}>*</span></div>
            <div style={{ fontWeight: 'bold' }}>{totals.subTotal.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>Additional Discount</div>
            <input type="number" name="additionalDiscount" value={headerData.additionalDiscount} onChange={handleHeaderChange} style={{ width: '80px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>Additional Cost <span style={{color:'red'}}>*</span></div>
            <input type="number" name="additionalCost" value={headerData.additionalCost} onChange={handleHeaderChange} style={{ width: '80px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)' }}>Net Amount <span style={{color:'red'}}>*</span></div>
            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--danger)' }}>{totals.netAmount.toFixed(2)}</div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input type="checkbox" checked={printTwoCopy} onChange={(e) => setPrintTwoCopy(e.target.checked)} />
              Print two copy
            </label>
            <button className="btn-theme" onClick={() => handleSave('save')} style={{ padding: '8px 16px', backgroundColor: '#00bcd4', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
            <button className="btn-danger" onClick={() => handleSave('hold')} style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Hold</button>
            <button className="btn-info" onClick={generatePDF} style={{ padding: '8px 16px', backgroundColor: '#00e5ff', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Preview</button>
            <button className="btn-secondary" onClick={handleClear} style={{ padding: '8px 16px', backgroundColor: '#f43f5e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Clear Temp</button>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
};

export default PurchaseReceive;
