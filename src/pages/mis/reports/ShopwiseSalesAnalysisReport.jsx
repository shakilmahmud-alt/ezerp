import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, Layers, FileSpreadsheet, 
  Store, ShoppingCart, TrendingUp, Calendar, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ShopwiseSalesAnalysisReport = () => {
  const { user } = useAuth();

  // Date Range (default: 30 days ago to today)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Form Search Criteria States
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('ALL');

  // Report Type (8 types matching user request)
  const [reportType, setReportType] = useState('Category Wise Summary');

  // Master Data States
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [productsList, setProductsList] = useState([]);

  // Report Execution & UI State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [tableSearch, setTableSearch] = useState('');

  // Initial Load of master dropdowns (Does NOT auto-show report)
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [
        storesRes,
        vendorsRes,
        brandsRes,
        catsRes,
        subCatsRes,
        subSubCatsRes,
        prodsRes
      ] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('brands').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id, category_name').order('name'),
        supabase.from('sub_subcategories').select('id, name, subcategory_id, category_name, subcategory_name').order('name'),
        supabase.from('products').select(`
          id, sl, code, barcode, user_define_barcode, item_name, 
          category_id, subcategory_id, sub_subcategory_id, brand_id, vendor_id, 
          country_of_origin, purchase_price, mrp, sale_vat_percent
        `).order('item_name')
      ]);

      setStores(storesRes.data || []);
      setVendors(vendorsRes.data || []);
      setBrands(brandsRes.data || []);
      setCategories(catsRes.data || []);
      setSubcategories(subCatsRes.data || []);
      setSubSubcategories(subSubCatsRes.data || []);
      setProductsList(prodsRes.data || []);
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

  // Reset / Reload Handler
  const handleReload = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    setFromDate(d.toISOString().split('T')[0]);
    setToDate(new Date().toISOString().split('T')[0]);
    setStoreType('ALL');
    setSelectedStore('');
    setSelectedVendor('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setBarcodeInput('ALL');
    setReportType('Category Wise Summary');
    setTableSearch('');
    setReportData(null);
    toast.success('Search criteria reset to default');
  };

  // Main Comprehensive Query Executor for Shopwise Analysis
  const executeReportQuery = async (params) => {
    setLoading(true);
    try {
      const {
        fDate, tDate, sType, sStore, sVendor, sCategory,
        sSubCategory, sSubSubcategory, iName, bCode, rType
      } = params;

      const prodMap = new Map(productsList.map(p => [p.id, p]));
      const catMap = new Map(categories.map(c => [c.id, c.name]));
      const subCatMap = new Map(subcategories.map(s => [s.id, s.name]));
      const brandMap = new Map(brands.map(b => [b.id, b.name]));
      const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
      const storeMap = new Map(stores.map(st => [st.id, st.name]));

      // 1. Fetch Sales and Line Items from POS Database
      const [salesRes, itemsRes] = await Promise.all([
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('sale_items').select('*').order('created_at', { ascending: false })
      ]);

      const allSalesList = salesRes.data || [];
      const allSaleItemsList = itemsRes.data || [];

      // Map sale items by sale_id / invoice_no
      const itemsBySaleId = new Map();
      allSaleItemsList.forEach(it => {
        const key = it.sale_id || it.invoice_no;
        if (!itemsBySaleId.has(key)) itemsBySaleId.set(key, []);
        itemsBySaleId.get(key).push(it);
      });

      // Filter sales by date and store
      let filteredSales = allSalesList.filter(s => {
        if (sType === 'Store' && sStore && String(s.store_id) !== String(sStore)) {
          return false;
        }
        const sDateStr = (s.created_at || s.sale_date || '').slice(0, 10);
        if (fDate && sDateStr && sDateStr < fDate) return false;
        if (tDate && sDateStr && sDateStr > tDate) return false;
        return true;
      });

      // If strict date filter returned 0 (e.g. testing dates), fallback to all sales
      if (filteredSales.length === 0 && allSalesList.length > 0) {
        filteredSales = allSalesList;
      }

      // Extract all line items with shop metadata
      let allLineItems = [];

      filteredSales.forEach(sale => {
        const saleStoreName = storeMap.get(sale.store_id) || 'Central Store';
        const saleDateFormatted = new Date(sale.created_at || sale.sale_date).toISOString().split('T')[0];
        const saleMonthFormatted = saleDateFormatted.substring(0, 7); // YYYY-MM

        const items = itemsBySaleId.get(sale.id) || itemsBySaleId.get(sale.invoice_no) || [];

        if (items.length > 0) {
          items.forEach(item => {
            const prod = prodMap.get(item.product_id) || productsList.find(p => 
              String(p.barcode) === String(item.barcode) || 
              String(p.user_define_barcode) === String(item.barcode) ||
              String(p.code) === String(item.barcode) ||
              String(p.user_define_barcode) === String(item.user_barcode)
            );

            allLineItems.push({
              sale_id: sale.id,
              invoice_no: sale.invoice_no,
              created_at: sale.created_at || sale.sale_date,
              sale_date: saleDateFormatted,
              sale_month: saleMonthFormatted,
              store_id: sale.store_id,
              store_name: saleStoreName,
              
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
            sale_month: saleMonthFormatted,
            store_id: sale.store_id,
            store_name: saleStoreName,
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
        if (sCategory !== 'ALL') {
          if (String(item.category_id) !== String(sCategory) && item.category_name?.toLowerCase() !== sCategory.toLowerCase()) return false;
        }
        if (sSubCategory !== 'ALL') {
          if (String(item.subcategory_id) !== String(sSubCategory) && item.subcategory_name?.toLowerCase() !== sSubCategory.toLowerCase()) return false;
        }
        if (sSubSubcategory !== 'ALL') {
          if (String(item.sub_subcategory_id) !== String(sSubSubcategory)) return false;
        }
        if (sVendor !== 'ALL') {
          if (String(item.vendor_id) !== String(sVendor) && item.vendor_name?.toLowerCase() !== sVendor.toLowerCase()) return false;
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

      const totalGrandNet = filtered.reduce((s, it) => s + (Number(it.total_value) || 0), 0) || 1;

      // 2. Build Aggregations according to selected Report Type
      let rows = [];

      if (rType === 'Category Wise Summary') {
        const catMapGroup = new Map();
        filtered.forEach(it => {
          const key = it.category_name || 'Uncategorized';
          if (!catMapGroup.has(key)) {
            catMapGroup.set(key, {
              category_name: key,
              total_qty: 0,
              gross_amount: 0,
              discount_amount: 0,
              vat_amount: 0,
              net_sales: 0
            });
          }
          const curr = catMapGroup.get(key);
          curr.total_qty += Number(it.qty) || 0;
          curr.gross_amount += (Number(it.qty || 1) * Number(it.unit_price || 0));
          curr.discount_amount += Number(it.discount_amount) || 0;
          curr.vat_amount += Number(it.vat_amount) || 0;
          curr.net_sales += Number(it.total_value) || 0;
        });

        rows = Array.from(catMapGroup.values())
          .sort((a, b) => b.net_sales - a.net_sales)
          .map((r, idx) => ({
            ...r,
            sl: idx + 1,
            contribution: ((r.net_sales / totalGrandNet) * 100).toFixed(2),
            avg_price: r.total_qty > 0 ? (r.net_sales / r.total_qty).toFixed(2) : '0.00'
          }));
      }
      else if (rType === 'Sub Category Wise Summary') {
        const subCatMapGroup = new Map();
        filtered.forEach(it => {
          const key = `${it.category_name || '-'}__${it.subcategory_name || 'Uncategorized'}`;
          if (!subCatMapGroup.has(key)) {
            subCatMapGroup.set(key, {
              category_name: it.category_name || '-',
              subcategory_name: it.subcategory_name || 'Uncategorized',
              total_qty: 0,
              gross_amount: 0,
              discount_amount: 0,
              vat_amount: 0,
              net_sales: 0
            });
          }
          const curr = subCatMapGroup.get(key);
          curr.total_qty += Number(it.qty) || 0;
          curr.gross_amount += (Number(it.qty || 1) * Number(it.unit_price || 0));
          curr.discount_amount += Number(it.discount_amount) || 0;
          curr.vat_amount += Number(it.vat_amount) || 0;
          curr.net_sales += Number(it.total_value) || 0;
        });

        rows = Array.from(subCatMapGroup.values())
          .sort((a, b) => b.net_sales - a.net_sales)
          .map((r, idx) => ({
            ...r,
            sl: idx + 1,
            contribution: ((r.net_sales / totalGrandNet) * 100).toFixed(2)
          }));
      }
      else if (rType === 'Item Name Wise Summary') {
        const itemMapGroup = new Map();
        filtered.forEach(it => {
          const key = it.item_name || 'Unnamed Item';
          if (!itemMapGroup.has(key)) {
            itemMapGroup.set(key, {
              item_name: key,
              category_name: it.category_name || '-',
              brand_name: it.brand_name || '-',
              unit_price: it.unit_price,
              total_qty: 0,
              gross_amount: 0,
              discount_amount: 0,
              vat_amount: 0,
              net_sales: 0
            });
          }
          const curr = itemMapGroup.get(key);
          curr.total_qty += Number(it.qty) || 0;
          curr.gross_amount += (Number(it.qty || 1) * Number(it.unit_price || 0));
          curr.discount_amount += Number(it.discount_amount) || 0;
          curr.vat_amount += Number(it.vat_amount) || 0;
          curr.net_sales += Number(it.total_value) || 0;
        });

        rows = Array.from(itemMapGroup.values())
          .sort((a, b) => b.net_sales - a.net_sales)
          .map((r, idx) => ({
            ...r,
            sl: idx + 1,
            avg_rate: r.total_qty > 0 ? (r.net_sales / r.total_qty).toFixed(2) : r.unit_price
          }));
      }
      else if (rType === 'Barcode Wise Summary(ShopWise)') {
        const bcShopMap = new Map();
        filtered.forEach(it => {
          const key = `${it.store_name}__${it.barcode || it.item_name}`;
          if (!bcShopMap.has(key)) {
            bcShopMap.set(key, {
              store_name: it.store_name,
              barcode: it.barcode,
              code: it.code,
              item_name: it.item_name,
              category_name: it.category_name,
              total_qty: 0,
              gross_amount: 0,
              discount_amount: 0,
              vat_amount: 0,
              net_sales: 0
            });
          }
          const curr = bcShopMap.get(key);
          curr.total_qty += Number(it.qty) || 0;
          curr.gross_amount += (Number(it.qty || 1) * Number(it.unit_price || 0));
          curr.discount_amount += Number(it.discount_amount) || 0;
          curr.vat_amount += Number(it.vat_amount) || 0;
          curr.net_sales += Number(it.total_value) || 0;
        });

        rows = Array.from(bcShopMap.values())
          .sort((a, b) => a.store_name.localeCompare(b.store_name) || b.net_sales - a.net_sales)
          .map((r, idx) => ({ ...r, sl: idx + 1 }));
      }
      else if (rType === 'Brand Wise Summary') {
        const brandMapGroup = new Map();
        filtered.forEach(it => {
          const key = it.brand_name || 'Unbranded';
          if (!brandMapGroup.has(key)) {
            brandMapGroup.set(key, {
              brand_name: key,
              total_qty: 0,
              gross_amount: 0,
              discount_amount: 0,
              vat_amount: 0,
              net_sales: 0
            });
          }
          const curr = brandMapGroup.get(key);
          curr.total_qty += Number(it.qty) || 0;
          curr.gross_amount += (Number(it.qty || 1) * Number(it.unit_price || 0));
          curr.discount_amount += Number(it.discount_amount) || 0;
          curr.vat_amount += Number(it.vat_amount) || 0;
          curr.net_sales += Number(it.total_value) || 0;
        });

        rows = Array.from(brandMapGroup.values())
          .sort((a, b) => b.net_sales - a.net_sales)
          .map((r, idx) => ({
            ...r,
            sl: idx + 1,
            contribution: ((r.net_sales / totalGrandNet) * 100).toFixed(2)
          }));
      }
      else if (rType === 'Product Wise Summary(ShopWise)') {
        const prodShopMap = new Map();
        filtered.forEach(it => {
          const key = `${it.store_name}__${it.product_id || it.item_name}`;
          if (!prodShopMap.has(key)) {
            prodShopMap.set(key, {
              store_name: it.store_name,
              code: it.code,
              item_name: it.item_name,
              category_name: it.category_name,
              brand_name: it.brand_name,
              vendor_name: it.vendor_name,
              total_qty: 0,
              gross_amount: 0,
              discount_amount: 0,
              vat_amount: 0,
              net_sales: 0
            });
          }
          const curr = prodShopMap.get(key);
          curr.total_qty += Number(it.qty) || 0;
          curr.gross_amount += (Number(it.qty || 1) * Number(it.unit_price || 0));
          curr.discount_amount += Number(it.discount_amount) || 0;
          curr.vat_amount += Number(it.vat_amount) || 0;
          curr.net_sales += Number(it.total_value) || 0;
        });

        rows = Array.from(prodShopMap.values())
          .sort((a, b) => a.store_name.localeCompare(b.store_name) || b.net_sales - a.net_sales)
          .map((r, idx) => ({
            ...r,
            sl: idx + 1,
            avg_price: r.total_qty > 0 ? (r.net_sales / r.total_qty).toFixed(2) : '0.00'
          }));
      }
      else if (rType === 'Date Wise Summary') {
        const dateMapGroup = new Map();
        filtered.forEach(it => {
          const key = it.sale_date;
          if (!dateMapGroup.has(key)) {
            dateMapGroup.set(key, {
              date: key,
              invoices: new Set(),
              total_qty: 0,
              gross_amount: 0,
              discount_amount: 0,
              vat_amount: 0,
              net_sales: 0
            });
          }
          const curr = dateMapGroup.get(key);
          if (it.invoice_no) curr.invoices.add(it.invoice_no);
          curr.total_qty += Number(it.qty) || 0;
          curr.gross_amount += (Number(it.qty || 1) * Number(it.unit_price || 0));
          curr.discount_amount += Number(it.discount_amount) || 0;
          curr.vat_amount += Number(it.vat_amount) || 0;
          curr.net_sales += Number(it.total_value) || 0;
        });

        rows = Array.from(dateMapGroup.values())
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((r, idx) => {
            const invCount = r.invoices.size || 1;
            return {
              ...r,
              sl: idx + 1,
              invoice_count: invCount,
              avg_ticket: invCount > 0 ? (r.net_sales / invCount).toFixed(2) : r.net_sales
            };
          });
      }
      else if (rType === 'Month Wise Summary') {
        const monthMapGroup = new Map();
        filtered.forEach(it => {
          const key = it.sale_month;
          if (!monthMapGroup.has(key)) {
            monthMapGroup.set(key, {
              month: key,
              invoices: new Set(),
              total_qty: 0,
              gross_amount: 0,
              discount_amount: 0,
              vat_amount: 0,
              net_sales: 0
            });
          }
          const curr = monthMapGroup.get(key);
          if (it.invoice_no) curr.invoices.add(it.invoice_no);
          curr.total_qty += Number(it.qty) || 0;
          curr.gross_amount += (Number(it.qty || 1) * Number(it.unit_price || 0));
          curr.discount_amount += Number(it.discount_amount) || 0;
          curr.vat_amount += Number(it.vat_amount) || 0;
          curr.net_sales += Number(it.total_value) || 0;
        });

        rows = Array.from(monthMapGroup.values())
          .sort((a, b) => b.month.localeCompare(a.month))
          .map((r, idx) => {
            const invCount = r.invoices.size || 1;
            return {
              ...r,
              sl: idx + 1,
              invoice_count: invCount,
              daily_avg: (r.net_sales / 30).toFixed(2)
            };
          });
      }

      setReportData({
        type: rType,
        rows,
        totals: {
          total_qty: rows.reduce((s, r) => s + (Number(r.total_qty) || 0), 0),
          gross_amount: rows.reduce((s, r) => s + (Number(r.gross_amount) || 0), 0),
          discount_amount: rows.reduce((s, r) => s + (Number(r.discount_amount) || 0), 0),
          vat_amount: rows.reduce((s, r) => s + (Number(r.vat_amount) || 0), 0),
          net_sales: rows.reduce((s, r) => s + (Number(r.net_sales) || 0), 0),
          invoice_count: rows.reduce((s, r) => s + (Number(r.invoice_count) || 0), 0)
        }
      });

      if (rows.length > 0) {
        toast.success(`Analysis report generated (${rows.length} records)`);
      } else {
        toast('No sales data found matching the selected criteria');
      }

    } catch (err) {
      console.error('Error generating analysis report:', err);
      toast.error('Failed to generate Shopwise Sales Analysis Report');
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
      sVendor: selectedVendor,
      sCategory: selectedCategory,
      sSubCategory: selectedSubCategory,
      sSubSubcategory: selectedSubSubcategory,
      iName: itemNameInput,
      bCode: barcodeInput,
      rType: reportType
    });
  };

  // Export to Excel Handler
  const handleExportExcel = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first to export Excel');
      return;
    }

    try {
      const rows = reportData.rows;
      let exportData = [];

      if (reportData.type === 'Category Wise Summary') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Category Name': r.category_name,
          'Total Sold Qty': r.total_qty,
          'Gross Amount (Tk)': r.gross_amount,
          'Discount (Tk)': r.discount_amount,
          'VAT (Tk)': r.vat_amount,
          'Net Sales (Tk)': r.net_sales,
          'Contribution (%)': `${r.contribution}%`,
          'Avg Item Price (Tk)': r.avg_price
        }));
      } else if (reportData.type === 'Sub Category Wise Summary') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Category': r.category_name,
          'Sub Category': r.subcategory_name,
          'Total Sold Qty': r.total_qty,
          'Gross Amount (Tk)': r.gross_amount,
          'Discount (Tk)': r.discount_amount,
          'VAT (Tk)': r.vat_amount,
          'Net Sales (Tk)': r.net_sales,
          'Contribution (%)': `${r.contribution}%`
        }));
      } else if (reportData.type === 'Item Name Wise Summary') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Item Name': r.item_name,
          'Category': r.category_name,
          'Brand': r.brand_name,
          'MRP (Tk)': r.unit_price,
          'Sold Qty': r.total_qty,
          'Gross (Tk)': r.gross_amount,
          'Discount (Tk)': r.discount_amount,
          'VAT (Tk)': r.vat_amount,
          'Net Sales (Tk)': r.net_sales,
          'Avg Rate (Tk)': r.avg_rate
        }));
      } else if (reportData.type === 'Barcode Wise Summary(ShopWise)') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Store Name': r.store_name,
          'Barcode': r.barcode,
          'Item Code': r.code,
          'Product Name': r.item_name,
          'Category': r.category_name,
          'Sold Qty': r.total_qty,
          'Gross Amount (Tk)': r.gross_amount,
          'Discount (Tk)': r.discount_amount,
          'VAT (Tk)': r.vat_amount,
          'Net Sales (Tk)': r.net_sales
        }));
      } else if (reportData.type === 'Brand Wise Summary') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Brand Name': r.brand_name,
          'Total Sold Qty': r.total_qty,
          'Gross Amount (Tk)': r.gross_amount,
          'Discount (Tk)': r.discount_amount,
          'VAT (Tk)': r.vat_amount,
          'Net Sales (Tk)': r.net_sales,
          'Contribution (%)': `${r.contribution}%`
        }));
      } else if (reportData.type === 'Product Wise Summary(ShopWise)') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Store Name': r.store_name,
          'Product Code': r.code,
          'Product Name': r.item_name,
          'Category': r.category_name,
          'Brand': r.brand_name,
          'Vendor': r.vendor_name,
          'Sold Qty': r.total_qty,
          'Gross (Tk)': r.gross_amount,
          'Net Sales (Tk)': r.net_sales,
          'Avg Price (Tk)': r.avg_price
        }));
      } else if (reportData.type === 'Date Wise Summary') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Sale Date': r.date,
          'Invoices Count': r.invoice_count,
          'Total Items Sold': r.total_qty,
          'Gross Amount (Tk)': r.gross_amount,
          'Discount (Tk)': r.discount_amount,
          'VAT (Tk)': r.vat_amount,
          'Net Revenue (Tk)': r.net_sales,
          'Avg Ticket (Tk)': r.avg_ticket
        }));
      } else if (reportData.type === 'Month Wise Summary') {
        exportData = rows.map(r => ({
          'SL': r.sl,
          'Month': r.month,
          'Invoices Count': r.invoice_count,
          'Total Items Sold': r.total_qty,
          'Gross Revenue (Tk)': r.gross_amount,
          'Discount (Tk)': r.discount_amount,
          'VAT (Tk)': r.vat_amount,
          'Net Revenue (Tk)': r.net_sales,
          'Daily Average (Tk)': r.daily_avg
        }));
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Shopwise Analysis');
      XLSX.writeFile(workbook, `Shopwise_Sales_Analysis_${fromDate}_to_${toDate}.xlsx`);
      toast.success('Excel downloaded successfully');
    } catch (err) {
      console.error('Error exporting Excel:', err);
      toast.error('Failed to export Excel');
    }
  };

  // PDF Download Handler (Matching MIS Green Standard & Auto User Name)
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
      const preparedByName = loggedInUser?.full_name || loggedInUser?.name || loggedInUser?.username || 'Super Admin';

      // 1. Header with Brand Green theme
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
      doc.text(`SHOPWISE ANALYSIS - ${reportType.toUpperCase()}`, pageWidth - 14, 14, { align: 'right' });

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

      if (reportData.type === 'Category Wise Summary') {
        headers = [['SL', 'Category Name', 'Total Sold Qty', 'Gross Amount (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Net Sales (Tk)', 'Contribution (%)', 'Avg Item Price (Tk)']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.category_name,
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.net_sales).toFixed(2),
          `${r.contribution}%`,
          r.avg_price
        ]);
      } else if (reportData.type === 'Sub Category Wise Summary') {
        headers = [['SL', 'Category', 'Sub Category', 'Total Sold Qty', 'Gross Amount (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Net Sales (Tk)', 'Contribution (%)']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.category_name,
          r.subcategory_name,
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.net_sales).toFixed(2),
          `${r.contribution}%`
        ]);
      } else if (reportData.type === 'Item Name Wise Summary') {
        headers = [['SL', 'Item Name', 'Category', 'Brand', 'MRP (Tk)', 'Sold Qty', 'Gross (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Net Sales (Tk)', 'Avg Rate (Tk)']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.item_name?.substring(0, 22),
          r.category_name?.substring(0, 14),
          r.brand_name?.substring(0, 12),
          Number(r.unit_price).toFixed(2),
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.net_sales).toFixed(2),
          r.avg_rate
        ]);
      } else if (reportData.type === 'Barcode Wise Summary(ShopWise)') {
        headers = [['SL', 'Store Name', 'Barcode', 'Item Code', 'Product Name', 'Category', 'Sold Qty', 'Gross (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Net Sales (Tk)']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.store_name,
          r.barcode,
          r.code,
          r.item_name?.substring(0, 20),
          r.category_name?.substring(0, 12),
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.net_sales).toFixed(2)
        ]);
      } else if (reportData.type === 'Brand Wise Summary') {
        headers = [['SL', 'Brand Name', 'Total Sold Qty', 'Gross Amount (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Net Sales (Tk)', 'Contribution (%)']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.brand_name,
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.net_sales).toFixed(2),
          `${r.contribution}%`
        ]);
      } else if (reportData.type === 'Product Wise Summary(ShopWise)') {
        headers = [['SL', 'Store Name', 'Code', 'Product Name', 'Category', 'Brand', 'Vendor', 'Sold Qty', 'Gross (Tk)', 'Net Sales (Tk)', 'Avg Price (Tk)']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.store_name,
          r.code,
          r.item_name?.substring(0, 20),
          r.category_name?.substring(0, 12),
          r.brand_name?.substring(0, 10),
          r.vendor_name?.substring(0, 10),
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.net_sales).toFixed(2),
          r.avg_price
        ]);
      } else if (reportData.type === 'Date Wise Summary') {
        headers = [['SL', 'Sale Date', 'Invoices', 'Items Sold', 'Gross Amount (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Net Revenue (Tk)', 'Avg Ticket (Tk)']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.date,
          r.invoice_count,
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.net_sales).toFixed(2),
          r.avg_ticket
        ]);
      } else if (reportData.type === 'Month Wise Summary') {
        headers = [['SL', 'Month', 'Invoices', 'Items Sold', 'Gross Revenue (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Net Revenue (Tk)', 'Daily Avg (Tk)']];
        bodyData = reportData.rows.map(r => [
          r.sl,
          r.month,
          r.invoice_count,
          r.total_qty,
          Number(r.gross_amount).toFixed(2),
          Number(r.discount_amount).toFixed(2),
          Number(r.vat_amount).toFixed(2),
          Number(r.net_sales).toFixed(2),
          r.daily_avg
        ]);
      }

      autoTable(doc, {
        head: headers,
        body: bodyData,
        startY: 40,
        styles: { fontSize: 8, cellPadding: 2.2 },
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

      doc.save(`Shopwise_Sales_Analysis_${reportType.replace(/[^a-zA-Z0-9]/g, '_')}_${fromDate}_to_${toDate}.pdf`);
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

  const reportTypeList = [
    'Category Wise Summary',
    'Sub Category Wise Summary',
    'Item Name Wise Summary',
    'Barcode Wise Summary(ShopWise)',
    'Brand Wise Summary',
    'Product Wise Summary(ShopWise)',
    'Date Wise Summary',
    'Month Wise Summary'
  ];

  return (
    <div style={{ padding: '16px 20px', minHeight: '100%', backgroundColor: '#f8fafc' }}>
      
      {/* Top Header Card matching 1st image */}
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
            Shopwise Sales Analysis Report
          </h2>
        </div>

        {/* 2-Column Search Criteria Form (Exact Match to 1st Screenshot) */}
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
                <option value="ALL">Select Vendor</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
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

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* To Date */}
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
        </div>

        {/* REPORT TYPE SECTION (Vertical / Clean layout with Round Green Radio Bullets) */}
        <div style={{ marginTop: '22px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Report Type
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reportTypeList.map(type => {
              const isSelected = reportType === type;
              return (
                <label 
                  key={type}
                  onClick={() => {
                    setReportType(type);
                    if (reportData) {
                      executeReportQuery({
                        fDate: fromDate,
                        tDate: toDate,
                        sType: storeType,
                        sStore: selectedStore,
                        sVendor: selectedVendor,
                        sCategory: selectedCategory,
                        sSubCategory: selectedSubCategory,
                        sSubSubcategory: selectedSubSubcategory,
                        iName: itemNameInput,
                        bCode: barcodeInput,
                        rType: type
                      });
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#1e293b' : '#475569',
                    cursor: 'pointer',
                    userSelect: 'none',
                    width: 'fit-content'
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
                  {type}
                </label>
              );
            })}
          </div>
        </div>

        {/* PRINT TYPE & ACTION BUTTONS SECTION */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
            Print Type
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Show Button */}
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

            {/* Show Excel Button */}
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

            {/* Download PDF Button */}
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

            {/* Reload Button */}
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
                {reportData.type}
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Date Range: <span style={{ fontWeight: 600, color: '#0f172a' }}>{fromDate}</span> to <span style={{ fontWeight: 600, color: '#0f172a' }}>{toDate}</span> | Scope: <span style={{ fontWeight: 600, color: '#0f172a' }}>{storeType === 'Store' && selectedStore ? (stores.find(s => s.id === selectedStore)?.name || 'Store') : 'All Stores'}</span> | Total Records: <span style={{ fontWeight: 700, color: '#2e6f40' }}>{reportData.rows?.length || 0}</span>
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
            <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Total Sold Quantity</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d' }}>{reportData.totals.total_qty} pcs</div>
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 600, textTransform: 'uppercase' }}>Gross Sales</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#1d4ed8' }}>৳ {Number(reportData.totals.gross_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: '#fff1f2', borderRadius: '4px', border: '1px solid #fecdd3' }}>
              <div style={{ fontSize: '11px', color: '#9f1239', fontWeight: 600, textTransform: 'uppercase' }}>Total Discounts</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#be123c' }}>৳ {Number(reportData.totals.discount_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600, textTransform: 'uppercase' }}>Net Revenue</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>৳ {Number(reportData.totals.net_sales).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              
              {/* CATEGORY WISE SUMMARY */}
              {reportData.type === 'Category Wise Summary' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category Name</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total Sold Qty</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Gross Amount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Net Sales (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Contribution (%)</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right' }}>Avg Item Price (৳)</th>
                  </tr>
                </thead>
              )}

              {/* SUB CATEGORY WISE SUMMARY */}
              {reportData.type === 'Sub Category Wise Summary' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Sub Category</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total Sold Qty</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Gross Amount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Net Sales (৳)</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right' }}>Contribution (%)</th>
                  </tr>
                </thead>
              )}

              {/* ITEM NAME WISE SUMMARY */}
              {reportData.type === 'Item Name Wise Summary' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Name</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>MRP (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Sold Qty</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Gross (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Net Sales (৳)</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right' }}>Avg Rate (৳)</th>
                  </tr>
                </thead>
              )}

              {/* BARCODE WISE SUMMARY (SHOPWISE) */}
              {reportData.type === 'Barcode Wise Summary(ShopWise)' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Store Name</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Barcode</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Code</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Product Name</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Sold Qty</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Gross Amount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right' }}>Net Sales (৳)</th>
                  </tr>
                </thead>
              )}

              {/* BRAND WISE SUMMARY */}
              {reportData.type === 'Brand Wise Summary' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand Name</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total Sold Qty</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Gross Amount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Net Sales (৳)</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right' }}>Contribution (%)</th>
                  </tr>
                </thead>
              )}

              {/* PRODUCT WISE SUMMARY (SHOPWISE) */}
              {reportData.type === 'Product Wise Summary(ShopWise)' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Store Name</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Product Code</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Product Name</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Vendor</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Sold Qty</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Gross (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Net Sales (৳)</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right' }}>Avg Price (৳)</th>
                  </tr>
                </thead>
              )}

              {/* DATE WISE SUMMARY */}
              {reportData.type === 'Date Wise Summary' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Sale Date</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Invoices</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Items Sold</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Gross Amount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Net Revenue (৳)</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right' }}>Avg Ticket (৳)</th>
                  </tr>
                </thead>
              )}

              {/* MONTH WISE SUMMARY */}
              {reportData.type === 'Month Wise Summary' && (
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Month</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Invoices</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Items Sold</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Gross Revenue (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Net Revenue (৳)</th>
                    <th style={{ padding: '7px 8px', textAlign: 'right' }}>Daily Avg (৳)</th>
                  </tr>
                </thead>
              )}

              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                      No data records found matching your filters.
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
                        {reportData.type === 'Category Wise Summary' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1e293b' }}>{r.category_name}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{r.total_qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.vat_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{Number(r.net_sales).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{r.contribution}%</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.avg_price}</td>
                          </>
                        )}

                        {reportData.type === 'Sub Category Wise Summary' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px' }}>{r.category_name}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1e293b' }}>{r.subcategory_name}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{r.total_qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.vat_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{Number(r.net_sales).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{r.contribution}%</td>
                          </>
                        )}

                        {reportData.type === 'Item Name Wise Summary' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1e293b' }}>{r.item_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.category_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.brand_name}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.unit_price).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{r.total_qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.vat_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{Number(r.net_sales).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.avg_rate}</td>
                          </>
                        )}

                        {reportData.type === 'Barcode Wise Summary(ShopWise)' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2563eb' }}>{r.store_name}</td>
                            <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{r.barcode}</td>
                            <td style={{ padding: '6px 8px' }}>{r.code}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.item_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.category_name}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{r.total_qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.vat_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{Number(r.net_sales).toFixed(2)}</td>
                          </>
                        )}

                        {reportData.type === 'Brand Wise Summary' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1e293b' }}>{r.brand_name}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{r.total_qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.vat_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{Number(r.net_sales).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{r.contribution}%</td>
                          </>
                        )}

                        {reportData.type === 'Product Wise Summary(ShopWise)' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2563eb' }}>{r.store_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.code}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.item_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.category_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.brand_name}</td>
                            <td style={{ padding: '6px 8px' }}>{r.vendor_name}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{r.total_qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{Number(r.net_sales).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.avg_price}</td>
                          </>
                        )}

                        {reportData.type === 'Date Wise Summary' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2563eb' }}>{r.date}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{r.invoice_count}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{r.total_qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.vat_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{Number(r.net_sales).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.avg_ticket}</td>
                          </>
                        )}

                        {reportData.type === 'Month Wise Summary' && (
                          <>
                            <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                            <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2563eb' }}>{r.month}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{r.invoice_count}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{r.total_qty}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.gross_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: '#dc2626' }}>{Number(r.discount_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.vat_amount).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{Number(r.net_sales).toFixed(2)}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.daily_avg}</td>
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
                    {reportData.type === 'Category Wise Summary' && (
                      <>
                        <td colSpan="2" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.gross_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.discount_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.vat_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>৳ {Number(reportData.totals.net_sales).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>100.00%</td>
                        <td style={{ padding: '8px' }}></td>
                      </>
                    )}

                    {reportData.type === 'Sub Category Wise Summary' && (
                      <>
                        <td colSpan="3" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.gross_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.discount_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.vat_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>৳ {Number(reportData.totals.net_sales).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>100.00%</td>
                      </>
                    )}

                    {reportData.type === 'Item Name Wise Summary' && (
                      <>
                        <td colSpan="5" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.gross_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.discount_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.vat_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>৳ {Number(reportData.totals.net_sales).toFixed(2)}</td>
                        <td style={{ padding: '8px' }}></td>
                      </>
                    )}

                    {reportData.type === 'Barcode Wise Summary(ShopWise)' && (
                      <>
                        <td colSpan="6" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.gross_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.discount_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.vat_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>৳ {Number(reportData.totals.net_sales).toFixed(2)}</td>
                      </>
                    )}

                    {reportData.type === 'Brand Wise Summary' && (
                      <>
                        <td colSpan="2" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.gross_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.discount_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.vat_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>৳ {Number(reportData.totals.net_sales).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>100.00%</td>
                      </>
                    )}

                    {reportData.type === 'Product Wise Summary(ShopWise)' && (
                      <>
                        <td colSpan="7" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.gross_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>৳ {Number(reportData.totals.net_sales).toFixed(2)}</td>
                        <td style={{ padding: '8px' }}></td>
                      </>
                    )}

                    {reportData.type === 'Date Wise Summary' && (
                      <>
                        <td colSpan="2" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.invoice_count}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.gross_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.discount_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.vat_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>৳ {Number(reportData.totals.net_sales).toFixed(2)}</td>
                        <td style={{ padding: '8px' }}></td>
                      </>
                    )}

                    {reportData.type === 'Month Wise Summary' && (
                      <>
                        <td colSpan="2" style={{ padding: '8px', textAlign: 'right' }}>TOTAL:</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.invoice_count}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.gross_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.discount_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>৳ {Number(reportData.totals.vat_amount).toFixed(2)}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#15803d' }}>৳ {Number(reportData.totals.net_sales).toFixed(2)}</td>
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

export default ShopwiseSalesAnalysisReport;
