import React, { useState, useEffect } from 'react';
import { Check, Trash2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import CustomSelect from '../../components/CustomSelect';
import LoadingOverlay from '../../components/LoadingOverlay';

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
        .select('id, po_number, reference_no, created_at')
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
      const selectedPO = vendorPOs.find(p => String(p.id) === String(value));
      if (selectedPO?.reference_no) {
        setHeaderData(prev => ({ ...prev, referenceNo: selectedPO.reference_no }));
      }
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

      if (poItems && poItems.length > 0) {
        let prodMap = {};
        const missingIds = poItems.filter(item => !item.products?.item_name && item.product_id).map(item => item.product_id);
        if (missingIds.length > 0) {
          const { data: fetchedProds } = await supabase
            .from('products')
            .select('*')
            .in('id', missingIds);
          if (fetchedProds) {
            fetchedProds.forEach(p => { prodMap[p.id] = p; });
          }
        }

        const mapped = poItems.map(item => {
          const prod = item.products || prodMap[item.product_id] || {};
          return {
            id: item.product_id,
            item_name: prod.item_name || item.product_name || '',
            barcode: prod.barcode || item.barcode || '',
            sale_vat_percent: prod.sale_vat_percent || 0,
            wh_stock: prod.wh_stock || 0,
            str_stock: prod.str_stock || 0,
            poQty: item.qty || item.quantity || 0,
            rcvQty: item.qty || item.quantity || 0,
            purPrice: item.pur_price || item.unit_price || 0,
            salePrice: prod.mrp || item.mrp_price || item.mrp || 0,
            discPercent: item.disc_percent || 0,
            freeQty: item.free_qty || 0,
            uom: 'Pcs'
          };
        });
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
              const newStoreQty = (Number(sStock.stock_qty) || 0) + rcvQty;
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
  const generatePDF = (challanNo = null, refNo = null, isDuplicate = false) => {
    if (selectedItems.length === 0) {
      toast.error('Please select products/PO to preview');
      return;
    }
    
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const vendorName = vendors.find(v => String(v.id) === String(headerData.vendorId))?.name || 'N/A';

    let displayChallanNo = '';
    if (typeof challanNo === 'string' && challanNo.trim()) {
      displayChallanNo = challanNo.trim();
    } else if (headerData.lastChallanNo) {
      displayChallanNo = headerData.lastChallanNo;
    } else {
      const dateObj = new Date();
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      displayChallanNo = `#PR${yyyy}${mm}${dd}001 (PREVIEW)`;
    }

    if (!displayChallanNo.startsWith('#') && !displayChallanNo.includes('(PREVIEW)')) {
      displayChallanNo = `#${displayChallanNo}`;
    }

    const displayRefNo = (typeof refNo === 'string' && refNo.trim()) ? refNo.trim() : (headerData.referenceNo || 'N/A');
    const selectedPO = vendorPOs.find(p => String(p.id) === String(headerData.purchaseOrderId));
    const poNumber = selectedPO?.po_number || 'N/A';

    const renderPageContent = (docInstance, isSecondCopy = false) => {
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
      docInstance.text('PURCHASE RECEIVE CHALLAN', pageWidth - 14, 13, { align: 'right' });

      docInstance.setFont("helvetica", "normal");
      docInstance.setFontSize(8.5);
      docInstance.setTextColor(30, 30, 30);
      docInstance.text(`Challan No: ${displayChallanNo}`, pageWidth - 14, 18.5, { align: 'right' });
      docInstance.text(`Receive Date: ${headerData.purchaseDate}`, pageWidth - 14, 23, { align: 'right' });
      docInstance.text(`Delivery To: ${headerData.deliveryTo || storeName || 'Central Store'}`, pageWidth - 14, 27.5, { align: 'right' });

      if (isDuplicate || isSecondCopy) {
        docInstance.setFont("helvetica", "bold");
        docInstance.setFontSize(9);
        docInstance.setTextColor(220, 38, 38);
        docInstance.text('[DUPLICATE]', pageWidth - 14, 32, { align: 'right' });
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
      docInstance.text(`${displayRefNo}`, 42, 23);

      if (poNumber && poNumber !== 'N/A') {
        docInstance.setFont("helvetica", "bold");
        docInstance.text('PO Number:', 14, 27.5);
        docInstance.setFont("helvetica", "normal");
        docInstance.text(`${poNumber}`, 42, 27.5);
      }

      // 4. Table Columns: SL, Barcode, Item Name, PO Qty, Rcv Qty, Pur. Price, MRP, Disc(%), Free Qty, Value, Dis.Amt, VAT, Amount
      const tableCols = [
        "SL",
        "Barcode",
        "Item Name",
        "PO Qty",
        "Rcv Qty",
        "Pur. Price",
        "MRP",
        "Disc(%)",
        "Free Qty",
        "Value",
        "Dis.Amt",
        "VAT",
        "Amount"
      ];

      let totalPoQty = 0;
      let totalRcvQty = 0;
      let totalFreeQty = 0;
      let totalValue = 0;
      let totalDiscAmt = 0;
      let totalVat = 0;
      let totalAmount = 0;

      const tableRows = selectedItems.map((item, idx) => {
        const calc = calculateRow(item);
        totalPoQty += Number(item.poQty || 0);
        totalRcvQty += Number(item.rcvQty || 0);
        totalFreeQty += Number(item.freeQty || 0);
        totalValue += calc.value;
        totalDiscAmt += calc.discAmt;
        totalVat += calc.vatAmt;
        totalAmount += calc.amount;

        return [
          idx + 1,
          item.barcode || '-',
          item.item_name || '',
          Number(item.poQty || 0),
          Number(item.rcvQty || 0),
          Number(item.purPrice || 0).toFixed(2),
          Number(item.salePrice || 0).toFixed(2),
          item.discPercent || 0,
          item.freeQty || 0,
          calc.value.toFixed(2),
          calc.discAmt.toFixed(2),
          calc.vatAmt.toFixed(2),
          calc.amount.toFixed(2)
        ];
      });

      // Add Summary Row
      tableRows.push([
        'Total',
        '',
        '',
        totalPoQty,
        totalRcvQty,
        '',
        '',
        '',
        totalFreeQty,
        totalValue.toFixed(2),
        totalDiscAmt.toFixed(2),
        totalVat.toFixed(2),
        totalAmount.toFixed(2)
      ]);

      const startY = (isDuplicate || isSecondCopy) ? 35 : 32;

      autoTable(docInstance, {
        head: [tableCols],
        body: tableRows,
        startY: startY,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 1.8,
          textColor: [30, 30, 30]
        },
        headStyles: {
          fillColor: [46, 111, 64], // Theme Brand Green
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'right'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left', cellWidth: 26 },
          2: { halign: 'left', cellWidth: 'auto' },
          3: { halign: 'right', cellWidth: 16 },
          4: { halign: 'right', cellWidth: 16 },
          5: { halign: 'right', cellWidth: 20 },
          6: { halign: 'right', cellWidth: 20 },
          7: { halign: 'right', cellWidth: 16 },
          8: { halign: 'right', cellWidth: 16 },
          9: { halign: 'right', cellWidth: 22 },
          10: { halign: 'right', cellWidth: 18 },
          11: { halign: 'right', cellWidth: 18 },
          12: { halign: 'right', cellWidth: 24 }
        },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'left';
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

    renderPageContent(doc, false);

    if (printTwoCopy) {
      doc.addPage('landscape');
      renderPageContent(doc, true);
    }

    const cleanFilename = String(displayChallanNo).replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`PurchaseReceive_${cleanFilename}.pdf`);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color, #f8fafc)', minHeight: '100vh', fontSize: '13px' }}>
      <LoadingOverlay isLoading={isLoading} message="Saving Purchase Receive... Please wait" />
      
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
              {vendorPOs.map(po => <option key={po.id} value={po.id}>{po.po_number || po.reference_no || 'PO'}</option>)}
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
