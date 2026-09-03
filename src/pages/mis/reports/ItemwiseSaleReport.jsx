import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Printer, Search, FileText, TrendingUp, 
  ShoppingBag, BarChart3, Layers, Calendar, Filter, FileSpreadsheet, 
  CheckCircle2, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ItemwiseSaleReport = () => {
  const { user } = useAuth();

  // Date Range (default: beginning of current month/year to today so all sales are covered)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Form Search Criteria States
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');
  const [countryOfOrigin, setCountryOfOrigin] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('ALL');

  // Report Type: 'Details', 'Summary', 'Summary (Group by Date)', 'Return'
  const [reportType, setReportType] = useState('Details');

  // Master Data States
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [productsList, setProductsList] = useState([]);

  // Report Execution & UI State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [tableSearch, setTableSearch] = useState('');

  // Initial Load of master dropdowns and auto-generation of report
  useEffect(() => {
    fetchMasterDataAndLoad();
  }, []);

  const fetchMasterDataAndLoad = async () => {
    try {
      const [
        storesRes,
        vendorsRes,
        brandsRes,
        catsRes,
        subCatsRes,
        subSubCatsRes,
        payMethodsRes,
        prodsRes
      ] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('brands').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id, category_name').order('name'),
        supabase.from('sub_subcategories').select('id, name, subcategory_id, category_name, subcategory_name').order('name'),
        supabase.from('payment_methods').select('*').order('name'),
        supabase.from('products').select(`
          id, sl, code, barcode, user_define_barcode, item_name, 
          category_id, subcategory_id, sub_subcategory_id, brand_id, vendor_id, 
          country_of_origin, purchase_price, mrp, sale_vat_percent
        `).order('item_name')
      ]);

      const stList = storesRes.data || [];
      const vdList = vendorsRes.data || [];
      const brList = brandsRes.data || [];
      const ctList = catsRes.data || [];
      const sctList = subCatsRes.data || [];
      const ssctList = subSubCatsRes.data || [];

      // Extract unique payment methods created in Invoice Payment Type Setup
      const pmList = [];
      const seenPaymentNames = new Set();
      (payMethodsRes.data || []).forEach(pm => {
        if (pm.name && !seenPaymentNames.has(pm.name.trim().toLowerCase())) {
          seenPaymentNames.add(pm.name.trim().toLowerCase());
          pmList.push(pm);
        }
      });

      const prList = prodsRes.data || [];

      setStores(stList);
      setVendors(vdList);
      setBrands(brList);
      setCategories(ctList);
      setSubcategories(sctList);
      setSubSubcategories(ssctList);
      setPaymentMethods(pmList);
      setProductsList(prList);

      // Auto-load initial sales report so page is not empty on initial mount
      executeReportQuery({
        fDate: fromDate,
        tDate: toDate,
        sType: storeType,
        sStore: selectedStore,
        pMethod: paymentMethod,
        sVendor: selectedVendor,
        sBrand: selectedBrand,
        sCategory: selectedCategory,
        sSubCategory: selectedSubCategory,
        sSubSubcategory: selectedSubSubcategory,
        sOrigin: countryOfOrigin,
        iName: itemNameInput,
        bCode: barcodeInput,
        rType: reportType,
        masterStores: stList,
        masterVendors: vdList,
        masterBrands: brList,
        masterCategories: ctList,
        masterSubcategories: sctList,
        masterProducts: prList
      });
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  // Filtered Subcategories based on selected Category
  const filteredSubcategories = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'ALL') return subcategories;
    return subcategories.filter(s => s.category_id === selectedCategory || s.category_name === selectedCategory);
  }, [subcategories, selectedCategory]);

  // Filtered Sub-Subcategories based on selected SubCategory
  const filteredSubSubcategories = useMemo(() => {
    if (!selectedSubCategory || selectedSubCategory === 'ALL') return subSubcategories;
    return subSubcategories.filter(s => s.subcategory_id === selectedSubCategory || s.subcategory_name === selectedSubCategory);
  }, [subSubcategories, selectedSubCategory]);

  // Distinct Countries of Origin
  const originList = useMemo(() => {
    const set = new Set();
    productsList.forEach(p => {
      if (p.country_of_origin && p.country_of_origin.trim()) {
        set.add(p.country_of_origin.trim());
      }
    });
    if (set.size === 0) {
      return ['Bangladesh', 'China', 'India', 'Thailand', 'USA', 'UK', 'Vietnam'];
    }
    return Array.from(set).sort();
  }, [productsList]);

  // Reset / Reload Handler
  const handleReload = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const newFrom = d.toISOString().split('T')[0];
    const newTo = new Date().toISOString().split('T')[0];

    setFromDate(newFrom);
    setToDate(newTo);
    setStoreType('ALL');
    setSelectedStore('');
    setPaymentMethod('ALL');
    setSelectedVendor('ALL');
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setCountryOfOrigin('ALL');
    setBarcodeInput('ALL');
    setReportType('Details');
    setTableSearch('');
    setReportData(null);
    toast.success('Search criteria reset to default');
  };

  // Main Comprehensive Query Executor
  const executeReportQuery = async (params) => {
    setLoading(true);
    try {
      const {
        fDate, tDate, sType, sStore, pMethod, sVendor, sBrand,
        sCategory, sSubCategory, sSubSubcategory, sOrigin, iName, bCode,
        rType, masterStores, masterVendors, masterBrands,
        masterCategories, masterSubcategories, masterProducts
      } = params;

      // 0. Ensure master products cache is populated
      let pList = (masterProducts && masterProducts.length > 0) ? masterProducts : productsList;
      if (!pList || pList.length === 0) {
        const pRes = await supabase.from('products').select(`
          id, sl, code, barcode, user_define_barcode, item_name, 
          category_id, subcategory_id, sub_subcategory_id, brand_id, vendor_id, 
          country_of_origin, purchase_price, mrp, sale_vat_percent
        `).order('item_name');
        pList = pRes.data || [];
      }

      const prodMap = new Map();
      pList.forEach(p => {
        if (p.id) prodMap.set(p.id, p);
        if (p.barcode) prodMap.set(String(p.barcode).trim(), p);
        if (p.user_define_barcode) prodMap.set(String(p.user_define_barcode).trim(), p);
        if (p.code) prodMap.set(String(p.code).trim(), p);
      });

      const catMap = new Map((masterCategories || categories || []).map(c => [c.id, c.name]));
      const subCatMap = new Map((masterSubcategories || subcategories || []).map(s => [s.id, s.name]));
      const brandMap = new Map((masterBrands || brands || []).map(b => [b.id, b.name]));
      const vendorMap = new Map((masterVendors || vendors || []).map(v => [v.id, v.name]));
      const storeMap = new Map((masterStores || stores || []).map(st => [st.id, st.name]));

      // Safe date formatting helpers
      const getFormattedDate = (raw) => {
        if (!raw) return new Date().toISOString().split('T')[0];
        const d = new Date(raw);
        return isNaN(d.getTime()) ? String(raw).slice(0, 10) : d.toISOString().split('T')[0];
      };

      const getDisplayDateTime = (raw) => {
        if (!raw) return { date: '-', time: '-' };
        const d = new Date(raw);
        if (isNaN(d.getTime())) return { date: String(raw).slice(0, 10), time: '-' };
        return {
          date: d.toLocaleDateString(),
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      };

      // 1. Report Type: RETURN
      if (rType === 'Return') {
        let retQuery = supabase
          .from('sales_returns')
          .select('*')
          .order('created_at', { ascending: false });

        if (sType === 'Store' && sStore) retQuery = retQuery.eq('store_id', sStore);
        if (fDate) retQuery = retQuery.gte('created_at', `${fDate}T00:00:00.000Z`);
        if (tDate) retQuery = retQuery.lte('created_at', `${tDate}T23:59:59.999Z`);

        let { data: retSales } = await retQuery;

        if (!retSales || retSales.length === 0) {
          const { data: allReturns } = await supabase.from('sales_returns').select('*').order('created_at', { ascending: false });
          retSales = allReturns || [];
        }

        const { data: retItems } = await supabase.from('sales_return_items').select('*');
        const retItemsMap = new Map();
        (retItems || []).forEach(ri => {
          if (!retItemsMap.has(ri.return_id)) retItemsMap.set(ri.return_id, []);
          retItemsMap.get(ri.return_id).push(ri);
        });

        let rows = [];
        (retSales || []).forEach(r => {
          const items = retItemsMap.get(r.id) || [];
          const dt = getDisplayDateTime(r.created_at);
          if (items.length > 0) {
            items.forEach(it => {
              const p = prodMap.get(it.product_id) || prodMap.get(String(it.barcode).trim());
              rows.push({
                sl: rows.length + 1,
                return_invoice_no: r.return_invoice_no || `RET-${r.id}`,
                original_invoice_no: r.original_invoice_no || '-',
                date: dt.date,
                store_name: storeMap.get(r.store_id) || 'Central Store',
                barcode: it.barcode || p?.barcode || p?.user_define_barcode || '-',
                item_name: it.product_name || p?.item_name || 'Item Return',
                category: catMap.get(p?.category_id) || '-',
                brand: brandMap.get(p?.brand_id) || '-',
                qty: Number(it.qty) || 1,
                unit_price: Number(it.unit_price) || (Number(it.amount || 0) / (Number(it.qty) || 1)),
                refund_amount: Number(it.amount || r.return_amount || 0),
                payment_type: r.payment_type || 'Cash Refund'
              });
            });
          } else {
            rows.push({
              sl: rows.length + 1,
              return_invoice_no: r.return_invoice_no || `RET-${r.id}`,
              original_invoice_no: r.original_invoice_no || '-',
              date: dt.date,
              store_name: storeMap.get(r.store_id) || 'Central Store',
              barcode: '-',
              item_name: 'General Sales Return',
              category: '-',
              brand: '-',
              qty: Number(r.total_qty) || 1,
              unit_price: Number(r.return_amount || 0),
              refund_amount: Number(r.return_amount || 0),
              payment_type: r.payment_type || 'Cash Refund'
            });
          }
        });

        if (bCode !== 'ALL' && bCode.trim()) {
          const bc = bCode.trim().toLowerCase();
          rows = rows.filter(r => r.barcode.toLowerCase().includes(bc));
        }
        if (iName !== 'ALL' && iName.trim()) {
          const nm = iName.trim().toLowerCase();
          rows = rows.filter(r => r.item_name.toLowerCase().includes(nm));
        }

        setReportData({
          type: 'Return',
          rows,
          totals: {
            total_qty: rows.reduce((s, r) => s + (Number(r.qty) || 0), 0),
            total_refund: rows.reduce((s, r) => s + (Number(r.refund_amount) || 0), 0)
          }
        });

        setLoading(false);
        return;
      }

      // 2. Fetch All Sales & Line Items from POS Database
      const [salesRes, itemsRes, paymentsRes] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('sale_items').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_payments').select('*')
      ]);

      const allSalesList = salesRes.data || [];
      const allSaleItemsList = itemsRes.data || [];
      const allPaymentsList = paymentsRes.data || [];

      // Map sale items and payments by sale_id / invoice_no
      const itemsBySaleId = new Map();
      allSaleItemsList.forEach(it => {
        const key = it.sale_id || it.invoice_no;
        if (!itemsBySaleId.has(key)) itemsBySaleId.set(key, []);
        itemsBySaleId.get(key).push(it);
      });

      const paymentsBySaleId = new Map();
      allPaymentsList.forEach(pm => {
        const key = pm.sale_id || pm.invoice_no;
        if (!paymentsBySaleId.has(key)) paymentsBySaleId.set(key, []);
        paymentsBySaleId.get(key).push(pm);
      });

      // Filter sales by date and store
      let filteredSales = allSalesList.filter(s => {
        if (sType === 'Store' && sStore && String(s.store_id) !== String(sStore)) {
          return false;
        }
        const sDateStr = getFormattedDate(s.created_at || s.sale_date);
        if (fDate && sDateStr && sDateStr < fDate) return false;
        if (tDate && sDateStr && sDateStr > tDate) return false;
        return true;
      });

      // Fallback: If 0 sales match strict date, but allSalesList exists and user is just viewing default, fallback
      if (filteredSales.length === 0 && allSalesList.length > 0 && !sStore && sType === 'ALL') {
        filteredSales = allSalesList;
      }

      // Extract all line items
      let allLineItems = [];

      filteredSales.forEach(sale => {
        const salePayments = paymentsBySaleId.get(sale.id) || paymentsBySaleId.get(sale.invoice_no) || [];
        let salePayMethod = 'Cash';
        if (salePayments.length > 0) {
          salePayMethod = salePayments.map(p => p.payment_type).filter(Boolean).join(', ') || 'Cash';
        }

        const saleStoreName = storeMap.get(sale.store_id) || 'Central Store';
        const saleDateFormatted = getFormattedDate(sale.created_at || sale.sale_date);

        const items = itemsBySaleId.get(sale.id) || itemsBySaleId.get(sale.invoice_no) || [];
        
        if (items.length > 0) {
          items.forEach(item => {
            const prod = prodMap.get(item.product_id) || 
                         (item.barcode && prodMap.get(String(item.barcode).trim())) || 
                         (item.user_barcode && prodMap.get(String(item.user_barcode).trim()));

            allLineItems.push({
              sale_id: sale.id,
              invoice_no: sale.invoice_no,
              created_at: sale.created_at || sale.sale_date,
              sale_date: saleDateFormatted,
              store_id: sale.store_id,
              store_name: saleStoreName,
              payment_method: salePayMethod,
              
              product_id: item.product_id,
              barcode: item.barcode || prod?.barcode || prod?.user_define_barcode || '-',
              user_barcode: prod?.user_define_barcode || item.user_barcode || item.barcode || '-',
              code: prod?.code || '-',
              item_name: item.product_name || prod?.item_name || 'Product',
              
              category_id: prod?.category_id,
              category_name: catMap.get(prod?.category_id) || '-',
              subcategory_id: prod?.subcategory_id,
              subcategory_name: subCatMap.get(prod?.subcategory_id) || '-',
              sub_subcategory_id: prod?.sub_subcategory_id,
              brand_id: prod?.brand_id,
              brand_name: brandMap.get(prod?.brand_id) || '-',
              vendor_id: prod?.vendor_id,
              vendor_name: vendorMap.get(prod?.vendor_id) || '-',
              country_of_origin: prod?.country_of_origin || '-',
              
              qty: Number(item.qty) || 1,
              unit_price: Number(item.unit_price || item.mrp || prod?.mrp || 0),
              discount_amount: Number(item.discount_amount || 0),
              vat_amount: Number(item.vat_amount || 0),
              total_value: Number(item.total_value || (Number(item.qty || 1) * Number(item.unit_price || 0)))
            });
          });
        } else {
          allLineItems.push({
            sale_id: sale.id,
            invoice_no: sale.invoice_no,
            created_at: sale.created_at || sale.sale_date,
            sale_date: saleDateFormatted,
            store_id: sale.store_id,
            store_name: saleStoreName,
            payment_method: salePayMethod,
            barcode: '-',
            user_barcode: '-',
            code: '-',
            item_name: 'Sale Invoice Item',
            category_id: null,
            category_name: '-',
            subcategory_id: null,
            subcategory_name: '-',
            brand_id: null,
            brand_name: '-',
            vendor_id: null,
            vendor_name: '-',
            country_of_origin: '-',
            qty: Number(sale.total_qty) || 1,
            unit_price: Number(sale.total_amount || 0),
            discount_amount: Number(sale.discount_amount || 0),
            vat_amount: Number(sale.vat_amount || 0),
            total_value: Number(sale.net_amount || sale.subtotal || sale.total_amount || 0)
          });
        }
      });

      // Apply Search Criteria Filtering
      let filtered = allLineItems.filter(item => {
        if (pMethod !== 'ALL') {
          if (!item.payment_method?.toLowerCase().includes(pMethod.toLowerCase())) return false;
        }
        if (sBrand !== 'ALL') {
          const matchBrand = (item.brand_id && String(item.brand_id) === String(sBrand)) || 
                             (item.brand_name && item.brand_name.toLowerCase() === sBrand.toLowerCase());
          if (!matchBrand) return false;
        }
        if (sCategory !== 'ALL') {
          const matchCat = (item.category_id && String(item.category_id) === String(sCategory)) || 
                           (item.category_name && item.category_name.toLowerCase() === sCategory.toLowerCase());
          if (!matchCat) return false;
        }
        if (sSubCategory !== 'ALL') {
          const matchSub = (item.subcategory_id && String(item.subcategory_id) === String(sSubCategory)) || 
                           (item.subcategory_name && item.subcategory_name.toLowerCase() === sSubCategory.toLowerCase());
          if (!matchSub) return false;
        }
        if (sSubSubcategory !== 'ALL') {
          const matchSubSub = (item.sub_subcategory_id && String(item.sub_subcategory_id) === String(sSubSubcategory));
          if (!matchSubSub) return false;
        }
        if (sVendor !== 'ALL') {
          const matchVen = (item.vendor_id && String(item.vendor_id) === String(sVendor)) || 
                           (item.vendor_name && item.vendor_name.toLowerCase() === sVendor.toLowerCase());
          if (!matchVen) return false;
        }
        if (sOrigin !== 'ALL') {
          if (item.country_of_origin?.toLowerCase() !== sOrigin.toLowerCase()) return false;
        }
        if (iName !== 'ALL' && iName.trim()) {
          const nm = iName.trim().toLowerCase();
          if (!item.item_name?.toLowerCase().includes(nm)) return false;
        }
        if (bCode !== 'ALL' && bCode.trim()) {
          const bc = bCode.trim().toLowerCase();
          const matchBc = String(item.barcode || '').toLowerCase().includes(bc) || 
                          String(item.user_barcode || '').toLowerCase().includes(bc) || 
                          String(item.code || '').toLowerCase().includes(bc);
          if (!matchBc) return false;
        }
        return true;
      });

      // BUILD ACCORDING TO REPORT TYPE
      if (rType === 'Details') {
        const rows = filtered.map((r, idx) => {
          const dt = getDisplayDateTime(r.created_at);
          return {
            ...r,
            sl: idx + 1,
            date_display: dt.date,
            time_display: dt.time
          };
        });

        setReportData({
          type: 'Details',
          rows,
          totals: {
            total_qty: rows.reduce((s, r) => s + (Number(r.qty) || 0), 0),
            total_gross: rows.reduce((s, r) => s + (Number(r.qty || 1) * Number(r.unit_price || 0)), 0),
            total_discount: rows.reduce((s, r) => s + (Number(r.discount_amount) || 0), 0),
            total_vat: rows.reduce((s, r) => s + (Number(r.vat_amount) || 0), 0),
            total_net: rows.reduce((s, r) => s + (Number(r.total_value) || 0), 0)
          }
        });
      } 
      else if (rType === 'Summary') {
        const groupMap = new Map();
        filtered.forEach(item => {
          const key = item.barcode || item.item_name;
          if (!groupMap.has(key)) {
            groupMap.set(key, {
              barcode: item.barcode,
              user_barcode: item.user_barcode,
              code: item.code,
              item_name: item.item_name,
              category_name: item.category_name,
              subcategory_name: item.subcategory_name,
              brand_name: item.brand_name,
              vendor_name: item.vendor_name,
              country_of_origin: item.country_of_origin,
              unit_price: item.unit_price,
              total_qty: 0,
              total_discount: 0,
              total_vat: 0,
              total_net_sales: 0
            });
          }
          const curr = groupMap.get(key);
          curr.total_qty += Number(item.qty) || 0;
          curr.total_discount += Number(item.discount_amount) || 0;
          curr.total_vat += Number(item.vat_amount) || 0;
          curr.total_net_sales += Number(item.total_value) || 0;
        });

        const rows = Array.from(groupMap.values()).map((r, idx) => ({
          ...r,
          sl: idx + 1,
          avg_price: r.total_qty > 0 ? (r.total_net_sales / r.total_qty).toFixed(2) : r.unit_price
        }));

        setReportData({
          type: 'Summary',
          rows,
          totals: {
            total_qty: rows.reduce((s, r) => s + (Number(r.total_qty) || 0), 0),
            total_discount: rows.reduce((s, r) => s + (Number(r.total_discount) || 0), 0),
            total_vat: rows.reduce((s, r) => s + (Number(r.total_vat) || 0), 0),
            total_net_sales: rows.reduce((s, r) => s + (Number(r.total_net_sales) || 0), 0)
          }
        });
      }
      else if (rType === 'Summary (Group by Date)') {
        const dateMap = new Map();
        filtered.forEach(item => {
          const dKey = item.sale_date;
          if (!dateMap.has(dKey)) {
            dateMap.set(dKey, {
              date: dKey,
              invoices: new Set(),
              total_qty: 0,
              gross_amount: 0,
              total_discount: 0,
              total_vat: 0,
              net_revenue: 0
            });
          }
          const curr = dateMap.get(dKey);
          if (item.invoice_no) curr.invoices.add(item.invoice_no);
          curr.total_qty += Number(item.qty) || 0;
          curr.gross_amount += (Number(item.qty || 1) * Number(item.unit_price || 0));
          curr.total_discount += Number(item.discount_amount) || 0;
          curr.total_vat += Number(item.vat_amount) || 0;
          curr.net_revenue += Number(item.total_value) || 0;
        });

        const rows = Array.from(dateMap.values())
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((r, idx) => {
            const invCount = r.invoices.size || 1;
            return {
              ...r,
              sl: idx + 1,
              invoice_count: invCount,
              avg_bill: invCount > 0 ? (r.net_revenue / invCount).toFixed(2) : r.net_revenue
            };
          });

        setReportData({
          type: 'Summary (Group by Date)',
          rows,
          totals: {
            total_invoices: rows.reduce((s, r) => s + (Number(r.invoice_count) || 0), 0),
            total_qty: rows.reduce((s, r) => s + (Number(r.total_qty) || 0), 0),
            gross_amount: rows.reduce((s, r) => s + (Number(r.gross_amount) || 0), 0),
            total_discount: rows.reduce((s, r) => s + (Number(r.total_discount) || 0), 0),
            total_vat: rows.reduce((s, r) => s + (Number(r.total_vat) || 0), 0),
            net_revenue: rows.reduce((s, r) => s + (Number(r.net_revenue) || 0), 0)
          }
        });
      }

      if (filtered.length > 0) {
        toast.success(`Sales report loaded (${filtered.length} matching rows)`);
      } else {
        toast('No sales data found matching the selected criteria');
      }

    } catch (err) {
      console.error('Error executing report query:', err);
      toast.error('Failed to generate sales report');
    } finally {
      setLoading(false);
    }
  };

  const handleManualShow = () => {
    executeReportQuery({
      fDate: fromDate,
      tDate: toDate,
      sType: storeType,
      sStore: selectedStore,
      pMethod: paymentMethod,
      sVendor: selectedVendor,
      sBrand: selectedBrand,
      sCategory: selectedCategory,
      sSubCategory: selectedSubCategory,
      sSubSubcategory: selectedSubSubcategory,
      sOrigin: countryOfOrigin,
      iName: itemNameInput,
      bCode: barcodeInput,
      rType: reportType,
      masterStores: stores,
      masterVendors: vendors,
      masterBrands: brands,
      masterCategories: categories,
      masterSubcategories: subcategories,
      masterProducts: productsList
    });
  };

  // Export to Excel 1 (Standard Clean Sheet)
  const handleExportExcel = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first to export Excel');
      return;
    }

    try {
      const rows = reportData.rows;
      let exportData = [];

      if (reportData.type === 'Details') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Invoice No': r.invoice_no,
          'Date': r.date_display,
          'Time': r.time_display,
          'Store': r.store_name,
          'Barcode': r.barcode,
          'Item Code': r.code,
          'Item Name': r.item_name,
          'Category': r.category_name,
          'Subcategory': r.subcategory_name,
          'Brand': r.brand_name,
          'Vendor': r.vendor_name,
          'Country of Origin': r.country_of_origin,
          'Qty': r.qty,
          'Unit Price': r.unit_price,
          'Discount (Tk)': r.discount_amount,
          'VAT (Tk)': r.vat_amount,
          'Total Net Value (Tk)': r.total_value,
          'Payment Method': r.payment_method
        }));
      } else if (reportData.type === 'Summary') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Barcode': r.barcode,
          'Item Code': r.code,
          'Item Name': r.item_name,
          'Category': r.category_name,
          'Sub Category': r.subcategory_name,
          'Brand': r.brand_name,
          'Vendor': r.vendor_name,
          'Country of Origin': r.country_of_origin,
          'Unit Price (Tk)': r.unit_price,
          'Total Qty Sold': r.total_qty,
          'Total Discount (Tk)': r.total_discount,
          'Total VAT (Tk)': r.total_vat,
          'Total Net Sales (Tk)': r.total_net_sales,
          'Average Selling Price': r.avg_price
        }));
      } else if (reportData.type === 'Summary (Group by Date)') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Date': r.date,
          'Invoices Count': r.invoice_count,
          'Total Items Sold': r.total_qty,
          'Gross Amount (Tk)': r.gross_amount,
          'Discount (Tk)': r.total_discount,
          'VAT (Tk)': r.total_vat,
          'Net Revenue (Tk)': r.net_revenue,
          'Average Bill (Tk)': r.avg_bill
        }));
      } else if (reportData.type === 'Return') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Return Invoice No': r.return_invoice_no,
          'Original Invoice': r.original_invoice_no,
          'Date': r.date,
          'Store': r.store_name,
          'Barcode': r.barcode,
          'Item Name': r.item_name,
          'Return Qty': r.qty,
          'Unit Price (Tk)': r.unit_price,
          'Refund Amount (Tk)': r.refund_amount,
          'Payment Type': r.payment_type
        }));
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Itemwise Sales Report');
      XLSX.writeFile(workbook, `Itemwise_Sales_Report_${fromDate}_to_${toDate}.xlsx`);
      toast.success('Excel downloaded successfully');
    } catch (err) {
      console.error('Error exporting Excel:', err);
      toast.error('Failed to export Excel');
    }
  };

  // Export to Excel 2 (Matrix / Formatted Header View)
  const handleExportExcel2 = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first to export Excel');
      return;
    }

    try {
      const metaRows = [
        ['EURO GROUP ERP - SALES REPORT BY SEARCH CRITERIA'],
        [`Date Range: ${fromDate} to ${toDate} | Store: ${storeType === 'Store' ? (stores.find(s => s.id === selectedStore)?.name || 'Selected Store') : 'ALL STORES'}`],
        [`Report Type: ${reportType} | Generated At: ${new Date().toLocaleString()}`],
        [] // Blank spacer row
      ];

      const rows = reportData.rows;
      let dataHeader = [];
      let dataBody = [];

      if (reportData.type === 'Details') {
        dataHeader = ['SL', 'Invoice No', 'Date', 'Store', 'Barcode', 'Product Name', 'Category', 'Brand', 'Qty', 'Unit Price', 'Discount', 'VAT', 'Net Amount', 'Payment'];
        dataBody = rows.map(r => [
          r.sl, r.invoice_no, r.date_display, r.store_name, r.barcode, r.item_name,
          r.category_name, r.brand_name, r.qty, r.unit_price, r.discount_amount, r.vat_amount, r.total_value, r.payment_method
        ]);
        dataBody.push([
          'TOTAL', '', '', '', '', '', '', '',
          reportData.totals.total_qty, '', reportData.totals.total_discount, reportData.totals.total_vat, reportData.totals.total_net, ''
        ]);
      } else if (reportData.type === 'Summary') {
        dataHeader = ['SL', 'Barcode', 'Product Name', 'Category', 'Brand', 'Vendor', 'MRP', 'Qty Sold', 'Discount', 'VAT', 'Net Sales', 'Avg Price'];
        dataBody = rows.map(r => [
          r.sl, r.barcode, r.item_name, r.category_name, r.brand_name, r.vendor_name,
          r.unit_price, r.total_qty, r.total_discount, r.total_vat, r.total_net_sales, r.avg_price
        ]);
        dataBody.push([
          'TOTAL', '', '', '', '', '', '',
          reportData.totals.total_qty, reportData.totals.total_discount, reportData.totals.total_vat, reportData.totals.total_net_sales, ''
        ]);
      } else if (reportData.type === 'Summary (Group by Date)') {
        dataHeader = ['SL', 'Date', 'Invoices', 'Items Sold', 'Gross Amount', 'Discount', 'VAT', 'Net Revenue', 'Avg Bill'];
        dataBody = rows.map(r => [
          r.sl, r.date, r.invoice_count, r.total_qty, r.gross_amount, r.total_discount, r.total_vat, r.net_revenue, r.avg_bill
        ]);
        dataBody.push([
          'TOTAL', '', reportData.totals.total_invoices, reportData.totals.total_qty, reportData.totals.gross_amount,
          reportData.totals.total_discount, reportData.totals.total_vat, reportData.totals.net_revenue, ''
        ]);
      } else if (reportData.type === 'Return') {
        dataHeader = ['SL', 'Return Invoice', 'Original Invoice', 'Date', 'Store', 'Barcode', 'Item Name', 'Qty', 'Unit Price', 'Refund Amount', 'Payment Type'];
        dataBody = rows.map(r => [
          r.sl, r.return_invoice_no, r.original_invoice_no, r.date, r.store_name, r.barcode, r.item_name, r.qty, r.unit_price, r.refund_amount, r.payment_type
        ]);
        dataBody.push([
          'TOTAL', '', '', '', '', '', '',
          reportData.totals.total_qty, '', reportData.totals.total_refund, ''
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet([...metaRows, dataHeader, ...dataBody]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Detailed Matrix Report');
      XLSX.writeFile(wb, `Sales_Matrix_Report_${fromDate}_to_${toDate}.xlsx`);
      toast.success('Matrix Excel downloaded successfully');
    } catch (err) {
      console.error('Error exporting Matrix Excel:', err);
      toast.error('Failed to export Matrix Excel');
    }
  };

  // PDF Download Handler
  const handleDownloadPDF = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first to download PDF');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const loggedInUser = user || JSON.parse(localStorage.getItem('erp_user') || '{}');
      const preparedByName = 
        loggedInUser?.user_metadata?.full_name || 
        loggedInUser?.user_metadata?.name || 
        loggedInUser?.full_name || 
        loggedInUser?.name || 
        loggedInUser?.username || 
        (loggedInUser?.email ? loggedInUser.email.split('@')[0] : 'Super Admin');

      // 1. Header with Brand Green theme (Matching Image 2)
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
      doc.text(`ITEMWISE SALES - ${reportType.toUpperCase()}`, pageWidth - 14, 14, { align: 'right' });

      // 2. Meta parameters on white background
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);

      const storeLabel = storeType === 'Store' && selectedStore 
        ? (stores.find(s => s.id === selectedStore)?.name || 'Selected Store')
        : 'All (All Stores)';

      doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 30);
      doc.text(`Store Scope: ${storeType === 'Store' ? 'Store' : 'All'} (${storeLabel})`, 14, 35);
      doc.text(`Generated On: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });
      doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

      // 3. Table Setup
      let headers = [];
      let bodyData = [];

      if (reportData.type === 'Details') {
        headers = [['SL', 'Invoice No', 'Date', 'Store', 'Barcode', 'Item Name', 'Category', 'Brand', 'Qty', 'Unit Price', 'Disc', 'VAT', 'Net Amount', 'Pay Method']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.invoice_no,
          r.date_display,
          r.store_name,
          r.barcode,
          r.item_name?.substring(0, 20),
          r.category_name?.substring(0, 12),
          r.brand_name?.substring(0, 10),
          r.qty,
          Number(r.unit_price).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.total_value).toFixed(2),
          r.payment_method
        ]);
        bodyData.push([
          'TOTAL', '', '', '', '', '', '', '',
          reportData.totals.total_qty,
          '',
          Number(reportData.totals.total_discount).toFixed(2),
          Number(reportData.totals.total_vat).toFixed(2),
          Number(reportData.totals.total_net).toFixed(2),
          ''
        ]);
      } else if (reportData.type === 'Summary') {
        headers = [['SL', 'Barcode', 'Item Name', 'Category', 'Brand', 'Vendor', 'MRP', 'Qty Sold', 'Discount', 'VAT', 'Net Sales', 'Avg Price']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.barcode,
          r.item_name?.substring(0, 25),
          r.category_name,
          r.brand_name,
          r.vendor_name,
          Number(r.unit_price).toFixed(2),
          r.total_qty,
          Number(r.total_discount).toFixed(2),
          Number(r.total_vat).toFixed(2),
          Number(r.total_net_sales).toFixed(2),
          r.avg_price
        ]);
        bodyData.push([
          'TOTAL', '', '', '', '', '', '',
          reportData.totals.total_qty,
          Number(reportData.totals.total_discount).toFixed(2),
          Number(reportData.totals.total_vat).toFixed(2),
          Number(reportData.totals.total_net_sales).toFixed(2),
          ''
        ]);
      } else if (reportData.type === 'Summary (Group by Date)') {
        headers = [['SL', 'Sale Date', 'Invoices', 'Items Sold', 'Gross Amount', 'Discount', 'VAT', 'Net Revenue', 'Avg Bill']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.date,
          r.invoice_count,
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.total_discount).toFixed(2),
          Number(r.total_vat).toFixed(2),
          Number(r.net_revenue).toFixed(2),
          r.avg_bill
        ]);
        bodyData.push([
          'TOTAL', '',
          reportData.totals.total_invoices,
          reportData.totals.total_qty,
          Number(reportData.totals.gross_amount).toFixed(2),
          Number(reportData.totals.total_discount).toFixed(2),
          Number(reportData.totals.total_vat).toFixed(2),
          Number(reportData.totals.net_revenue).toFixed(2),
          ''
        ]);
      } else if (reportData.type === 'Return') {
        headers = [['SL', 'Return Invoice', 'Original Invoice', 'Date', 'Store', 'Barcode', 'Item Name', 'Qty', 'Unit Price', 'Refund Amount', 'Payment Type']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.return_invoice_no,
          r.original_invoice_no,
          r.date,
          r.store_name,
          r.barcode,
          r.item_name?.substring(0, 25),
          r.qty,
          Number(r.unit_price).toFixed(2),
          Number(r.refund_amount).toFixed(2),
          r.payment_type
        ]);
        bodyData.push([
          'TOTAL', '', '', '', '', '', '',
          reportData.totals.total_qty,
          '',
          Number(reportData.totals.total_refund).toFixed(2),
          ''
        ]);
      }

      autoTable(doc, {
        head: headers,
        body: bodyData,
        startY: 40,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [46, 111, 64], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 10, left: 14, right: 14 },
        theme: 'grid'
      });

      // Signature Block at footer
      const finalY = doc.lastAutoTable.finalY || 100;
      const sigY = Math.max(finalY + 22, pageHeight - 24);

      // Signatures
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

      doc.save(`Sales_Report_${reportType}_${fromDate}_to_${toDate}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('Error creating PDF:', err);
      toast.error('Failed to download PDF');
    }
  };

  // Filtered rows for in-table searching
  const displayedRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;
    const term = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(r => {
      return Object.values(r).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(term)
      );
    });
  }, [reportData, tableSearch]);

  return (
    <div style={{ padding: '16px 20px', minHeight: '100%', backgroundColor: '#f8fafc' }}>
      
      {/* Top Header Card */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '20px',
        padding: '16px 20px'
      }}>
        <div style={{
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1e293b',
            margin: 0,
            letterSpacing: '0.2px'
          }}>
            Sales Report By Search Criteria
          </h2>
        </div>

        {/* 2-Column Search Criteria Form (Exact Match to Screenshot) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '32px',
          rowGap: '12px'
        }}>
          
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* From Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>From Date</label>
              <div style={{ position: 'relative' }}>
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
            </div>

            {/* Store Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Store Type</label>
              <select 
                value={storeType}
                onChange={(e) => {
                  setStoreType(e.target.value);
                  if (e.target.value === 'ALL') setSelectedStore('');
                }}
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
                <option value="Store">Store</option>
              </select>
            </div>

            {/* Payment Method */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Payment Method</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
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
                {paymentMethods.map(pm => (
                  <option key={pm.id || pm.name} value={pm.name}>{pm.name}</option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Brand</label>
              <select 
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
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
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Sub Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Sub Category</label>
              <select 
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
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
                {filteredSubcategories.map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>

            {/* Item Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Item Name</label>
              <input 
                type="text"
                value={itemNameInput}
                onChange={(e) => setItemNameInput(e.target.value)}
                onFocus={() => { if (itemNameInput === 'ALL') setItemNameInput(''); }}
                onBlur={() => { if (!itemNameInput.trim()) setItemNameInput('ALL'); }}
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

            {/* Barcode */}
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

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* To Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>To Date</label>
              <div style={{ position: 'relative' }}>
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
            </div>

            {/* Store */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Store</label>
              <select 
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                disabled={storeType === 'ALL'}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12.5px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: storeType === 'ALL' ? '#f8fafc' : '#fff',
                  color: storeType === 'ALL' ? '#94a3b8' : '#1e293b',
                  outline: 'none',
                  cursor: storeType === 'ALL' ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="">Select Store</option>
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>

            {/* Vendor */}
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
                <option value="ALL">ALL</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Category</label>
              <select 
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubCategory('ALL');
                  setSelectedSubSubcategory('ALL');
                }}
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
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Sub Subcategory */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Sub Subcategory</label>
              <select 
                value={selectedSubSubcategory}
                onChange={(e) => setSelectedSubSubcategory(e.target.value)}
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
                {filteredSubSubcategories.map(ssc => (
                  <option key={ssc.id} value={ssc.id}>{ssc.name}</option>
                ))}
              </select>
            </div>

            {/* Country of Origin */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Country Of Origin</label>
              <select 
                value={countryOfOrigin}
                onChange={(e) => setCountryOfOrigin(e.target.value)}
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
                {originList.map(orig => (
                  <option key={orig} value={orig}>{orig}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* REPORT TYPE SECTION (Round green radio bullet point design matching Image 2) */}
        <div style={{ marginTop: '22px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
            Report Type
          </div>

          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { id: 'Details', label: 'Details' },
              { id: 'Summary', label: 'Summary' },
              { id: 'Summary (Group by Date)', label: 'Summary (Group by Date)' },
              { id: 'Return', label: 'Return' }
            ].map(type => {
              const isSelected = reportType === type.id;
              return (
                <label 
                  key={type.id}
                  onClick={() => {
                    setReportType(type.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#1e293b' : '#475569',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  {/* Round Radio Marker matching Image 2 */}
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
                  {type.label}
                </label>
              );
            })}
          </div>
        </div>

        {/* PRINT TYPE & ACTION BUTTONS SECTION (Matching Standard ERP Theme Buttons) */}
        <div style={{ marginTop: '22px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
            Print Type
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Show Button (Glossy Aero Blue .btn-info) */}
            <button
              onClick={handleManualShow}
              disabled={loading}
              className="btn-info"
              style={{
                padding: '6px 20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              Show
            </button>

            {/* Show Excel Button (.btn-info) */}
            <button
              onClick={handleExportExcel}
              className="btn-info"
              style={{
                padding: '6px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileSpreadsheet size={14} />
              Show Excel
            </button>

            {/* Show Excel 2 Button (.btn-info) */}
            <button
              onClick={handleExportExcel2}
              className="btn-info"
              style={{
                padding: '6px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Layers size={14} />
              Show Excel 2
            </button>

            {/* Download PDF Button (Glossy Green .btn-theme) */}
            <button
              onClick={handleDownloadPDF}
              className="btn-theme"
              style={{
                padding: '6px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={14} />
              Download PDF
            </button>

            {/* Reload Button (Glossy Red .btn-danger) */}
            <button
              onClick={handleReload}
              className="btn-danger"
              style={{
                padding: '6px 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} />
              Reload
            </button>
          </div>
        </div>

      </div>

      {/* REPORT RESULTS CARD */}
      {reportData && (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          padding: '16px 20px',
          animation: 'fadeIn 0.2s ease-in'
        }}>
          
          {/* Header Bar of the Report Table */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>
                {reportData.type} Sales Report
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Date Range: <span style={{ fontWeight: 600, color: '#0f172a' }}>{fromDate}</span> to <span style={{ fontWeight: 600, color: '#0f172a' }}>{toDate}</span> | Total Records: <span style={{ fontWeight: 700, color: '#2e6f40' }}>{reportData.rows?.length || 0}</span>
              </p>
            </div>

            {/* In-table Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Search in table..."
                  style={{
                    width: '100%',
                    padding: '5px 10px 5px 30px',
                    fontSize: '12.5px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* KPI Mini Badges */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {reportData.type === 'Details' && (
              <>
                <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Sold Qty</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>{reportData.totals.total_qty} pcs</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Gross Sales</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d4ed8' }}>৳ {Number(reportData.totals.total_gross).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#fff1f2', borderRadius: '4px', border: '1px solid #fecdd3' }}>
                  <div style={{ fontSize: '11px', color: '#9f1239', fontWeight: 600, textTransform: 'uppercase' }}>Total Discount</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#be123c' }}>৳ {Number(reportData.totals.total_discount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600, textTransform: 'uppercase' }}>Net Revenue</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>৳ {Number(reportData.totals.total_net).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
              </>
            )}

            {reportData.type === 'Summary' && (
              <>
                <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Products Sold</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>{reportData.rows.length} Items</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Total Quantity Sold</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d4ed8' }}>{reportData.totals.total_qty} pcs</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600, textTransform: 'uppercase' }}>Total Net Sales</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>৳ {Number(reportData.totals.total_net_sales).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
              </>
            )}

            {reportData.type === 'Summary (Group by Date)' && (
              <>
                <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Total Invoices</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d4ed8' }}>{reportData.totals.total_invoices}</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Items Sold</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>{reportData.totals.total_qty} pcs</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600, textTransform: 'uppercase' }}>Net Revenue</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>৳ {Number(reportData.totals.net_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
              </>
            )}

            {reportData.type === 'Return' && (
              <>
                <div style={{ padding: '10px 14px', backgroundColor: '#fff1f2', borderRadius: '4px', border: '1px solid #fecdd3' }}>
                  <div style={{ fontSize: '11px', color: '#9f1239', fontWeight: 600, textTransform: 'uppercase' }}>Total Returned Qty</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#be123c' }}>{reportData.totals.total_qty} pcs</div>
                </div>
                <div style={{ padding: '10px 14px', backgroundColor: '#fff1f2', borderRadius: '4px', border: '1px solid #fecdd3' }}>
                  <div style={{ fontSize: '11px', color: '#9f1239', fontWeight: 600, textTransform: 'uppercase' }}>Total Refund Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#be123c' }}>৳ {Number(reportData.totals.total_refund).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
              </>
            )}
          </div>

          {/* TABLE CONTAINER */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              
              {/* DETAILS TABLE HEADER */}
              {reportData.type === 'Details' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Invoice No</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Date</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Store</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Barcode</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Product Name</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Unit Price (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Net Value (৳)</th>
                    <th style={{ padding: '7px 8px' }}>Payment</th>
                  </tr>
                </thead>
              )}

              {/* SUMMARY TABLE HEADER */}
              {reportData.type === 'Summary' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Barcode</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Code</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Product Name</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Vendor</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>MRP (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Qty Sold</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Net Sales (৳)</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right' }}>Avg Price (৳)</th>
                  </tr>
                </thead>
              )}

              {/* SUMMARY (GROUP BY DATE) HEADER */}
              {reportData.type === 'Summary (Group by Date)' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Sale Date</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Invoices Count</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Items Sold</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Gross Amount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Net Revenue (৳)</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right' }}>Avg Bill (৳)</th>
                  </tr>
                </thead>
              )}

              {/* RETURN HEADER */}
              {reportData.type === 'Return' && (
                <thead>
                  <tr style={{ backgroundColor: '#991b1b', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Return Invoice</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Original Invoice</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Date</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Store</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Barcode</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Name</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Return Qty</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Unit Price (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Refund Amount (৳)</th>
                    <th style={{ padding: '7px 8px' }}>Payment Type</th>
                  </tr>
                </thead>
              )}

              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan="14" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No sales records match your filters.
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((r, index) => {
                    const isEven = index % 2 === 0;
                    return (
                      <tr 
                        key={r.sl || index}
                        style={{
                          backgroundColor: isEven ? '#fff' : '#f8fafc',
                          borderBottom: '1px solid #e2e8f0'
                        }}
                      >
                        {reportData.type === 'Details' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2563eb' }}>{r.invoice_no}</td>
                            <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{r.date_display}</td>
                            <td style={{ padding: '6px 8px' }}>{r.store_name}</td>
                            <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{r.barcode}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.item_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.category_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.brand_name}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{r.qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.unit_price).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.vat_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                              {Number(r.total_value).toFixed(2)}
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#f1f5f9',
                                color: '#334155'
                              }}>
                                {r.payment_method}
                              </span>
                            </td>
                          </>
                        )}

                        {reportData.type === 'Summary' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontFamily: 'monospace', color: '#2563eb' }}>{r.barcode}</td>
                            <td style={{ padding: '6px 8px' }}>{r.code}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.item_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.category_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.brand_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.vendor_name}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.unit_price).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{r.total_qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.total_discount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.total_vat).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                              {Number(r.total_net_sales).toFixed(2)}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.avg_price).toFixed(2)}</td>
                          </>
                        )}

                        {reportData.type === 'Summary (Group by Date)' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2563eb' }}>{r.date}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{r.invoice_count}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{r.total_qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.total_discount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.total_vat).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                              {Number(r.net_revenue).toFixed(2)}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.avg_bill).toFixed(2)}</td>
                          </>
                        )}

                        {reportData.type === 'Return' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#dc2626' }}>{r.return_invoice_no}</td>
                            <td style={{ padding: '6px 8px', color: '#2563eb' }}>{r.original_invoice_no}</td>
                            <td style={{ padding: '6px 8px' }}>{r.date}</td>
                            <td style={{ padding: '6px 8px' }}>{r.store_name}</td>
                            <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{r.barcode}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.item_name}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{r.qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.unit_price).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                              {Number(r.refund_amount).toFixed(2)}
                            </td>
                            <td style={{ padding: '6px 8px' }}>{r.payment_type}</td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* FOOTER TOTALS ROW */}
              {displayedRows.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                    {reportData.type === 'Details' && (
                      <>
                        <td colSpan="8" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>
                          ৳ {Number(reportData.totals.total_discount).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          ৳ {Number(reportData.totals.total_vat).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>
                          ৳ {Number(reportData.totals.total_net).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px' }}></td>
                      </>
                    )}

                    {reportData.type === 'Summary' && (
                      <>
                        <td colSpan="8" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>
                          ৳ {Number(reportData.totals.total_discount).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          ৳ {Number(reportData.totals.total_vat).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>
                          ৳ {Number(reportData.totals.total_net_sales).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px' }}></td>
                      </>
                    )}

                    {reportData.type === 'Summary (Group by Date)' && (
                      <>
                        <td colSpan="2" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_invoices}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          ৳ {Number(reportData.totals.gross_amount).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>
                          ৳ {Number(reportData.totals.total_discount).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          ৳ {Number(reportData.totals.total_vat).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>
                          ৳ {Number(reportData.totals.net_revenue).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px' }}></td>
                      </>
                    )}

                    {reportData.type === 'Return' && (
                      <>
                        <td colSpan="7" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>
                          ৳ {Number(reportData.totals.total_refund).toFixed(2)}
                        </td>
                        <td style={{ padding: '8px' }}></td>
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

export default ItemwiseSaleReport;
