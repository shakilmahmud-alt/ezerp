import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  Calendar, Layers, Package, DollarSign, Store, Tag, ShoppingCart, Truck
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const PurchaseOrderReport = () => {
  const { user } = useAuth();

  // Helper for today's date
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Filter States matching Screenshot
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('ALL');
  const [orderInput, setOrderInput] = useState('ALL');
  const [userInput, setUserInput] = useState('ALL');

  // Status Filter: 'PO vs Receive' | 'Upcoming' | 'Not Delivered'
  const [statusFilter, setStatusFilter] = useState('PO vs Receive');
  const statusOptions = ['PO vs Receive', 'Upcoming', 'Not Delivered'];

  // Report Type: 'Details' | 'Summary'
  const [reportType, setReportType] = useState('Details');
  const reportTypeOptions = ['Details', 'Summary'];

  // 2. Master Data Lists
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // 3. Output / Generated Report State (strictly null on mount, only populates on Show)
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Initial Load of Master Dropdowns
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [storesRes, vendorsRes, profilesRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('profiles').select('id, full_name, email')
      ]);

      setStores(storesRes.data || []);
      setVendors(vendorsRes.data || []);
      setUsersList(profilesRes.data || []);
      // STRICT RULE: Do NOT auto-generate report on mount; user must click Show
    } catch (err) {
      console.error('Error loading master data:', err);
      toast.error('Failed to load filter dropdowns');
    }
  };

  // Main Show Button Click: Calculate and set report data
  const handleShowReport = async () => {
    setLoading(true);
    setTableSearch('');
    try {
      // 1. Fetch Purchase Orders within date range
      let poQuery = supabase
        .from('purchase_orders')
        .select(`
          id, po_number, reference_no, order_date, delivery_date, 
          vendor_id, delivery_to, status, supplier_payment_type, 
          created_at, created_by
        `)
        .gte('order_date', fromDate)
        .lte('order_date', toDate)
        .order('order_date', { ascending: false });

      if (selectedVendor !== 'ALL') {
        poQuery = poQuery.eq('vendor_id', selectedVendor);
      }

      if (selectedStore !== 'ALL') {
        poQuery = poQuery.eq('delivery_to', selectedStore);
      }

      if (orderInput !== 'ALL' && orderInput.trim()) {
        poQuery = poQuery.ilike('po_number', `%${orderInput.trim()}%`);
      }

      const { data: pos, error: poErr } = await poQuery;
      if (poErr) throw poErr;

      if (!pos || pos.length === 0) {
        setReportData({
          reportType,
          statusFilter,
          fromDate,
          toDate,
          storeFilter: selectedStore,
          vendorFilter: selectedVendor,
          rows: [],
          totals: {
            total_orders: 0,
            ordered_qty: 0,
            received_qty: 0,
            pending_qty: 0,
            total_order_val: 0,
            total_rcv_val: 0
          }
        });
        toast('No purchase orders found for the selected criteria');
        setLoading(false);
        return;
      }

      const poIds = pos.map(p => p.id);

      // 2. Fetch PO Items
      const { data: poItems, error: itemsErr } = await supabase
        .from('purchase_order_items')
        .select(`
          id, purchase_order_id, product_id, qty, pur_price, mrp_price, disc_percent, free_qty, line_notes,
          products(id, barcode, user_define_barcode, code, item_name, category_id)
        `)
        .in('purchase_order_id', poIds);

      if (itemsErr) throw itemsErr;

      // 2.1 Resilient lookup map for products
      const pIds = [...new Set((poItems || []).map(i => i.product_id).filter(Boolean))];
      const productMap = new Map();
      if (pIds.length > 0) {
        const { data: prodsList } = await supabase
          .from('products')
          .select('id, barcode, user_define_barcode, code, item_name, category_id')
          .in('id', pIds);

        (prodsList || []).forEach(p => {
          productMap.set(p.id, p);
          productMap.set(String(p.id), p);
        });
      }

      // 3. Fetch Purchase Receives linked to these POs
      const { data: receives, error: rcvErr } = await supabase
        .from('purchase_receives')
        .select('id, purchase_order_id, pr_number, receive_date, status')
        .in('purchase_order_id', poIds);

      if (rcvErr) throw rcvErr;

      // 4. Fetch Receive Items if receives exist
      let rcvItemsMap = new Map(); // key `${po_id}_${product_id}` -> received qty
      let rcvValByProduct = new Map();

      if (receives && receives.length > 0) {
        const rcvIds = receives.map(r => r.id);
        const { data: rcvItems, error: rcvItemsErr } = await supabase
          .from('purchase_receive_items')
          .select('id, purchase_receive_id, product_id, rcv_qty, pur_price')
          .in('purchase_receive_id', rcvIds);

        if (!rcvItemsErr && rcvItems) {
          const rcvIdToPoId = new Map(receives.map(r => [r.id, r.purchase_order_id]));
          rcvItems.forEach(ri => {
            const poId = rcvIdToPoId.get(ri.purchase_receive_id);
            if (poId) {
              const key = `${poId}_${ri.product_id}`;
              const q = Number(ri.rcv_qty || 0);
              const p = Number(ri.pur_price || 0);
              rcvItemsMap.set(key, (rcvItemsMap.get(key) || 0) + q);
              rcvValByProduct.set(key, (rcvValByProduct.get(key) || 0) + (q * p));
            }
          });
        }
      }

      // Lookup maps
      const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
      const storeMap = new Map(stores.map(s => [s.id, s.name]));
      const poMap = new Map(pos.map(p => [p.id, p]));

      // 5. Build Detail Rows
      let detailRows = [];
      const todayStr = getTodayDate();

      (poItems || []).forEach(item => {
        const po = poMap.get(item.purchase_order_id);
        if (!po) return;

        const joinedProd = Array.isArray(item.products) ? item.products[0] : item.products;
        const prod = productMap.get(item.product_id) || productMap.get(String(item.product_id)) || joinedProd || {};
        const barcodeVal = prod.user_define_barcode || prod.barcode || prod.code || '-';
        const itemNameVal = prod.item_name || item.line_notes || `Item #${prod.code || item.product_id || '-'}`;

        // Filter Barcode if specified
        if (barcodeInput !== 'ALL' && barcodeInput.trim()) {
          const q = barcodeInput.trim().toLowerCase();
          const matchB = String(barcodeVal).toLowerCase().includes(q);
          const matchN = String(itemNameVal).toLowerCase().includes(q);
          const matchC = String(prod.code || '').toLowerCase().includes(q);
          if (!matchB && !matchN && !matchC) return;
        }

        const ordQty = Number(item.qty || 0);
        const key = `${po.id}_${item.product_id}`;
        const rcvQty = rcvItemsMap.get(key) || 0;
        const pendingQty = Math.max(0, ordQty - rcvQty);
        const unitPrice = Number(item.pur_price || 0);
        const ordVal = ordQty * unitPrice;
        const rcvVal = rcvQty * unitPrice;

        // Apply Status Filter
        if (statusFilter === 'Upcoming') {
          const isUpcoming = (po.delivery_date && po.delivery_date >= todayStr) || po.status === 'Saved';
          if (!isUpcoming || pendingQty <= 0) return;
        } else if (statusFilter === 'Not Delivered') {
          if (rcvQty > 0 && pendingQty === 0) return;
        }

        // Determine line status label
        let lineStatus = 'Pending';
        if (rcvQty >= ordQty && ordQty > 0) {
          lineStatus = 'Fully Received';
        } else if (rcvQty > 0 && rcvQty < ordQty) {
          lineStatus = 'Partial';
        } else if (po.delivery_date && po.delivery_date < todayStr && rcvQty === 0) {
          lineStatus = 'Delayed / Overdue';
        }

        detailRows.push({
          po_id: po.id,
          po_number: po.po_number || '-',
          reference_no: po.reference_no || '-',
          order_date: po.order_date || '-',
          delivery_date: po.delivery_date || '-',
          vendor_name: vendorMap.get(po.vendor_id) || 'General Vendor',
          store_name: storeMap.get(po.delivery_to) || po.delivery_to || 'Central Store',
          barcode: barcodeVal,
          item_code: prod.code || '-',
          item_name: itemNameVal,
          order_qty: ordQty,
          received_qty: rcvQty,
          pending_qty: pendingQty,
          unit_price: unitPrice,
          order_value: ordVal,
          received_value: rcvVal,
          line_status: lineStatus,
          po_status: po.status || 'Saved'
        });
      });

      let finalRows = [];

      // If Report Type is Details
      if (reportType === 'Details') {
        finalRows = detailRows
          .sort((a, b) => b.order_date.localeCompare(a.order_date) || a.po_number.localeCompare(b.po_number))
          .map((r, idx) => ({ ...r, sl: idx + 1 }));
      } 
      // If Report Type is Summary (PO Level)
      else {
        const poGroup = new Map();
        detailRows.forEach(r => {
          if (!poGroup.has(r.po_id)) {
            poGroup.set(r.po_id, {
              po_id: r.po_id,
              po_number: r.po_number,
              reference_no: r.reference_no,
              order_date: r.order_date,
              delivery_date: r.delivery_date,
              vendor_name: r.vendor_name,
              store_name: r.store_name,
              total_items: 0,
              order_qty: 0,
              received_qty: 0,
              pending_qty: 0,
              order_value: 0,
              received_value: 0,
              po_status: r.po_status
            });
          }
          const curr = poGroup.get(r.po_id);
          curr.total_items += 1;
          curr.order_qty += r.order_qty;
          curr.received_qty += r.received_qty;
          curr.pending_qty += r.pending_qty;
          curr.order_value += r.order_value;
          curr.received_value += r.received_value;
        });

        finalRows = Array.from(poGroup.values())
          .sort((a, b) => b.order_date.localeCompare(a.order_date))
          .map((r, idx) => ({
            ...r,
            sl: idx + 1,
            line_status: r.received_qty >= r.order_qty && r.order_qty > 0 
              ? 'Fully Received' 
              : r.received_qty > 0 
              ? 'Partial' 
              : 'Pending'
          }));
      }

      setReportData({
        reportType,
        statusFilter,
        fromDate,
        toDate,
        storeFilter: selectedStore,
        vendorFilter: selectedVendor,
        rows: finalRows,
        totals: {
          total_orders: new Set(detailRows.map(r => r.po_id)).size,
          ordered_qty: detailRows.reduce((s, r) => s + r.order_qty, 0),
          received_qty: detailRows.reduce((s, r) => s + r.received_qty, 0),
          pending_qty: detailRows.reduce((s, r) => s + r.pending_qty, 0),
          total_order_val: detailRows.reduce((s, r) => s + r.order_value, 0),
          total_rcv_val: detailRows.reduce((s, r) => s + r.received_value, 0)
        }
      });

      if (finalRows.length > 0) {
        toast.success(`Generated ${finalRows.length} records for Purchase Order Report`);
      } else {
        toast('No matching records found for status: ' + statusFilter);
      }

    } catch (err) {
      console.error('Error generating Purchase Order report:', err);
      toast.error('Failed to generate Purchase Order report');
    } finally {
      setLoading(false);
    }
  };

  // Reload / Reset filters and clear output
  const handleReload = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setSelectedStore('ALL');
    setSelectedVendor('ALL');
    setBarcodeInput('ALL');
    setOrderInput('ALL');
    setUserInput('ALL');
    setStatusFilter('PO vs Receive');
    setReportType('Details');
    setTableSearch('');
    setReportData(null);
    toast.success('Search criteria reset to default');
  };

  // Live client-side search inside table
  const displayedRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;
    const q = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(r => 
      Object.values(r).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
    );
  }, [reportData, tableSearch]);

  // Standardized Landscape PDF Export
  const handlePrintPDF = () => {
    if (!reportData || reportData.rows.length === 0) {
      toast.error("Please click 'Show' first to generate report");
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Header with Brand Green Banner theme (Image 1)
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
    doc.text(`PURCHASE ORDER REPORT - ${reportData.reportType.toUpperCase()}`, pageWidth - 14, 14, { align: 'right' });

    const loggedInUser = user || JSON.parse(localStorage.getItem('erp_user') || '{}');
    const preparedByName = 
      loggedInUser?.user_metadata?.full_name || 
      loggedInUser?.user_metadata?.name || 
      loggedInUser?.full_name || 
      loggedInUser?.name || 
      loggedInUser?.username || 
      (loggedInUser?.email ? loggedInUser.email.split('@')[0] : 'Super Admin');

    // 2. Meta parameters on white background (Image 1)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    const activeStoreName = reportData.storeFilter === 'ALL'
      ? 'All (All Stores)'
      : (stores.find(st => st.id === reportData.storeFilter)?.name || reportData.storeFilter);

    const activeVendorName = reportData.vendorFilter === 'ALL'
      ? 'All Vendors'
      : (vendors.find(v => v.id === reportData.vendorFilter)?.name || 'Vendor');

    doc.text(`Date Range: ${reportData.fromDate} to ${reportData.toDate}`, 14, 30);
    doc.text(`Store Scope: ${activeStoreName} | Vendor: ${activeVendorName} | Status: ${reportData.statusFilter}`, 14, 35);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

    // Table Headers and Rows
    let head = [];
    let body = [];

    if (reportData.reportType === 'Details') {
      head = [['SL', 'PO Number', 'PO Date', 'Delivery', 'Vendor', 'Store', 'Item Name', 'Order Qty', 'Rcv Qty', 'Pending', 'Rate (Tk)', 'Order Val (Tk)', 'Rcv Val (Tk)', 'Status']];
      displayedRows.forEach(r => {
        body.push([
          r.sl,
          r.po_number,
          r.order_date,
          r.delivery_date,
          r.vendor_name,
          r.store_name,
          r.item_name,
          r.order_qty,
          r.received_qty,
          r.pending_qty,
          Number(r.unit_price).toFixed(2),
          Number(r.order_value).toFixed(2),
          Number(r.received_value).toFixed(2),
          r.line_status
        ]);
      });
      body.push([
        'Total',
        `${reportData.totals.total_orders} Orders`,
        '', '', '', '',
        `${reportData.rows.length} Items Listed`,
        reportData.totals.ordered_qty,
        reportData.totals.received_qty,
        reportData.totals.pending_qty,
        '',
        Number(reportData.totals.total_order_val).toFixed(2),
        Number(reportData.totals.total_rcv_val).toFixed(2),
        ''
      ]);
    } else {
      head = [['SL', 'PO Number', 'Order Date', 'Delivery Date', 'Vendor', 'Store', 'Items', 'Order Qty', 'Rcv Qty', 'Pending', 'Order Val (Tk)', 'Rcv Val (Tk)', 'Status']];
      displayedRows.forEach(r => {
        body.push([
          r.sl,
          r.po_number,
          r.order_date,
          r.delivery_date,
          r.vendor_name,
          r.store_name,
          r.total_items,
          r.order_qty,
          r.received_qty,
          r.pending_qty,
          Number(r.order_value).toFixed(2),
          Number(r.received_value).toFixed(2),
          r.line_status
        ]);
      });
      body.push([
        'Total',
        `${reportData.rows.length} POs Listed`,
        '', '', '', '', '',
        reportData.totals.ordered_qty,
        reportData.totals.received_qty,
        reportData.totals.pending_qty,
        Number(reportData.totals.total_order_val).toFixed(2),
        Number(reportData.totals.total_rcv_val).toFixed(2),
        ''
      ]);
    }

    autoTable(doc, {
      head,
      body,
      startY: 40,
      theme: 'grid',
      headStyles: {
        fillColor: [46, 111, 64],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59]
      },
      didParseCell: function (data) {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    // Bottom Signatures (Image 2)
    const finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 22 : pageHeight - 25;
    const sigY = Math.max(finalY, pageHeight - 22);

    doc.setDrawColor(160, 174, 192);

    // Prepared By: User Name ABOVE line, Label BELOW line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(preparedByName, 47.5, sigY - 2.5, { align: 'center' });

    doc.line(20, sigY, 75, sigY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared By', 47.5, sigY + 5, { align: 'center' });

    // Checked By
    doc.line(pageWidth / 2 - 27.5, sigY, pageWidth / 2 + 27.5, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

    // Authorized Signature
    doc.line(pageWidth - 75, sigY, pageWidth - 20, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature', pageWidth - 47.5, sigY + 5, { align: 'center' });

    // Page Number
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
    }

    doc.save(`Purchase_Order_Report_${reportData.reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Standardized Excel Export
  const handleExportExcel = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first to export Excel');
      return;
    }

    const wsData = [
      ['E-COMMERCE GENERAL ERP'],
      ['PURCHASE ORDER REPORT'],
      [`Report Type: ${reportData.reportType}`, `Status: ${reportData.statusFilter}`],
      [`Date Range: ${reportData.fromDate} to ${reportData.toDate}`, `Generated: ${new Date().toLocaleDateString()}`],
      []
    ];

    if (reportData.reportType === 'Details') {
      wsData.push(['SL', 'PO Number', 'PO Date', 'Delivery Date', 'Vendor', 'Store', 'Barcode', 'Item Code', 'Item Name', 'Order Qty', 'Received Qty', 'Pending Qty', 'Rate (TK)', 'Order Value (TK)', 'Received Value (TK)', 'Status']);
      displayedRows.forEach(r => {
        wsData.push([r.sl, r.po_number, r.order_date, r.delivery_date, r.vendor_name, r.store_name, r.barcode, r.item_code, r.item_name, r.order_qty, r.received_qty, r.pending_qty, r.unit_price, r.order_value, r.received_value, r.line_status]);
      });
      wsData.push(['Total', `${reportData.totals.total_orders} Orders`, '', '', '', '', '', '', `${reportData.rows.length} Items`, reportData.totals.ordered_qty, reportData.totals.received_qty, reportData.totals.pending_qty, '', reportData.totals.total_order_val, reportData.totals.total_rcv_val, '']);
    } else {
      wsData.push(['SL', 'PO Number', 'Order Date', 'Delivery Date', 'Vendor', 'Store', 'Items Count', 'Order Qty', 'Received Qty', 'Pending Qty', 'Order Value (TK)', 'Received Value (TK)', 'Status']);
      displayedRows.forEach(r => {
        wsData.push([r.sl, r.po_number, r.order_date, r.delivery_date, r.vendor_name, r.store_name, r.total_items, r.order_qty, r.received_qty, r.pending_qty, r.order_value, r.received_value, r.line_status]);
      });
      wsData.push(['Total', `${reportData.rows.length} Orders`, '', '', '', '', '', reportData.totals.ordered_qty, reportData.totals.received_qty, reportData.totals.pending_qty, reportData.totals.total_order_val, reportData.totals.total_rcv_val, '']);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PO Report');
    XLSX.writeFile(wb, `Purchase_Order_Report_${reportData.reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Page Title */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          Purchase Order Report
        </h1>
      </div>

      {/* FILTER SEARCH CRITERIA CARD (Matching User Screenshot) */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        padding: '24px 28px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>

        {/* 2-Column Grid Layout matching screenshot */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '40px',
          rowGap: '12px',
          marginBottom: '22px'
        }}>
          
          {/* Row 1: From Date | To Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                color: '#1e293b',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                color: '#1e293b',
                outline: 'none'
              }}
            />
          </div>

          {/* Row 2: Store | Vendor */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Store</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                color: '#1e293b',
                outline: 'none'
              }}
            >
              <option value="ALL">ALL</option>
              {stores.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                color: '#1e293b',
                outline: 'none'
              }}
            >
              <option value="ALL">Select Vendor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Row 3: Barcode | Order */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Barcode</label>
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onFocus={() => { if (barcodeInput === 'ALL') setBarcodeInput(''); }}
              onBlur={() => { if (!barcodeInput.trim()) setBarcodeInput('ALL'); }}
              placeholder="ALL"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                color: '#1e293b',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Order</label>
            <input
              type="text"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              onFocus={() => { if (orderInput === 'ALL') setOrderInput(''); }}
              onBlur={() => { if (!orderInput.trim()) setOrderInput('ALL'); }}
              placeholder="ALL"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                color: '#1e293b',
                outline: 'none'
              }}
            />
          </div>

          {/* Row 4: User | (Empty on Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>User</label>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onFocus={() => { if (userInput === 'ALL') setUserInput(''); }}
              onBlur={() => { if (!userInput.trim()) setUserInput('ALL'); }}
              placeholder="ALL"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                color: '#1e293b',
                outline: 'none'
              }}
            />
          </div>

          <div></div>
        </div>

        {/* STATUS SECTION (Round Green Radio Bullets matching Image) */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
            Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
            {statusOptions.map(stItem => {
              const isSelected = statusFilter === stItem;
              return (
                <label
                  key={stItem}
                  onClick={() => setStatusFilter(stItem)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#1e293b' : '#475569',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  {/* Round Green Radio Bullet */}
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #2e6f40' : '2px solid #94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    boxShadow: isSelected ? '0 0 0 1px rgba(46, 111, 64, 0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}>
                    {isSelected && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#2e6f40'
                      }} />
                    )}
                  </div>
                  {stItem}
                </label>
              );
            })}
          </div>
        </div>

        {/* REPORT TYPE SECTION (Details, Summary with Round Green Radio Bullets) */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
            Report Type
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {reportTypeOptions.map(rTypeItem => {
              const isSelected = reportType === rTypeItem;
              return (
                <label
                  key={rTypeItem}
                  onClick={() => setReportType(rTypeItem)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#1e293b' : '#475569',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  {/* Round Green Radio Bullet */}
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #2e6f40' : '2px solid #94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fff',
                    boxShadow: isSelected ? '0 0 0 1px rgba(46, 111, 64, 0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}>
                    {isSelected && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#2e6f40'
                      }} />
                    )}
                  </div>
                  {rTypeItem}
                </label>
              );
            })}
          </div>
        </div>

        {/* PRINT TYPE BUTTONS (Show, Reload, Download PDF, Show Excel) */}
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Print Type
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Show Button (Aero Sky Blue .btn-info) */}
            <button
              onClick={handleShowReport}
              disabled={loading}
              className="btn-info"
              style={{
                padding: '6px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              Show
            </button>

            {/* Reload Button (Aero Ruby Red .btn-danger) */}
            <button
              onClick={handleReload}
              disabled={loading}
              className="btn-danger"
              style={{
                padding: '6px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} />
              Reload
            </button>

            {/* Download PDF Button (.btn-theme Emerald Green) */}
            <button
              onClick={handlePrintPDF}
              disabled={loading || !reportData || reportData.rows.length === 0}
              className="btn-theme"
              style={{
                padding: '6px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: (!reportData || reportData.rows.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              <Download size={14} />
              Download PDF
            </button>

            {/* Show / Export Excel Button (.btn-info Sky Blue) */}
            <button
              onClick={handleExportExcel}
              disabled={loading || !reportData || reportData.rows.length === 0}
              className="btn-info"
              style={{
                padding: '6px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: (!reportData || reportData.rows.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              <FileSpreadsheet size={14} />
              Show Excel
            </button>
          </div>
        </div>

      </div>

      {/* REPORT RESULTS DISPLAY CARD (ONLY SHOWN AFTER CLICKING SHOW) */}
      {reportData && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>

          {/* KPI Summary Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase' }}>Purchase Orders</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                {reportData.totals.total_orders} Orders
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>Total Ordered Qty</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {Number(reportData.totals.ordered_qty).toLocaleString()} Pcs
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Received Qty</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                {Number(reportData.totals.received_qty).toLocaleString()} Pcs
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>Pending / Balance Qty</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                {Number(reportData.totals.pending_qty).toLocaleString()} Pcs
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600, textTransform: 'uppercase' }}>Total Order Value</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                ৳ {Number(reportData.totals.total_order_val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Table Search & Meta Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                Purchase Order {reportData.reportType} ({reportData.statusFilter})
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Date: <span style={{ fontWeight: 600, color: '#1e293b' }}>{reportData.fromDate} to {reportData.toDate}</span>
                {' | '}Store: <span style={{ fontWeight: 600, color: '#1e293b' }}>{reportData.storeFilter}</span>
                {' | '}Showing {displayedRows.length} records
              </div>
            </div>

            {/* Live Table Search */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search within results..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* TABLE COMPONENT */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
              
              {/* THEAD */}
              <thead>
                <tr style={{ backgroundColor: '#2e6f40', color: '#fff' }}>
                  
                  {/* Details View */}
                  {reportData.reportType === 'Details' && (
                    <>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>PO Number</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>PO Date</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Delivery Date</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Vendor</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Store</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Name</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Order Qty</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Rcv Qty</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Pending</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Unit Rate (৳)</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Order Value (৳)</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Rcv Value (৳)</th>
                      <th style={{ padding: '7px 8px', textAlign: 'center' }}>Status</th>
                    </>
                  )}

                  {/* Summary View */}
                  {reportData.reportType === 'Summary' && (
                    <>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>PO Number</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Order Date</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Delivery Date</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Vendor</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Store</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Items</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Order Qty</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Rcv Qty</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Pending</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Order Value (৳)</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Rcv Value (৳)</th>
                      <th style={{ padding: '7px 10px', textAlign: 'center' }}>Status</th>
                    </>
                  )}

                </tr>
              </thead>

              {/* TBODY */}
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      No matching purchase orders found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((r, idx) => (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      {/* Details View Rows */}
                      {reportData.reportType === 'Details' && (
                        <>
                          <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2e6f40', fontFamily: 'monospace' }}>{r.po_number}</td>
                          <td style={{ padding: '6px 8px', color: '#475569' }}>{r.order_date}</td>
                          <td style={{ padding: '6px 8px', color: '#475569' }}>{r.delivery_date}</td>
                          <td style={{ padding: '6px 8px' }}>{r.vendor_name}</td>
                          <td style={{ padding: '6px 8px' }}>{r.store_name}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.item_name}</div>
                            {r.barcode !== '-' && (
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                Barcode: {r.barcode} {r.item_code && r.item_code !== '-' && `| Code: ${r.item_code}`}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{r.order_qty}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{r.received_qty}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: r.pending_qty > 0 ? '#dc2626' : '#64748b' }}>
                            {r.pending_qty}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.unit_price).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{Number(r.order_value).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>{Number(r.received_value).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: r.line_status === 'Fully Received' ? '#ecfdf5' : r.line_status === 'Partial' ? '#fef3c7' : '#fef2f2',
                              color: r.line_status === 'Fully Received' ? '#047857' : r.line_status === 'Partial' ? '#b45309' : '#dc2626'
                            }}>
                              {r.line_status}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Summary View Rows */}
                      {reportData.reportType === 'Summary' && (
                        <>
                          <td style={{ padding: '7px 10px' }}>{r.sl}</td>
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: '#2e6f40', fontFamily: 'monospace' }}>{r.po_number}</td>
                          <td style={{ padding: '7px 10px', color: '#475569' }}>{r.order_date}</td>
                          <td style={{ padding: '7px 10px', color: '#475569' }}>{r.delivery_date}</td>
                          <td style={{ padding: '7px 10px' }}>{r.vendor_name}</td>
                          <td style={{ padding: '7px 10px' }}>{r.store_name}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>{r.total_items}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700 }}>{r.order_qty}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{r.received_qty}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: r.pending_qty > 0 ? '#dc2626' : '#64748b' }}>
                            {r.pending_qty}
                          </td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{Number(r.order_value).toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>{Number(r.received_value).toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: r.line_status === 'Fully Received' ? '#ecfdf5' : r.line_status === 'Partial' ? '#fef3c7' : '#fef2f2',
                              color: r.line_status === 'Fully Received' ? '#047857' : r.line_status === 'Partial' ? '#b45309' : '#dc2626'
                            }}>
                              {r.line_status}
                            </span>
                          </td>
                        </>
                      )}

                    </tr>
                  ))
                )}
              </tbody>

              {/* TFOOT TOTALS */}
              {displayedRows.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                    
                    {reportData.reportType === 'Details' && (
                      <>
                        <td style={{ padding: '9px 8px' }}>TOTAL</td>
                        <td colSpan="6" style={{ padding: '9px 8px' }}>
                          {reportData.totals.total_orders} Orders ({reportData.rows.length} Items Listed)
                        </td>
                        <td style={{ padding: '9px 8px', textAlign: 'right' }}>{reportData.totals.ordered_qty}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right', color: '#15803d' }}>{reportData.totals.received_qty}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right', color: '#dc2626' }}>{reportData.totals.pending_qty}</td>
                        <td></td>
                        <td style={{ padding: '9px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_order_val).toFixed(2)}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right', color: '#15803d' }}>৳ {Number(reportData.totals.total_rcv_val).toFixed(2)}</td>
                        <td></td>
                      </>
                    )}

                    {reportData.reportType === 'Summary' && (
                      <>
                        <td style={{ padding: '9px 10px' }}>TOTAL</td>
                        <td colSpan="6" style={{ padding: '9px 10px' }}>
                          {reportData.rows.length} Purchase Orders Listed
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>{reportData.totals.ordered_qty}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#15803d' }}>{reportData.totals.received_qty}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#dc2626' }}>{reportData.totals.pending_qty}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_order_val).toFixed(2)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#15803d' }}>৳ {Number(reportData.totals.total_rcv_val).toFixed(2)}</td>
                        <td></td>
                      </>
                    )}

                  </tr>
                </tfoot>
              )}

            </table>
          </div>

        </div>
      )}

    </div>
  );
};

export default PurchaseOrderReport;
