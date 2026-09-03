import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Printer, Search, FileSpreadsheet, 
  Warehouse, Store, Layers, DollarSign, Package, Filter, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ItemwiseStockReport = () => {
  const { user } = useAuth();

  // Search Criteria Filter States
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL'); // Supplier Payment Type (CashPurchase / CreditPurchase)
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');
  const [selectedCountry, setSelectedCountry] = useState('ALL');

  // Value Type (Default, ONLY ZERO, NON ZERO, NEGATIVE)
  const [valueType, setValueType] = useState('Default');

  // Report Type (Details, Summary)
  const [reportType, setReportType] = useState('Details');

  // Master Data
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [countries, setCountries] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [storeStocks, setStoreStocks] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseOrderItems, setPurchaseOrderItems] = useState([]);

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
      const [
        storesRes, 
        vendorsRes, 
        brandsRes, 
        catsRes, 
        subCatsRes, 
        subSubCatsRes, 
        prodsRes, 
        storeStocksRes,
        poRes,
        poiRes
      ] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, name, contract_details').order('name'),
        supabase.from('brands').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id, category_name').order('name'),
        supabase.from('sub_subcategories').select('id, name, subcategory_id, category_name, subcategory_name').order('name'),
        supabase.from('products').select(`
          id, code, barcode, user_define_barcode, item_name, product_description,
          category_id, subcategory_id, sub_subcategory_id, brand_id, vendor_id,
          country_of_origin, purchase_price, mrp, wh_stock, str_stock, status
        `).order('item_name'),
        supabase.from('store_stocks').select('*'),
        supabase.from('purchase_orders').select('id, vendor_id, supplier_payment_type'),
        supabase.from('purchase_order_items').select('purchase_order_id, product_id')
      ]);

      const pList = prodsRes.data || [];
      const countrySet = new Set();
      pList.forEach(p => {
        if (p.country_of_origin && p.country_of_origin.trim()) {
          countrySet.add(p.country_of_origin.trim());
        }
      });

      setStores(storesRes.data || []);
      setVendors(vendorsRes.data || []);
      setBrands(brandsRes.data || []);
      setCategories(catsRes.data || []);
      setSubcategories(subCatsRes.data || []);
      setSubSubcategories(subSubCatsRes.data || []);
      setCountries(Array.from(countrySet).sort());
      setRawProducts(pList);
      setStoreStocks(storeStocksRes.data || []);
      setPurchaseOrders(poRes.data || []);
      setPurchaseOrderItems(poiRes.data || []);
    } catch (err) {
      console.error('Error fetching master data:', err);
      toast.error('Failed to load filter dropdowns');
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

  // Pure function to calculate itemwise stock and generate report output
  const computeReportOutput = (
    rType, vType, storeFilter, stType, payTypeFilter, vFilter, bFilter, cFilter, 
    scFilter, sscFilter, nameInput, countryFilter, prods, sStocks, storeList, 
    vendorList, brandList, catList, subCatList, subSubCatList, pos, pois
  ) => {
    if (!prods || prods.length === 0) return null;

    // Fast lookups
    const storeStockMap = new Map();
    const totalBranchStockMap = new Map();

    (sStocks || []).forEach(ss => {
      const pId = ss.product_id;
      const sId = ss.store_id;
      const q = Number(ss.stock_qty || 0);
      storeStockMap.set(`${pId}_${sId}`, q);
      totalBranchStockMap.set(pId, (totalBranchStockMap.get(pId) || 0) + q);
    });

    const storeMap = new Map();
    (storeList || []).forEach(s => storeMap.set(s.id, s));

    const vendorMap = new Map();
    const vendorPayTermsMap = new Map();
    (vendorList || []).forEach(v => {
      vendorMap.set(v.id, v.name);
      const terms = v.contract_details?.payment_terms || '';
      vendorPayTermsMap.set(v.id, terms.toLowerCase().includes('credit') ? 'CreditPurchase' : 'CashPurchase');
    });

    // Map Product Supplier Payment Types from Purchase Orders
    const poMap = new Map();
    (pos || []).forEach(po => {
      if (po.id && po.supplier_payment_type) {
        poMap.set(po.id, po.supplier_payment_type);
      }
    });

    const productPaymentTypeMap = new Map();
    (pois || []).forEach(poi => {
      const pt = poMap.get(poi.purchase_order_id);
      if (pt && poi.product_id) {
        productPaymentTypeMap.set(poi.product_id, pt);
      }
    });

    const brandMap = new Map();
    (brandList || []).forEach(b => brandMap.set(b.id, b.name));

    const catMap = new Map();
    (catList || []).forEach(c => catMap.set(c.id, c.name));

    const subCatMap = new Map();
    (subCatList || []).forEach(s => subCatMap.set(s.id, s.name));

    const subSubCatMap = new Map();
    (subSubCatList || []).forEach(ss => subSubCatMap.set(ss.id, ss.name));

    // Filter and compute stock for each product
    let items = [];

    prods.forEach(p => {
      const barcode = p.user_define_barcode || p.barcode || p.code || '-';
      const itemName = p.item_name || 'Item';
      const brandName = brandMap.get(p.brand_id) || '-';
      const vendorName = vendorMap.get(p.vendor_id) || '-';
      const catName = catMap.get(p.category_id) || '-';
      const subCatName = subCatMap.get(p.subcategory_id) || '-';
      const subSubCatName = subSubCatMap.get(p.sub_subcategory_id) || '-';
      const countryName = p.country_of_origin || '-';

      // Determine Supplier Payment Type (Purchase method)
      const supplierPaymentType = productPaymentTypeMap.get(p.id) || 
                                  vendorPayTermsMap.get(p.vendor_id) || 
                                  'CashPurchase';

      // 1. Supplier Payment Type Filter
      if (payTypeFilter !== 'ALL' && payTypeFilter !== '') {
        if (supplierPaymentType.toLowerCase() !== payTypeFilter.toLowerCase()) return;
      }

      // 2. Vendor Filter
      if (vFilter !== 'ALL' && vendorName.toLowerCase() !== vFilter.toLowerCase()) return;

      // 3. Brand Filter
      if (bFilter !== 'ALL' && brandName.toLowerCase() !== bFilter.toLowerCase()) return;

      // 4. Category Filter
      if (cFilter !== 'ALL' && catName.toLowerCase() !== cFilter.toLowerCase()) return;

      // 5. Sub Category Filter
      if (scFilter !== 'ALL' && subCatName.toLowerCase() !== scFilter.toLowerCase()) return;

      // 6. Sub Subcategory Filter
      if (sscFilter !== 'ALL' && subSubCatName.toLowerCase() !== sscFilter.toLowerCase()) return;

      // 7. Country of Origin Filter
      if (countryFilter !== 'ALL' && countryName.toLowerCase() !== countryFilter.toLowerCase()) return;

      // 8. Item Name / Barcode Input Filter
      if (nameInput !== 'ALL' && nameInput.trim()) {
        const q = nameInput.trim().toLowerCase();
        const matchName = itemName.toLowerCase().includes(q);
        const matchBarcode = String(barcode).toLowerCase().includes(q);
        if (!matchName && !matchBarcode) return;
      }

      // Stock Calculation according to Store Filter
      const whStock = Number(p.wh_stock || 0);
      const allBranchStock = totalBranchStockMap.has(p.id) ? totalBranchStockMap.get(p.id) : Number(p.str_stock || 0);

      let effectiveStock = 0;
      let effectiveCentral = whStock;
      let effectiveBranch = allBranchStock;

      if (storeFilter === 'ALL') {
        if (stType === 'Store') {
          // Store only: branch stores stock
          effectiveStock = allBranchStock;
          effectiveCentral = 0;
          effectiveBranch = allBranchStock;
        } else {
          // ALL = Central Store (Warehouse) + All Branch Stores
          effectiveStock = whStock + allBranchStock;
        }
      } else if (storeFilter === 'CENTRAL_STORE') {
        effectiveStock = whStock;
        effectiveBranch = 0;
      } else {
        const bQty = storeStockMap.get(`${p.id}_${storeFilter}`) ?? 0;
        effectiveStock = bQty;
        effectiveCentral = 0;
        effectiveBranch = bQty;
      }

      // 9. Value Type Filter (Default, ONLY ZERO, NON ZERO, NEGATIVE)
      if (vType === 'ONLY ZERO' && effectiveStock !== 0) return;
      if (vType === 'NON ZERO' && effectiveStock === 0) return;
      if (vType === 'NEGATIVE' && effectiveStock >= 0) return;

      const costPrice = Number(p.purchase_price || 0);
      const mrp = Number(p.mrp || 0);
      const totalCost = effectiveStock * costPrice;
      const totalMrp = effectiveStock * mrp;

      items.push({
        id: p.id,
        barcode,
        code: p.code || '-',
        item_name: itemName,
        category: catName,
        sub_category: subCatName,
        sub_subcategory: subSubCatName,
        brand: brandName,
        vendor: vendorName,
        country: countryName,
        supplier_payment_type: supplierPaymentType,
        central_stock: effectiveCentral,
        branch_stock: effectiveBranch,
        stock: effectiveStock,
        cost_price: costPrice,
        mrp: mrp,
        total_cost: totalCost,
        total_mrp: totalMrp
      });
    });

    let rows = [];

    if (rType === 'Summary') {
      // Group by Category & Sub Category
      const group = {};
      items.forEach(p => {
        const key = `${p.category} -> ${p.sub_category}`;
        if (!group[key]) {
          group[key] = {
            category: p.category,
            sub_category: p.sub_category,
            total_items: 0,
            central_stock: 0,
            branch_stock: 0,
            stock: 0,
            total_cost: 0,
            total_mrp: 0
          };
        }
        group[key].total_items += 1;
        group[key].central_stock += p.central_stock;
        group[key].branch_stock += p.branch_stock;
        group[key].stock += p.stock;
        group[key].total_cost += p.total_cost;
        group[key].total_mrp += p.total_mrp;
      });

      rows = Object.values(group).map((g, idx) => ({
        sl: idx + 1,
        ...g
      }));
    } else {
      // Details
      items.sort((a, b) => a.category.localeCompare(b.category) || a.item_name.localeCompare(b.item_name));
      rows = items.map((p, idx) => ({
        sl: idx + 1,
        ...p
      }));
    }

    const totalStock = items.reduce((s, p) => s + p.stock, 0);
    const totalCentral = items.reduce((s, p) => s + p.central_stock, 0);
    const totalBranch = items.reduce((s, p) => s + p.branch_stock, 0);
    const totalCostVal = items.reduce((s, p) => s + p.total_cost, 0);
    const totalMrpVal = items.reduce((s, p) => s + p.total_mrp, 0);

    return {
      reportType: rType,
      valueType: vType,
      storeFilter,
      rows,
      totals: {
        total_products: items.length,
        total_central_stock: totalCentral,
        total_branch_stock: totalBranch,
        total_stock: totalStock,
        total_cost_value: totalCostVal,
        total_mrp_value: totalMrpVal
      }
    };
  };

  // Update filter state on radio changes (report output changes only on Show button click)
  const handleReportTypeChange = (newType) => {
    setReportType(newType);
  };

  const handleValueTypeChange = (newValType) => {
    setValueType(newValType);
  };

  // Reset Filters Handler
  const handleReload = () => {
    setStoreType('ALL');
    setSelectedStore('ALL');
    setPaymentMethod('ALL');
    setSelectedVendor('ALL');
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setSelectedCountry('ALL');
    setValueType('Default');
    setReportType('Details');
    setReportData(null);
    setTableSearch('');
    toast.success('Filters reset');
  };

  // Main Report Execution Logic
  const handleShowReport = () => {
    setLoading(true);
    try {
      const computed = computeReportOutput(
        reportType, valueType, selectedStore, storeType,
        paymentMethod, selectedVendor, selectedBrand, selectedCategory,
        selectedSubCategory, selectedSubSubcategory,
        itemNameInput, selectedCountry,
        rawProducts, storeStocks, stores, vendors, brands,
        categories, subcategories, subSubcategories,
        purchaseOrders, purchaseOrderItems
      );
      setReportData(computed);

      if (!computed || computed.rows.length === 0) {
        toast('No matching stock records found.', { icon: 'ℹ️' });
      } else {
        toast.success(`Generated ${computed.rows.length} records`);
      }
    } catch (err) {
      console.error('Error generating itemwise stock report:', err);
      toast.error('Failed to generate stock report');
    } finally {
      setLoading(false);
    }
  };

  // Live client-side search inside table
  const displayedRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;
    const q = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(r => 
      Object.values(r).some(val => String(val).toLowerCase().includes(q))
    );
  }, [reportData, tableSearch]);

  // Determine store visibility context strictly from the snapshot of the generated report
  const activeStore = reportData ? reportData.storeFilter : selectedStore;
  const isAll = activeStore === 'ALL';
  const isCentral = activeStore === 'CENTRAL_STORE';
  const isSpecific = !isAll && !isCentral;
  const specificStoreName = isSpecific ? (stores.find(s => s.id === activeStore)?.name || 'Store') : '';

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

    // 2. Top Right Title & Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(46, 111, 64);
    doc.text(`ITEMWISE STOCK REPORT (${reportData.reportType.toUpperCase()})`, pageWidth - 14, 13, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(`Date: ${new Date().toISOString().split('T')[0]}`, pageWidth - 14, 18.5, { align: 'right' });
    doc.text(`Payment: ${paymentMethod} | Filter: ${reportData.valueType}`, pageWidth - 14, 23, { align: 'right' });

    // 3. Top Left Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text("Store:", 14, 18.5);
    doc.setFont("helvetica", "normal");
    const storeLabel = isAll ? 'All Stores & Central Warehouse' : isCentral ? 'Central Store (Warehouse)' : specificStoreName;
    doc.text(storeLabel, 32, 18.5);

    doc.setFont("helvetica", "bold");
    doc.text("Category:", 14, 23);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedCategory}`, 32, 23);

    doc.setFont("helvetica", "bold");
    doc.text("Vendor:", 14, 27.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedVendor}`, 32, 27.5);

    // 4. Build Table dynamically based on selected Store
    let head = [];
    let body = [];

    if (reportData.reportType === 'Summary') {
      if (isAll) {
        head = [['SL', 'Category', 'Sub Category', 'Active Items', 'Central Stock', 'Branch Stock', 'Total Stock', 'Cost Value (TP)', 'MRP Value']];
        displayedRows.forEach((r, idx) => {
          body.push([
            idx + 1, r.category, r.sub_category, r.total_items, r.central_stock, r.branch_stock, r.stock,
            Number(r.total_cost).toFixed(2), Number(r.total_mrp).toFixed(2)
          ]);
        });
        body.push([
          'Total', `${reportData.rows.length} Groups`, '', reportData.totals.total_products,
          reportData.totals.total_central_stock, reportData.totals.total_branch_stock, reportData.totals.total_stock,
          Number(reportData.totals.total_cost_value).toFixed(2), Number(reportData.totals.total_mrp_value).toFixed(2)
        ]);
      } else if (isCentral) {
        head = [['SL', 'Category', 'Sub Category', 'Active Items', 'Central Store Stock', 'Cost Value (TP)', 'MRP Value']];
        displayedRows.forEach((r, idx) => {
          body.push([
            idx + 1, r.category, r.sub_category, r.total_items, r.central_stock,
            Number(r.total_cost).toFixed(2), Number(r.total_mrp).toFixed(2)
          ]);
        });
        body.push([
          'Total', `${reportData.rows.length} Groups`, '', reportData.totals.total_products,
          reportData.totals.total_central_stock,
          Number(reportData.totals.total_cost_value).toFixed(2), Number(reportData.totals.total_mrp_value).toFixed(2)
        ]);
      } else {
        head = [['SL', 'Category', 'Sub Category', 'Active Items', `${specificStoreName} Stock`, 'Cost Value (TP)', 'MRP Value']];
        displayedRows.forEach((r, idx) => {
          body.push([
            idx + 1, r.category, r.sub_category, r.total_items, r.branch_stock,
            Number(r.total_cost).toFixed(2), Number(r.total_mrp).toFixed(2)
          ]);
        });
        body.push([
          'Total', `${reportData.rows.length} Groups`, '', reportData.totals.total_products,
          reportData.totals.total_branch_stock,
          Number(reportData.totals.total_cost_value).toFixed(2), Number(reportData.totals.total_mrp_value).toFixed(2)
        ]);
      }
    } else {
      if (isAll) {
        head = [['SL', 'Barcode', 'Item Name', 'Category', 'Vendor', 'Country', 'Central WH', 'Branch', 'Total Stock', 'Cost (TP)', 'MRP', 'Cost Value', 'MRP Value']];
        displayedRows.forEach((r, idx) => {
          body.push([
            idx + 1, r.barcode, r.item_name, r.category, r.vendor, r.country,
            r.central_stock, r.branch_stock, r.stock,
            Number(r.cost_price).toFixed(2), Number(r.mrp).toFixed(2),
            Number(r.total_cost).toFixed(2), Number(r.total_mrp).toFixed(2)
          ]);
        });
        body.push([
          'Total', '', `${reportData.rows.length} Items`, '', '', '',
          reportData.totals.total_central_stock, reportData.totals.total_branch_stock, reportData.totals.total_stock,
          '', '', Number(reportData.totals.total_cost_value).toFixed(2), Number(reportData.totals.total_mrp_value).toFixed(2)
        ]);
      } else if (isCentral) {
        head = [['SL', 'Barcode', 'Item Name', 'Category', 'Vendor', 'Country', 'Central Store Stock', 'Cost (TP)', 'MRP', 'Cost Value', 'MRP Value']];
        displayedRows.forEach((r, idx) => {
          body.push([
            idx + 1, r.barcode, r.item_name, r.category, r.vendor, r.country,
            r.central_stock,
            Number(r.cost_price).toFixed(2), Number(r.mrp).toFixed(2),
            Number(r.total_cost).toFixed(2), Number(r.total_mrp).toFixed(2)
          ]);
        });
        body.push([
          'Total', '', `${reportData.rows.length} Items`, '', '', '',
          reportData.totals.total_central_stock,
          '', '', Number(reportData.totals.total_cost_value).toFixed(2), Number(reportData.totals.total_mrp_value).toFixed(2)
        ]);
      } else {
        head = [['SL', 'Barcode', 'Item Name', 'Category', 'Vendor', 'Country', `${specificStoreName} Stock`, 'Cost (TP)', 'MRP', 'Cost Value', 'MRP Value']];
        displayedRows.forEach((r, idx) => {
          body.push([
            idx + 1, r.barcode, r.item_name, r.category, r.vendor, r.country,
            r.branch_stock,
            Number(r.cost_price).toFixed(2), Number(r.mrp).toFixed(2),
            Number(r.total_cost).toFixed(2), Number(r.total_mrp).toFixed(2)
          ]);
        });
        body.push([
          'Total', '', `${reportData.rows.length} Items`, '', '', '',
          reportData.totals.total_branch_stock,
          '', '', Number(reportData.totals.total_cost_value).toFixed(2), Number(reportData.totals.total_mrp_value).toFixed(2)
        ]);
      }
    }

    autoTable(doc, {
      startY: 33,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 30, 30] },
      headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 }
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

    doc.save(`Itemwise_Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF Downloaded");
  };

  // Export to Excel dynamically matching visible columns
  const handleExportExcel = () => {
    if (!reportData || reportData.rows.length === 0) {
      toast.error("Please click 'Show' first to generate report");
      return;
    }

    let exportData = [];

    if (reportData.reportType === 'Summary') {
      if (isAll) {
        exportData = reportData.rows.map((r, idx) => ({
          'SL': idx + 1,
          'Category': r.category,
          'Sub Category': r.sub_category,
          'Active Items': r.total_items,
          'Central Store Stock': r.central_stock,
          'Branch Store Stock': r.branch_stock,
          'Total Stock Qty': r.stock,
          'Total Cost Value (TP)': Number(r.total_cost).toFixed(2),
          'Total MRP Value': Number(r.total_mrp).toFixed(2)
        }));
        exportData.push({
          'SL': 'Total',
          'Category': `${reportData.rows.length} Summary Groups`,
          'Sub Category': '',
          'Active Items': reportData.totals.total_products,
          'Central Store Stock': reportData.totals.total_central_stock,
          'Branch Store Stock': reportData.totals.total_branch_stock,
          'Total Stock Qty': reportData.totals.total_stock,
          'Total Cost Value (TP)': Number(reportData.totals.total_cost_value).toFixed(2),
          'Total MRP Value': Number(reportData.totals.total_mrp_value).toFixed(2)
        });
      } else if (isCentral) {
        exportData = reportData.rows.map((r, idx) => ({
          'SL': idx + 1,
          'Category': r.category,
          'Sub Category': r.sub_category,
          'Active Items': r.total_items,
          'Central Store Stock': r.central_stock,
          'Total Cost Value (TP)': Number(r.total_cost).toFixed(2),
          'Total MRP Value': Number(r.total_mrp).toFixed(2)
        }));
        exportData.push({
          'SL': 'Total',
          'Category': `${reportData.rows.length} Summary Groups`,
          'Sub Category': '',
          'Active Items': reportData.totals.total_products,
          'Central Store Stock': reportData.totals.total_central_stock,
          'Total Cost Value (TP)': Number(reportData.totals.total_cost_value).toFixed(2),
          'Total MRP Value': Number(reportData.totals.total_mrp_value).toFixed(2)
        });
      } else {
        exportData = reportData.rows.map((r, idx) => ({
          'SL': idx + 1,
          'Category': r.category,
          'Sub Category': r.sub_category,
          'Active Items': r.total_items,
          [`${specificStoreName} Stock`]: r.branch_stock,
          'Total Cost Value (TP)': Number(r.total_cost).toFixed(2),
          'Total MRP Value': Number(r.total_mrp).toFixed(2)
        }));
        exportData.push({
          'SL': 'Total',
          'Category': `${reportData.rows.length} Summary Groups`,
          'Sub Category': '',
          'Active Items': reportData.totals.total_products,
          [`${specificStoreName} Stock`]: reportData.totals.total_branch_stock,
          'Total Cost Value (TP)': Number(reportData.totals.total_cost_value).toFixed(2),
          'Total MRP Value': Number(reportData.totals.total_mrp_value).toFixed(2)
        });
      }
    } else {
      if (isAll) {
        exportData = reportData.rows.map((r, idx) => ({
          'SL': idx + 1,
          'Barcode': r.barcode,
          'Item Name': r.item_name,
          'Category': r.category,
          'Sub Category': r.sub_category,
          'Brand': r.brand,
          'Vendor': r.vendor,
          'Country': r.country,
          'Supplier Payment Type': r.supplier_payment_type,
          'Central Store Stock': r.central_stock,
          'Branch Store Stock': r.branch_stock,
          'Total Current Stock': r.stock,
          'Cost Price (TP)': Number(r.cost_price).toFixed(2),
          'Sale Price (MRP)': Number(r.mrp).toFixed(2),
          'Total Cost Value (TP)': Number(r.total_cost).toFixed(2),
          'Total MRP Value': Number(r.total_mrp).toFixed(2)
        }));
        exportData.push({
          'SL': 'Total',
          'Barcode': '',
          'Item Name': `${reportData.rows.length} Items Listed`,
          'Category': '',
          'Sub Category': '',
          'Brand': '',
          'Vendor': '',
          'Country': '',
          'Supplier Payment Type': '',
          'Central Store Stock': reportData.totals.total_central_stock,
          'Branch Store Stock': reportData.totals.total_branch_stock,
          'Total Current Stock': reportData.totals.total_stock,
          'Cost Price (TP)': '',
          'Sale Price (MRP)': '',
          'Total Cost Value (TP)': Number(reportData.totals.total_cost_value).toFixed(2),
          'Total MRP Value': Number(reportData.totals.total_mrp_value).toFixed(2)
        });
      } else if (isCentral) {
        exportData = reportData.rows.map((r, idx) => ({
          'SL': idx + 1,
          'Barcode': r.barcode,
          'Item Name': r.item_name,
          'Category': r.category,
          'Sub Category': r.sub_category,
          'Brand': r.brand,
          'Vendor': r.vendor,
          'Country': r.country,
          'Supplier Payment Type': r.supplier_payment_type,
          'Central Store Stock': r.central_stock,
          'Cost Price (TP)': Number(r.cost_price).toFixed(2),
          'Sale Price (MRP)': Number(r.mrp).toFixed(2),
          'Total Cost Value (TP)': Number(r.total_cost).toFixed(2),
          'Total MRP Value': Number(r.total_mrp).toFixed(2)
        }));
        exportData.push({
          'SL': 'Total',
          'Barcode': '',
          'Item Name': `${reportData.rows.length} Items Listed`,
          'Category': '',
          'Sub Category': '',
          'Brand': '',
          'Vendor': '',
          'Country': '',
          'Supplier Payment Type': '',
          'Central Store Stock': reportData.totals.total_central_stock,
          'Cost Price (TP)': '',
          'Sale Price (MRP)': '',
          'Total Cost Value (TP)': Number(reportData.totals.total_cost_value).toFixed(2),
          'Total MRP Value': Number(reportData.totals.total_mrp_value).toFixed(2)
        });
      } else {
        exportData = reportData.rows.map((r, idx) => ({
          'SL': idx + 1,
          'Barcode': r.barcode,
          'Item Name': r.item_name,
          'Category': r.category,
          'Sub Category': r.sub_category,
          'Brand': r.brand,
          'Vendor': r.vendor,
          'Country': r.country,
          'Supplier Payment Type': r.supplier_payment_type,
          [`${specificStoreName} Stock`]: r.branch_stock,
          'Cost Price (TP)': Number(r.cost_price).toFixed(2),
          'Sale Price (MRP)': Number(r.mrp).toFixed(2),
          'Total Cost Value (TP)': Number(r.total_cost).toFixed(2),
          'Total MRP Value': Number(r.total_mrp).toFixed(2)
        }));
        exportData.push({
          'SL': 'Total',
          'Barcode': '',
          'Item Name': `${reportData.rows.length} Items Listed`,
          'Category': '',
          'Sub Category': '',
          'Brand': '',
          'Vendor': '',
          'Country': '',
          'Supplier Payment Type': '',
          [`${specificStoreName} Stock`]: reportData.totals.total_branch_stock,
          'Cost Price (TP)': '',
          'Sale Price (MRP)': '',
          'Total Cost Value (TP)': Number(reportData.totals.total_cost_value).toFixed(2),
          'Total MRP Value': Number(reportData.totals.total_mrp_value).toFixed(2)
        });
      }
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Itemwise Stock");
    XLSX.writeFile(wb, `Itemwise_Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel Downloaded");
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Top Header Title */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '18px' }}>
        Itemwise Stock Report
      </h2>

      {/* Main Filter Panel - Exact 2-Column Grid */}
      <div style={{
        backgroundColor: 'var(--card-bg, #fff)',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        marginBottom: '24px'
      }}>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '20px'
        }}>
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            {/* Store Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '145px 1fr', alignItems: 'center' }}>
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
                <option value="Store">Store</option>
              </select>
            </div>

            {/* Supplier Payment Type (Purchase Method) */}
            <div style={{ display: 'grid', gridTemplateColumns: '145px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Supplier Payment Type</label>
              <select 
                value={paymentMethod} 
                onChange={e => setPaymentMethod(e.target.value)}
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
                <option value="CashPurchase">CashPurchase</option>
                <option value="CreditPurchase">CreditPurchase</option>
              </select>
            </div>

            {/* Brand */}
            <div style={{ display: 'grid', gridTemplateColumns: '145px 1fr', alignItems: 'center' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '145px 1fr', alignItems: 'center' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '145px 1fr', alignItems: 'center' }}>
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
                <option value="ALL">All Stores & Central Warehouse</option>
                <option value="CENTRAL_STORE">Central Store (Warehouse Only)</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Vendor */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
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

            {/* Country Of Origin */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
              <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Country Of Origin</label>
              <select 
                value={selectedCountry} 
                onChange={e => setSelectedCountry(e.target.value)}
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
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

          </div>
        </div>

        {/* Value Type Section (Default, ONLY ZERO, NON ZERO, NEGATIVE) */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
            Value Type
          </h4>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
            {['Default', 'ONLY ZERO', 'NON ZERO', 'NEGATIVE'].map(type => (
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
                  name="itemwiseValueType"
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

        {/* Report Type Section (Details, Summary) */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
            Report Type
          </h4>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
            {['Details', 'Summary'].map(type => (
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
                  name="itemwiseReportType"
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
          
          {/* Summary KPI Metric Cards (Dynamically tailored to Selected Store) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            
            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe' }}>
              <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase' }}>Products Cataloged</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c4a6e', marginTop: '4px' }}>
                {reportData.totals.total_products}
              </div>
            </div>

            {/* Central Store Card: Show when ALL or CENTRAL_STORE */}
            {(isAll || isCentral) && (
              <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 600, textTransform: 'uppercase' }}>Central Store (WH)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#047857', marginTop: '4px' }}>
                  {reportData.totals.total_central_stock} Units
                </div>
              </div>
            )}

            {/* Branch Store Card: Show when ALL */}
            {isAll && (
              <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Branch Stores Stock</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#14532d', marginTop: '4px' }}>
                  {reportData.totals.total_branch_stock} Units
                </div>
              </div>
            )}

            {/* Specific Branch Store Card: Show when specific branch selected */}
            {isSpecific && (
              <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
                <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>{specificStoreName} Stock</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#14532d', marginTop: '4px' }}>
                  {reportData.totals.total_branch_stock} Units
                </div>
              </div>
            )}

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fdf4ff', border: '1px solid #fae8ff' }}>
              <div style={{ fontSize: '0.78rem', color: '#86198f', fontWeight: 600, textTransform: 'uppercase' }}>Grand Total Stock</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#701a75', marginTop: '4px' }}>
                {reportData.totals.total_stock} Units
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
              <div style={{ fontSize: '0.78rem', color: '#854d0e', fontWeight: 600, textTransform: 'uppercase' }}>Total Stock Cost (TP)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#713f12', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_cost_value).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f5f3ff', border: '1px solid #ede9fe' }}>
              <div style={{ fontSize: '0.78rem', color: '#5b21b6', fontWeight: 600, textTransform: 'uppercase' }}>Total Stock Value (MRP)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4c1d95', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_mrp_value).toFixed(2)}
              </div>
            </div>

          </div>

          {/* Quick Table Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {reportData.reportType === 'Summary' ? 'Category & Sub Category Stock Summary' : 'Itemwise Stock Details'} ({displayedRows.length} Rows)
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
                  {reportData.reportType === 'Summary' ? (
                    // Summary Columns
                    <>
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 10px' }}>Category</th>
                      <th style={{ padding: '10px 10px' }}>Sub Category</th>
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>Active Items</th>
                      {isAll && (
                        <>
                          <th style={{ padding: '10px 10px', textAlign: 'right' }}>Central WH Stock</th>
                          <th style={{ padding: '10px 10px', textAlign: 'right' }}>Branch Stock</th>
                          <th style={{ padding: '10px 10px', textAlign: 'right' }}>Total Stock</th>
                        </>
                      )}
                      {isCentral && (
                        <th style={{ padding: '10px 10px', textAlign: 'right' }}>Central Store Stock</th>
                      )}
                      {isSpecific && (
                        <th style={{ padding: '10px 10px', textAlign: 'right' }}>{specificStoreName} Stock</th>
                      )}
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Cost Value (TP)</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>MRP Value</th>
                    </>
                  ) : (
                    // Detail Columns
                    <>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 8px' }}>Barcode</th>
                      <th style={{ padding: '10px 8px' }}>Item Name</th>
                      <th style={{ padding: '10px 8px' }}>Category</th>
                      <th style={{ padding: '10px 8px' }}>Sub Category</th>
                      <th style={{ padding: '10px 8px' }}>Brand</th>
                      <th style={{ padding: '10px 8px' }}>Vendor</th>
                      <th style={{ padding: '10px 8px' }}>Country</th>
                      {isAll && (
                        <>
                          <th style={{ padding: '10px 8px', textAlign: 'right' }}>Central WH</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right' }}>Branch</th>
                          <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Stock</th>
                        </>
                      )}
                      {isCentral && (
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Central Store Stock</th>
                      )}
                      {isSpecific && (
                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>{specificStoreName} Stock</th>
                      )}
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cost (TP)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cost Value</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP Value</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      No matching stock records found.
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
                      {reportData.reportType === 'Summary' ? (
                        <>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2e6f40' }}>{r.category}</td>
                          <td style={{ padding: '8px 10px' }}>{r.sub_category}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{r.total_items}</td>
                          {isAll && (
                            <>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.central_stock}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.branch_stock}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: r.stock > 0 ? '#166534' : r.stock < 0 ? '#dc2626' : '#64748b' }}>
                                {r.stock}
                              </td>
                            </>
                          )}
                          {isCentral && (
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: r.central_stock > 0 ? '#166534' : r.central_stock < 0 ? '#dc2626' : '#64748b' }}>
                              {r.central_stock}
                            </td>
                          )}
                          {isSpecific && (
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: r.branch_stock > 0 ? '#166534' : r.branch_stock < 0 ? '#dc2626' : '#64748b' }}>
                              {r.branch_stock}
                            </td>
                          )}
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{Number(r.total_mrp).toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px 8px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 8px', fontWeight: 600, color: '#2e6f40' }}>{r.barcode}</td>
                          <td style={{ padding: '8px 8px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.item_name}>
                            {r.item_name}
                          </td>
                          <td style={{ padding: '8px 8px' }}>{r.category}</td>
                          <td style={{ padding: '8px 8px' }}>{r.sub_category}</td>
                          <td style={{ padding: '8px 8px' }}>{r.brand}</td>
                          <td style={{ padding: '8px 8px' }}>{r.vendor}</td>
                          <td style={{ padding: '8px 8px' }}>{r.country}</td>
                          {isAll && (
                            <>
                              <td style={{ padding: '8px 8px', textAlign: 'right' }}>{r.central_stock}</td>
                              <td style={{ padding: '8px 8px', textAlign: 'right' }}>{r.branch_stock}</td>
                              <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: r.stock > 0 ? '#166534' : r.stock < 0 ? '#dc2626' : '#64748b' }}>
                                {r.stock}
                              </td>
                            </>
                          )}
                          {isCentral && (
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: r.central_stock > 0 ? '#166534' : r.central_stock < 0 ? '#dc2626' : '#64748b' }}>
                              {r.central_stock}
                            </td>
                          )}
                          {isSpecific && (
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: r.branch_stock > 0 ? '#166534' : r.branch_stock < 0 ? '#dc2626' : '#64748b' }}>
                              {r.branch_stock}
                            </td>
                          )}
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.cost_price).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.mrp).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{Number(r.total_mrp).toFixed(2)}</td>
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
                    {reportData.reportType === 'Summary' ? (
                      <>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>Total</td>
                        <td colSpan={2} style={{ padding: '10px 10px' }}>{reportData.rows.length} Summary Groups</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>{reportData.totals.total_products}</td>
                        {isAll && (
                          <>
                            <td style={{ padding: '10px 10px', textAlign: 'right' }}>{reportData.totals.total_central_stock}</td>
                            <td style={{ padding: '10px 10px', textAlign: 'right' }}>{reportData.totals.total_branch_stock}</td>
                            <td style={{ padding: '10px 10px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                          </>
                        )}
                        {isCentral && (
                          <td style={{ padding: '10px 10px', textAlign: 'right' }}>{reportData.totals.total_central_stock}</td>
                        )}
                        {isSpecific && (
                          <td style={{ padding: '10px 10px', textAlign: 'right' }}>{reportData.totals.total_branch_stock}</td>
                        )}
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost_value).toFixed(2)}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_mrp_value).toFixed(2)}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>Total</td>
                        <td colSpan={7} style={{ padding: '10px 8px' }}>{reportData.rows.length} Listed Items</td>
                        {isAll && (
                          <>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_central_stock}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_branch_stock}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                          </>
                        )}
                        {isCentral && (
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_central_stock}</td>
                        )}
                        {isSpecific && (
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_branch_stock}</td>
                        )}
                        <td style={{ padding: '10px 8px' }}></td>
                        <td style={{ padding: '10px 8px' }}></td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost_value).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_mrp_value).toFixed(2)}</td>
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

export default ItemwiseStockReport;
