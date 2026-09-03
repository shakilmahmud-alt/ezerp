import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Calendar, RotateCcw, RefreshCw, Play, Printer, Download, 
  Search, FileSpreadsheet, Layers, Tag, ShoppingBag, 
  CheckCircle2, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const PromotionWiseSalesReport = () => {
  const { user } = useAuth();

  // Date range defaults to current month/today
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Filters from screenshot
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedPromoType, setSelectedPromoType] = useState('ALL');
  const [selectedPromoName, setSelectedPromoName] = useState('ALL');
  const [selectedCircularNo, setSelectedCircularNo] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');

  // Report Type (Single choice, default 'Details')
  const [reportType, setReportType] = useState('Details');

  // Master Data States
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [promotionsList, setPromotionsList] = useState([]);
  const [productsList, setProductsList] = useState([]);

  // Report Output State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [rawProcessedItems, setRawProcessedItems] = useState(null);
  const [tableSearch, setTableSearch] = useState('');

  // Initial Load of master data
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [
        storesRes,
        vendorsRes,
        catsRes,
        subCatsRes,
        subSubCatsRes,
        promosRes,
        prodsRes
      ] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id, category_name').order('name'),
        supabase.from('sub_subcategories').select('id, name, subcategory_id, category_name, subcategory_name').order('name'),
        supabase.from('promotions').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, category_id, subcategory_id, sub_subcategory_id, brand_id, vendor_id, mrp').order('item_name')
      ]);

      setStores(storesRes.data || []);
      setVendors(vendorsRes.data || []);
      setCategories(catsRes.data || []);
      setSubcategories(subCatsRes.data || []);
      setSubSubcategories(subSubCatsRes.data || []);
      setPromotionsList(promosRes.data || []);
      setProductsList(prodsRes.data || []);
    } catch (err) {
      console.error('Error loading master data:', err);
      toast.error('Failed to load filter options');
    }
  };

  // Distinct Promotion Types from circular promotions
  const promotionTypes = useMemo(() => {
    const types = new Set();
    promotionsList.forEach(p => {
      if (p.promotion_type) types.add(p.promotion_type);
    });
    types.add('Circular Discount');
    types.add('Buy Get');
    types.add('Coupon');
    return Array.from(types);
  }, [promotionsList]);

  // Filtered Promotion Names based on Promotion Type
  const filteredPromotionNames = useMemo(() => {
    return promotionsList.filter(p => {
      if (selectedPromoType !== 'ALL' && p.promotion_type !== selectedPromoType) return false;
      return true;
    });
  }, [promotionsList, selectedPromoType]);

  // Filtered Circular Numbers
  const filteredCircularNumbers = useMemo(() => {
    return promotionsList.filter(p => {
      if (selectedPromoType !== 'ALL' && p.promotion_type !== selectedPromoType) return false;
      if (selectedPromoName !== 'ALL' && p.circular_name !== selectedPromoName) return false;
      return true;
    });
  }, [promotionsList, selectedPromoType, selectedPromoName]);

  // Filtered Subcategories based on Category
  const filteredSubcategories = useMemo(() => {
    if (selectedCategory === 'ALL') return subcategories;
    const cat = categories.find(c => c.name === selectedCategory || c.id === selectedCategory);
    if (!cat) return subcategories;
    return subcategories.filter(s => 
      s.category_id === cat.id || 
      s.category_name?.trim().toLowerCase() === cat.name?.trim().toLowerCase()
    );
  }, [selectedCategory, subcategories, categories]);

  // Filtered Sub-Subcategories
  const filteredSubSubcategories = useMemo(() => {
    if (selectedSubCategory === 'ALL') return subSubcategories;
    const sub = subcategories.find(s => s.name === selectedSubCategory || s.id === selectedSubCategory);
    if (!sub) return subSubcategories;
    return subSubcategories.filter(ss => 
      ss.subcategory_id === sub.id || 
      ss.subcategory_name?.trim().toLowerCase() === sub.name?.trim().toLowerCase()
    );
  }, [selectedSubCategory, subSubcategories, subcategories]);

  // Reset Filters Handler
  const handleReload = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    setFromDate(d.toISOString().split('T')[0]);
    setToDate(new Date().toISOString().split('T')[0]);
    setStoreType('ALL');
    setSelectedStore('');
    setSelectedPromoType('ALL');
    setSelectedPromoName('ALL');
    setSelectedCircularNo('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setSelectedVendor('ALL');
    setReportType('Details');
    setReportData(null);
    setRawProcessedItems(null);
    setTableSearch('');
    toast.success('Filters reset');
  };

  // Pure Function to Compute Report Data based on current report type
  const computeReportData = (targetType, items) => {
    if (!items || items.length === 0) {
      return { reportType: targetType, rows: [], totals: { total_items: 0, total_qty: 0, total_gross: 0, total_discount: 0, total_net: 0 } };
    }

    const isNonPromo = targetType.includes('Non Promotional');
    const filteredPool = items.filter(r => isNonPromo ? !r.is_promotional : r.is_promotional);

    let rows = [];

    if (targetType === 'Details') {
      // Product-wise Promotional Details (the 3 products in the active promotion)
      const prodMap = new Map();
      filteredPool.forEach(it => {
        const key = `${it.circular_no}_${it.barcode}`;
        if (!prodMap.has(key)) {
          prodMap.set(key, {
            circular_no: it.circular_no,
            promo_name: it.promo_name,
            promo_type: it.promo_type,
            store_name: it.store_name,
            barcode: it.barcode,
            item_name: it.item_name,
            category: it.category,
            sub_category: it.sub_category,
            vendor: it.vendor,
            brand: it.brand,
            qty: 0,
            unit_price: it.unit_price,
            gross_value: 0,
            discount_percent: it.discount_percent,
            discount_amount: 0,
            net_value: 0
          });
        }
        const curr = prodMap.get(key);
        curr.qty += it.qty;
        curr.gross_value += it.gross_value;
        curr.discount_amount += it.discount_amount;
        curr.net_value += it.net_value;
      });

      rows = Array.from(prodMap.values()).map((r, idx) => ({
        sl: idx + 1,
        ...r
      }));
    } else if (targetType === 'Summary') {
      // Circular / Promotion Level Summary (1 row per promotion)
      const sumMap = new Map();
      filteredPool.forEach(it => {
        const key = `${it.circular_no}_${it.promo_name}_${it.store_name}`;
        if (!sumMap.has(key)) {
          sumMap.set(key, {
            circular_no: it.circular_no,
            promo_name: it.promo_name,
            promo_type: it.promo_type,
            store_name: it.store_name,
            products_set: new Set(),
            total_qty: 0,
            gross_amount: 0,
            discount_amount: 0,
            net_amount: 0
          });
        }
        const curr = sumMap.get(key);
        curr.products_set.add(it.barcode);
        curr.total_qty += it.qty;
        curr.gross_amount += it.gross_value;
        curr.discount_amount += it.discount_amount;
        curr.net_amount += it.net_value;
      });

      rows = Array.from(sumMap.values()).map((s, idx) => ({
        sl: idx + 1,
        circular_no: s.circular_no,
        promo_name: s.promo_name,
        promo_type: s.promo_type,
        store_name: s.store_name,
        items_count: s.products_set.size,
        total_qty: s.total_qty,
        gross_amount: s.gross_amount,
        discount_amount: s.discount_amount,
        net_amount: s.net_amount
      }));
    } else if (targetType === 'Promotional Discount Details By Range') {
      // Transaction / Invoice-wise detailed list
      rows = filteredPool.map((it, idx) => ({
        sl: idx + 1,
        ...it
      }));
    } else if (targetType === 'Promotional Discount Summary By Range') {
      // Group by Circular / Store
      const groupMap = new Map();
      filteredPool.forEach(it => {
        const key = `${it.circular_no}_${it.promo_name}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            circular_no: it.circular_no,
            promo_name: it.promo_name,
            promo_type: it.promo_type,
            store_name: it.store_name,
            products_set: new Set(),
            invoices_set: new Set(),
            total_qty: 0,
            gross_amount: 0,
            discount_amount: 0,
            net_amount: 0
          });
        }
        const g = groupMap.get(key);
        g.products_set.add(it.barcode);
        g.invoices_set.add(it.invoice_no);
        g.total_qty += it.qty;
        g.gross_amount += it.gross_value;
        g.discount_amount += it.discount_amount;
        g.net_amount += it.net_value;
      });

      rows = Array.from(groupMap.values()).map((g, idx) => ({
        sl: idx + 1,
        circular_no: g.circular_no,
        promo_name: g.promo_name,
        promo_type: g.promo_type,
        store_name: g.store_name,
        items_count: g.products_set.size,
        invoices_count: g.invoices_set.size,
        total_qty: g.total_qty,
        gross_amount: g.gross_amount,
        discount_amount: g.discount_amount,
        net_amount: g.net_amount
      }));
    } else if (targetType === 'Non Promotional Discount Details') {
      // Non promotional product-wise summary
      const nonProdMap = new Map();
      filteredPool.forEach(it => {
        const key = it.barcode;
        if (!nonProdMap.has(key)) {
          nonProdMap.set(key, {
            store_name: it.store_name,
            barcode: it.barcode,
            item_name: it.item_name,
            category: it.category,
            vendor: it.vendor,
            brand: it.brand,
            qty: 0,
            unit_price: it.unit_price,
            gross_value: 0,
            discount_amount: 0,
            net_value: 0
          });
        }
        const p = nonProdMap.get(key);
        p.qty += it.qty;
        p.gross_value += it.gross_value;
        p.discount_amount += it.discount_amount;
        p.net_value += it.net_value;
      });

      rows = Array.from(nonProdMap.values()).map((r, idx) => ({
        sl: idx + 1,
        ...r
      }));
    } else if (targetType === 'Non Promotional Discount Summary') {
      // Non promotional grouped by Store & Category
      const sumMap = new Map();
      filteredPool.forEach(it => {
        const key = `${it.store_name}_${it.category}`;
        if (!sumMap.has(key)) {
          sumMap.set(key, {
            store_name: it.store_name,
            category: it.category,
            products_set: new Set(),
            total_qty: 0,
            gross_amount: 0,
            discount_amount: 0,
            net_amount: 0
          });
        }
        const s = sumMap.get(key);
        s.products_set.add(it.barcode);
        s.total_qty += it.qty;
        s.gross_amount += it.gross_value;
        s.discount_amount += it.discount_amount;
        s.net_amount += it.net_value;
      });

      rows = Array.from(sumMap.values()).map((s, idx) => ({
        sl: idx + 1,
        store_name: s.store_name,
        category: s.category,
        items_count: s.products_set.size,
        total_qty: s.total_qty,
        gross_amount: s.gross_amount,
        discount_amount: s.discount_amount,
        net_amount: s.net_amount
      }));
    } else {
      // Non Promotional Discount By Range (Grouped by Date)
      const dateMap = new Map();
      filteredPool.forEach(it => {
        const key = `${it.date}_${it.store_name}`;
        if (!dateMap.has(key)) {
          dateMap.set(key, {
            date: it.date,
            store_name: it.store_name,
            products_set: new Set(),
            total_qty: 0,
            gross_amount: 0,
            discount_amount: 0,
            net_amount: 0
          });
        }
        const d = dateMap.get(key);
        d.products_set.add(it.barcode);
        d.total_qty += it.qty;
        d.gross_amount += it.gross_value;
        d.discount_amount += it.discount_amount;
        d.net_amount += it.net_value;
      });

      rows = Array.from(dateMap.values()).map((d, idx) => ({
        sl: idx + 1,
        date: d.date,
        store_name: d.store_name,
        items_count: d.products_set.size,
        total_qty: d.total_qty,
        gross_amount: d.gross_amount,
        discount_amount: d.discount_amount,
        net_amount: d.net_amount
      }));
    }

    // Compute Overall Totals
    const totalQty = rows.reduce((acc, r) => acc + (Number(r.total_qty ?? r.qty) || 0), 0);
    const totalGross = rows.reduce((acc, r) => acc + (Number(r.gross_amount ?? r.gross_value) || 0), 0);
    const totalDisc = rows.reduce((acc, r) => acc + (Number(r.discount_amount) || 0), 0);
    const totalNet = rows.reduce((acc, r) => acc + (Number(r.net_amount ?? r.net_value) || 0), 0);

    return {
      reportType: targetType,
      rows,
      totals: {
        total_items: rows.length,
        total_qty: totalQty,
        total_gross: totalGross,
        total_discount: totalDisc,
        total_net: totalNet
      }
    };
  };

  // Update filter state on radio changes (report output changes only on Show button click)
  const handleReportTypeChange = (newType) => {
    setReportType(newType);
  };

  // Main Report Generation Logic
  const handleShowReport = async () => {
    setLoading(true);

    try {
      // 1. Fetch sales, sale items, promotions, and promotion items
      const [salesRes, saleItemsRes, promoItemsRes] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('sale_items').select('*').order('created_at', { ascending: false }),
        supabase.from('promotion_items').select('*')
      ]);

      const salesList = salesRes.data || [];
      const saleItemsList = saleItemsRes.data || [];
      const allPromoItems = promoItemsRes.data || [];

      // Maps for fast relation resolution
      const storeMap = new Map();
      stores.forEach(s => storeMap.set(s.id, s.name));

      const catMap = new Map();
      categories.forEach(c => catMap.set(c.id, c.name));

      const subCatMap = new Map();
      subcategories.forEach(s => subCatMap.set(s.id, s.name));

      const subSubCatMap = new Map();
      subSubcategories.forEach(ss => subSubCatMap.set(ss.id, ss.name));

      const vendorMap = new Map();
      vendors.forEach(v => vendorMap.set(v.id, v.name));

      const productMap = new Map();
      productsList.forEach(p => {
        if (p.id) productMap.set(p.id, p);
        if (p.barcode) productMap.set(String(p.barcode).trim(), p);
        if (p.user_define_barcode) productMap.set(String(p.user_define_barcode).trim(), p);
        if (p.code) productMap.set(String(p.code).trim(), p);
      });

      // Map promotions and promotion items
      const promoById = new Map();
      promotionsList.forEach(p => promoById.set(p.id, p));

      // Key promo items by barcode / user_barcode / code
      const promoItemsByBarcode = new Map();
      allPromoItems.forEach(item => {
        const promo = promoById.get(item.promotion_id);
        const itemInfo = {
          ...item,
          circular_name: promo?.circular_name || 'Promotion',
          circular_code: promo?.circular_code || '',
          promotion_type: promo?.promotion_type || 'Circular Discount',
          valid_from: promo?.valid_from,
          valid_to: promo?.valid_to,
          promo_stores: promo?.stores || 'ALL'
        };
        if (item.barcode) promoItemsByBarcode.set(String(item.barcode).trim().toLowerCase(), itemInfo);
        if (item.user_barcode) promoItemsByBarcode.set(String(item.user_barcode).trim().toLowerCase(), itemInfo);
        if (item.code) promoItemsByBarcode.set(String(item.code).trim().toLowerCase(), itemInfo);
      });

      // Filter sales by date range
      const fDate = new Date(fromDate);
      fDate.setHours(0, 0, 0, 0);
      const tDate = new Date(toDate);
      tDate.setHours(23, 59, 59, 999);

      const salesById = new Map();
      salesList.forEach(s => {
        const sDate = s.created_at ? new Date(s.created_at) : new Date();
        if (sDate >= fDate && sDate <= tDate) {
          salesById.set(s.id, s);
          if (s.invoice_no) salesById.set(s.invoice_no, s);
        }
      });

      // Filter sale items
      const processedItems = [];

      saleItemsList.forEach(item => {
        const sale = salesById.get(item.sale_id) || salesById.get(item.invoice_no);
        if (!sale && !salesById.has(item.sale_id)) return;

        const storeName = sale?.store_name || storeMap.get(sale?.store_id) || 'Central Store';
        
        // Filter by store
        if (selectedStore && selectedStore !== 'Select Store' && selectedStore !== 'ALL') {
          if (storeName.trim().toLowerCase() !== selectedStore.trim().toLowerCase()) return;
        }

        // Filter by store type
        if (storeType !== 'ALL') {
          const sObj = stores.find(st => st.name === storeName);
          if (sObj && sObj.shop_type && sObj.shop_type !== storeType) return;
        }

        // Resolve Product
        const p = productMap.get(item.product_id) || productMap.get(item.barcode) || productMap.get(item.user_barcode);
        const barcodeVal = item.user_barcode || item.barcode || p?.user_define_barcode || p?.barcode || p?.code || '-';
        const itemName = item.product_name || p?.item_name || 'Item';
        const catName = catMap.get(p?.category_id) || '-';
        const subCatName = subCatMap.get(p?.subcategory_id) || '-';
        const subSubCatName = subSubCatMap.get(p?.sub_subcategory_id) || '-';
        const vendorName = vendorMap.get(p?.vendor_id) || '-';

        // Filters check
        if (selectedCategory !== 'ALL' && catName.toLowerCase() !== selectedCategory.toLowerCase()) return;
        if (selectedSubCategory !== 'ALL' && subCatName.toLowerCase() !== selectedSubCategory.toLowerCase()) return;
        if (selectedSubSubcategory !== 'ALL' && subSubCatName.toLowerCase() !== selectedSubSubcategory.toLowerCase()) return;
        if (selectedVendor !== 'ALL' && vendorName.toLowerCase() !== selectedVendor.toLowerCase()) return;
        if (itemNameInput !== 'ALL' && itemNameInput.trim()) {
          if (!itemName.toLowerCase().includes(itemNameInput.trim().toLowerCase())) return;
        }

        // Check if item belongs to a Promotion
        const promoInfo = promoItemsByBarcode.get(String(barcodeVal).trim().toLowerCase()) ||
                          promoItemsByBarcode.get(String(item.barcode).trim().toLowerCase()) ||
                          promoItemsByBarcode.get(String(item.user_barcode).trim().toLowerCase()) || null;

        const isPromotional = promoInfo !== null || Number(item.discount_amount || 0) > 0 || Number(item.discount_percent || 0) > 0;

        // Apply Promotion filters if applicable
        if (selectedPromoType !== 'ALL') {
          const pType = promoInfo?.promotion_type || (isPromotional ? 'Circular Discount' : 'None');
          if (pType !== selectedPromoType) return;
        }
        if (selectedPromoName !== 'ALL') {
          const pName = promoInfo?.circular_name || '';
          if (pName !== selectedPromoName) return;
        }
        if (selectedCircularNo !== 'ALL') {
          const cNo = promoInfo?.circular_code || '';
          if (cNo !== selectedCircularNo && `#${cNo}` !== selectedCircularNo) return;
        }

        const qty = Number(item.qty || 1);
        const unitPrice = Number(item.unit_price || p?.mrp || 0);
        const grossValue = qty * unitPrice;

        // Accurate Discount Calculation:
        let discPct = Number(item.discount_percent || 0);
        if (discPct === 0 && promoInfo?.discount_percent) {
          discPct = Number(promoInfo.discount_percent);
        }
        let discAmt = Number(item.discount_amount || 0);
        if (discAmt === 0 && discPct > 0) {
          discAmt = parseFloat(((grossValue * discPct) / 100).toFixed(2));
        } else if (discAmt === 0 && promoInfo?.discount_amount) {
          discAmt = parseFloat((Number(promoInfo.discount_amount) * qty).toFixed(2));
        }

        const vatAmt = Number(item.vat_amount || 0);
        const netValue = Number(item.total_value) > 0 ? Number(item.total_value) : (grossValue - discAmt + vatAmt);

        processedItems.push({
          id: item.id,
          invoice_no: item.invoice_no || sale?.invoice_no || 'INV-1',
          date: sale?.created_at ? new Date(sale.created_at).toISOString().split('T')[0] : (item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : toDate),
          store_name: storeName,
          circular_no: promoInfo?.circular_code ? (promoInfo.circular_code.startsWith('#') ? promoInfo.circular_code : `#${promoInfo.circular_code}`) : (isPromotional ? '#PR-AUTO' : '-'),
          promo_name: promoInfo?.circular_name || (isPromotional ? 'Store Discount' : 'Regular Sale'),
          promo_type: promoInfo?.promotion_type || (isPromotional ? 'Circular Discount' : 'Regular'),
          barcode: barcodeVal,
          item_name: itemName,
          category: catName,
          sub_category: subCatName,
          sub_subcategory: subSubCatName,
          vendor: vendorName,
          brand: promoInfo?.brand || p?.brand || '-',
          qty: qty,
          unit_price: unitPrice,
          gross_value: grossValue,
          discount_percent: discPct,
          discount_amount: discAmt,
          net_value: netValue,
          is_promotional: isPromotional
        });
      });

      setRawProcessedItems(processedItems);
      const computed = computeReportData(reportType, processedItems);
      setReportData(computed);

      if (computed.rows.length === 0) {
        toast('No sales records match the selected filters.', { icon: 'ℹ️' });
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

  // Filter rendered rows by table search bar
  const displayedRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;
    const q = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(r => 
      Object.values(r).some(val => String(val).toLowerCase().includes(q))
    );
  }, [reportData, tableSearch]);

  // Standardized PDF Export (Exact Match to Project Design Standard - Image 3)
  const handlePrintPDF = () => {
    if (!reportData || reportData.rows.length === 0) {
      toast.error("Please click 'Show' to generate data first");
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

    // 2. Top Right Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(46, 111, 64);
    doc.text("PROMOTION WISE SALES REPORT", pageWidth - 14, 13, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(`Report Type: ${reportType}`, pageWidth - 14, 18.5, { align: 'right' });
    doc.text(`Period: ${fromDate} to ${toDate}`, pageWidth - 14, 23, { align: 'right' });
    doc.text(`Store: ${selectedStore || 'ALL'}`, pageWidth - 14, 27.5, { align: 'right' });

    // 3. Top Left Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text("Promotion Type:", 14, 18.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedPromoType}`, 45, 18.5);

    doc.setFont("helvetica", "bold");
    doc.text("Promotion Name:", 14, 23);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedPromoName}`, 45, 23);

    doc.setFont("helvetica", "bold");
    doc.text("Circular No:", 14, 27.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedCircularNo}`, 45, 27.5);

    // 4. Build Table
    const currentType = reportData.reportType;
    let head = [];
    let body = [];
    let colStyles = {};

    if (currentType === 'Summary' || currentType.includes('Summary')) {
      head = [['SL', 'Circular No', 'Promotion Name', 'Type', 'Store', 'Items Sold', 'Total Qty', 'Gross Sale', 'Disc. Amount', 'Net Sale']];
      reportData.rows.forEach((r, idx) => {
        body.push([
          idx + 1,
          r.circular_no || '-',
          r.promo_name || r.category || '-',
          r.promo_type || 'Regular',
          r.store_name,
          r.items_count,
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.net_amount).toFixed(2)
        ]);
      });

      // Total Row
      body.push([
        'Total',
        '',
        `${reportData.rows.length} groups`,
        '',
        '',
        '',
        reportData.totals.total_qty,
        Number(reportData.totals.total_gross).toFixed(2),
        Number(reportData.totals.total_discount).toFixed(2),
        Number(reportData.totals.total_net).toFixed(2)
      ]);

      colStyles = {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'left', cellWidth: 26 },
        2: { halign: 'left' },
        3: { halign: 'left', cellWidth: 28 },
        4: { halign: 'left', cellWidth: 32 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'right', cellWidth: 20 },
        7: { halign: 'right', cellWidth: 25 },
        8: { halign: 'right', cellWidth: 25 },
        9: { halign: 'right', cellWidth: 28 }
      };
    } else if (currentType === 'Details') {
      head = [['SL', 'Circular No', 'Promotion Name', 'Store', 'Barcode', 'Item Name', 'Category', 'Qty', 'MRP', 'Gross', 'Disc(%)', 'Disc.Amt', 'Net Sale']];
      reportData.rows.forEach((r, idx) => {
        body.push([
          idx + 1,
          r.circular_no,
          r.promo_name,
          r.store_name,
          r.barcode,
          r.item_name,
          r.category,
          r.qty,
          Number(r.unit_price).toFixed(2),
          Number(r.gross_value).toFixed(2),
          `${Number(r.discount_percent).toFixed(1)}%`,
          Number(r.discount_amount).toFixed(2),
          Number(r.net_value).toFixed(2)
        ]);
      });

      // Total Row
      body.push([
        'Total',
        '',
        `${reportData.rows.length} items`,
        '',
        '',
        '',
        '',
        reportData.totals.total_qty,
        '',
        Number(reportData.totals.total_gross).toFixed(2),
        '',
        Number(reportData.totals.total_discount).toFixed(2),
        Number(reportData.totals.total_net).toFixed(2)
      ]);

      colStyles = {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left', cellWidth: 24 },
        2: { halign: 'left', cellWidth: 26 },
        3: { halign: 'left', cellWidth: 24 },
        4: { halign: 'left', cellWidth: 22 },
        5: { halign: 'left' },
        6: { halign: 'left', cellWidth: 20 },
        7: { halign: 'right', cellWidth: 14 },
        8: { halign: 'right', cellWidth: 18 },
        9: { halign: 'right', cellWidth: 20 },
        10: { halign: 'right', cellWidth: 16 },
        11: { halign: 'right', cellWidth: 18 },
        12: { halign: 'right', cellWidth: 22 }
      };
    } else {
      head = [['SL', 'Date', 'Invoice No', 'Store', 'Circular', 'Barcode', 'Item Name', 'Qty', 'MRP', 'Gross', 'Disc.Amt', 'Net Sale']];
      reportData.rows.forEach((r, idx) => {
        body.push([
          idx + 1,
          r.date,
          r.invoice_no,
          r.store_name,
          r.circular_no,
          r.barcode,
          r.item_name,
          r.qty,
          Number(r.unit_price).toFixed(2),
          Number(r.gross_value).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.net_value).toFixed(2)
        ]);
      });

      // Total Row
      body.push([
        'Total',
        '',
        '',
        '',
        '',
        '',
        `${reportData.rows.length} records`,
        reportData.totals.total_qty,
        '',
        Number(reportData.totals.total_gross).toFixed(2),
        Number(reportData.totals.total_discount).toFixed(2),
        Number(reportData.totals.total_net).toFixed(2)
      ]);

      colStyles = {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'left', cellWidth: 26 },
        3: { halign: 'left', cellWidth: 26 },
        4: { halign: 'left', cellWidth: 24 },
        5: { halign: 'left', cellWidth: 24 },
        6: { halign: 'left' },
        7: { halign: 'right', cellWidth: 14 },
        8: { halign: 'right', cellWidth: 18 },
        9: { halign: 'right', cellWidth: 22 },
        10: { halign: 'right', cellWidth: 20 },
        11: { halign: 'right', cellWidth: 24 }
      };
    }

    autoTable(doc, {
      startY: 33,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 30, 30] },
      headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: colStyles,
      didParseCell: function (data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
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

    // 5. Signatures (Exact Match to Project Design Standard - Image 3)
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

    doc.save(`Promotion_Wise_Sales_${reportData.reportType.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF Downloaded");
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || reportData.rows.length === 0) {
      toast.error("Please click 'Show' to generate data first");
      return;
    }

    const currentType = reportData.reportType;
    let exportData = [];

    if (currentType === 'Summary' || currentType.includes('Summary')) {
      exportData = reportData.rows.map((r, idx) => ({
        'SL': idx + 1,
        'Circular No': r.circular_no,
        'Promotion Name': r.promo_name,
        'Type': r.promo_type,
        'Store': r.store_name,
        'Items Count': r.items_count,
        'Total Qty': r.total_qty,
        'Gross Amount': Number(r.gross_amount).toFixed(2),
        'Discount Amount': Number(r.discount_amount).toFixed(2),
        'Net Amount': Number(r.net_amount).toFixed(2)
      }));
    } else if (currentType === 'Details') {
      exportData = reportData.rows.map((r, idx) => ({
        'SL': idx + 1,
        'Circular No': r.circular_no,
        'Promotion Name': r.promo_name,
        'Type': r.promo_type,
        'Store': r.store_name,
        'Barcode': r.barcode,
        'Item Name': r.item_name,
        'Category': r.category,
        'Vendor': r.vendor,
        'Qty Sold': r.qty,
        'MRP': Number(r.unit_price).toFixed(2),
        'Gross Value': Number(r.gross_value).toFixed(2),
        'Discount (%)': r.discount_percent,
        'Discount Amount': Number(r.discount_amount).toFixed(2),
        'Net Sale Value': Number(r.net_value).toFixed(2)
      }));
    } else {
      exportData = reportData.rows.map((r, idx) => ({
        'SL': idx + 1,
        'Date': r.date,
        'Invoice No': r.invoice_no,
        'Store': r.store_name,
        'Circular No': r.circular_no,
        'Promotion Name': r.promo_name,
        'Type': r.promo_type,
        'Barcode': r.barcode,
        'Item Name': r.item_name,
        'Category': r.category,
        'Vendor': r.vendor,
        'Qty': r.qty,
        'Unit Price': Number(r.unit_price).toFixed(2),
        'Gross Value': Number(r.gross_value).toFixed(2),
        'Discount (%)': r.discount_percent,
        'Discount Amount': Number(r.discount_amount).toFixed(2),
        'Net Sale Value': Number(r.net_value).toFixed(2)
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Promotion Sales");
    XLSX.writeFile(wb, `Promotion_Sales_${currentType.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`);
    toast.success("Excel Downloaded");
  };

  const reportTypes = [
    'Details',
    'Summary',
    'Promotional Discount Details By Range',
    'Promotional Discount Summary By Range',
    'Non Promotional Discount Details',
    'Non Promotional Discount Summary',
    'Non Promotional Discount By Range'
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Top Header Title */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '18px' }}>
        Promotion wise Sales Report
      </h2>

      {/* Main Filter Panel - Exact 2 Column Grid from Screenshot */}
      <div style={{
        backgroundColor: 'var(--card-bg, #fff)',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        marginBottom: '24px'
      }}>
        {/* Top Filters Grid: 2 Columns Matching Image 2 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '16px'
        }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* From Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
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
                <option value="Physical">Physical</option>
                <option value="Online">Online</option>
                <option value="Warehouse">Warehouse</option>
              </select>
            </div>

            {/* Promotion Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Promotion Type</label>
              <select 
                value={selectedPromoType} 
                onChange={e => { setSelectedPromoType(e.target.value); setSelectedPromoName('ALL'); setSelectedCircularNo('ALL'); }}
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
                {promotionTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Circular No */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Circular No</label>
              <select 
                value={selectedCircularNo} 
                onChange={e => setSelectedCircularNo(e.target.value)}
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
                {filteredCircularNumbers.map(p => (
                  <option key={p.id} value={p.circular_code}>#{p.circular_code} ({p.circular_name})</option>
                ))}
              </select>
            </div>

            {/* Sub Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
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

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* To Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
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
                <option value="">Select Store</option>
                <option value="ALL">ALL</option>
                <option value="Central Store">Central Store</option>
                {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            {/* Promotion Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Promotion Name</label>
              <select 
                value={selectedPromoName} 
                onChange={e => setSelectedPromoName(e.target.value)}
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
                {filteredPromotionNames.map(p => (
                  <option key={p.id} value={p.circular_name}>{p.circular_name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
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

            {/* Vendor */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
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

          </div>
        </div>

        {/* Report Type Section */}
        <div style={{ marginTop: '28px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>
            Report Type
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reportTypes.map(type => (
              <label 
                key={type} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  color: reportType === type ? '#2e6f40' : 'var(--text-primary)',
                  fontWeight: reportType === type ? 600 : 400
                }}
              >
                <input 
                  type="radio" 
                  name="reportTypeRadio"
                  checked={reportType === type}
                  onChange={() => handleReportTypeChange(type)}
                  style={{ 
                    accentColor: '#2e6f40', 
                    width: '16px', 
                    height: '16px', 
                    cursor: 'pointer' 
                  }}
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons Section - Windows 7 Aero Style Matching Image 2 */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
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
          padding: '20px',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)'
        }}>
          
          {/* Summary Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
              <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Sold Items</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#14532d', marginTop: '4px' }}>
                {reportData.totals.total_items}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe' }}>
              <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase' }}>Total Quantity</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c4a6e', marginTop: '4px' }}>
                {reportData.totals.total_qty}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
              <div style={{ fontSize: '0.78rem', color: '#854d0e', fontWeight: 600, textTransform: 'uppercase' }}>Gross Sales</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#713f12', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_gross).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
              <div style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>Promo Discount</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#7f1d1d', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_discount).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f5f3ff', border: '1px solid #ede9fe' }}>
              <div style={{ fontSize: '0.78rem', color: '#5b21b6', fontWeight: 600, textTransform: 'uppercase' }}>Net Sales Value</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4c1d95', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_net).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quick Table Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {reportData.reportType} ({displayedRows.length} Rows)
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
                  {reportData.reportType === 'Summary' || reportData.reportType.includes('Summary') ? (
                    <>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 12px' }}>Circular No</th>
                      <th style={{ padding: '10px 12px' }}>Promotion Name</th>
                      <th style={{ padding: '10px 12px' }}>Type</th>
                      <th style={{ padding: '10px 12px' }}>Store</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>Items Sold</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Qty</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross Sale</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Disc. Amount</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net Sale</th>
                    </>
                  ) : reportData.reportType === 'Details' ? (
                    <>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 8px' }}>Circular No</th>
                      <th style={{ padding: '10px 8px' }}>Promotion Name</th>
                      <th style={{ padding: '10px 8px' }}>Store</th>
                      <th style={{ padding: '10px 8px' }}>Barcode</th>
                      <th style={{ padding: '10px 8px' }}>Item Name</th>
                      <th style={{ padding: '10px 8px' }}>Category</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Gross</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Disc (%)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Disc.Amt</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Net Value</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 8px' }}>Date</th>
                      <th style={{ padding: '10px 8px' }}>Invoice No</th>
                      <th style={{ padding: '10px 8px' }}>Store</th>
                      <th style={{ padding: '10px 8px' }}>Circular</th>
                      <th style={{ padding: '10px 8px' }}>Barcode</th>
                      <th style={{ padding: '10px 8px' }}>Item Name</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Gross</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Disc.Amt</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Net Value</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
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
                      {reportData.reportType === 'Summary' || reportData.reportType.includes('Summary') ? (
                        <>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#2e6f40' }}>{r.circular_no}</td>
                          <td style={{ padding: '8px 12px' }}>{r.promo_name || r.category}</td>
                          <td style={{ padding: '8px 12px' }}>{r.promo_type || 'Regular'}</td>
                          <td style={{ padding: '8px 12px' }}>{r.store_name}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.items_count}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{r.total_qty}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>{Number(r.net_amount).toFixed(2)}</td>
                        </>
                      ) : reportData.reportType === 'Details' ? (
                        <>
                          <td style={{ padding: '8px 8px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 8px', color: '#2e6f40', fontWeight: 600 }}>{r.circular_no}</td>
                          <td style={{ padding: '8px 8px' }}>{r.promo_name}</td>
                          <td style={{ padding: '8px 8px' }}>{r.store_name}</td>
                          <td style={{ padding: '8px 8px', fontWeight: 600 }}>{r.barcode}</td>
                          <td style={{ padding: '8px 8px', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.item_name}>
                            {r.item_name}
                          </td>
                          <td style={{ padding: '8px 8px' }}>{r.category}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{r.qty}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.unit_price).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.gross_value).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#0284c7' }}>{Number(r.discount_percent).toFixed(1)}%</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>{Number(r.net_value).toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px 8px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 8px' }}>{r.date}</td>
                          <td style={{ padding: '8px 8px', fontWeight: 600 }}>{r.invoice_no}</td>
                          <td style={{ padding: '8px 8px' }}>{r.store_name}</td>
                          <td style={{ padding: '8px 8px', color: '#2e6f40' }}>{r.circular_no}</td>
                          <td style={{ padding: '8px 8px' }}>{r.barcode}</td>
                          <td style={{ padding: '8px 8px', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.item_name}>
                            {r.item_name}
                          </td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{r.qty}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.unit_price).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.gross_value).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>{Number(r.net_value).toFixed(2)}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {/* Total Footer Row */}
              {displayedRows.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold', borderTop: '2px solid #bbf7d0' }}>
                    {reportData.reportType === 'Summary' || reportData.reportType.includes('Summary') ? (
                      <>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>Total</td>
                        <td colSpan={5} style={{ padding: '10px 12px' }}>{reportData.rows.length} Summary Groups</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_gross).toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_discount).toFixed(2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_net).toFixed(2)}</td>
                      </>
                    ) : reportData.reportType === 'Details' ? (
                      <>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>Total</td>
                        <td colSpan={6} style={{ padding: '10px 8px' }}>{reportData.rows.length} Promotional Products</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '10px 8px' }}></td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_gross).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px' }}></td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_discount).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_net).toFixed(2)}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>Total</td>
                        <td colSpan={6} style={{ padding: '10px 8px' }}>{reportData.rows.length} Total Records</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '10px 8px' }}></td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_gross).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_discount).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_net).toFixed(2)}</td>
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

export default PromotionWiseSalesReport;
