import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  Calendar, Layers, Package, DollarSign, Store, Tag, ShoppingCart, Truck,
  FileText, CheckCircle2, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const StoreRequisitionReport = () => {
  const { user } = useAuth();

  // Helper for today's date (YYYY-MM-DD)
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Filter States (Matching Screenshot)
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('ALL');

  // Report Type Options: All, Requisition, Approve, Deliver
  const [reportType, setReportType] = useState('All');
  const reportTypeOptions = ['All', 'Requisition', 'Approve', 'Deliver'];

  // 2. Master Data Lists
  const [storesList, setStoresList] = useState([]);
  const [storeTypesList, setStoreTypesList] = useState(['ALL', 'Retail', 'Warehouse', 'Branch', 'Franchise']);
  const [vendorsList, setVendorsList] = useState([]);
  const [productsMap, setProductsMap] = useState(new Map());

  // 3. Output / Generated Report State (strictly null on mount, only populates on Show click)
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Initial Load of Master Dropdowns
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [storesRes, vendorsRes, prodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, category_id, purchase_price, mrp')
      ]);

      const fetchedStores = storesRes.data || [];
      setStoresList(fetchedStores);
      setVendorsList(vendorsRes.data || []);

      // Extract unique store types
      const types = ['ALL', ...new Set(fetchedStores.map(s => s.shop_type).filter(Boolean))];
      if (types.length > 1) {
        setStoreTypesList(types);
      }

      const pMap = new Map();
      (prodsRes.data || []).forEach(p => {
        pMap.set(p.id, p);
        pMap.set(String(p.id), p);
        if (p.barcode) pMap.set(p.barcode, p);
        if (p.user_define_barcode) pMap.set(p.user_define_barcode, p);
        if (p.code) pMap.set(p.code, p);
      });
      setProductsMap(pMap);
      // STRICT RULE: Do NOT auto-generate report on mount; user must click Show
    } catch (err) {
      console.error('Error loading master data:', err);
      toast.error('Failed to load filter dropdowns');
    }
  };

  // Filtered stores based on store type
  const availableStores = useMemo(() => {
    if (storeType === 'ALL') return storesList;
    return storesList.filter(s => s.shop_type?.toLowerCase() === storeType.toLowerCase());
  }, [storesList, storeType]);

  // Main Show Button Click: Calculate and set report data
  const handleShowReport = async () => {
    setLoading(true);
    setTableSearch('');
    try {
      // 1. Fetch Store Requisitions within date range
      let srQuery = supabase
        .from('store_requisitions')
        .select('*')
        .gte('requisition_date', fromDate)
        .lte('requisition_date', toDate)
        .order('requisition_date', { ascending: false });

      if (selectedStore !== 'ALL') {
        srQuery = srQuery.eq('shop_id', selectedStore);
      }

      const { data: srData, error: srErr } = await srQuery;
      if (srErr) console.warn("store_requisitions query note:", srErr);

      // Also query fallback requisitions table for compatibility
      let reqQuery = supabase
        .from('requisitions')
        .select('*')
        .gte('requisition_date', fromDate)
        .lte('requisition_date', toDate)
        .order('requisition_date', { ascending: false });

      if (selectedStore !== 'ALL') {
        reqQuery = reqQuery.eq('shop_id', selectedStore);
      }

      const { data: reqData, error: reqErr } = await reqQuery;
      if (reqErr) console.warn("requisitions query note:", reqErr);

      // Fetch tracking delivery and receive records to cross-reference status
      let trackingQuery = supabase
        .from('requisitions')
        .select('*')
        .or('status.eq.Received,status.eq.Receive Challan,status.eq.Delivered,challan_no.not.is.null')
        .order('created_at', { ascending: false })
        .limit(200);

      const { data: trackingData } = await trackingQuery;

      // Delivery tracking lookup map by challan_no or requisition_no
      const deliveryLookup = new Map();
      (trackingData || []).forEach(tr => {
        if (tr.challan_no) {
          deliveryLookup.set(tr.challan_no, tr);
        }
        if (tr.requisition_no) {
          deliveryLookup.set(tr.requisition_no, tr);
        }
      });

      // Merge and deduplicate requisitions by requisition_no
      const reqMap = new Map();
      
      (srData || []).forEach(r => {
        if (r.requisition_no) {
          const track = deliveryLookup.get(r.requisition_no);
          let effectiveStatus = r.status || 'Pending';
          if (track) {
            if (track.status === 'Received' || track.status === 'Receive Challan') {
              effectiveStatus = 'Received';
            } else if (track.status === 'Delivered' || track.challan_no?.startsWith('DLV')) {
              effectiveStatus = 'Delivered';
            }
          }
          reqMap.set(r.requisition_no, { 
            ...r, 
            effectiveStatus,
            delivery_challan: track?.challan_no || track?.requisition_no || r.delivery_date || null,
            source: 'store_requisitions' 
          });
        }
      });

      (reqData || []).forEach(r => {
        if (r.requisition_no) {
          if (reqMap.has(r.requisition_no)) {
            const existing = reqMap.get(r.requisition_no);
            existing.fallback_req_id = r.id;
            if ((r.status === 'Received' || r.status === 'Delivered') && existing.effectiveStatus !== 'Received') {
              existing.effectiveStatus = r.status;
            }
          } else if (!r.requisition_no.startsWith('SDR')) {
            const storeObj = storesList.find(s => s.id === r.shop_id);
            const track = deliveryLookup.get(r.requisition_no) || (r.challan_no ? deliveryLookup.get(r.challan_no) : null);
            let effectiveStatus = r.status || 'Pending';
            if (track) {
              if (track.status === 'Received' || track.status === 'Receive Challan') {
                effectiveStatus = 'Received';
              } else if (track.status === 'Delivered' || track.challan_no?.startsWith('DLV')) {
                effectiveStatus = 'Delivered';
              }
            }
            reqMap.set(r.requisition_no, { 
              ...r, 
              effectiveStatus,
              delivery_challan: r.challan_no || track?.challan_no || null,
              shop_name: r.shop_name || storeObj?.name || 'Store',
              source: 'requisitions' 
            });
          }
        }
      });

      let allRequisitions = Array.from(reqMap.values());

      // Filter strictly by Date Range (YYYY-MM-DD)
      allRequisitions = allRequisitions.filter(r => {
        const d = (r.requisition_date || r.created_at || '').slice(0, 10);
        if (fromDate && d && d < fromDate) return false;
        if (toDate && d && d > toDate) return false;
        return true;
      });

      // Filter by storeType if needed
      if (storeType !== 'ALL') {
        allRequisitions = allRequisitions.filter(r => {
          const sObj = storesList.find(s => s.id === r.shop_id || s.name?.toLowerCase() === r.shop_name?.toLowerCase());
          return sObj?.shop_type?.toLowerCase() === storeType.toLowerCase();
        });
      }

      // Filter by Report Type:
      // Options: 'All', 'Requisition', 'Approve', 'Deliver'
      if (reportType === 'Requisition') {
        // Requisition Report includes all store requisitions
        allRequisitions = allRequisitions.filter(r => {
          return !r.requisition_no?.startsWith('SDR') && !r.requisition_no?.startsWith('DLV');
        });
      } else if (reportType === 'Approve') {
        // Approved strictly includes requisitions that have been approved or delivered/received (NOT Pending)
        allRequisitions = allRequisitions.filter(r => {
          const st = (r.effectiveStatus || r.status || '').toLowerCase();
          return st === 'approved' || st === 'approve' || st === 'delivered' || st === 'received';
        });
      } else if (reportType === 'Deliver') {
        // Deliver strictly includes requisitions that have reached delivery or received status
        allRequisitions = allRequisitions.filter(r => {
          const st = (r.effectiveStatus || r.status || '').toLowerCase();
          return st === 'delivered' || st === 'deliver' || st === 'received' || st === 'receive challan' || st === 'completed';
        });
      }

      if (allRequisitions.length === 0) {
        setReportData({
          reportType,
          fromDate,
          toDate,
          storeType,
          selectedStore,
          rows: [],
          totals: {
            total_requisitions: 0,
            total_items: 0,
            total_req_qty: 0,
            total_app_qty: 0,
            total_cost_value: 0,
            total_mrp_value: 0
          }
        });
        toast('No store requisitions found for the selected criteria');
        setLoading(false);
        return;
      }

      // 2. Fetch Requisition Items
      const srIds = allRequisitions.filter(r => r.source === 'store_requisitions').map(r => r.id);
      const reqIds = allRequisitions.map(r => r.fallback_req_id || (r.source === 'requisitions' ? r.id : null)).filter(Boolean);

      let srItems = [];
      let reqItems = [];

      if (srIds.length > 0) {
        const { data: sriData, error: sriErr } = await supabase
          .from('store_requisition_items')
          .select('*')
          .in('requisition_id', srIds);
        if (!sriErr && sriData) srItems = sriData;
      }

      if (reqIds.length > 0) {
        const { data: riData, error: riErr } = await supabase
          .from('requisition_items')
          .select('*')
          .in('requisition_id', reqIds);
        if (!riErr && riData) reqItems = riData;
      }

      // Group items by requisition_id
      const itemsByReqId = new Map();
      srItems.forEach(item => {
        const list = itemsByReqId.get(item.requisition_id) || [];
        list.push(item);
        itemsByReqId.set(item.requisition_id, list);
      });
      reqItems.forEach(item => {
        const list = itemsByReqId.get(item.requisition_id) || [];
        list.push(item);
        itemsByReqId.set(item.requisition_id, list);
      });

      // 3. Build Detailed Report Rows
      const rows = [];
      let totalReqQty = 0;
      let totalAppQty = 0;
      let totalCostValue = 0;
      let totalMrpValue = 0;

      allRequisitions.forEach(req => {
        let items = itemsByReqId.get(req.id) || [];
        if (items.length === 0 && req.fallback_req_id) {
          items = itemsByReqId.get(req.fallback_req_id) || [];
        }

        const reqDate = req.requisition_date 
          ? new Date(req.requisition_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : '';

        const effectiveStatus = req.effectiveStatus || req.status || 'Pending';

        if (items.length === 0) {
          // Add a single header-level row if items are empty
          const rQty = Number(req.total_qty || 0);
          const cVal = Number(req.total_value || req.total_cost_value || 0);
          totalReqQty += rQty;
          totalAppQty += rQty;
          totalCostValue += cVal;

          rows.push({
            sl: rows.length + 1,
            requisition_id: req.id,
            requisition_no: req.requisition_no,
            requisition_date: reqDate,
            raw_date: req.requisition_date,
            store_name: req.shop_name || 'Store',
            vendor_name: req.vendor || 'ANY',
            prepared_by: req.prepared_by || 'Staff',
            status: effectiveStatus,
            delivery_date: req.delivery_challan || (req.delivery_date ? req.delivery_date.slice(0, 10) : '-'),
            barcode: '-',
            product_code: '-',
            item_name: 'General Requisition Items',
            category: '-',
            cpu: 0,
            mrp: 0,
            req_qty: rQty,
            app_qty: rQty,
            cost_value: cVal,
            mrp_value: 0
          });
        } else {
          items.forEach(item => {
            const prod = productsMap.get(item.product_id) || productsMap.get(item.barcode) || {};
            const barcode = item.barcode || prod.barcode || item.product_code || '-';
            const code = item.product_code || prod.code || '-';
            const itemName = item.product_name || prod.item_name || 'Item';
            const category = item.category || prod.category_id || '-';
            const cpu = Number(item.cpu || prod.purchase_price || 0);
            const mrp = Number(item.mrp || prod.mrp || 0);
            const reqQ = Number(item.req_qty || 0);
            const appQ = Number(item.app_qty !== undefined ? item.app_qty : item.approve_qty !== undefined ? item.approve_qty : reqQ);
            const costVal = Number(item.cost_value || (cpu * (appQ || reqQ)));
            const mrpVal = mrp * (appQ || reqQ);

            totalReqQty += reqQ;
            totalAppQty += appQ;
            totalCostValue += costVal;
            totalMrpValue += mrpVal;

            rows.push({
              sl: rows.length + 1,
              requisition_id: req.id,
              requisition_no: req.requisition_no,
              requisition_date: reqDate,
              raw_date: req.requisition_date,
              store_name: req.shop_name || 'Store',
              vendor_name: req.vendor || 'ANY',
              prepared_by: req.prepared_by || 'Staff',
              status: effectiveStatus,
              delivery_date: req.delivery_challan || (req.delivery_date ? req.delivery_date.slice(0, 10) : '-'),
              barcode: barcode,
              product_code: code,
              item_name: itemName,
              category: category,
              cpu: cpu,
              mrp: mrp,
              req_qty: reqQ,
              app_qty: appQ,
              cost_value: costVal,
              mrp_value: mrpVal
            });
          });
        }
      });

      setReportData({
        reportType,
        fromDate,
        toDate,
        storeType,
        selectedStore,
        rows,
        totals: {
          total_requisitions: allRequisitions.length,
          total_items: rows.length,
          total_req_qty: totalReqQty,
          total_app_qty: totalAppQty,
          total_cost_value: totalCostValue,
          total_mrp_value: totalMrpValue
        }
      });

      toast.success(`Generated Store Requisition Report (${rows.length} rows)`);
    } catch (err) {
      console.error('Error generating report:', err);
      toast.error('Failed to generate Store Requisition Report');
    } finally {
      setLoading(false);
    }
  };

  // Reload Button Click: Reset filters & clear output
  const handleReload = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setStoreType('ALL');
    setSelectedStore('ALL');
    setReportType('All');
    setTableSearch('');
    setReportData(null);
    toast.success('Filters reset');
  };

  // Filtered rows for client search inside report table
  const displayedRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;

    const q = tableSearch.toLowerCase();
    return reportData.rows.filter(r => 
      (r.requisition_no || '').toLowerCase().includes(q) ||
      (r.store_name || '').toLowerCase().includes(q) ||
      (r.vendor_name || '').toLowerCase().includes(q) ||
      (r.barcode || '').toLowerCase().includes(q) ||
      (r.product_code || '').toLowerCase().includes(q) ||
      (r.item_name || '').toLowerCase().includes(q) ||
      (r.category || '').toLowerCase().includes(q) ||
      (r.status || '').toLowerCase().includes(q)
    );
  }, [reportData, tableSearch]);

  // Standard MIS Landscape PDF Export
  const handleDownloadPDF = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first to export PDF');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Top Green Banner
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
    const subTitle = `STORE REQUISITION REPORT (${reportData.reportType.toUpperCase()})`;
    doc.text(subTitle, pageWidth - 14, 14, { align: 'right' });

    // User name resolution
    const loggedInUser = user || JSON.parse(localStorage.getItem('erp_user') || '{}');
    const preparedByName = 
      loggedInUser?.user_metadata?.full_name || 
      loggedInUser?.user_metadata?.name || 
      loggedInUser?.full_name || 
      loggedInUser?.name || 
      loggedInUser?.username || 
      (loggedInUser?.email ? loggedInUser.email.split('@')[0] : 'Super Admin');

    // 2. Metadata Section below Banner
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    const storeLabel = selectedStore !== 'ALL' 
      ? storesList.find(s => s.id === selectedStore)?.name || 'Selected Store'
      : 'All Stores';

    doc.text(`Date Range: ${reportData.fromDate} to ${reportData.toDate}`, 14, 30);
    doc.text(`Store Scope: ${reportData.storeType} (${storeLabel}) | Report Type: ${reportData.reportType}`, 14, 35);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

    // 3. Table
    const head = [['SL', 'Req No', 'Date', 'Store / Branch', 'Vendor', 'Barcode', 'Item Name', 'Category', 'CPU (Tk)', 'MRP (Tk)', 'Req Qty', 'App Qty', 'Cost Value (Tk)', 'Status']];
    
    const body = displayedRows.map((r, idx) => [
      idx + 1,
      r.requisition_no,
      r.requisition_date,
      r.store_name,
      r.vendor_name,
      r.barcode,
      r.item_name,
      r.category,
      r.cpu.toFixed(2),
      r.mrp.toFixed(2),
      r.req_qty,
      r.app_qty,
      r.cost_value.toFixed(2),
      r.status
    ]);

    const totReqQty = displayedRows.reduce((sum, r) => sum + r.req_qty, 0);
    const totAppQty = displayedRows.reduce((sum, r) => sum + r.app_qty, 0);
    const totCostVal = displayedRows.reduce((sum, r) => sum + r.cost_value, 0);

    // Summary Total Row
    body.push([
      'Total',
      '',
      '',
      '',
      '',
      '',
      `${displayedRows.length} Items`,
      '',
      '',
      '',
      totReqQty,
      totAppQty,
      totCostVal.toFixed(2),
      ''
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 7.2,
        cellPadding: 1.8,
        valign: 'middle',
        overflow: 'linebreak',
        textColor: [50, 50, 50]
      },
      headStyles: {
        fillColor: [46, 111, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 9 },
        1: { halign: 'center', cellWidth: 26 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'left', cellWidth: 24 },
        4: { halign: 'left', cellWidth: 18 },
        5: { halign: 'center', cellWidth: 22 },
        6: { halign: 'left', cellWidth: 'auto' },
        7: { halign: 'left', cellWidth: 18 },
        8: { halign: 'right', cellWidth: 16 },
        9: { halign: 'right', cellWidth: 16 },
        10: { halign: 'right', cellWidth: 14 },
        11: { halign: 'right', fontStyle: 'bold', cellWidth: 14 },
        12: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
        13: { halign: 'center', cellWidth: 16 }
      },
      didParseCell: function (data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
          if (data.column.index === 1 || data.column.index === 2 || data.column.index === 5 || data.column.index === 13) data.cell.styles.halign = 'center';
          if (data.column.index === 3 || data.column.index === 4 || data.column.index === 6 || data.column.index === 7) data.cell.styles.halign = 'left';
          if (data.column.index >= 8 && data.column.index <= 12) data.cell.styles.halign = 'right';
        }
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 240];
          data.cell.styles.textColor = [10, 60, 20];
        }
      },
      margin: { top: 10, left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable?.finalY || 100;
    const sigY = Math.max(finalY + 22, pageHeight - 24);

    // 4. Bottom Signatures
    doc.setDrawColor(160, 174, 192);

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

    doc.save(`Store_Requisition_Report_${reportData.reportType}_${reportData.fromDate}_to_${reportData.toDate}.pdf`);
    toast.success('PDF downloaded successfully');
  };

  // Standard MIS Excel Export
  const handleDownloadExcel = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first to export Excel');
      return;
    }

    const storeLabel = selectedStore !== 'ALL' 
      ? storesList.find(s => s.id === selectedStore)?.name || 'Selected Store'
      : 'All Stores';

    const wsData = [
      ['EZ ERP MANAGEMENT INFORMATION SYSTEM (MIS)'],
      ['STORE REQUISITION REPORT'],
      [`Report Type: ${reportData.reportType}`, `Date Range: ${reportData.fromDate} to ${reportData.toDate}`],
      [`Store Scope: ${reportData.storeType} (${storeLabel})`, `Generated On: ${new Date().toLocaleString()}`],
      [],
      ['SL', 'Requisition No', 'Requisition Date', 'Store / Branch', 'Vendor', 'Barcode', 'Product Code', 'Item Name', 'Category', 'CPU (Tk)', 'MRP (Tk)', 'Req Qty', 'App Qty', 'Cost Value (Tk)', 'Status', 'Delivery Date']
    ];

    displayedRows.forEach(r => {
      wsData.push([
        r.sl,
        r.requisition_no,
        r.requisition_date,
        r.store_name,
        r.vendor_name,
        r.barcode,
        r.product_code,
        r.item_name,
        r.category,
        r.cpu,
        r.mrp,
        r.req_qty,
        r.app_qty,
        r.cost_value,
        r.status,
        r.delivery_date
      ]);
    });

    const totReqQty = displayedRows.reduce((sum, r) => sum + r.req_qty, 0);
    const totAppQty = displayedRows.reduce((sum, r) => sum + r.app_qty, 0);
    const totCostVal = displayedRows.reduce((sum, r) => sum + r.cost_value, 0);

    wsData.push([
      'Total',
      `${reportData.totals.total_requisitions} Requisitions`,
      '',
      '',
      '',
      '',
      '',
      `${displayedRows.length} Items`,
      '',
      '',
      '',
      totReqQty,
      totAppQty,
      totCostVal,
      '',
      ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Requisition Report');
    XLSX.writeFile(wb, `Store_Requisition_Report_${reportData.reportType}_${reportData.fromDate}_to_${reportData.toDate}.xlsx`);
    toast.success('Excel exported successfully');
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Page Title */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          Store Requisition Report
        </h1>
      </div>

      {/* FILTER SEARCH CRITERIA CARD (Matching User Screenshot Precisely) */}
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
          rowGap: '14px',
          marginBottom: '22px'
        }}>
          
          {/* Row 1: From Date | To Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>From Date</label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  color: '#1e293b',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>To Date</label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#fff',
                  color: '#1e293b',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Row 2: Store Type | Store */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Store Type</label>
            <select
              value={storeType}
              onChange={(e) => {
                setStoreType(e.target.value);
                setSelectedStore('ALL');
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              {storeTypesList.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Store</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="ALL">Select Store</option>
              {availableStores.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* REPORT TYPE SECTION (Round Green Radio Bullets matching Image) */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Report Type
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '36px', flexWrap: 'wrap' }}>
            {reportTypeOptions.map(rType => {
              const isSelected = reportType === rType;
              return (
                <label
                  key={rType}
                  onClick={() => setReportType(rType)}
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
                  {rType}
                </label>
              );
            })}
          </div>
        </div>

        {/* PRINT TYPE BUTTONS (Show, Show Excel, Download PDF, Reload) */}
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

            {/* Show Excel Button (.btn-info Sky Blue) */}
            <button
              onClick={handleDownloadExcel}
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

            {/* Download PDF Button (.btn-theme Emerald Green) */}
            <button
              onClick={handleDownloadPDF}
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

          </div>
        </div>

      </div>

      {/* REPORT OUTPUT DISPLAY (Only rendered when user clicks Show) */}
      {reportData && (
        <div className="animate-fade-in">
          
          {/* KPI Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '18px'
          }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Requisitions</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{reportData.totals.total_requisitions}</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <Package size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Item Lines</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{reportData.totals.total_items}</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Req Qty</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{reportData.totals.total_req_qty} Pcs</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2e6f40' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Approved Qty</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#2e6f40' }}>{reportData.totals.total_app_qty} Pcs</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Cost Value</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>Tk {reportData.totals.total_cost_value.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Table Container Card */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            overflow: 'hidden'
          }}>
            
            {/* Table Action Bar */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafbfc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  Requisition Records ({displayedRows.length})
                </span>
              </div>

              {/* Table Search */}
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search in table..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 10px 5px 30px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    outline: 'none',
                    backgroundColor: '#fff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '40px' }}>SL</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Req No</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Date</th>
                    <th style={{ padding: '8px 10px' }}>Store / Branch</th>
                    <th style={{ padding: '8px 10px' }}>Vendor</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Barcode</th>
                    <th style={{ padding: '8px 10px' }}>Item Name</th>
                    <th style={{ padding: '8px 10px' }}>Category</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>CPU (Tk)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>MRP (Tk)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Req Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>App Qty</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cost Value (Tk)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan="14" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                        No records matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fcfdfd' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{r.sl}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold', color: '#2e6f40', fontFamily: 'monospace' }}>
                          {r.requisition_no}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{r.requisition_date}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 500 }}>{r.store_name}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{r.vendor_name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace' }}>{r.barcode}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 500 }}>{r.item_name}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{r.category}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.cpu.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.mrp.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.req_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#2e6f40' }}>{r.app_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>Tk {r.cost_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: 
                              r.status === 'Received' ? '#ecfdf5' :
                              r.status === 'Delivered' ? '#f3e8ff' :
                              r.status === 'Approved' ? '#dcfce7' : 
                              r.status === 'Cancelled' || r.status === 'Rejected' ? '#fee2e2' : 
                              '#fef3c7',
                            color: 
                              r.status === 'Received' ? '#047857' :
                              r.status === 'Delivered' ? '#7e22ce' :
                              r.status === 'Approved' ? '#15803d' : 
                              r.status === 'Cancelled' || r.status === 'Rejected' ? '#b91c1c' : 
                              '#b45309'
                          }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {displayedRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#f0f5f0', fontWeight: 'bold', borderTop: '2px solid #2e6f40', color: '#0a3c14' }}>
                      <td colSpan="6" style={{ padding: '10px', textAlign: 'right' }}>Total:</td>
                      <td style={{ padding: '10px' }}>{displayedRows.length} Items</td>
                      <td colSpan="3"></td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>{displayedRows.reduce((sum, r) => sum + r.req_qty, 0)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#2e6f40' }}>{displayedRows.reduce((sum, r) => sum + r.app_qty, 0)}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>Tk {displayedRows.reduce((sum, r) => sum + r.cost_value, 0).toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default StoreRequisitionReport;
