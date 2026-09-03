import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Printer, Search, FileSpreadsheet, 
  Layers, Package, DollarSign, Store, Tag, Filter, CheckSquare, Square
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ShopwiseStockAnalysisReport = () => {
  const { user } = useAuth();

  // 1. Filter States
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');

  // Value Type: 'Default' | 'Without Zero'
  const [valueType, setValueType] = useState('Default');

  // Report Type: 6 types from screenshot
  const [reportType, setReportType] = useState('Category Wise Stock');

  const reportTypeList = [
    'Category Wise Stock',
    'Sub Category Wise Stock',
    'Item Name Wise Stock',
    'Barcode Wise Stock(ShopWise)',
    'Product Wise Stock(ShopWise)',
    'Brand Wise Stock'
  ];

  // 2. Master Data Lists
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [rawStoreStocks, setRawStoreStocks] = useState([]);

  // 3. Output / Generated Report State (Frozen snapshot)
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Initial Load of Master Data
  useEffect(() => {
    fetchMasterDataAndLoad();
  }, []);

  const fetchMasterDataAndLoad = async () => {
    setLoading(true);
    try {
      const [
        storesRes,
        vendorsRes,
        catsRes,
        subCatsRes,
        subSubCatsRes,
        brandsRes,
        prodsRes,
        storeStocksRes
      ] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id, category_name').order('name'),
        supabase.from('sub_subcategories').select('id, name, subcategory_id, category_name, subcategory_name').order('name'),
        supabase.from('brands').select('id, name').order('name'),
        supabase.from('products').select(`
          id, code, barcode, user_define_barcode, item_name, 
          category_id, subcategory_id, sub_subcategory_id, brand_id, vendor_id, 
          country_of_origin, purchase_price, mrp, stock, wh_stock, str_stock
        `).order('item_name'),
        supabase.from('store_stocks').select('product_id, store_id, stock_qty')
      ]);

      const stList = storesRes.data || [];
      const vdList = vendorsRes.data || [];
      const ctList = catsRes.data || [];
      const sctList = subCatsRes.data || [];
      const ssctList = subSubCatsRes.data || [];
      const brList = brandsRes.data || [];
      const prList = prodsRes.data || [];
      const ssList = storeStocksRes.data || [];

      setStores(stList);
      setVendors(vdList);
      setCategories(ctList);
      setSubcategories(sctList);
      setSubSubcategories(ssctList);
      setBrands(brList);
      setRawProducts(prList);
      setRawStoreStocks(ssList);
      // Notice: Do NOT auto-generate report on page mount; user must click Show
    } catch (err) {
      console.error('Error loading master data for Shopwise Stock Analysis:', err);
      toast.error('Failed to load master stock data');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Subcategories based on Category
  const filteredSubcategories = useMemo(() => {
    if (!selectedCategory || selectedCategory === 'ALL') return subcategories;
    return subcategories.filter(s => s.category_id === selectedCategory || s.category_name === selectedCategory);
  }, [subcategories, selectedCategory]);

  // Filtered Sub-Subcategories based on SubCategory
  const filteredSubSubcategories = useMemo(() => {
    if (!selectedSubCategory || selectedSubCategory === 'ALL') return subSubcategories;
    return subSubcategories.filter(s => s.subcategory_id === selectedSubCategory || s.subcategory_name === selectedSubCategory);
  }, [subSubcategories, selectedSubCategory]);

  // Pure function to compute report output snapshot
  const computeReportOutput = (params) => {
    const {
      rType, vType, sType, sStore, sVendor, sCategory,
      sSubCategory, sSubSubcategory, iName,
      prods, sStocks, storeList, vendorList, catList, subCatList, subSubCatList, brandList
    } = params;

    if (!prods || prods.length === 0) {
      return {
        reportType: rType,
        valueType: vType,
        storeType: sType,
        storeFilter: sStore,
        rows: [],
        totals: {
          total_products: 0,
          total_stock: 0,
          total_cost: 0,
          total_mrp: 0
        }
      };
    }

    // Lookup maps
    const storeMap = new Map((storeList || []).map(st => [st.id, st.name]));
    const vendorMap = new Map((vendorList || []).map(v => [v.id, v.name]));
    const catMap = new Map((catList || []).map(c => [c.id, c.name]));
    const subCatMap = new Map((subCatList || []).map(sc => [sc.id, sc.name]));
    const subSubCatMap = new Map((subSubCatList || []).map(ssc => [ssc.id, ssc.name]));
    const brandMap = new Map((brandList || []).map(b => [b.id, b.name]));

    // Store stocks map: key `${product_id}_${store_id}` -> qty
    const storeStockMap = new Map();
    // Total branch stock map: key `${product_id}` -> sum across stores
    const branchStockByProduct = new Map();

    (sStocks || []).forEach(ss => {
      const pId = ss.product_id;
      const sId = ss.store_id;
      const q = Number(ss.stock_qty || 0);
      storeStockMap.set(`${pId}_${sId}`, q);
      branchStockByProduct.set(pId, (branchStockByProduct.get(pId) || 0) + q);
    });

    // Determine target stores list for shopwise breakdown
    let targetStores = [];
    if (sType === 'Store' && sStore) {
      const found = (storeList || []).find(st => st.id === sStore);
      if (found) targetStores = [found];
    } else {
      // All stores including Central Store
      targetStores = [
        { id: 'CENTRAL_STORE', name: 'Central Store (Warehouse)' },
        ...(storeList || [])
      ];
    }

    // 1. Filter raw products by Search Criteria
    let filteredProducts = prods.filter(p => {
      // Vendor
      if (sVendor !== 'ALL') {
        const matchVen = (p.vendor_id && String(p.vendor_id) === String(sVendor)) ||
                         (vendorMap.get(p.vendor_id) && vendorMap.get(p.vendor_id).toLowerCase() === sVendor.toLowerCase());
        if (!matchVen) return false;
      }

      // Category
      if (sCategory !== 'ALL') {
        const matchCat = (p.category_id && String(p.category_id) === String(sCategory)) ||
                         (catMap.get(p.category_id) && catMap.get(p.category_id).toLowerCase() === sCategory.toLowerCase());
        if (!matchCat) return false;
      }

      // Sub Category
      if (sSubCategory !== 'ALL') {
        const matchSub = (p.subcategory_id && String(p.subcategory_id) === String(sSubCategory)) ||
                         (subCatMap.get(p.subcategory_id) && subCatMap.get(p.subcategory_id).toLowerCase() === sSubCategory.toLowerCase());
        if (!matchSub) return false;
      }

      // Sub Subcategory
      if (sSubSubcategory !== 'ALL') {
        if (p.sub_subcategory_id && String(p.sub_subcategory_id) !== String(sSubSubcategory)) return false;
      }

      // Item Name / Barcode / Code search
      if (iName !== 'ALL' && iName.trim()) {
        const q = iName.trim().toLowerCase();
        const matchName = String(p.item_name || '').toLowerCase().includes(q);
        const matchBarcode = String(p.barcode || p.user_define_barcode || '').toLowerCase().includes(q);
        const matchCode = String(p.code || '').toLowerCase().includes(q);
        if (!matchName && !matchBarcode && !matchCode) return false;
      }

      return true;
    });

    // Helper: calculate stock for product based on store filter
    const getProductStock = (p) => {
      const whStock = Number(p.wh_stock ?? p.stock ?? 0);
      const allBranch = branchStockByProduct.get(p.id) ?? Number(p.str_stock || 0);

      if (sType === 'Store' && sStore) {
        return storeStockMap.get(`${p.id}_${sStore}`) ?? 0;
      } else if (sType === 'Store' && !sStore) {
        return allBranch;
      } else {
        // ALL = Central Store (Warehouse) + All Branch Stores
        return whStock + allBranch;
      }
    };

    let rows = [];

    // ==========================================
    // REPORT TYPE 1: Category Wise Stock
    // ==========================================
    if (rType === 'Category Wise Stock') {
      const catGroup = new Map();

      filteredProducts.forEach(p => {
        const catName = catMap.get(p.category_id) || 'General Category';
        const stQty = getProductStock(p);
        const costPrice = Number(p.purchase_price || 0);
        const mrpPrice = Number(p.mrp || 0);

        if (!catGroup.has(catName)) {
          catGroup.set(catName, {
            category_name: catName,
            total_items: 0,
            stock_qty: 0,
            total_cost: 0,
            total_mrp: 0
          });
        }
        const curr = catGroup.get(catName);
        curr.total_items += 1;
        curr.stock_qty += stQty;
        curr.total_cost += (stQty * costPrice);
        curr.total_mrp += (stQty * mrpPrice);
      });

      let list = Array.from(catGroup.values());
      if (vType === 'Without Zero') {
        list = list.filter(r => r.stock_qty !== 0);
      }

      const totalGrandMrp = list.reduce((s, r) => s + r.total_mrp, 0);

      rows = list
        .sort((a, b) => b.total_mrp - a.total_mrp || a.category_name.localeCompare(b.category_name))
        .map((r, idx) => ({
          ...r,
          sl: idx + 1,
          contribution: totalGrandMrp > 0 ? ((r.total_mrp / totalGrandMrp) * 100).toFixed(2) : '0.00'
        }));
    }

    // ==========================================
    // REPORT TYPE 2: Sub Category Wise Stock
    // ==========================================
    else if (rType === 'Sub Category Wise Stock') {
      const subCatGroup = new Map();

      filteredProducts.forEach(p => {
        const catName = catMap.get(p.category_id) || 'General';
        const subCatName = subCatMap.get(p.subcategory_id) || 'No Subcategory';
        const key = `${catName}__${subCatName}`;
        const stQty = getProductStock(p);
        const costPrice = Number(p.purchase_price || 0);
        const mrpPrice = Number(p.mrp || 0);

        if (!subCatGroup.has(key)) {
          subCatGroup.set(key, {
            category_name: catName,
            subcategory_name: subCatName,
            total_items: 0,
            stock_qty: 0,
            total_cost: 0,
            total_mrp: 0
          });
        }
        const curr = subCatGroup.get(key);
        curr.total_items += 1;
        curr.stock_qty += stQty;
        curr.total_cost += (stQty * costPrice);
        curr.total_mrp += (stQty * mrpPrice);
      });

      let list = Array.from(subCatGroup.values());
      if (vType === 'Without Zero') {
        list = list.filter(r => r.stock_qty !== 0);
      }

      const totalGrandMrp = list.reduce((s, r) => s + r.total_mrp, 0);

      rows = list
        .sort((a, b) => a.category_name.localeCompare(b.category_name) || b.total_mrp - a.total_mrp)
        .map((r, idx) => ({
          ...r,
          sl: idx + 1,
          contribution: totalGrandMrp > 0 ? ((r.total_mrp / totalGrandMrp) * 100).toFixed(2) : '0.00'
        }));
    }

    // ==========================================
    // REPORT TYPE 3: Item Name Wise Stock
    // ==========================================
    else if (rType === 'Item Name Wise Stock') {
      let list = filteredProducts.map(p => {
        const stQty = getProductStock(p);
        const costPrice = Number(p.purchase_price || 0);
        const mrpPrice = Number(p.mrp || 0);

        return {
          id: p.id,
          barcode: p.user_define_barcode || p.barcode || p.code || '-',
          code: p.code || '-',
          item_name: p.item_name || 'Product',
          category_name: catMap.get(p.category_id) || '-',
          subcategory_name: subCatMap.get(p.subcategory_id) || '-',
          brand_name: brandMap.get(p.brand_id) || '-',
          vendor_name: vendorMap.get(p.vendor_id) || '-',
          unit_cost: costPrice,
          unit_mrp: mrpPrice,
          stock_qty: stQty,
          total_cost: stQty * costPrice,
          total_mrp: stQty * mrpPrice
        };
      });

      if (vType === 'Without Zero') {
        list = list.filter(r => r.stock_qty !== 0);
      }

      rows = list
        .sort((a, b) => a.item_name.localeCompare(b.item_name))
        .map((r, idx) => ({ ...r, sl: idx + 1 }));
    }

    // ==========================================
    // REPORT TYPE 4: Barcode Wise Stock(ShopWise)
    // ==========================================
    else if (rType === 'Barcode Wise Stock(ShopWise)') {
      let list = [];

      filteredProducts.forEach(p => {
        const costPrice = Number(p.purchase_price || 0);
        const mrpPrice = Number(p.mrp || 0);
        const barcodeVal = p.user_define_barcode || p.barcode || p.code || '-';

        targetStores.forEach(st => {
          let stQty = 0;
          if (st.id === 'CENTRAL_STORE') {
            stQty = Number(p.wh_stock ?? p.stock ?? 0);
          } else {
            stQty = storeStockMap.get(`${p.id}_${st.id}`) ?? 0;
          }

          list.push({
            store_name: st.name,
            barcode: barcodeVal,
            code: p.code || '-',
            item_name: p.item_name || 'Product',
            category_name: catMap.get(p.category_id) || '-',
            brand_name: brandMap.get(p.brand_id) || '-',
            cost_price: costPrice,
            unit_mrp: mrpPrice,
            stock_qty: stQty,
            total_cost: stQty * costPrice,
            total_mrp: stQty * mrpPrice
          });
        });
      });

      if (vType === 'Without Zero') {
        list = list.filter(r => r.stock_qty !== 0);
      }

      rows = list
        .sort((a, b) => a.store_name.localeCompare(b.store_name) || a.item_name.localeCompare(b.item_name))
        .map((r, idx) => ({ ...r, sl: idx + 1 }));
    }

    // ==========================================
    // REPORT TYPE 5: Product Wise Stock(ShopWise)
    // ==========================================
    else if (rType === 'Product Wise Stock(ShopWise)') {
      let list = [];

      filteredProducts.forEach(p => {
        const costPrice = Number(p.purchase_price || 0);
        const mrpPrice = Number(p.mrp || 0);

        targetStores.forEach(st => {
          let stQty = 0;
          if (st.id === 'CENTRAL_STORE') {
            stQty = Number(p.wh_stock ?? p.stock ?? 0);
          } else {
            stQty = storeStockMap.get(`${p.id}_${st.id}`) ?? 0;
          }

          list.push({
            store_name: st.name,
            code: p.code || '-',
            item_name: p.item_name || 'Product',
            category_name: catMap.get(p.category_id) || '-',
            brand_name: brandMap.get(p.brand_id) || '-',
            vendor_name: vendorMap.get(p.vendor_id) || '-',
            cost_price: costPrice,
            unit_mrp: mrpPrice,
            stock_qty: stQty,
            total_cost: stQty * costPrice,
            total_mrp: stQty * mrpPrice
          });
        });
      });

      if (vType === 'Without Zero') {
        list = list.filter(r => r.stock_qty !== 0);
      }

      rows = list
        .sort((a, b) => a.store_name.localeCompare(b.store_name) || a.item_name.localeCompare(b.item_name))
        .map((r, idx) => ({ ...r, sl: idx + 1 }));
    }

    // ==========================================
    // REPORT TYPE 6: Brand Wise Stock
    // ==========================================
    else if (rType === 'Brand Wise Stock') {
      const brandGroup = new Map();

      filteredProducts.forEach(p => {
        const bName = brandMap.get(p.brand_id) || 'No Brand';
        const stQty = getProductStock(p);
        const costPrice = Number(p.purchase_price || 0);
        const mrpPrice = Number(p.mrp || 0);

        if (!brandGroup.has(bName)) {
          brandGroup.set(bName, {
            brand_name: bName,
            total_items: 0,
            stock_qty: 0,
            total_cost: 0,
            total_mrp: 0
          });
        }
        const curr = brandGroup.get(bName);
        curr.total_items += 1;
        curr.stock_qty += stQty;
        curr.total_cost += (stQty * costPrice);
        curr.total_mrp += (stQty * mrpPrice);
      });

      let list = Array.from(brandGroup.values());
      if (vType === 'Without Zero') {
        list = list.filter(r => r.stock_qty !== 0);
      }

      const totalGrandMrp = list.reduce((s, r) => s + r.total_mrp, 0);

      rows = list
        .sort((a, b) => b.total_mrp - a.total_mrp || a.brand_name.localeCompare(b.brand_name))
        .map((r, idx) => ({
          ...r,
          sl: idx + 1,
          contribution: totalGrandMrp > 0 ? ((r.total_mrp / totalGrandMrp) * 100).toFixed(2) : '0.00'
        }));
    }

    return {
      reportType: rType,
      valueType: vType,
      storeType: sType,
      storeFilter: sStore,
      rows,
      totals: {
        total_products: filteredProducts.length,
        total_stock: rows.reduce((s, r) => s + (Number(r.stock_qty) || 0), 0),
        total_cost: rows.reduce((s, r) => s + (Number(r.total_cost) || 0), 0),
        total_mrp: rows.reduce((s, r) => s + (Number(r.total_mrp) || 0), 0)
      }
    };
  };

  // Main Show Button Handler: recalculates and sets frozen reportData
  const handleShowReport = () => {
    setLoading(true);
    setTableSearch('');
    try {
      const computed = computeReportOutput({
        rType: reportType,
        vType: valueType,
        sType: storeType,
        sStore: selectedStore,
        sVendor: selectedVendor,
        sCategory: selectedCategory,
        sSubCategory: selectedSubCategory,
        sSubSubcategory: selectedSubSubcategory,
        iName: itemNameInput,
        prods: rawProducts,
        sStocks: rawStoreStocks,
        storeList: stores,
        vendorList: vendors,
        catList: categories,
        subCatList: subcategories,
        subSubCatList: subSubcategories,
        brandList: brands
      });

      setReportData(computed);
      if (computed.rows.length > 0) {
        toast.success(`Generated ${computed.rows.length} records for ${reportType}`);
      } else {
        toast('No matching stock records found');
      }
    } catch (err) {
      console.error('Error generating Shopwise Stock Analysis report:', err);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Reload / Reset to defaults
  const handleReload = () => {
    setStoreType('ALL');
    setSelectedStore('');
    setSelectedVendor('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setValueType('Default');
    setReportType('Category Wise Stock');
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

  // Standardized PDF Export (Landscape with Aero Green Header)
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
    doc.setTextColor(46, 111, 64); // Emerald Green
    doc.text("E-COMMERCE GENERAL ERP", pageWidth / 2, 11, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("SHOPWISE STOCK ANALYSIS REPORT", pageWidth / 2, 16.5, { align: 'center' });

    // 2. Report Meta Info
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    const activeStoreName = reportData.storeFilter 
      ? (stores.find(st => st.id === reportData.storeFilter)?.name || 'Store') 
      : (reportData.storeType === 'ALL' ? 'All Stores & Central Warehouse' : 'All Branch Stores');

    doc.setFont("helvetica", "bold");
    doc.text(`REPORT TYPE: ${reportData.reportType.toUpperCase()}`, 14, 22);
    doc.text(`STORE: ${activeStoreName}`, 14, 26.5);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Value Type: ${reportData.valueType}`, pageWidth - 14, 22, { align: 'right' });
    doc.text(`Generated On: ${new Date().toLocaleString()}`, pageWidth - 14, 26.5, { align: 'right' });

    // 3. Build Table Headers and Rows
    let head = [];
    let body = [];

    if (reportData.reportType === 'Category Wise Stock') {
      head = [['SL', 'Category Name', 'Items Count', 'Stock Qty', 'Cost Value (৳)', 'MRP Value (৳)', 'Contribution (%)']];
      displayedRows.forEach(r => {
        body.push([
          r.sl,
          r.category_name,
          r.total_items,
          r.stock_qty,
          Number(r.total_cost).toFixed(2),
          Number(r.total_mrp).toFixed(2),
          `${r.contribution}%`
        ]);
      });
      body.push([
        'Total',
        `${reportData.rows.length} Categories`,
        reportData.totals.total_products,
        reportData.totals.total_stock,
        Number(reportData.totals.total_cost).toFixed(2),
        Number(reportData.totals.total_mrp).toFixed(2),
        '100.00%'
      ]);
    } 
    else if (reportData.reportType === 'Sub Category Wise Stock') {
      head = [['SL', 'Category', 'Sub Category', 'Items Count', 'Stock Qty', 'Cost Value (৳)', 'MRP Value (৳)', 'Contribution (%)']];
      displayedRows.forEach(r => {
        body.push([
          r.sl,
          r.category_name,
          r.subcategory_name,
          r.total_items,
          r.stock_qty,
          Number(r.total_cost).toFixed(2),
          Number(r.total_mrp).toFixed(2),
          `${r.contribution}%`
        ]);
      });
      body.push([
        'Total',
        '',
        `${reportData.rows.length} Subcategories`,
        reportData.totals.total_products,
        reportData.totals.total_stock,
        Number(reportData.totals.total_cost).toFixed(2),
        Number(reportData.totals.total_mrp).toFixed(2),
        '100.00%'
      ]);
    }
    else if (reportData.reportType === 'Item Name Wise Stock') {
      head = [['SL', 'Item Name', 'Category', 'Sub Category', 'Brand', 'Vendor', 'Cost (৳)', 'MRP (৳)', 'Stock Qty', 'Cost Value (৳)', 'MRP Value (৳)']];
      displayedRows.forEach(r => {
        body.push([
          r.sl,
          r.item_name,
          r.category_name,
          r.subcategory_name,
          r.brand_name,
          r.vendor_name,
          Number(r.unit_cost).toFixed(2),
          Number(r.unit_mrp).toFixed(2),
          r.stock_qty,
          Number(r.total_cost).toFixed(2),
          Number(r.total_mrp).toFixed(2)
        ]);
      });
      body.push([
        'Total',
        `${reportData.rows.length} Items Listed`,
        '', '', '', '', '', '',
        reportData.totals.total_stock,
        Number(reportData.totals.total_cost).toFixed(2),
        Number(reportData.totals.total_mrp).toFixed(2)
      ]);
    }
    else if (reportData.reportType === 'Barcode Wise Stock(ShopWise)') {
      head = [['SL', 'Store Name', 'Barcode', 'Item Code', 'Product Name', 'Category', 'Brand', 'Cost (৳)', 'MRP (৳)', 'Stock Qty', 'Cost Value (৳)', 'MRP Value (৳)']];
      displayedRows.forEach(r => {
        body.push([
          r.sl,
          r.store_name,
          r.barcode,
          r.code,
          r.item_name,
          r.category_name,
          r.brand_name,
          Number(r.cost_price).toFixed(2),
          Number(r.unit_mrp).toFixed(2),
          r.stock_qty,
          Number(r.total_cost).toFixed(2),
          Number(r.total_mrp).toFixed(2)
        ]);
      });
      body.push([
        'Total',
        '', '', '',
        `${reportData.rows.length} Store Items`,
        '', '', '', '',
        reportData.totals.total_stock,
        Number(reportData.totals.total_cost).toFixed(2),
        Number(reportData.totals.total_mrp).toFixed(2)
      ]);
    }
    else if (reportData.reportType === 'Product Wise Stock(ShopWise)') {
      head = [['SL', 'Store Name', 'Code', 'Product Name', 'Category', 'Brand', 'Vendor', 'Cost (৳)', 'MRP (৳)', 'Stock Qty', 'Cost Value (৳)', 'MRP Value (৳)']];
      displayedRows.forEach(r => {
        body.push([
          r.sl,
          r.store_name,
          r.code,
          r.item_name,
          r.category_name,
          r.brand_name,
          r.vendor_name,
          Number(r.cost_price).toFixed(2),
          Number(r.unit_mrp).toFixed(2),
          r.stock_qty,
          Number(r.total_cost).toFixed(2),
          Number(r.total_mrp).toFixed(2)
        ]);
      });
      body.push([
        'Total',
        '', '',
        `${reportData.rows.length} Store Products`,
        '', '', '', '', '',
        reportData.totals.total_stock,
        Number(reportData.totals.total_cost).toFixed(2),
        Number(reportData.totals.total_mrp).toFixed(2)
      ]);
    }
    else if (reportData.reportType === 'Brand Wise Stock') {
      head = [['SL', 'Brand Name', 'Items Count', 'Stock Qty', 'Cost Value (৳)', 'MRP Value (৳)', 'Contribution (%)']];
      displayedRows.forEach(r => {
        body.push([
          r.sl,
          r.brand_name,
          r.total_items,
          r.stock_qty,
          Number(r.total_cost).toFixed(2),
          Number(r.total_mrp).toFixed(2),
          `${r.contribution}%`
        ]);
      });
      body.push([
        'Total',
        `${reportData.rows.length} Brands`,
        reportData.totals.total_products,
        reportData.totals.total_stock,
        Number(reportData.totals.total_cost).toFixed(2),
        Number(reportData.totals.total_mrp).toFixed(2),
        '100.00%'
      ]);
    }

    autoTable(doc, {
      head,
      body,
      startY: 30,
      theme: 'grid',
      headStyles: {
        fillColor: [46, 111, 64],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'left'
      },
      styles: {
        fontSize: 8,
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

    // 4. Signatures at Bottom
    const finalY = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 22 : pageHeight - 25;
    const signY = finalY > pageHeight - 25 ? pageHeight - 20 : finalY;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);

    doc.line(14, signY, 55, signY);
    doc.text("Prepared By", 25, signY + 4);

    doc.line(pageWidth / 2 - 20, signY, pageWidth / 2 + 20, signY);
    doc.text("Checked By", pageWidth / 2 - 8, signY + 4);

    doc.line(pageWidth - 55, signY, pageWidth - 14, signY);
    doc.text("Approved By", pageWidth - 42, signY + 4);

    // Page Number
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
    }

    doc.save(`Shopwise_Stock_Analysis_${reportData.reportType.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Standardized Excel Export
  const handleExportExcel = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first to export Excel');
      return;
    }

    const wsData = [
      ['E-COMMERCE GENERAL ERP'],
      ['SHOPWISE STOCK ANALYSIS REPORT'],
      [`Report Type: ${reportData.reportType}`, `Value Type: ${reportData.valueType}`],
      [`Store: ${reportData.storeFilter ? (stores.find(s => s.id === reportData.storeFilter)?.name || 'Store') : 'ALL'}`, `Date: ${new Date().toLocaleDateString()}`],
      []
    ];

    if (reportData.reportType === 'Category Wise Stock') {
      wsData.push(['SL', 'Category Name', 'Items Count', 'Stock Qty', 'Total Cost (TK)', 'Total MRP (TK)', 'Contribution (%)']);
      displayedRows.forEach(r => {
        wsData.push([r.sl, r.category_name, r.total_items, r.stock_qty, r.total_cost, r.total_mrp, `${r.contribution}%`]);
      });
      wsData.push(['Total', `${reportData.rows.length} Categories`, reportData.totals.total_products, reportData.totals.total_stock, reportData.totals.total_cost, reportData.totals.total_mrp, '100%']);
    } else if (reportData.reportType === 'Sub Category Wise Stock') {
      wsData.push(['SL', 'Category', 'Sub Category', 'Items Count', 'Stock Qty', 'Total Cost (TK)', 'Total MRP (TK)', 'Contribution (%)']);
      displayedRows.forEach(r => {
        wsData.push([r.sl, r.category_name, r.subcategory_name, r.total_items, r.stock_qty, r.total_cost, r.total_mrp, `${r.contribution}%`]);
      });
      wsData.push(['Total', '', `${reportData.rows.length} Subcategories`, reportData.totals.total_products, reportData.totals.total_stock, reportData.totals.total_cost, reportData.totals.total_mrp, '100%']);
    } else if (reportData.reportType === 'Item Name Wise Stock') {
      wsData.push(['SL', 'Item Name', 'Category', 'Sub Category', 'Brand', 'Vendor', 'Cost Price', 'MRP', 'Stock Qty', 'Total Cost', 'Total MRP']);
      displayedRows.forEach(r => {
        wsData.push([r.sl, r.item_name, r.category_name, r.subcategory_name, r.brand_name, r.vendor_name, r.unit_cost, r.unit_mrp, r.stock_qty, r.total_cost, r.total_mrp]);
      });
      wsData.push(['Total', `${reportData.rows.length} Items`, '', '', '', '', '', '', reportData.totals.total_stock, reportData.totals.total_cost, reportData.totals.total_mrp]);
    } else if (reportData.reportType === 'Barcode Wise Stock(ShopWise)') {
      wsData.push(['SL', 'Store Name', 'Barcode', 'Item Code', 'Product Name', 'Category', 'Brand', 'Cost Price', 'MRP', 'Stock Qty', 'Total Cost', 'Total MRP']);
      displayedRows.forEach(r => {
        wsData.push([r.sl, r.store_name, r.barcode, r.code, r.item_name, r.category_name, r.brand_name, r.cost_price, r.unit_mrp, r.stock_qty, r.total_cost, r.total_mrp]);
      });
      wsData.push(['Total', '', '', '', `${reportData.rows.length} Store Items`, '', '', '', '', reportData.totals.total_stock, reportData.totals.total_cost, reportData.totals.total_mrp]);
    } else if (reportData.reportType === 'Product Wise Stock(ShopWise)') {
      wsData.push(['SL', 'Store Name', 'Code', 'Product Name', 'Category', 'Brand', 'Vendor', 'Cost Price', 'MRP', 'Stock Qty', 'Total Cost', 'Total MRP']);
      displayedRows.forEach(r => {
        wsData.push([r.sl, r.store_name, r.code, r.item_name, r.category_name, r.brand_name, r.vendor_name, r.cost_price, r.unit_mrp, r.stock_qty, r.total_cost, r.total_mrp]);
      });
      wsData.push(['Total', '', '', `${reportData.rows.length} Store Products`, '', '', '', '', '', reportData.totals.total_stock, reportData.totals.total_cost, reportData.totals.total_mrp]);
    } else if (reportData.reportType === 'Brand Wise Stock') {
      wsData.push(['SL', 'Brand Name', 'Items Count', 'Stock Qty', 'Total Cost (TK)', 'Total MRP (TK)', 'Contribution (%)']);
      displayedRows.forEach(r => {
        wsData.push([r.sl, r.brand_name, r.total_items, r.stock_qty, r.total_cost, r.total_mrp, `${r.contribution}%`]);
      });
      wsData.push(['Total', `${reportData.rows.length} Brands`, reportData.totals.total_products, reportData.totals.total_stock, reportData.totals.total_cost, reportData.totals.total_mrp, '100%']);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Analysis');
    XLSX.writeFile(wb, `Shopwise_Stock_Analysis_${reportData.reportType.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Page Title */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          Shopwise Stock Analysis Report
        </h1>
      </div>

      {/* FILTER SEARCH CRITERIA CARD */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>

        {/* Two-Column Inputs Grid Matching Screenshot */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '40px',
          rowGap: '12px',
          marginBottom: '20px'
        }}>
          
          {/* Row 1: Store Type | Store */}
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

          {/* Row 2: Vendor | Category */}
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

          {/* Row 3: Sub Category | Sub Subcategory */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Sub Category</label>
            <select
              value={selectedSubCategory}
              onChange={(e) => {
                setSelectedSubCategory(e.target.value);
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
              {filteredSubcategories.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          </div>

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

          {/* Row 4: Item Name | (Empty on Right) */}
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

          <div></div>
        </div>

        {/* VALUE TYPE SECTION (Matching other reports with round green radio bullets) */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
            Value Type
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            {[
              { id: 'Default', label: 'Default' },
              { id: 'Without Zero', label: 'Without Zero' }
            ].map(vt => {
              const isSelected = valueType === vt.id;
              return (
                <label
                  key={vt.id}
                  onClick={() => setValueType(vt.id)}
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
                  {/* Round Green Radio Marker matching other reports */}
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
                  {vt.label}
                </label>
              );
            })}
          </div>
        </div>

        {/* REPORT TYPE SECTION (Vertical list matching other reports with round green radio bullets) */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
            Report Type
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reportTypeList.map(rTypeItem => {
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
                    userSelect: 'none',
                    width: 'fit-content'
                  }}
                >
                  {/* Round Green Radio Marker matching other reports */}
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
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
            Print Type
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Show Button (Glossy Aero Blue .btn-info) */}
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

            {/* Reload Button (Glossy Aero Ruby Red .btn-danger) */}
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

      {/* REPORT RESULTS DISPLAY CARD */}
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase' }}>Products Cataloged</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                {reportData.totals.total_products}
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>Total Stock Quantity</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {Number(reportData.totals.total_stock).toLocaleString()} Units
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '11px', color: '#334155', fontWeight: 600, textTransform: 'uppercase' }}>Total Cost Value (TP)</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                ৳ {Number(reportData.totals.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600, textTransform: 'uppercase' }}>Total MRP Value</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                ৳ {Number(reportData.totals.total_mrp).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                {reportData.reportType}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Store: <span style={{ fontWeight: 600, color: '#1e293b' }}>
                  {reportData.storeFilter 
                    ? (stores.find(st => st.id === reportData.storeFilter)?.name || 'Store') 
                    : (reportData.storeType === 'ALL' ? 'All Stores & Central Warehouse' : 'All Branch Stores')}
                </span>
                {' | '}Value Type: <span style={{ fontWeight: 600, color: '#1e293b' }}>{reportData.valueType}</span>
                {' | '}Showing {displayedRows.length} records
              </div>
            </div>

            {/* Quick Filter Search Box */}
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
                  
                  {/* Category Wise Stock */}
                  {reportData.reportType === 'Category Wise Stock' && (
                    <>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category Name</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Total Items (SKUs)</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Stock Qty (Pcs)</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total Cost Value (৳)</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total MRP Value (৳)</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Contribution (%)</th>
                    </>
                  )}

                  {/* Sub Category Wise Stock */}
                  {reportData.reportType === 'Sub Category Wise Stock' && (
                    <>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category Name</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Sub Category Name</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Total Items</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Stock Qty (Pcs)</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total Cost Value (৳)</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total MRP Value (৳)</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Contribution (%)</th>
                    </>
                  )}

                  {/* Item Name Wise Stock */}
                  {reportData.reportType === 'Item Name Wise Stock' && (
                    <>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Name</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Sub Category</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Vendor</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Unit Cost (৳)</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Unit MRP (৳)</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Stock (Pcs)</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total Cost (৳)</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right' }}>Total MRP (৳)</th>
                    </>
                  )}

                  {/* Barcode Wise Stock(ShopWise) */}
                  {reportData.reportType === 'Barcode Wise Stock(ShopWise)' && (
                    <>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Store Name</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Barcode</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Code</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Product Name</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Cost Price (৳)</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Unit MRP (৳)</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Current Stock</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total Cost (৳)</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right' }}>Total MRP (৳)</th>
                    </>
                  )}

                  {/* Product Wise Stock(ShopWise) */}
                  {reportData.reportType === 'Product Wise Stock(ShopWise)' && (
                    <>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Store Name</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Product Code</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Product Name</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Vendor</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Cost Price (৳)</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Unit MRP (৳)</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Current Stock</th>
                      <th style={{ padding: '7px 8px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total Cost (৳)</th>
                      <th style={{ padding: '7px 8px', textAlign: 'right' }}>Total MRP (৳)</th>
                    </>
                  )}

                  {/* Brand Wise Stock */}
                  {reportData.reportType === 'Brand Wise Stock' && (
                    <>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand Name</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>Total Items (SKUs)</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Stock Qty (Pcs)</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total Cost Value (৳)</th>
                      <th style={{ padding: '7px 10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'right' }}>Total MRP Value (৳)</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right' }}>Contribution (%)</th>
                    </>
                  )}

                </tr>
              </thead>

              {/* TBODY */}
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      No matching stock records found for the selected criteria.
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
                      {/* Category Wise Stock Rows */}
                      {reportData.reportType === 'Category Wise Stock' && (
                        <>
                          <td style={{ padding: '7px 10px' }}>{r.sl}</td>
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: '#2e6f40' }}>{r.category_name}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>{r.total_items}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: r.stock_qty > 0 ? '#15803d' : '#64748b' }}>
                            {r.stock_qty}
                          </td>
                          <td style={{ padding: '7px 10px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{Number(r.total_mrp).toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{r.contribution}%</td>
                        </>
                      )}

                      {/* Sub Category Wise Stock Rows */}
                      {reportData.reportType === 'Sub Category Wise Stock' && (
                        <>
                          <td style={{ padding: '7px 10px' }}>{r.sl}</td>
                          <td style={{ padding: '7px 10px', color: '#64748b' }}>{r.category_name}</td>
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: '#2e6f40' }}>{r.subcategory_name}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>{r.total_items}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: r.stock_qty > 0 ? '#15803d' : '#64748b' }}>
                            {r.stock_qty}
                          </td>
                          <td style={{ padding: '7px 10px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{Number(r.total_mrp).toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{r.contribution}%</td>
                        </>
                      )}

                      {/* Item Name Wise Stock Rows */}
                      {reportData.reportType === 'Item Name Wise Stock' && (
                        <>
                          <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1e293b' }}>{r.item_name}</td>
                          <td style={{ padding: '6px 8px' }}>{r.category_name}</td>
                          <td style={{ padding: '6px 8px' }}>{r.subcategory_name}</td>
                          <td style={{ padding: '6px 8px' }}>{r.brand_name}</td>
                          <td style={{ padding: '6px 8px' }}>{r.vendor_name}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.unit_cost).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.unit_mrp).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: r.stock_qty > 0 ? '#15803d' : '#64748b' }}>
                            {r.stock_qty}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>{Number(r.total_mrp).toFixed(2)}</td>
                        </>
                      )}

                      {/* Barcode Wise Stock(ShopWise) Rows */}
                      {reportData.reportType === 'Barcode Wise Stock(ShopWise)' && (
                        <>
                          <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2e6f40' }}>{r.store_name}</td>
                          <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{r.barcode}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>{r.code}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.item_name}</td>
                          <td style={{ padding: '6px 8px' }}>{r.category_name}</td>
                          <td style={{ padding: '6px 8px' }}>{r.brand_name}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.cost_price).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.unit_mrp).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: r.stock_qty > 0 ? '#15803d' : '#64748b' }}>
                            {r.stock_qty}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>{Number(r.total_mrp).toFixed(2)}</td>
                        </>
                      )}

                      {/* Product Wise Stock(ShopWise) Rows */}
                      {reportData.reportType === 'Product Wise Stock(ShopWise)' && (
                        <>
                          <td style={{ padding: '6px 8px' }}>{r.sl}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2e6f40' }}>{r.store_name}</td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>{r.code}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.item_name}</td>
                          <td style={{ padding: '6px 8px' }}>{r.category_name}</td>
                          <td style={{ padding: '6px 8px' }}>{r.brand_name}</td>
                          <td style={{ padding: '6px 8px' }}>{r.vendor_name}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.cost_price).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.unit_mrp).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: r.stock_qty > 0 ? '#15803d' : '#64748b' }}>
                            {r.stock_qty}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>{Number(r.total_mrp).toFixed(2)}</td>
                        </>
                      )}

                      {/* Brand Wise Stock Rows */}
                      {reportData.reportType === 'Brand Wise Stock' && (
                        <>
                          <td style={{ padding: '7px 10px' }}>{r.sl}</td>
                          <td style={{ padding: '7px 10px', fontWeight: 600, color: '#2e6f40' }}>{r.brand_name}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'center' }}>{r.total_items}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: r.stock_qty > 0 ? '#15803d' : '#64748b' }}>
                            {r.stock_qty}
                          </td>
                          <td style={{ padding: '7px 10px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{Number(r.total_mrp).toFixed(2)}</td>
                          <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{r.contribution}%</td>
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
                    
                    {reportData.reportType === 'Category Wise Stock' && (
                      <>
                        <td style={{ padding: '9px 10px' }}>TOTAL</td>
                        <td style={{ padding: '9px 10px' }}>{reportData.rows.length} Categories</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>{reportData.totals.total_products}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost).toFixed(2)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_mrp).toFixed(2)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>100.00%</td>
                      </>
                    )}

                    {reportData.reportType === 'Sub Category Wise Stock' && (
                      <>
                        <td style={{ padding: '9px 10px' }}>TOTAL</td>
                        <td colSpan="2" style={{ padding: '9px 10px' }}>{reportData.rows.length} Subcategories</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>{reportData.totals.total_products}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost).toFixed(2)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_mrp).toFixed(2)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>100.00%</td>
                      </>
                    )}

                    {reportData.reportType === 'Item Name Wise Stock' && (
                      <>
                        <td style={{ padding: '9px 8px' }}>TOTAL</td>
                        <td colSpan="7" style={{ padding: '9px 8px' }}>{reportData.rows.length} Items Listed</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost).toFixed(2)}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_mrp).toFixed(2)}</td>
                      </>
                    )}

                    {reportData.reportType === 'Barcode Wise Stock(ShopWise)' && (
                      <>
                        <td style={{ padding: '9px 8px' }}>TOTAL</td>
                        <td colSpan="8" style={{ padding: '9px 8px' }}>{reportData.rows.length} Store Items Listed</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost).toFixed(2)}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_mrp).toFixed(2)}</td>
                      </>
                    )}

                    {reportData.reportType === 'Product Wise Stock(ShopWise)' && (
                      <>
                        <td style={{ padding: '9px 8px' }}>TOTAL</td>
                        <td colSpan="8" style={{ padding: '9px 8px' }}>{reportData.rows.length} Store Products Listed</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost).toFixed(2)}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_mrp).toFixed(2)}</td>
                      </>
                    )}

                    {reportData.reportType === 'Brand Wise Stock' && (
                      <>
                        <td style={{ padding: '9px 10px' }}>TOTAL</td>
                        <td style={{ padding: '9px 10px' }}>{reportData.rows.length} Brands</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>{reportData.totals.total_products}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost).toFixed(2)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#dc2626' }}>৳ {Number(reportData.totals.total_mrp).toFixed(2)}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right' }}>100.00%</td>
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

export default ShopwiseStockAnalysisReport;
