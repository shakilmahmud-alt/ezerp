import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Printer, Search, FileSpreadsheet, 
  TrendingUp, TrendingDown, AlertCircle, Scale, Package, 
  ShoppingBag, Layers, Filter 
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const SlowFastNonMovingReport = () => {
  const { user } = useAuth();

  // Date Range Defaults
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filter States matching screenshot
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');

  // Parameters
  const [showRecords, setShowRecords] = useState(10);
  const [productLessThanValue, setProductLessThanValue] = useState(5);

  // Report Type Radio (Slow Moving, With Scale Items, Fast Moving, Non Moving)
  const [reportType, setReportType] = useState('Slow Moving');

  // Value Type Radio (Quantity Wise, Value Wise)
  const [valueType, setValueType] = useState('Quantity Wise');

  // Master Data
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  // Raw fetched items for instant switching
  const [rawAggregatedData, setRawAggregatedData] = useState(null);

  // UI State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [tableSearch, setTableSearch] = useState('');

  // Initial Master Data Load
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [storesRes, vendorsRes, brandsRes, catsRes, subCatsRes, subSubCatsRes, prodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('brands').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id, category_name').order('name'),
        supabase.from('sub_subcategories').select('id, name, subcategory_id, category_name, subcategory_name').order('name'),
        supabase.from('products').select(`
          id, code, barcode, user_define_barcode, item_name, product_description,
          category_id, subcategory_id, sub_subcategory_id, brand_id, vendor_id,
          purchase_price, mrp, wh_stock, str_stock, status
        `).order('item_name')
      ]);

      setStores(storesRes.data || []);
      setVendors(vendorsRes.data || []);
      setBrands(brandsRes.data || []);
      setCategories(catsRes.data || []);
      setSubcategories(subCatsRes.data || []);
      setSubSubcategories(subSubCatsRes.data || []);
      setAllProducts(prodsRes.data || []);
    } catch (err) {
      console.error('Error fetching master data:', err);
      toast.error('Failed to load filter options');
    }
  };

  // Filtered Subcategories based on selected Category
  const filteredSubcategories = useMemo(() => {
    if (selectedCategory === 'ALL') return subcategories;
    const cat = categories.find(c => c.name === selectedCategory || c.id === selectedCategory);
    if (!cat) return subcategories;
    return subcategories.filter(s => 
      s.category_id === cat.id || 
      s.category_name?.trim().toLowerCase() === cat.name?.trim().toLowerCase()
    );
  }, [selectedCategory, subcategories, categories]);

  // Filtered Sub-Subcategories based on selected Sub Category
  const filteredSubSubcategories = useMemo(() => {
    if (selectedSubCategory === 'ALL') return subSubcategories;
    const sub = subcategories.find(s => s.name === selectedSubCategory || s.id === selectedSubCategory);
    if (!sub) return subSubcategories;
    return subSubcategories.filter(ss => 
      ss.subcategory_id === sub.id || 
      ss.subcategory_name?.trim().toLowerCase() === sub.name?.trim().toLowerCase()
    );
  }, [selectedSubCategory, subSubcategories, subcategories]);

  // Pure function to filter and slice items according to Report Type & Value Type
  const computeReportOutput = (rType, vType, limitCount, lessThanVal, rawData) => {
    if (!rawData) return null;

    const { soldItems, nonMovingItems } = rawData;
    let list = [];
    const threshold = Number(lessThanVal) || 5;
    const maxRecords = Number(limitCount) > 0 ? Number(limitCount) : 999999;

    if (rType === 'Fast Moving') {
      // Products with sales > 0, sorted descending by Quantity or Value
      list = [...soldItems].filter(item => item.sold_qty > 0);
      if (vType === 'Quantity Wise') {
        list.sort((a, b) => b.sold_qty - a.sold_qty || b.total_sales - a.total_sales);
      } else {
        list.sort((a, b) => b.total_sales - a.total_sales || b.sold_qty - a.sold_qty);
      }
      list = list.slice(0, maxRecords);
    } else if (rType === 'Slow Moving') {
      // Products with sales > 0 and <= threshold
      list = [...soldItems].filter(item => {
        if (item.sold_qty <= 0) return false;
        if (vType === 'Quantity Wise') {
          return item.sold_qty <= threshold;
        } else {
          return item.total_sales <= threshold;
        }
      });
      // Sort lowest sales first (or ascending)
      if (vType === 'Quantity Wise') {
        list.sort((a, b) => a.sold_qty - b.sold_qty || a.total_sales - b.total_sales);
      } else {
        list.sort((a, b) => a.total_sales - b.total_sales || a.sold_qty - b.sold_qty);
      }
      list = list.slice(0, maxRecords);
    } else if (rType === 'Non Moving') {
      // Products that had ZERO sales in the period
      list = [...nonMovingItems];
      // Sort by highest stock value tied up first
      list.sort((a, b) => (b.current_stock * b.mrp) - (a.current_stock * a.mrp));
      list = list.slice(0, maxRecords);
    } else if (rType === 'With Scale Items') {
      // Weighted / Scale products (description or name contains weight units like kg, gm, gram, scale)
      list = [...soldItems, ...nonMovingItems].filter(item => {
        const text = `${item.item_name} ${item.product_description || ''}`.toLowerCase();
        return text.includes('kg') || text.includes('gm') || text.includes('gram') || 
               text.includes('scale') || text.includes('ltr') || item.is_scale;
      });
      if (vType === 'Quantity Wise') {
        list.sort((a, b) => b.sold_qty - a.sold_qty);
      } else {
        list.sort((a, b) => b.total_sales - a.total_sales);
      }
      list = list.slice(0, maxRecords);
    }

    const rows = list.map((r, idx) => ({
      sl: idx + 1,
      ...r
    }));

    const totalQty = rows.reduce((s, r) => s + (r.sold_qty || 0), 0);
    const totalSales = rows.reduce((s, r) => s + (r.total_sales || 0), 0);
    const totalStock = rows.reduce((s, r) => s + (r.current_stock || 0), 0);
    const totalStockVal = rows.reduce((s, r) => s + ((r.current_stock || 0) * (r.cost_price || 0)), 0);

    return {
      reportType: rType,
      valueType: vType,
      threshold,
      rows,
      totals: {
        total_products: rows.length,
        total_qty: totalQty,
        total_sales: totalSales,
        total_stock: totalStock,
        total_stock_value: totalStockVal
      }
    };
  };

  // Instant switching on radio changes
  const handleReportTypeChange = (newType) => {
    setReportType(newType);
    if (rawAggregatedData) {
      const computed = computeReportOutput(newType, valueType, showRecords, productLessThanValue, rawAggregatedData);
      setReportData(computed);
    }
  };

  const handleValueTypeChange = (newValType) => {
    setValueType(newValType);
    if (rawAggregatedData) {
      const computed = computeReportOutput(reportType, newValType, showRecords, productLessThanValue, rawAggregatedData);
      setReportData(computed);
    }
  };

  // Reset Filters Handler
  const handleReload = () => {
    const today = new Date().toISOString().split('T')[0];
    const past = new Date();
    past.setDate(past.getDate() - 30);
    setFromDate(past.toISOString().split('T')[0]);
    setToDate(today);
    setStoreType('ALL');
    setSelectedStore('ALL');
    setSelectedVendor('ALL');
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setShowRecords(10);
    setProductLessThanValue(5);
    setReportType('Slow Moving');
    setValueType('Quantity Wise');
    setRawAggregatedData(null);
    setReportData(null);
    setTableSearch('');
    toast.success('Filters reset');
  };

  // Main Fetch & Execution Logic
  const handleShowReport = async () => {
    setLoading(true);

    try {
      // 1. Fetch sales and sale items from POS
      const [salesRes, saleItemsRes] = await Promise.all([
        supabase.from('sales').select('id, invoice_no, store_id, sale_date, created_at'),
        supabase.from('sale_items').select('*')
      ]);

      const salesList = salesRes.data || [];
      const saleItemsList = saleItemsRes.data || [];

      // Fast Lookup Maps
      const storeMap = new Map();
      stores.forEach(s => storeMap.set(s.id, s));

      const vendorMap = new Map();
      vendors.forEach(v => vendorMap.set(v.id, v.name));

      const brandMap = new Map();
      brands.forEach(b => brandMap.set(b.id, b.name));

      const catMap = new Map();
      categories.forEach(c => catMap.set(c.id, c.name));

      const subCatMap = new Map();
      subcategories.forEach(s => subCatMap.set(s.id, s.name));

      const subSubCatMap = new Map();
      subSubcategories.forEach(ss => subSubCatMap.set(ss.id, ss.name));

      // Filter sales by date range and store
      const fDate = new Date(fromDate);
      fDate.setHours(0, 0, 0, 0);
      const tDate = new Date(toDate);
      tDate.setHours(23, 59, 59, 999);

      const validSaleIds = new Set();
      salesList.forEach(s => {
        const sDateRaw = s.sale_date || s.created_at;
        if (!sDateRaw) return;
        const d = new Date(sDateRaw);
        if (d < fDate || d > tDate) return;

        // Store filter
        if (selectedStore !== 'ALL' && selectedStore !== '') {
          if (s.store_id !== selectedStore) return;
        }

        // Store Type filter
        if (storeType !== 'ALL' && storeType !== '') {
          const stObj = storeMap.get(s.store_id);
          if (stObj && stObj.shop_type && stObj.shop_type.toLowerCase() !== storeType.toLowerCase()) return;
        }

        validSaleIds.add(s.id);
        if (s.invoice_no) validSaleIds.add(s.invoice_no);
      });

      // Product lookup map
      const productLookup = new Map();
      allProducts.forEach(p => {
        if (p.id) productLookup.set(p.id, p);
        if (p.barcode) productLookup.set(String(p.barcode).trim(), p);
        if (p.user_define_barcode) productLookup.set(String(p.user_define_barcode).trim(), p);
        if (p.code) productLookup.set(String(p.code).trim(), p);
      });

      // Aggregate sales by Barcode / Product
      const productSalesAgg = new Map();

      saleItemsList.forEach(item => {
        if (!validSaleIds.has(item.sale_id) && !validSaleIds.has(item.invoice_no)) return;

        const p = productLookup.get(item.product_id) || productLookup.get(item.barcode) || productLookup.get(item.user_barcode);
        const barcodeKey = String(item.user_barcode || item.barcode || p?.user_define_barcode || p?.barcode || p?.code || '').trim();
        if (!barcodeKey) return;

        const qty = Number(item.qty || 1);
        const val = Number(item.total_value) > 0 
          ? Number(item.total_value) 
          : (qty * Number(item.unit_price || 0) - Number(item.discount_amount || 0));

        if (!productSalesAgg.has(barcodeKey)) {
          productSalesAgg.set(barcodeKey, {
            sold_qty: 0,
            total_sales: 0,
            sample_item: item,
            matched_product: p
          });
        }

        const curr = productSalesAgg.get(barcodeKey);
        curr.sold_qty += qty;
        curr.total_sales += val;
      });

      // Build items matching current category/vendor/brand filters
      const soldItems = [];
      const nonMovingItems = [];

      allProducts.forEach(p => {
        const barcode = p.user_define_barcode || p.barcode || p.code || '-';
        const brandName = brandMap.get(p.brand_id) || '-';
        const vendorName = vendorMap.get(p.vendor_id) || '-';
        const catName = catMap.get(p.category_id) || '-';
        const subCatName = subCatMap.get(p.subcategory_id) || '-';
        const subSubCatName = subSubCatMap.get(p.sub_subcategory_id) || '-';
        const itemName = p.item_name || 'Item';

        // Apply Search Criteria Filters
        if (selectedVendor !== 'ALL' && vendorName.toLowerCase() !== selectedVendor.toLowerCase()) return;
        if (selectedBrand !== 'ALL' && brandName.toLowerCase() !== selectedBrand.toLowerCase()) return;
        if (selectedCategory !== 'ALL' && catName.toLowerCase() !== selectedCategory.toLowerCase()) return;
        if (selectedSubCategory !== 'ALL' && subCatName.toLowerCase() !== selectedSubCategory.toLowerCase()) return;
        if (selectedSubSubcategory !== 'ALL' && subSubCatName.toLowerCase() !== selectedSubSubcategory.toLowerCase()) return;
        if (itemNameInput !== 'ALL' && itemNameInput.trim()) {
          const q = itemNameInput.trim().toLowerCase();
          const matchName = itemName.toLowerCase().includes(q);
          const matchBarcode = String(barcode).toLowerCase().includes(q);
          if (!matchName && !matchBarcode) return;
        }

        const currentStock = (Number(p.wh_stock) || 0) + (Number(p.str_stock) || 0);
        const costPrice = Number(p.purchase_price) || 0;
        const mrp = Number(p.mrp) || 0;

        const agg = productSalesAgg.get(String(barcode).trim()) || productSalesAgg.get(String(p.barcode).trim()) || productSalesAgg.get(String(p.id).trim());

        const isScale = (p.product_description || '').toLowerCase().includes('kg') || 
                        (p.product_description || '').toLowerCase().includes('gm') ||
                        itemName.toLowerCase().includes('kg') ||
                        itemName.toLowerCase().includes('gm');

        const record = {
          barcode,
          item_name: itemName,
          product_description: p.product_description || 'Pcs',
          category: catName,
          sub_category: subCatName,
          sub_subcategory: subSubCatName,
          brand: brandName,
          vendor: vendorName,
          current_stock: currentStock,
          cost_price: costPrice,
          mrp: mrp,
          sold_qty: agg ? agg.sold_qty : 0,
          total_sales: agg ? agg.total_sales : 0,
          is_scale: isScale
        };

        if (agg && agg.sold_qty > 0) {
          soldItems.push(record);
        } else {
          nonMovingItems.push(record);
        }
      });

      const raw = { soldItems, nonMovingItems };
      setRawAggregatedData(raw);

      const computed = computeReportOutput(reportType, valueType, showRecords, productLessThanValue, raw);
      setReportData(computed);

      if (computed.rows.length === 0) {
        toast('No products match the selected criteria.', { icon: 'ℹ️' });
      } else {
        toast.success(`Loaded ${computed.rows.length} records`);
      }
    } catch (err) {
      console.error('Error generating report:', err);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Client side search inside table
  const displayedRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;
    const q = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(r => 
      Object.values(r).some(val => String(val).toLowerCase().includes(q))
    );
  }, [reportData, tableSearch]);

  // Standardized PDF Export (Landscape with Signatures)
  const handlePrintPDF = () => {
    if (!reportData || reportData.rows.length === 0) {
      toast.error("Please click 'Show' first to generate report");
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Centered Company Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(46, 111, 64);
    doc.text("EZ ERP", pageWidth / 2, 13, { align: 'center' });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text("House: 352, Lane: 05, 2nd floor, Baridhara DOHS, Dhaka-1212, Bangladesh", pageWidth / 2, 18, { align: 'center' });

    // 2. Top Right Title & Period
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(46, 111, 64);
    doc.text(`${reportData.reportType.toUpperCase()} REPORT (${reportData.valueType.toUpperCase()})`, pageWidth - 14, 13, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(`Period: ${fromDate} to ${toDate}`, pageWidth - 14, 18.5, { align: 'right' });
    doc.text(`Limit: Top ${showRecords} | Threshold: ${productLessThanValue}`, pageWidth - 14, 23, { align: 'right' });

    // 3. Top Left Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text("Store:", 14, 18.5);
    doc.setFont("helvetica", "normal");
    doc.text(selectedStore === 'ALL' || !selectedStore ? 'ALL' : (stores.find(s => s.id === selectedStore)?.name || selectedStore), 32, 18.5);

    doc.setFont("helvetica", "bold");
    doc.text("Category:", 14, 23);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedCategory}`, 32, 23);

    doc.setFont("helvetica", "bold");
    doc.text("Brand:", 14, 27.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedBrand}`, 32, 27.5);

    // 4. Build Table
    const head = [[
      'SL', 'Barcode', 'Item Name', 'Category', 'Brand', 
      'Stock', 'Cost (TP)', 'MRP', 'Sold Qty', 'Total Sales (৳)', 'Status'
    ]];

    const body = [];
    displayedRows.forEach((r, idx) => {
      body.push([
        idx + 1,
        r.barcode,
        r.item_name,
        r.category,
        r.brand,
        r.current_stock,
        Number(r.cost_price).toFixed(2),
        Number(r.mrp).toFixed(2),
        r.sold_qty,
        Number(r.total_sales).toFixed(2),
        reportData.reportType
      ]);
    });

    // Total Row
    body.push([
      'Total',
      '',
      `${reportData.rows.length} Items`,
      '',
      '',
      reportData.totals.total_stock,
      '',
      '',
      reportData.totals.total_qty,
      Number(reportData.totals.total_sales).toFixed(2),
      ''
    ]);

    autoTable(doc, {
      startY: 33,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 30, 30] },
      headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 26 },
        2: { halign: 'left' },
        3: { halign: 'left', cellWidth: 26 },
        4: { halign: 'left', cellWidth: 24 },
        5: { halign: 'right', cellWidth: 18 },
        6: { halign: 'right', cellWidth: 20 },
        7: { halign: 'right', cellWidth: 20 },
        8: { halign: 'right', cellWidth: 18 },
        9: { halign: 'right', cellWidth: 24 },
        10: { halign: 'center', cellWidth: 24 }
      },
      didParseCell: function (data) {
        if (data.section === 'head' && data.column.index === 0) {
          data.cell.styles.halign = 'center';
        }
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 240];
          data.cell.styles.textColor = [10, 60, 20];
        }
      },
      margin: { top: 10, left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY || 150;

    // 5. Signatures Block
    const sigY = Math.max(finalY + 24, pageHeight - 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setLineWidth(0.4);

    const currentUserName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Admin';
    const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Admin' : currentUserName;

    // Posted By
    doc.line(20, sigY, 70, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(2, 132, 199);
    doc.text(displayName, 45, sigY - 2, { align: 'center' });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text('Posted By', 45, sigY + 5, { align: 'center' });

    // Checked By
    doc.setFont("helvetica", "bold");
    doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
    doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

    // Authorized Signature
    doc.setFont("helvetica", "bold");
    doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
    doc.text('Authorized Signature', pageWidth - 45, sigY + 5, { align: 'center' });

    doc.save(`${reportData.reportType.replace(/\s+/g, '_')}_Report_${fromDate}_to_${toDate}.pdf`);
    toast.success("PDF Downloaded");
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || reportData.rows.length === 0) {
      toast.error("Please click 'Show' first to generate report");
      return;
    }

    const exportData = reportData.rows.map((r, idx) => ({
      'SL': idx + 1,
      'Barcode': r.barcode,
      'Item Name': r.item_name,
      'Category': r.category,
      'Sub Category': r.sub_category,
      'Sub Subcategory': r.sub_subcategory,
      'Brand': r.brand,
      'Vendor': r.vendor,
      'Current Stock': r.current_stock,
      'Cost Price (TP)': Number(r.cost_price).toFixed(2),
      'Sale Price (MRP)': Number(r.mrp).toFixed(2),
      'Sold Qty': r.sold_qty,
      'Total Sales (৳)': Number(r.total_sales).toFixed(2),
      'Movement Status': reportData.reportType
    }));

    exportData.push({
      'SL': 'Total',
      'Barcode': '',
      'Item Name': `${reportData.rows.length} Items`,
      'Category': '',
      'Sub Category': '',
      'Sub Subcategory': '',
      'Brand': '',
      'Vendor': '',
      'Current Stock': reportData.totals.total_stock,
      'Cost Price (TP)': '',
      'Sale Price (MRP)': '',
      'Sold Qty': reportData.totals.total_qty,
      'Total Sales (৳)': Number(reportData.totals.total_sales).toFixed(2),
      'Movement Status': ''
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movement Report");
    XLSX.writeFile(wb, `${reportData.reportType.replace(/\s+/g, '_')}_Report_${fromDate}_to_${toDate}.xlsx`);
    toast.success("Excel Downloaded");
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Top Header Title */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '18px' }}>
        Slow or Fast or Non Moving Report
      </h2>

      {/* Main Filter Panel - Exact Layout from Screenshot */}
      <div style={{
        backgroundColor: 'var(--card-bg, #fff)',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        marginBottom: '24px'
      }}>
        
        {/* 2-Column Grid for Filter Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '20px'
        }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* From Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>From Date</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)}
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

            {/* Store Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Store Type</label>
              <select 
                value={storeType} 
                onChange={e => setStoreType(e.target.value)}
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
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Outlet">Outlet</option>
              </select>
            </div>

            {/* Vendor */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Vendor</label>
              <select 
                value={selectedVendor} 
                onChange={e => setSelectedVendor(e.target.value)}
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
                {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
              </select>
            </div>

            {/* Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Category</label>
              <select 
                value={selectedCategory} 
                onChange={e => { setSelectedCategory(e.target.value); setSelectedSubCategory('ALL'); setSelectedSubSubcategory('ALL'); }}
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
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Sub Subcategory */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Sub Subcategory</label>
              <select 
                value={selectedSubSubcategory} 
                onChange={e => setSelectedSubSubcategory(e.target.value)}
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
                {filteredSubSubcategories.map(ssc => <option key={ssc.id} value={ssc.name}>{ssc.name}</option>)}
              </select>
            </div>

            {/* Show Record(s) ? */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Show Record(s) ?</label>
              <input 
                type="number" 
                min="1" 
                value={showRecords} 
                onChange={e => setShowRecords(Math.max(1, Number(e.target.value) || 10))}
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

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* To Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>To Date</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={e => setToDate(e.target.value)}
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

            {/* Store */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Store</label>
              <select 
                value={selectedStore} 
                onChange={e => setSelectedStore(e.target.value)}
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
                <option value="ALL">Select Store</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Brand */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Brand</label>
              <select 
                value={selectedBrand} 
                onChange={e => setSelectedBrand(e.target.value)}
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
                {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>

            {/* Sub Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Sub Category</label>
              <select 
                value={selectedSubCategory} 
                onChange={e => { setSelectedSubCategory(e.target.value); setSelectedSubSubcategory('ALL'); }}
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
                {filteredSubcategories.map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
              </select>
            </div>

            {/* Item Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Item Name</label>
              <input 
                type="text" 
                placeholder="ALL"
                value={itemNameInput === 'ALL' ? '' : itemNameInput} 
                onChange={e => setItemNameInput(e.target.value || 'ALL')}
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

            {/* Product Less Than Value */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Product Less Than Value</label>
              <input 
                type="number" 
                min="0" 
                value={productLessThanValue} 
                onChange={e => setProductLessThanValue(Math.max(0, Number(e.target.value) || 0))}
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

          </div>
        </div>

        {/* Report Type Section (Horizontal Layout as in Screenshot) */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
            Report Type
          </h4>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
            {['Slow Moving', 'With Scale Items', 'Fast Moving', 'Non Moving'].map(type => (
              <label 
                key={type} 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: reportType === type ? '#2e6f40' : 'var(--text-primary)',
                  fontWeight: reportType === type ? 600 : 400
                }}
              >
                <input 
                  type="radio" 
                  name="movingReportType"
                  checked={reportType === type}
                  onChange={() => handleReportTypeChange(type)}
                  style={{ 
                    accentColor: '#2e6f40', 
                    width: '15px', 
                    height: '15px', 
                    cursor: 'pointer' 
                  }}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Value Type Section (Horizontal Layout as in Screenshot) */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
            Value Type
          </h4>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
            {['Quantity Wise', 'Value Wise'].map(type => (
              <label 
                key={type} 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: valueType === type ? '#2e6f40' : 'var(--text-primary)',
                  fontWeight: valueType === type ? 600 : 400
                }}
              >
                <input 
                  type="radio" 
                  name="movingValueType"
                  checked={valueType === type}
                  onChange={() => handleValueTypeChange(type)}
                  style={{ 
                    accentColor: '#2e6f40', 
                    width: '15px', 
                    height: '15px', 
                    cursor: 'pointer' 
                  }}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons Section - Windows 7 Aero Style */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Print Type
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Show Button */}
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

            {/* Show Excel Button */}
            <button
              onClick={handleExportExcel}
              className="btn-info"
              style={{
                padding: '6px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <FileSpreadsheet size={14} />
              Show Excel
            </button>

            {/* Download PDF Button */}
            <button
              onClick={handlePrintPDF}
              className="btn-theme"
              style={{
                padding: '6px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <Download size={14} />
              Download PDF
            </button>

            {/* Reload Button */}
            <button
              onClick={handleReload}
              className="btn-danger"
              style={{
                padding: '6px 18px',
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

      {/* Report Output Display Panel */}
      {reportData && (
        <div className="animate-fade-in" style={{
          backgroundColor: 'var(--card-bg, #fff)',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e2e8f0)',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
        }}>
          
          {/* Summary KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            
            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe' }}>
              <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase' }}>Products Analyzed</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c4a6e', marginTop: '4px' }}>
                {reportData.totals.total_products}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
              <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Sold Qty</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#14532d', marginTop: '4px' }}>
                {reportData.totals.total_qty}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f5f3ff', border: '1px solid #ede9fe' }}>
              <div style={{ fontSize: '0.78rem', color: '#5b21b6', fontWeight: 600, textTransform: 'uppercase' }}>Total Sales Value</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4c1d95', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_sales).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
              <div style={{ fontSize: '0.78rem', color: '#854d0e', fontWeight: 600, textTransform: 'uppercase' }}>Available Stock Units</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#713f12', marginTop: '4px' }}>
                {reportData.totals.total_stock}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5' }}>
              <div style={{ fontSize: '0.78rem', color: '#c2410c', fontWeight: 600, textTransform: 'uppercase' }}>Inventory Value (TP)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#9a3412', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_stock_value).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fdf4ff', border: '1px solid #fae8ff' }}>
              <div style={{ fontSize: '0.78rem', color: '#86198f', fontWeight: 600, textTransform: 'uppercase' }}>Analysis Basis</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#701a75', marginTop: '6px' }}>
                {reportData.reportType} ({reportData.valueType})
              </div>
            </div>

          </div>

          {/* Quick Table Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {reportData.reportType} ({displayedRows.length} Items)
              </h3>
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Filter table rows..." 
                value={tableSearch}
                onChange={e => setTableSearch(e.target.value)}
                style={{ padding: '6px 12px 6px 32px', fontSize: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '4px', width: '220px' }}
              />
            </div>
          </div>

          {/* Data Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff', fontWeight: 'bold' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>SL</th>
                  <th style={{ padding: '10px 8px' }}>Barcode</th>
                  <th style={{ padding: '10px 8px' }}>Item Name</th>
                  <th style={{ padding: '10px 8px' }}>Category</th>
                  <th style={{ padding: '10px 8px' }}>Sub Category</th>
                  <th style={{ padding: '10px 8px' }}>Brand</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Current Stock</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cost Price (TP)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Sold Qty</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Sales (৳)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((r, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid var(--border-color, #e2e8f0)',
                        backgroundColor: idx % 2 === 0 ? 'var(--card-bg, #ffffff)' : '#fafafa' 
                      }}
                    >
                      <td style={{ padding: '8px 8px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 8px', fontWeight: 600, color: '#2e6f40' }}>{r.barcode}</td>
                      <td style={{ padding: '8px 8px', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.item_name}>
                        {r.item_name}
                      </td>
                      <td style={{ padding: '8px 8px' }}>{r.category}</td>
                      <td style={{ padding: '8px 8px' }}>{r.sub_category}</td>
                      <td style={{ padding: '8px 8px' }}>{r.brand}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{r.current_stock}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.cost_price).toFixed(2)}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.mrp).toFixed(2)}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: r.sold_qty > 0 ? '#1e293b' : '#94a3b8' }}>
                        {r.sold_qty}
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: r.total_sales > 0 ? '#166534' : '#64748b' }}>
                        ৳ {Number(r.total_sales).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.74rem', 
                          fontWeight: 600,
                          backgroundColor: reportType === 'Fast Moving' ? '#dcfce7' : reportType === 'Slow Moving' ? '#fef3c7' : reportType === 'Non Moving' ? '#fee2e2' : '#e0f2fe',
                          color: reportType === 'Fast Moving' ? '#166534' : reportType === 'Slow Moving' ? '#92400e' : reportType === 'Non Moving' ? '#991b1b' : '#0369a1'
                        }}>
                          {reportType}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Total Footer Row */}
              {displayedRows.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold', borderTop: '2px solid #bbf7d0' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>Total</td>
                    <td colSpan={5} style={{ padding: '10px 8px' }}>{reportData.rows.length} Listed Items</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                    <td style={{ padding: '10px 8px' }}></td>
                    <td style={{ padding: '10px 8px' }}></td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_sales).toFixed(2)}</td>
                    <td style={{ padding: '10px 8px' }}></td>
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

export default SlowFastNonMovingReport;
