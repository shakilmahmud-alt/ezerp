import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from '../components/CustomSelect';

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
  const [stores, setStores] = useState([]);
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
      const [vendorRes, storeRes] = await Promise.all([
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('stores').select('id, name').eq('status', 'ACTIVE').order('name')
      ]);
      setVendors(vendorRes.data || []);
      setStores(storeRes.data || []);
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

        if (itemsData && itemsData.length > 0) {
          let prodMap = {};
          const missingIds = itemsData.filter(item => !item.products?.item_name && item.product_id).map(item => item.product_id);
          if (missingIds.length > 0) {
            const { data: fetchedProds } = await supabase
              .from('products')
              .select('id, item_name, barcode, sale_vat_percent, mrp, wh_stock, str_stock')
              .in('id', missingIds);
            if (fetchedProds) {
              fetchedProds.forEach(p => { prodMap[p.id] = p; });
            }
          }

          const mappedItems = itemsData.map(item => {
            const prod = item.products || prodMap[item.product_id] || {};
            return {
              id: item.product_id,
              item_name: prod.item_name || '',
              barcode: prod.barcode || '',
              sale_vat_percent: prod.sale_vat_percent || 0,
              wh_stock: prod.wh_stock || 0,
              str_stock: prod.str_stock || 0,
              poQty: item.po_qty,
              rcvQty: item.rcv_qty,
              purPrice: item.pur_price,
              salePrice: item.sale_price,
              discPercent: item.disc_percent,
              freeQty: item.free_qty,
              lineAmount: item.line_amount
            };
          });
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
        .select('id, po_number, reference_no, order_date')
        .eq('vendor_id', vendorId)
        .neq('status', 'Received')
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

      if (data && data.length > 0) {
        let prodMap = {};
        const missingIds = data.filter(item => !item.products?.item_name && item.product_id).map(item => item.product_id);
        if (missingIds.length > 0) {
          const { data: fetchedProds } = await supabase
            .from('products')
            .select('id, item_name, barcode, sale_vat_percent, mrp, wh_stock, str_stock')
            .in('id', missingIds);
          if (fetchedProds) {
            fetchedProds.forEach(p => { prodMap[p.id] = p; });
          }
        }

        const mappedItems = data.map(item => {
          const prod = item.products || prodMap[item.product_id] || {};
          const prevRcv = prevRcvQtyByProduct[item.product_id] || 0;
          const leftQty = Math.max(0, item.qty - prevRcv);
          
          return {
            id: item.product_id,
            item_name: prod.item_name || '',
            barcode: prod.barcode || '',
            sale_vat_percent: prod.sale_vat_percent || 0,
            wh_stock: prod.wh_stock || 0,
            str_stock: prod.str_stock || 0,
            poQty: leftQty,
            rcvQty: leftQty,
            purPrice: item.pur_price,
            salePrice: prod.mrp || item.mrp_price,
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
      const selectedPO = vendorPOs.find(p => String(p.id) === String(value));
      setHeaderData(prev => ({
        ...prev,
        [name]: value,
        referenceNo: selectedPO?.reference_no || prev.referenceNo || ''
      }));
      loadPOItems(value);
    } else {
      setHeaderData(prev => ({ ...prev, [name]: value }));
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
          const dateObj = new Date();
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          const prefix = `PR${yyyy}${mm}${dd}`;

          const { data: allPRs } = await supabase
            .from('purchase_receives')
            .select('last_challan_no');

          let maxSeq = 0;
          if (allPRs && allPRs.length > 0) {
            allPRs.forEach(d => {
              if (d.last_challan_no) {
                const clean = String(d.last_challan_no).replace(/^[#]/, '').trim();
                if (clean.startsWith(prefix)) {
                  const seqPart = parseInt(clean.substring(prefix.length), 10);
                  if (!isNaN(seqPart) && seqPart > maxSeq) {
                    maxSeq = seqPart;
                  }
                }
              }
            });
          }
          finalChallanNo = `#PR${yyyy}${mm}${dd}${String(maxSeq + 1).padStart(3, '0')}`;
        }
        if (!finalReferenceNo) {
          finalReferenceNo = `REF-${new Date().getTime()}`;
        }
      }

      const payload = {
        vendor_id: headerData.vendorId,
        purchase_order_id: headerData.purchaseOrderId || null,
        from_date: headerData.fromDate,
        to_date: headerData.toDate,
        purchase_date: headerData.purchaseDate,
        last_challan_no: finalChallanNo,
        reference_no: finalReferenceNo,
        delivery_to: headerData.deliveryTo,
        additional_discount: Number(headerData.additionalDiscount || 0),
        additional_cost: Number(headerData.additionalCost || 0),
        status: status,
        total_value: totals.totalValue,
        total_discount: totals.totalDiscount,
        vat_amount: totals.totalVat,
        sub_total: totals.subTotal,
        net_amount: totals.netAmount
      };

      if (receiveId) {
        payload.id = receiveId;
      }

      const { data: prData, error: prError } = await supabase
        .from('purchase_receives')
        .upsert(payload)
        .select()
        .single();

      if (prError) throw prError;
      const currentReceiveId = prData?.id || receiveId;

      if (!currentReceiveId) {
        throw new Error('Failed to retrieve Purchase Receive ID');
      }

      // Delete existing items
      const { error: delError } = await supabase
        .from('purchase_receive_items')
        .delete()
        .eq('purchase_receive_id', currentReceiveId);
      if (delError) throw delError;

      // Insert items
      const itemsPayload = selectedItems.map(item => {
        const calc = calculateRow(item);
        return {
          purchase_receive_id: currentReceiveId,
          product_id: item.id,
          po_qty: item.poQty,
          rcv_qty: item.rcvQty,
          pur_price: item.purPrice,
          sale_price: item.salePrice,
          disc_percent: item.discPercent,
          free_qty: item.freeQty,
          line_amount: calc.amount,
          line_notes: item.lineNotes
        };
      });

      const { error: itemsError } = await supabase
        .from('purchase_receive_items')
        .insert(itemsPayload);
      if (itemsError) throw itemsError;

      // Update Stocks and PO status if Saved
      if (status === 'Saved') {
        let allReceived = true;
        const targetStore = stores.find(s => s.name === headerData.deliveryTo);

        for (const item of selectedItems) {
          const rcvQty = Number(item.rcvQty || 0);
          if (rcvQty > 0) {
            if (headerData.deliveryTo === 'Central Store') {
              const { data: prod } = await supabase
                .from('products')
                .select('wh_stock')
                .eq('id', item.id)
                .single();
              if (prod) {
                await supabase
                  .from('products')
                  .update({ wh_stock: (prod.wh_stock || 0) + rcvQty })
                  .eq('id', item.id);
              }
            } else if (targetStore) {
              const { data: sStock } = await supabase
                .from('store_stocks')
                .select('stock_qty')
                .eq('store_id', targetStore.id)
                .eq('product_id', item.id)
                .single();

              if (sStock) {
                await supabase
                  .from('store_stocks')
                  .update({ stock_qty: (sStock.stock_qty || 0) + rcvQty })
                  .eq('store_id', targetStore.id)
                  .eq('product_id', item.id);
              } else {
                await supabase.from('store_stocks').insert([{
                  store_id: targetStore.id,
                  product_id: item.id,
                  stock_qty: rcvQty
                }]);
              }
            }
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
        generatePDF(finalChallanNo, finalReferenceNo, false);
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
      docInstance.text(`Delivery To: ${headerData.deliveryTo || 'Central Store'}`, pageWidth - 14, 27.5, { align: 'right' });

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
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      <SectionWrapper title="Purchase Receive">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vendor Name <span style={{color:'red'}}>*</span></label>
            <CustomSelect name="vendorId" value={headerData.vendorId} onChange={handleHeaderChange} className="input-animated">
              <option value="">-- Select a Vendor --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </CustomSelect>
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
            <CustomSelect name="purchaseOrderId" value={headerData.purchaseOrderId} onChange={handleHeaderChange} className="input-animated">
              <option value="">-- Select --</option>
              {vendorPOs.map(po => {
                const poLabel = po.po_number || po.reference_no || 'PO';
                return (
                  <option key={po.id} value={po.id}>
                    {poLabel} {po.order_date ? `- ${po.order_date}` : ''}
                  </option>
                );
              })}
            </CustomSelect>
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
            <CustomSelect name="deliveryTo" value={headerData.deliveryTo} onChange={handleHeaderChange} className="input-animated">
              <option value="Central Store">Central Store</option>
              {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </CustomSelect>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={printTwoCopy} onChange={(e) => setPrintTwoCopy(e.target.checked)} style={{ accentColor: 'var(--accent-primary)' }} />
              Print two copy
            </label>
            <button className="btn-theme" onClick={() => handleSave('save')} style={{ padding: '8px 18px', backgroundColor: 'var(--accent-primary, #2e6f40)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
            <button className="btn-danger" onClick={() => handleSave('hold')} style={{ padding: '8px 18px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Hold</button>
            <button className="btn-info" onClick={() => generatePDF()} style={{ padding: '8px 18px', backgroundColor: '#166534', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Preview</button>
            <button className="btn-secondary" onClick={handleClear} style={{ padding: '8px 18px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Clear Temp</button>
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
};

export default PurchaseReceive;
