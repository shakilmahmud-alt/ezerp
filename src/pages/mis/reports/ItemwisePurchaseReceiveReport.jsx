import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { 
  FileText, 
  RotateCcw, 
  RefreshCw,
  FileDown, 
  Download,
  FileSpreadsheet,
  Printer, 
  Calendar, 
  Search, 
  Building2, 
  Layers, 
  Tag, 
  DollarSign,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

export default function ItemwisePurchaseReceiveReport() {
  const { user } = useAuth();

  // Helper for today's date in YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 1. Search Criteria Form States
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');
  const [countryOfOriginInput, setCountryOfOriginInput] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('ALL');

  // Report Type: Details vs Summary
  const [reportType, setReportType] = useState('Details');

  // 2. Report Output & Loading States (Initial state is null: Do NOT fetch on load)
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // 3. Dropdown Masters
  const [storesList, setStoresList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [subSubcategoriesList, setSubSubcategoriesList] = useState([]);
  const [paymentMethodsList, setPaymentMethodsList] = useState([]);
  const [productsMap, setProductsMap] = useState(new Map());

  // Fetch Master Dropdowns on mount
  useEffect(() => {
    fetchMasterDropdowns();
  }, []);

  const fetchMasterDropdowns = async () => {
    try {
      const [storesRes, vendorsRes, brandsRes, catsRes, subcatsRes, subSubcatsRes, pmRes, prodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, code, name, contact_no, vendor_type, vat_registration_no').order('name'),
        supabase.from('brands').select('id, name, code').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id').order('name'),
        supabase.from('sub_subcategories').select('id, name, category_name, subcategory_name').order('name'),
        supabase.from('payment_methods').select('id, name, code').order('name'),
        supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, category_id, subcategory_id, brand_id, vendor_id, country_of_origin, purchase_price, mrp, sale_vat_percent, wh_stock, str_stock')
      ]);

      setStoresList(storesRes.data || []);
      setVendorsList(vendorsRes.data || []);
      setBrandsList(brandsRes.data || []);
      setCategoriesList(catsRes.data || []);
      setSubcategoriesList(subcatsRes.data || []);
      setSubSubcategoriesList(subSubcatsRes.data || []);
      setPaymentMethodsList(pmRes.data || []);

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
      console.error('Error fetching dropdowns in ItemwisePurchaseReceiveReport:', err);
    }
  };

  // Filtered dropdowns based on parent selection
  const availableStores = useMemo(() => {
    if (storeType === 'ALL') return storesList;
    return storesList.filter(s => s.shop_type?.toLowerCase() === storeType.toLowerCase());
  }, [storesList, storeType]);

  const availableSubcategories = useMemo(() => {
    if (selectedCategory === 'ALL') return subcategoriesList;
    return subcategoriesList.filter(s => s.category_id === selectedCategory);
  }, [subcategoriesList, selectedCategory]);

  const availableSubSubcategories = useMemo(() => {
    if (selectedSubCategory === 'ALL') return subSubcategoriesList;
    const subObj = subcategoriesList.find(s => s.id === selectedSubCategory);
    if (!subObj) return subSubcategoriesList;
    return subSubcategoriesList.filter(ss => ss.subcategory_name === subObj.name || ss.subcategory_id === selectedSubCategory);
  }, [subSubcategoriesList, subcategoriesList, selectedSubCategory]);

  // Main Handle Show: Triggered strictly by user click
  const handleShow = async () => {
    setLoading(true);
    setTableSearch('');

    try {
      // 1. Query Purchase Receives from DB
      const { data: allPrs, error: prErr } = await supabase
        .from('purchase_receives')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (prErr) console.error("PR Query error:", prErr);

      // STRICT in-memory filter on PRs (no fallback to all dates)
      const filteredPRs = (allPrs || []).filter(pr => {
        const pDate = (pr.purchase_date || pr.from_date || pr.to_date || pr.created_at || '').slice(0, 10);
        if (fromDate && pDate && pDate < fromDate) return false;
        if (toDate && pDate && pDate > toDate) return false;
        if (!pDate && (fromDate || toDate)) return false;

        // Vendor filter
        if (selectedVendor !== 'ALL' && pr.vendor_id !== selectedVendor) return false;

        // Store / Delivery To filter
        if (selectedStore !== 'ALL') {
          const storeObj = storesList.find(s => s.id === selectedStore);
          const storeName = storeObj?.name?.toLowerCase();
          const dt = (pr.delivery_to || '').toLowerCase();
          if (dt !== selectedStore.toLowerCase() && (!storeName || !dt.includes(storeName))) {
            return false;
          }
        } else if (storeType !== 'ALL') {
          const matchingStores = storesList.filter(s => s.shop_type?.toLowerCase() === storeType.toLowerCase()).map(s => s.name.toLowerCase());
          const dt = (pr.delivery_to || '').toLowerCase();
          if (!matchingStores.some(name => dt.includes(name))) {
            return false;
          }
        }

        // Payment Method filter
        if (paymentMethod !== 'ALL') {
          const pm = (pr.payment_method || pr.payment_type || '').toLowerCase();
          if (pm && !pm.includes(paymentMethod.toLowerCase())) return false;
        }

        return true;
      });

      if (filteredPRs.length === 0) {
        setReportData({
          type: reportType,
          rows: []
        });
        toast(`No purchase receive records found for ${fromDate} to ${toDate}`);
        setLoading(false);
        return;
      }

      // 2. Fetch purchase_receive_items for the filtered PRs
      const prIds = filteredPRs.map(p => p.id).filter(Boolean);
      let allPrItems = [];
      if (prIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('purchase_receive_items')
          .select('*')
          .in('purchase_receive_id', prIds);
        allPrItems = itemsData || [];
      }

      // Cross-reference PO numbers
      const poIds = [...new Set(filteredPRs.map(p => p.purchase_order_id).filter(Boolean))];
      let poMap = new Map();
      if (poIds.length > 0) {
        const { data: pos } = await supabase.from('purchase_orders').select('id, po_number, reference_no').in('id', poIds);
        (pos || []).forEach(po => {
          poMap.set(po.id, po);
          poMap.set(String(po.id), po);
        });
      }

      // 3. Filter Items based on Brand, Category, Subcategory, Sub-Subcategory, Item Name, Country of Origin, Barcode
      let matchedItems = [];

      allPrItems.forEach(item => {
        const parentPr = filteredPRs.find(pr => pr.id === item.purchase_receive_id);
        if (!parentPr) return;

        const prod = productsMap.get(item.product_id) || {};
        const matchedPo = poMap.get(parentPr.purchase_order_id);
        const vendor = vendorsList.find(v => v.id === parentPr.vendor_id || v.id === prod.vendor_id);
        const cat = categoriesList.find(c => c.id === prod.category_id);
        const subcat = subcategoriesList.find(s => s.id === prod.subcategory_id);
        const brand = brandsList.find(b => b.id === prod.brand_id);

        // Filters on product attributes
        if (selectedBrand !== 'ALL' && prod.brand_id !== selectedBrand) return;
        if (selectedCategory !== 'ALL' && prod.category_id !== selectedCategory) return;
        if (selectedSubCategory !== 'ALL' && prod.subcategory_id !== selectedSubCategory) return;
        
        if (barcodeInput !== 'ALL' && barcodeInput.trim()) {
          const q = barcodeInput.trim().toLowerCase();
          const bc = (prod.barcode || prod.user_define_barcode || '').toLowerCase();
          if (!bc.includes(q)) return;
        }

        if (itemNameInput !== 'ALL' && itemNameInput.trim()) {
          const q = itemNameInput.trim().toLowerCase();
          const name = (prod.item_name || item.product_name || '').toLowerCase();
          if (!name.includes(q)) return;
        }

        if (countryOfOriginInput !== 'ALL' && countryOfOriginInput.trim()) {
          const q = countryOfOriginInput.trim().toLowerCase();
          const coo = (prod.country_of_origin || '').toLowerCase();
          if (!coo.includes(q)) return;
        }

        const rcvQty = Number(item.rcv_qty || 0);
        const poQty = Number(item.po_qty || rcvQty);
        const purPrice = Number(item.pur_price || prod.purchase_price || 0);
        const discPercent = Number(item.disc_percent || 0);
        const val = rcvQty * purPrice;
        const discAmt = (val * discPercent) / 100;
        const vatRate = (prod.sale_vat_percent && Number(prod.sale_vat_percent) > 0 && Number(prod.sale_vat_percent) <= 1)
          ? Number((Number(prod.sale_vat_percent) * 100).toFixed(2))
          : Number(prod.sale_vat_percent || 7.50);
        const vatAmt = ((val - discAmt) * vatRate) / 100;
        const lineAmt = Number(item.line_amount) || (val - discAmt + vatAmt);

        matchedItems.push({
          id: item.id,
          challan_no: parentPr.last_challan_no || parentPr.reference_no || `PR-${parentPr.id}`,
          po_number: matchedPo?.po_number || 'Direct Receive',
          receive_date: parentPr.purchase_date || parentPr.created_at?.slice(0, 10) || fromDate,
          delivery_to: parentPr.delivery_to || 'Central Store',
          vendor_name: vendor?.name || 'Local Supplier',
          barcode: prod.barcode || prod.user_define_barcode || 'N/A',
          item_name: prod.item_name || item.product_name || 'Received Item',
          category_name: cat?.name || 'General',
          subcategory_name: subcat?.name || 'General',
          brand_name: brand?.name || '-',
          country_of_origin: prod.country_of_origin || '-',
          po_qty: poQty,
          rcv_qty: rcvQty,
          pur_price: purPrice,
          value: val,
          discount: discAmt,
          vat: vatAmt,
          total_amount: lineAmt
        });
      });

      // 4. Handle Details vs Summary
      if (reportType === 'Details') {
        // Sort items by Challan No and Date
        matchedItems.sort((a, b) => {
          if (a.challan_no !== b.challan_no) {
            return a.challan_no.localeCompare(b.challan_no);
          }
          return a.item_name.localeCompare(b.item_name);
        });

        setReportData({
          type: 'Details',
          rows: matchedItems
        });
        toast.success(`Found ${matchedItems.length} itemized purchase receive records`);
      } else {
        // Group by Barcode / Product Name for Summary
        const summaryMap = {};
        matchedItems.forEach(item => {
          const key = item.barcode !== 'N/A' ? item.barcode : item.item_name;
          if (!summaryMap[key]) {
            summaryMap[key] = {
              barcode: item.barcode,
              item_name: item.item_name,
              category_name: item.category_name,
              subcategory_name: item.subcategory_name,
              brand_name: item.brand_name,
              vendor_name: item.vendor_name,
              challans_count: 0,
              total_rcv_qty: 0,
              total_value: 0,
              total_vat: 0,
              total_amount: 0
            };
          }
          summaryMap[key].challans_count += 1;
          summaryMap[key].total_rcv_qty += item.rcv_qty;
          summaryMap[key].total_value += item.value;
          summaryMap[key].total_vat += item.vat;
          summaryMap[key].total_amount += item.total_amount;
        });

        const summaryRows = Object.values(summaryMap).map(s => ({
          ...s,
          avg_price: s.total_rcv_qty > 0 ? (s.total_value / s.total_rcv_qty) : 0
        }));

        summaryRows.sort((a, b) => a.item_name.localeCompare(b.item_name));

        setReportData({
          type: 'Summary',
          rows: summaryRows
        });
        toast.success(`Generated Summary for ${summaryRows.length} distinct products`);
      }

    } catch (err) {
      console.error('Error generating Itemwise Purchase Receive Report:', err);
      toast.error('Failed to generate report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset / Reload Handler
  const handleReload = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setStoreType('ALL');
    setSelectedStore('ALL');
    setPaymentMethod('ALL');
    setSelectedVendor('ALL');
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setCountryOfOriginInput('ALL');
    setBarcodeInput('ALL');
    setReportType('Details');
    setReportData(null);
    setTableSearch('');
    toast.success('Form filters reset to default');
  };

  // Live Table Search Filter
  const filteredRows = useMemo(() => {
    if (!reportData?.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;
    const q = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(row => {
      return Object.values(row).some(val => 
        String(val || '').toLowerCase().includes(q)
      );
    });
  }, [reportData, tableSearch]);

  // PDF Export Engine (Matching Image 3 MIS Layout & Signatures)
  const handleDownloadPDF = () => {
    if (!reportData || filteredRows.length === 0) {
      toast.error('No report data to export');
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
    const subTitle = `ITEM WISE PURCHASE RECEIVE REPORT (${reportType.toUpperCase()})`;
    doc.text(subTitle, pageWidth - 14, 14, { align: 'right' });

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
      : 'All (All Stores)';

    const vendorLabel = selectedVendor !== 'ALL'
      ? vendorsList.find(v => v.id === selectedVendor)?.name || 'Selected Vendor'
      : 'All Vendors';

    doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 30);
    doc.text(`Store Scope: ${storeType} (${storeLabel}) | Vendor: ${vendorLabel}`, 14, 35);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

    let head = [];
    let body = [];

    if (reportType === 'Details') {
      head = [['SL', 'Challan No', 'PO No', 'Date', 'Delivery To', 'Vendor', 'Barcode', 'Item Name', 'Category', 'Rcv Qty', 'Price (Tk)', 'Value (Tk)', 'Disc (Tk)', 'VAT (Tk)', 'Total (Tk)']];
      body = filteredRows.map((r, idx) => [
        idx + 1,
        r.challan_no,
        r.po_number,
        r.receive_date,
        r.delivery_to,
        r.vendor_name,
        r.barcode,
        r.item_name,
        r.category_name,
        r.rcv_qty,
        r.pur_price.toFixed(2),
        r.value.toFixed(2),
        r.discount.toFixed(2),
        r.vat.toFixed(2),
        r.total_amount.toFixed(2)
      ]);
      const totRcv = filteredRows.reduce((sum, r) => sum + r.rcv_qty, 0);
      const totVal = filteredRows.reduce((sum, r) => sum + r.value, 0);
      const totDisc = filteredRows.reduce((sum, r) => sum + r.discount, 0);
      const totVat = filteredRows.reduce((sum, r) => sum + r.vat, 0);
      const totAmt = filteredRows.reduce((sum, r) => sum + r.total_amount, 0);
      body.push(['Total', '', '', '', '', '', `${filteredRows.length} Items`, '', '', totRcv, '', totVal.toFixed(2), totDisc.toFixed(2), totVat.toFixed(2), totAmt.toFixed(2)]);
    } else {
      head = [['SL', 'Barcode', 'Item Name', 'Category', 'Sub Category', 'Brand', 'Vendor', 'Challans', 'Total Qty', 'Avg Price (Tk)', 'Total Value (Tk)', 'VAT (Tk)', 'Total Amount (Tk)']];
      body = filteredRows.map((r, idx) => [
        idx + 1,
        r.barcode,
        r.item_name,
        r.category_name,
        r.subcategory_name,
        r.brand_name,
        r.vendor_name,
        r.challans_count,
        r.total_rcv_qty,
        r.avg_price.toFixed(2),
        r.total_value.toFixed(2),
        r.total_vat.toFixed(2),
        r.total_amount.toFixed(2)
      ]);
      const totChallans = filteredRows.reduce((sum, r) => sum + r.challans_count, 0);
      const totQty = filteredRows.reduce((sum, r) => sum + r.total_rcv_qty, 0);
      const totVal = filteredRows.reduce((sum, r) => sum + r.total_value, 0);
      const totVat = filteredRows.reduce((sum, r) => sum + r.total_vat, 0);
      const totAmt = filteredRows.reduce((sum, r) => sum + r.total_amount, 0);
      body.push(['Total', `${filteredRows.length} Items`, '', '', '', '', '', totChallans, totQty, '', totVal.toFixed(2), totVat.toFixed(2), totAmt.toFixed(2)]);
    }

    autoTable(doc, {
      head,
      body,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [46, 111, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      didParseCell: function(data) {
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

    // Bottom Signatures (Matching Image 3)
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

    doc.save(`Item_Wise_Purchase_Receive_${reportType}_${fromDate}_to_${toDate}.pdf`);
    toast.success('PDF downloaded successfully');
  };

  // Excel Export
  const handleDownloadExcel = () => {
    if (!reportData || filteredRows.length === 0) {
      toast.error('No report data to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Purchase_Receive_${reportType}`);
    XLSX.writeFile(workbook, `Item_Wise_Purchase_Receive_${reportType}_${fromDate}_to_${toDate}.xlsx`);
    toast.success('Excel downloaded successfully');
  };

  return (
    <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', minHeight: '100%', fontSize: '0.82rem', fontFamily: 'inherit' }}>
      
      {/* Page Title */}
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: '0 0 16px 0' }}>
        Item wise Purchase Receive Report
      </h1>

      {/* Main Filter Card matching User's Image layout */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: '20px'
      }}>
        
        {/* 2-Column Search Criteria Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '12px 30px', marginBottom: '16px' }}>
          
          {/* Row 1 Left: From Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>From Date</label>
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
            />
          </div>

          {/* Row 1 Right: To Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>To Date</label>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
            />
          </div>

          {/* Row 2 Left: Store Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Store Type</label>
            <select
              value={storeType}
              onChange={e => {
                setStoreType(e.target.value);
                setSelectedStore('ALL');
              }}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">ALL</option>
              <option value="Store">Store</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Central Store">Central Store</option>
            </select>
          </div>

          {/* Row 2 Right: Store */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Store</label>
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">Select Store</option>
              {availableStores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Row 3 Left: Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">ALL</option>
              <option value="Cash">Cash</option>
              <option value="Credit">Credit</option>
              <option value="Bank">Bank</option>
              {paymentMethodsList.map(pm => (
                <option key={pm.id} value={pm.name}>{pm.name}</option>
              ))}
            </select>
          </div>

          {/* Row 3 Right: Vendor */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Vendor</label>
            <select
              value={selectedVendor}
              onChange={e => setSelectedVendor(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">ALL</option>
              {vendorsList.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.code || 'Vendor'})</option>
              ))}
            </select>
          </div>

          {/* Row 4 Left: Brand */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Brand</label>
            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">ALL</option>
              {brandsList.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Row 4 Right: Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Category</label>
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory('ALL');
                setSelectedSubSubcategory('ALL');
              }}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">ALL</option>
              {categoriesList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Row 5 Left: Sub Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Sub Category</label>
            <select
              value={selectedSubCategory}
              onChange={e => {
                setSelectedSubCategory(e.target.value);
                setSelectedSubSubcategory('ALL');
              }}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">ALL</option>
              {availableSubcategories.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          </div>

          {/* Row 5 Right: Sub Subcategory */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Sub Subcategory</label>
            <select
              value={selectedSubSubcategory}
              onChange={e => setSelectedSubSubcategory(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">ALL</option>
              {availableSubSubcategories.map(ssc => (
                <option key={ssc.id} value={ssc.id}>{ssc.name}</option>
              ))}
            </select>
          </div>

          {/* Row 6 Left: Item Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Item Name</label>
            <input 
              type="text" 
              value={itemNameInput} 
              onChange={e => setItemNameInput(e.target.value)}
              placeholder="ALL or enter item name..."
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
            />
          </div>

          {/* Row 6 Right: Country Of Origin */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Country Of Origin</label>
            <input 
              type="text" 
              value={countryOfOriginInput} 
              onChange={e => setCountryOfOriginInput(e.target.value)}
              placeholder="ALL or enter country..."
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
            />
          </div>

          {/* Row 7 Left: Barcode */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Barcode</label>
            <input 
              type="text" 
              value={barcodeInput} 
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="ALL or enter barcode..."
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
            />
          </div>

        </div>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '14px 0 16px 0' }} />

        {/* Report Type (Details vs Summary) */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
            Report Type
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            
            {/* Details Radio */}
            <label 
              onClick={() => setReportType('Details')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: reportType === 'Details' ? 600 : 400,
                color: reportType === 'Details' ? '#166534' : '#334155',
                userSelect: 'none'
              }}
            >
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: reportType === 'Details' ? '2px solid #2e6f40' : '1.5px solid #94a3b8',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}>
                {reportType === 'Details' && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#2e6f40'
                  }} />
                )}
              </div>
              <span>Details</span>
            </label>

            {/* Summary Radio */}
            <label 
              onClick={() => setReportType('Summary')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: reportType === 'Summary' ? 600 : 400,
                color: reportType === 'Summary' ? '#166534' : '#334155',
                userSelect: 'none'
              }}
            >
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: reportType === 'Summary' ? '2px solid #2e6f40' : '1.5px solid #94a3b8',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}>
                {reportType === 'Summary' && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#2e6f40'
                  }} />
                )}
              </div>
              <span>Summary</span>
            </label>

          </div>
        </div>

        {/* Print Type & Action Buttons */}
        <div>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
            Print Type
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Show Button (Aero Sky Blue .btn-info) */}
            <button
              onClick={handleShow}
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
              disabled={loading || !reportData || filteredRows.length === 0}
              className="btn-info"
              style={{
                padding: '6px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: (!reportData || filteredRows.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              <FileSpreadsheet size={14} />
              Show Excel
            </button>

            {/* Download PDF Button (.btn-theme Emerald Green) */}
            <button
              onClick={handleDownloadPDF}
              disabled={loading || !reportData || filteredRows.length === 0}
              className="btn-theme"
              style={{
                padding: '6px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: (!reportData || filteredRows.length === 0) ? 'not-allowed' : 'pointer'
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

      {/* Report Data Table Output (Shown ONLY after user clicks Show) */}
      {reportData && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          
          {/* Header of Table View */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                Item wise Purchase Receive Report ({reportData.type})
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Date Range: <strong>{fromDate}</strong> to <strong>{toDate}</strong> | 
                Total Records: <strong>{filteredRows.length}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={tableSearch} 
                  onChange={e => setTableSearch(e.target.value)}
                  placeholder="Search in table..."
                  style={{
                    padding: '5px 10px 5px 28px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    outline: 'none',
                    width: '200px'
                  }}
                />
                <Search size={14} style={{ position: 'absolute', left: '8px', top: '7px', color: '#94a3b8' }} />
              </div>
              <button
                onClick={handleDownloadPDF}
                className="btn-theme"
                style={{
                  padding: '5px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <Printer size={13} />
                Print / PDF
              </button>
            </div>
          </div>

          {/* Table */}
          {filteredRows.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
              No purchase receive records found matching your search criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    {reportData.type === 'Details' ? (
                      <>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', width: '40px' }}>SL</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Challan No</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>PO No</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Date</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Vendor</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Delivery To</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Barcode</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Item Name</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', textAlign: 'right' }}>Rcv Qty</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', textAlign: 'right' }}>Price (৳)</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', textAlign: 'right' }}>Value (৳)</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', textAlign: 'right' }}>Disc (৳)</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', textAlign: 'right' }}>VAT (৳)</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Total (৳)</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', width: '40px' }}>SL</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Barcode</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Item Name</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Category</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Sub Category</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Brand</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54' }}>Vendor</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', textAlign: 'right' }}>Challans</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', textAlign: 'right' }}>Total Qty</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', textAlign: 'right' }}>Avg Price (৳)</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', textAlign: 'right' }}>Total Value (৳)</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #3d8b54', textAlign: 'right' }}>VAT (৳)</th>
                        <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'right' }}>Total Amount (৳)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportData.type === 'Details' ? (
                    filteredRows.map((r, idx) => (
                      <tr 
                        key={r.id || idx}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          borderBottom: '1px solid #f1f5f9'
                        }}
                      >
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{r.challan_no}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{r.po_number}</td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>{r.receive_date}</td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>{r.vendor_name}</td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>{r.delivery_to}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0284c7' }}>{r.barcode}</td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>{r.item_name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>{r.rcv_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#334155' }}>{r.pur_price.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#334155' }}>{r.value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626' }}>{r.discount.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>{r.vat.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{r.total_amount.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr 
                        key={idx}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          borderBottom: '1px solid #f1f5f9'
                        }}
                      >
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0284c7' }}>{r.barcode}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{r.item_name}</td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>{r.category_name}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{r.subcategory_name}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{r.brand_name}</td>
                        <td style={{ padding: '8px 10px', color: '#334155' }}>{r.vendor_name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#334155' }}>{r.challans_count}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>{r.total_rcv_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#334155' }}>{r.avg_price.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#334155' }}>{r.total_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>{r.total_vat.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{r.total_amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #bbf7d0', fontWeight: 700, color: '#166534' }}>
                    {reportData.type === 'Details' ? (
                      <>
                        <td style={{ padding: '10px' }}>Total</td>
                        <td colSpan={7} style={{ padding: '10px' }}>{filteredRows.length} Items Listed</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          {filteredRows.reduce((sum, r) => sum + r.rcv_qty, 0)}
                        </td>
                        <td style={{ padding: '10px' }}></td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          ৳ {filteredRows.reduce((sum, r) => sum + r.value, 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>
                          ৳ {filteredRows.reduce((sum, r) => sum + r.discount, 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#0284c7' }}>
                          ৳ {filteredRows.reduce((sum, r) => sum + r.vat, 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          ৳ {filteredRows.reduce((sum, r) => sum + r.total_amount, 0).toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px' }}>Total</td>
                        <td colSpan={6} style={{ padding: '10px' }}>{filteredRows.length} Distinct Products</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          {filteredRows.reduce((sum, r) => sum + r.challans_count, 0)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          {filteredRows.reduce((sum, r) => sum + r.total_rcv_qty, 0)}
                        </td>
                        <td style={{ padding: '10px' }}></td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          ৳ {filteredRows.reduce((sum, r) => sum + r.total_value, 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#0284c7' }}>
                          ৳ {filteredRows.reduce((sum, r) => sum + r.total_vat, 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          ৳ {filteredRows.reduce((sum, r) => sum + r.total_amount, 0).toFixed(2)}
                        </td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
