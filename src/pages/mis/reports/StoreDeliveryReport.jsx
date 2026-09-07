import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  Calendar, Layers, Package, DollarSign, Store, Tag, ShoppingCart, Truck,
  FileText, CheckCircle2, Clock, Send, ChevronRight, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../../../components/CustomSelect';

const StoreDeliveryReport = () => {
  const { user } = useAuth();

  // Helper for today's date (YYYY-MM-DD)
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Filter States (Matching 2nd Screenshot)
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [storeType, setStoreType] = useState('ALL');
  const [deliveryFrom, setDeliveryFrom] = useState('ALL');
  const [deliveryTo, setDeliveryTo] = useState('ALL');
  const [deliveryStatus, setDeliveryStatus] = useState('ALL');

  // Report Type Options (Matching 2nd Screenshot)
  // 1. Challan wise Delivery Details
  // 2. Challan wise Delivery Summary
  // 3. Reference Wise Delivery Report
  // 4. Barcode wise Store Delivery
  const [reportType, setReportType] = useState('Challan wise Delivery Details');
  const [extraSearch, setExtraSearch] = useState('');

  const reportTypeOptions = [
    'Challan wise Delivery Details',
    'Challan wise Delivery Summary',
    'Reference Wise Delivery Report',
    'Barcode wise Store Delivery'
  ];

  // 2. Master Data Lists
  const [storesList, setStoresList] = useState([]);
  const [storeTypesList, setStoreTypesList] = useState(['ALL', 'Store', 'Retail', 'Warehouse', 'Branch', 'Franchise']);
  const [productsMap, setProductsMap] = useState(new Map());

  // 3. Output / Generated Report State (strictly null on mount, only populates on Show click)
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  // Initial Load of Master Dropdowns
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [storesRes, prodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type, is_central').order('name'),
        supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, category_id, purchase_price, mrp, category:category_id(name)')
      ]);

      const fetchedStores = storesRes.data || [];
      setStoresList(fetchedStores);

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
    setCurrentPage(1);

    try {
      // 1. Query delivery / requisition records within date range
      let reqQuery = supabase
        .from('requisitions')
        .select('*')
        .gte('requisition_date', fromDate)
        .lte('requisition_date', toDate)
        .order('requisition_date', { ascending: false });

      if (deliveryTo !== 'ALL') {
        reqQuery = reqQuery.eq('shop_id', deliveryTo);
      }

      const { data: reqData, error: reqErr } = await reqQuery;
      if (reqErr) console.warn("requisitions query note:", reqErr);

      // Query store_requisitions for cross-compatibility
      let sReqQuery = supabase
        .from('store_requisitions')
        .select('*')
        .gte('requisition_date', fromDate)
        .lte('requisition_date', toDate)
        .order('requisition_date', { ascending: false });

      if (deliveryTo !== 'ALL') {
        sReqQuery = sReqQuery.eq('shop_id', deliveryTo);
      }

      const { data: sReqData, error: sReqErr } = await sReqQuery;
      if (sReqErr) console.warn("store_requisitions query note:", sReqErr);

      // Merge and deduplicate delivery headers
      const deliveryMap = new Map();

      // Process direct deliveries and receipts from requisitions
      (reqData || []).forEach(r => {
        const challan = r.challan_no || r.requisition_no;
        if (!challan) return;

        const storeObj = storesList.find(s => s.id === r.shop_id || s.name?.toLowerCase() === r.shop_name?.toLowerCase());
        let effectiveStatus = r.status || 'Delivered';
        if (effectiveStatus === 'Receive Challan') effectiveStatus = 'Received';

        const key = challan;
        if (!deliveryMap.has(key)) {
          deliveryMap.set(key, {
            id: r.id,
            challan_no: challan,
            ref_no: r.requisition_no || r.challan_no || '-',
            requisition_date: (r.requisition_date || r.created_at || '').slice(0, 10),
            delivery_from: 'Central Store',
            delivery_to_id: r.shop_id,
            delivery_to_name: r.shop_name || storeObj?.name || 'Store',
            shop_type: storeObj?.shop_type || 'Store',
            status: effectiveStatus,
            source: 'requisitions',
            fallback_id: r.id
          });
        } else {
          const existing = deliveryMap.get(key);
          if (effectiveStatus === 'Received') {
            existing.status = 'Received';
          }
          if (r.requisition_no && r.requisition_no.startsWith('REQ')) {
            existing.ref_no = r.requisition_no;
          }
        }
      });

      // Process approved/delivered store requisitions
      (sReqData || []).forEach(r => {
        if (!r.requisition_no) return;
        const challan = r.requisition_no;
        const storeObj = storesList.find(s => s.id === r.shop_id || s.name?.toLowerCase() === r.shop_name?.toLowerCase());
        let effectiveStatus = r.status || 'Approved';
        if (effectiveStatus === 'Receive Challan') effectiveStatus = 'Received';

        if (deliveryMap.has(challan)) {
          const existing = deliveryMap.get(challan);
          existing.store_req_id = r.id;
          if (effectiveStatus === 'Received') existing.status = 'Received';
        } else if (r.status === 'Approved' || r.status === 'Delivered' || r.status === 'Received') {
          deliveryMap.set(challan, {
            id: r.id,
            challan_no: challan,
            ref_no: r.requisition_no,
            requisition_date: (r.requisition_date || r.created_at || '').slice(0, 10),
            delivery_from: 'Central Store',
            delivery_to_id: r.shop_id,
            delivery_to_name: r.shop_name || storeObj?.name || 'Store',
            shop_type: storeObj?.shop_type || 'Store',
            status: effectiveStatus,
            source: 'store_requisitions',
            store_req_id: r.id
          });
        }
      });

      let allDeliveries = Array.from(deliveryMap.values());

      // Filter strictly by Date Range
      allDeliveries = allDeliveries.filter(d => {
        const dateStr = d.requisition_date;
        if (fromDate && dateStr && dateStr < fromDate) return false;
        if (toDate && dateStr && dateStr > toDate) return false;
        return true;
      });

      // Filter by Store Type
      if (storeType !== 'ALL') {
        allDeliveries = allDeliveries.filter(d => {
          return d.shop_type?.toLowerCase() === storeType.toLowerCase();
        });
      }

      // Filter by Delivery From
      if (deliveryFrom !== 'ALL') {
        allDeliveries = allDeliveries.filter(d => {
          return d.delivery_from?.toLowerCase().includes(deliveryFrom.toLowerCase());
        });
      }

      // Filter by Delivery To
      if (deliveryTo !== 'ALL') {
        allDeliveries = allDeliveries.filter(d => {
          return d.delivery_to_id === deliveryTo || d.delivery_to_name?.toLowerCase() === deliveryTo.toLowerCase();
        });
      }

      // Filter by Delivery Status
      if (deliveryStatus !== 'ALL') {
        allDeliveries = allDeliveries.filter(d => {
          const st = (d.status || '').toLowerCase();
          return st === deliveryStatus.toLowerCase();
        });
      }

      // Filter by extra text search if present
      if (extraSearch.trim()) {
        const term = extraSearch.trim().toLowerCase();
        allDeliveries = allDeliveries.filter(d => {
          return d.challan_no?.toLowerCase().includes(term) ||
                 d.ref_no?.toLowerCase().includes(term) ||
                 d.delivery_to_name?.toLowerCase().includes(term);
        });
      }

      if (allDeliveries.length === 0) {
        setReportData({
          reportType,
          fromDate,
          toDate,
          storeType,
          deliveryFrom,
          deliveryTo,
          deliveryStatus,
          rows: [],
          totals: {
            total_deliveries: 0,
            total_items: 0,
            total_del_qty: 0,
            total_cost_value: 0,
            total_sale_value: 0
          }
        });
        toast('No delivery records found for the selected criteria');
        setLoading(false);
        return;
      }

      // 2. Fetch line items for deliveries
      const reqIds = allDeliveries.map(d => d.fallback_id || (d.source === 'requisitions' ? d.id : null)).filter(Boolean);
      const storeReqIds = allDeliveries.map(d => d.store_req_id || (d.source === 'store_requisitions' ? d.id : null)).filter(Boolean);

      let reqItems = [];
      let storeReqItems = [];

      if (reqIds.length > 0) {
        const { data: riData } = await supabase
          .from('requisition_items')
          .select('*')
          .in('requisition_id', reqIds);
        if (riData) reqItems = riData;
      }

      if (storeReqIds.length > 0) {
        const { data: sriData } = await supabase
          .from('store_requisition_items')
          .select('*')
          .in('requisition_id', storeReqIds);
        if (sriData) storeReqItems = sriData;
      }

      // Map line items by parent ID
      const reqItemsMap = new Map();
      reqItems.forEach(item => {
        if (!reqItemsMap.has(item.requisition_id)) reqItemsMap.set(item.requisition_id, []);
        reqItemsMap.get(item.requisition_id).push(item);
      });

      const storeReqItemsMap = new Map();
      storeReqItems.forEach(item => {
        if (!storeReqItemsMap.has(item.requisition_id)) storeReqItemsMap.set(item.requisition_id, []);
        storeReqItemsMap.get(item.requisition_id).push(item);
      });

      // Assemble line item records
      const detailedRows = [];

      allDeliveries.forEach((del) => {
        let items = [];
        if (del.fallback_id && reqItemsMap.has(del.fallback_id)) {
          items = reqItemsMap.get(del.fallback_id);
        } else if (del.store_req_id && storeReqItemsMap.has(del.store_req_id)) {
          items = storeReqItemsMap.get(del.store_req_id);
        } else if (reqItemsMap.has(del.id)) {
          items = reqItemsMap.get(del.id);
        } else if (storeReqItemsMap.has(del.id)) {
          items = storeReqItemsMap.get(del.id);
        }

        if (items.length === 0) {
          detailedRows.push({
            id: `${del.id}-empty`,
            challan_no: del.challan_no,
            ref_no: del.ref_no,
            date: del.requisition_date,
            delivery_from: del.delivery_from,
            delivery_to: del.delivery_to_name,
            barcode: '-',
            code: '-',
            item_name: 'Store Delivery Items',
            category: 'General',
            cpu: 0,
            mrp: 0,
            del_qty: 0,
            cost_value: 0,
            sale_value: 0,
            status: del.status
          });
          return;
        }

        items.forEach((item, itemIdx) => {
          const barcode = item.barcode || item.product_code || '';
          const pInfo = productsMap.get(barcode) || (item.product_id ? productsMap.get(item.product_id) : null);

          const itemName = item.product_name || pInfo?.item_name || 'Delivery Item';
          const code = item.product_code || pInfo?.code || barcode;
          const category = item.category || pInfo?.category?.name || 'General';

          const cpu = Number(item.cpu || pInfo?.purchase_price || 0);
          const mrp = Number(item.mrp || pInfo?.mrp || 0);
          const delQty = Number(
            item.approve_qty !== undefined && item.approve_qty !== null ? item.approve_qty :
            item.app_qty !== undefined && item.app_qty !== null ? item.app_qty :
            item.del_qty !== undefined && item.del_qty !== null ? item.del_qty :
            (item.req_qty || 0)
          );
          const costVal = Number(item.cost_value || (cpu * delQty));
          const saleVal = mrp * delQty;

          detailedRows.push({
            id: `${del.id}-${item.id || itemIdx}`,
            challan_no: del.challan_no,
            ref_no: del.ref_no,
            date: del.requisition_date,
            delivery_from: del.delivery_from,
            delivery_to: del.delivery_to_name,
            barcode: barcode || '-',
            code: code || '-',
            item_name: itemName,
            category: category,
            cpu: cpu,
            mrp: mrp,
            del_qty: delQty,
            cost_value: costVal,
            sale_value: saleVal,
            status: del.status
          });
        });
      });

      // 3. Format Rows according to selected Report Type
      let finalRows = [];

      if (reportType === 'Challan wise Delivery Summary') {
        // Group by Challan No
        const challanGroups = new Map();
        detailedRows.forEach(r => {
          const key = r.challan_no;
          if (!challanGroups.has(key)) {
            challanGroups.set(key, {
              id: key,
              challan_no: r.challan_no,
              date: r.date,
              ref_no: r.ref_no,
              delivery_from: r.delivery_from,
              delivery_to: r.delivery_to,
              total_items: 0,
              del_qty: 0,
              cost_value: 0,
              sale_value: 0,
              status: r.status
            });
          }
          const g = challanGroups.get(key);
          g.total_items += 1;
          g.del_qty += r.del_qty;
          g.cost_value += r.cost_value;
          g.sale_value += r.sale_value;
        });
        finalRows = Array.from(challanGroups.values());

      } else if (reportType === 'Reference Wise Delivery Report') {
        // Group / Order by Reference No
        finalRows = [...detailedRows].sort((a, b) => (a.ref_no || '').localeCompare(b.ref_no || ''));

      } else if (reportType === 'Barcode wise Store Delivery') {
        // Group by Barcode and Delivery Store
        const barcodeGroups = new Map();
        detailedRows.forEach(r => {
          const key = `${r.barcode}-${r.delivery_to}`;
          if (!barcodeGroups.has(key)) {
            barcodeGroups.set(key, {
              id: key,
              barcode: r.barcode,
              code: r.code,
              item_name: r.item_name,
              category: r.category,
              delivery_to: r.delivery_to,
              cpu: r.cpu,
              mrp: r.mrp,
              del_qty: 0,
              cost_value: 0,
              sale_value: 0
            });
          }
          const bg = barcodeGroups.get(key);
          bg.del_qty += r.del_qty;
          bg.cost_value += r.cost_value;
          bg.sale_value += r.sale_value;
        });
        finalRows = Array.from(barcodeGroups.values());

      } else {
        // Challan wise Delivery Details (Default)
        finalRows = detailedRows;
      }

      // Calculate KPI summary totals
      const uniqueChallans = new Set(detailedRows.map(r => r.challan_no)).size;
      const totalDelQty = detailedRows.reduce((sum, r) => sum + r.del_qty, 0);
      const totalCostVal = detailedRows.reduce((sum, r) => sum + r.cost_value, 0);
      const totalSaleVal = detailedRows.reduce((sum, r) => sum + r.sale_value, 0);

      setReportData({
        reportType,
        fromDate,
        toDate,
        storeType,
        deliveryFrom,
        deliveryTo,
        deliveryStatus,
        rows: finalRows,
        detailedRows: detailedRows,
        totals: {
          total_deliveries: uniqueChallans,
          total_items: detailedRows.length,
          total_del_qty: totalDelQty,
          total_cost_value: totalCostVal,
          total_sale_value: totalSaleVal
        }
      });

      toast.success(`Store Delivery Report generated (${finalRows.length} records)`);
    } catch (err) {
      console.error("Error generating delivery report:", err);
      toast.error('Failed to generate delivery report');
    } finally {
      setLoading(false);
    }
  };

  // Reset Filters
  const handleReload = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setStoreType('ALL');
    setDeliveryFrom('ALL');
    setDeliveryTo('ALL');
    setDeliveryStatus('ALL');
    setReportType('Challan wise Delivery Details');
    setExtraSearch('');
    setTableSearch('');
    setReportData(null);
    setCurrentPage(1);
    toast.success('Filters reset. Click Show to generate fresh report.');
  };

  // Filter Table Search
  const filteredRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;

    const term = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(row => {
      return Object.values(row).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(term)
      );
    });
  }, [reportData, tableSearch]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  // 4. Excel Export
  const handleExportExcel = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first by clicking Show');
      return;
    }

    try {
      const activeReportType = reportData.reportType;
      const exportData = reportData.rows.map((r, idx) => {
        if (activeReportType === 'Challan wise Delivery Summary') {
          return {
            'SL': idx + 1,
            'Challan No': r.challan_no,
            'Date': r.date,
            'Ref No': r.ref_no,
            'Delivery From': r.delivery_from,
            'Delivery To': r.delivery_to,
            'Total Items': r.total_items,
            'Del Qty (Pcs)': r.del_qty,
            'Cost Value (Tk)': r.cost_value.toFixed(2),
            'Sale Value (Tk)': r.sale_value.toFixed(2),
            'Status': r.status
          };
        } else if (activeReportType === 'Barcode wise Store Delivery') {
          return {
            'SL': idx + 1,
            'Barcode': r.barcode,
            'Code': r.code,
            'Item Name': r.item_name,
            'Category': r.category,
            'Delivery To': r.delivery_to,
            'CPU (Tk)': r.cpu.toFixed(2),
            'MRP (Tk)': r.mrp.toFixed(2),
            'Total Del Qty': r.del_qty,
            'Total Cost Value (Tk)': r.cost_value.toFixed(2),
            'Total Sale Value (Tk)': r.sale_value.toFixed(2)
          };
        } else {
          return {
            'SL': idx + 1,
            'Challan No': r.challan_no,
            'Date': r.date,
            'Ref No': r.ref_no,
            'Delivery From': r.delivery_from,
            'Delivery To': r.delivery_to,
            'Barcode': r.barcode,
            'Item Name': r.item_name,
            'Category': r.category,
            'CPU (Tk)': r.cpu.toFixed(2),
            'MRP (Tk)': r.mrp.toFixed(2),
            'Del Qty': r.del_qty,
            'Cost Value (Tk)': r.cost_value.toFixed(2),
            'Sale Value (Tk)': r.sale_value.toFixed(2),
            'Status': r.status
          };
        }
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Store Delivery Report');
      XLSX.writeFile(wb, `Store_Delivery_Report_${reportData.fromDate || fromDate}_to_${reportData.toDate || toDate}.xlsx`);
      toast.success('Excel downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel');
    }
  };

  // 5. PDF Export (Matching Existing MIS Reports Design)
  const handleDownloadPDF = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first by clicking Show');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Top Green Banner
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
      doc.text("STORE DELIVERY REPORT", pageWidth - 14, 14, { align: 'right' });

      // User info
      const loggedInUser = JSON.parse(localStorage.getItem('erp_user') || '{}');
      const preparedByName = 
        loggedInUser?.user_metadata?.full_name || 
        loggedInUser?.user_metadata?.name || 
        loggedInUser?.full_name || 
        loggedInUser?.name || 
        loggedInUser?.username || 
        (loggedInUser?.email ? loggedInUser.email.split('@')[0] : 'Super Admin');

      // Metadata Section
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);

      const storeNameDisplay = (reportData.deliveryTo || deliveryTo) === 'ALL' ? 'ALL STORES' : (storesList.find(s => s.id === (reportData.deliveryTo || deliveryTo))?.name || reportData.deliveryTo || deliveryTo);
      doc.text(`Period: ${reportData.fromDate || fromDate} to ${reportData.toDate || toDate} | Store Type: ${reportData.storeType || storeType}`, 14, 30);
      doc.text(`Delivery To: ${storeNameDisplay} | Status: ${reportData.deliveryStatus || deliveryStatus} | Report Type: ${reportData.reportType}`, 14, 35);
      doc.text(`Generated On: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });
      doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

      // Table Setup
      let headers = [];
      let body = [];
      const activeReportType = reportData.reportType;

      if (activeReportType === 'Challan wise Delivery Summary') {
        headers = [['SL', 'Challan No', 'Date', 'Ref No', 'Delivery From', 'Delivery To', 'Total Items', 'Del Qty', 'Cost Value (Tk)', 'Sale Value (Tk)', 'Status']];
        body = reportData.rows.map((r, idx) => [
          idx + 1,
          r.challan_no,
          r.date,
          r.ref_no || '-',
          r.delivery_from,
          r.delivery_to,
          r.total_items,
          r.del_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2),
          r.status
        ]);
        body.push([
          'Total', '', '', '', '', '',
          reportData.totals.total_items,
          reportData.totals.total_del_qty,
          reportData.totals.total_cost_value.toFixed(2),
          reportData.totals.total_sale_value.toFixed(2),
          ''
        ]);
      } else if (activeReportType === 'Barcode wise Store Delivery') {
        headers = [['SL', 'Barcode', 'Code', 'Item Name', 'Category', 'Delivery To Store', 'CPU (Tk)', 'MRP (Tk)', 'Del Qty', 'Cost Value (Tk)', 'Sale Value (Tk)']];
        body = reportData.rows.map((r, idx) => [
          idx + 1,
          r.barcode,
          r.code || '-',
          r.item_name,
          r.category,
          r.delivery_to,
          r.cpu.toFixed(2),
          r.mrp.toFixed(2),
          r.del_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2)
        ]);
        body.push([
          'Total', '', '', `${reportData.rows.length} Items`, '', '', '', '',
          reportData.totals.total_del_qty,
          reportData.totals.total_cost_value.toFixed(2),
          reportData.totals.total_sale_value.toFixed(2)
        ]);
      } else {
        headers = [['SL', 'Challan No', 'Date', 'Delivery To', 'Barcode', 'Item Name', 'Category', 'CPU (Tk)', 'MRP (Tk)', 'Del Qty', 'Cost Value (Tk)', 'Sale Value (Tk)', 'Status']];
        body = reportData.rows.map((r, idx) => [
          idx + 1,
          r.challan_no,
          r.date,
          r.delivery_to,
          r.barcode,
          r.item_name,
          r.category,
          r.cpu.toFixed(2),
          r.mrp.toFixed(2),
          r.del_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2),
          r.status
        ]);
        body.push([
          'Total', '', '', '', '', `${reportData.rows.length} Records`, '', '', '',
          reportData.totals.total_del_qty,
          reportData.totals.total_cost_value.toFixed(2),
          reportData.totals.total_sale_value.toFixed(2),
          ''
        ]);
      }

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 30, 30] },
        headStyles: { fillColor: [46, 111, 64], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        didParseCell: function (data) {
          if (data.row.index === body.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 245, 240];
            data.cell.styles.textColor = [10, 60, 20];
          }
        },
        margin: { top: 10, left: 14, right: 14 }
      });

      // Signatures at bottom
      const finalY = doc.lastAutoTable.finalY || 160;
      const sigY = Math.max(finalY + 24, pageHeight - 20);

      doc.setDrawColor(160, 174, 192);
      doc.setLineWidth(0.4);

      // Posted By (Left)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(preparedByName, 47.5, sigY - 2.5, { align: 'center' });
      doc.line(20, sigY, 75, sigY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Posted By', 47.5, sigY + 5, { align: 'center' });

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

      doc.save(`Store_Delivery_Report_${reportData.fromDate || fromDate}_to_${reportData.toDate || toDate}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* 1. Header Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
          Store Delivery Report
        </h1>
      </div>

      {/* 2. Filter Box (Exact Matching 2nd Screenshot) */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        
        {/* Top 2-Column Grid Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px 28px', marginBottom: '20px' }}>
          
          {/* Row 1: From Date & To Date */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '130px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              From Date
            </label>
            <div style={{ flex: 1 }}>
              <input 
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setReportData(null); }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '130px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              To Date
            </label>
            <div style={{ flex: 1 }}>
              <input 
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setReportData(null); }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Row 2: Store Type & Delivery From */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '130px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Store Type
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={storeType}
                onChange={(e) => { setStoreType(e.target.value); setReportData(null); }}
              >
                {storeTypesList.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '130px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Delivery From
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={deliveryFrom}
                onChange={(e) => { setDeliveryFrom(e.target.value); setReportData(null); }}
              >
                <option value="ALL">Select Delivery From Store</option>
                <option value="Central Store">Central Store</option>
                {storesList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 3: Delivery To & Delivery Status */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '130px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Delivery To
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={deliveryTo}
                onChange={(e) => { setDeliveryTo(e.target.value); setReportData(null); }}
              >
                <option value="ALL">Select Delivery To Store</option>
                {availableStores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '130px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Delivery Status
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={deliveryStatus}
                onChange={(e) => { setDeliveryStatus(e.target.value); setReportData(null); }}
              >
                <option value="ALL">-- ALL --</option>
                <option value="Delivered">Delivered</option>
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Cancelled">Cancelled</option>
              </CustomSelect>
            </div>
          </div>

        </div>

        {/* Report Type Selection (Matching 2nd Screenshot) */}
        <div style={{ marginTop: '16px', marginBottom: '22px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
            Report Type
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'flex-start' }}>
            
            {/* 4 Report Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reportTypeOptions.map((option) => {
                const isSelected = reportType === option;
                return (
                  <label
                    key={option}
                    onClick={() => { setReportType(option); setReportData(null); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      fontWeight: isSelected ? 'bold' : 500,
                      color: isSelected ? '#166534' : '#334155',
                      userSelect: 'none'
                    }}
                  >
                    {/* Round Green Radio Button matching 2nd screenshot */}
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid #2e6f40' : '1.5px solid #94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#fff',
                      flexShrink: 0,
                      boxShadow: isSelected ? '0 0 0 1px rgba(46, 111, 64, 0.15)' : 'none',
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
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>

            {/* Extra search input next to Report Type */}
            <div>
              <input 
                type="text"
                value={extraSearch}
                onChange={(e) => { setExtraSearch(e.target.value); setReportData(null); }}
                placeholder={
                  reportType === 'Barcode wise Store Delivery' ? "Filter by Barcode or Item Name (or leave blank for ALL)..." :
                  reportType === 'Reference Wise Delivery Report' ? "Filter by Reference / PO No (or leave blank for ALL)..." :
                  "Filter by Challan No / Store (or leave blank for ALL)..."
                }
                style={{
                  width: '100%',
                  padding: '9px 14px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  outline: 'none'
                }}
              />
            </div>

          </div>
        </div>

        {/* Print Type / Buttons (Exact Design Matching Existing Reports) */}
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

      {/* 3. Output Section (Only shown when reportData is generated) */}
      {reportData && (
        <div>
          
          {/* KPI Summary Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            
            {/* Total Deliveries */}
            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ padding: '10px', backgroundColor: '#e0f2fe', borderRadius: '8px', color: '#0284c7' }}>
                <Truck size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Deliveries</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                  {reportData.totals.total_deliveries}
                </div>
              </div>
            </div>

            {/* Total Item Lines */}
            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ padding: '10px', backgroundColor: '#ecfdf5', borderRadius: '8px', color: '#059669' }}>
                <Package size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Item Lines</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                  {reportData.totals.total_items}
                </div>
              </div>
            </div>

            {/* Total Delivery Quantity */}
            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ padding: '10px', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#d97706' }}>
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Del Qty</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                  {reportData.totals.total_del_qty} Pcs
                </div>
              </div>
            </div>

            {/* Total Cost Value */}
            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderRadius: '8px', color: '#16a34a' }}>
                <DollarSign size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Cost Value</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>
                  Tk {reportData.totals.total_cost_value.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Total Sale / MRP Value */}
            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ padding: '10px', backgroundColor: '#f3e8ff', borderRadius: '8px', color: '#9333ea' }}>
                <ShoppingCart size={22} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Sale Value</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#9333ea' }}>
                  Tk {reportData.totals.total_sale_value.toFixed(2)}
                </div>
              </div>
            </div>

          </div>

          {/* Table Container */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            
            {/* Table Header Bar with Live Table Search */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>
                Delivery Records ({filteredRows.length}) - <span style={{ color: '#2e6f40' }}>{reportData.reportType}</span>
              </div>

              <div style={{ position: 'relative', width: '260px' }}>
                <input 
                  type="text"
                  placeholder="Search in table..."
                  value={tableSearch}
                  onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                  style={{
                    width: '100%',
                    padding: '7px 12px 7px 32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                {tableSearch && (
                  <button 
                    onClick={() => setTableSearch('')}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', fontWeight: 600 }}>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: '45px' }}>SL</th>
                    
                    {reportData.reportType === 'Challan wise Delivery Summary' ? (
                      <>
                        <th style={{ padding: '10px 12px' }}>Challan No</th>
                        <th style={{ padding: '10px 12px' }}>Date</th>
                        <th style={{ padding: '10px 12px' }}>Ref No</th>
                        <th style={{ padding: '10px 12px' }}>Delivery From</th>
                        <th style={{ padding: '10px 12px' }}>Delivery To</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Items</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Del Qty</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Cost Value (Tk)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sale Value (Tk)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                      </>
                    ) : reportData.reportType === 'Barcode wise Store Delivery' ? (
                      <>
                        <th style={{ padding: '10px 12px' }}>Barcode</th>
                        <th style={{ padding: '10px 12px' }}>Code</th>
                        <th style={{ padding: '10px 12px' }}>Item Name</th>
                        <th style={{ padding: '10px 12px' }}>Category</th>
                        <th style={{ padding: '10px 12px' }}>Delivery To</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>CPU (Tk)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>MRP (Tk)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Del Qty</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Cost Value (Tk)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sale Value (Tk)</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '10px 12px' }}>Challan No</th>
                        <th style={{ padding: '10px 12px' }}>Date</th>
                        <th style={{ padding: '10px 12px' }}>Delivery To</th>
                        <th style={{ padding: '10px 12px' }}>Barcode</th>
                        <th style={{ padding: '10px 12px' }}>Item Name</th>
                        <th style={{ padding: '10px 12px' }}>Category</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>CPU (Tk)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>MRP (Tk)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Del Qty</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Cost Value (Tk)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sale Value (Tk)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan="14" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                        No records match the current filter / search.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((r, idx) => {
                      const absoluteIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                      const isEven = idx % 2 === 0;

                      return (
                        <tr 
                          key={r.id || idx}
                          style={{
                            backgroundColor: isEven ? '#fff' : '#f8fafc',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.1s ease'
                          }}
                        >
                          <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{absoluteIdx}</td>

                          {reportData.reportType === 'Challan wise Delivery Summary' ? (
                            <>
                              <td style={{ padding: '9px 12px', fontWeight: 'bold', color: '#2e6f40' }}>{r.challan_no}</td>
                              <td style={{ padding: '9px 12px', color: '#475569' }}>{r.date}</td>
                              <td style={{ padding: '9px 12px', color: '#64748b' }}>{r.ref_no || '-'}</td>
                              <td style={{ padding: '9px 12px', color: '#475569' }}>{r.delivery_from}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{r.delivery_to}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 'bold' }}>{r.total_items}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 'bold' }}>{r.del_qty}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>Tk {r.cost_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#9333ea' }}>Tk {r.sale_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  backgroundColor: r.status === 'Received' ? '#dcfce7' : r.status === 'Delivered' ? '#f3e8ff' : '#fef3c7',
                                  color: r.status === 'Received' ? '#15803d' : r.status === 'Delivered' ? '#7e22ce' : '#b45309'
                                }}>
                                  {r.status}
                                </span>
                              </td>
                            </>
                          ) : reportData.reportType === 'Barcode wise Store Delivery' ? (
                            <>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0284c7' }}>{r.barcode}</td>
                              <td style={{ padding: '9px 12px', color: '#64748b' }}>{r.code || '-'}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{r.item_name}</td>
                              <td style={{ padding: '9px 12px', color: '#64748b' }}>{r.category}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#334155' }}>{r.delivery_to}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right' }}>{r.cpu.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right' }}>{r.mrp.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 'bold' }}>{r.del_qty}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>Tk {r.cost_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#9333ea' }}>Tk {r.sale_value.toFixed(2)}</td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '9px 12px', fontWeight: 'bold', color: '#2e6f40' }}>{r.challan_no}</td>
                              <td style={{ padding: '9px 12px', color: '#475569' }}>{r.date}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{r.delivery_to}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0284c7' }}>{r.barcode}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{r.item_name}</td>
                              <td style={{ padding: '9px 12px', color: '#64748b' }}>{r.category}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right' }}>{r.cpu.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right' }}>{r.mrp.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 'bold' }}>{r.del_qty}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>Tk {r.cost_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#9333ea' }}>Tk {r.sale_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  backgroundColor: r.status === 'Received' ? '#dcfce7' : r.status === 'Delivered' ? '#f3e8ff' : '#fef3c7',
                                  color: r.status === 'Received' ? '#15803d' : r.status === 'Delivered' ? '#7e22ce' : '#b45309'
                                }}>
                                  {r.status}
                                </span>
                              </td>
                            </>
                          )}

                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Footer Totals Row */}
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #cbd5e1' }}>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>Total:</td>
                      <td colSpan={reportData.reportType === 'Challan wise Delivery Summary' ? 5 : reportData.reportType === 'Barcode wise Store Delivery' ? 6 : 7} style={{ padding: '10px 12px' }}>
                        {filteredRows.length} Records Listed
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {reportData.totals.total_del_qty}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        Tk {reportData.totals.total_cost_value.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#9333ea' }}>
                        Tk {reportData.totals.total_sale_value.toFixed(2)}
                      </td>
                      {reportData.reportType !== 'Barcode wise Store Delivery' && <td style={{ padding: '10px 12px' }}></td>}
                    </tr>
                  </tfoot>
                )}

              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                fontSize: '12px'
              }}>
                <div style={{ color: '#64748b' }}>
                  Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length} records
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === 1 ? '#f1f5f9' : '#fff',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .map((p, idx, arr) => (
                      <React.Fragment key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ padding: '5px' }}>...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: currentPage === p ? '#2e6f40' : '#fff',
                            color: currentPage === p ? '#fff' : '#0f172a',
                            fontWeight: currentPage === p ? 'bold' : 'normal',
                            cursor: 'pointer'
                          }}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    ))}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === totalPages ? '#f1f5f9' : '#fff',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};

export default StoreDeliveryReport;
