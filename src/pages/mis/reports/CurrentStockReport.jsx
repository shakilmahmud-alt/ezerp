import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Printer, Search, FileSpreadsheet, 
  Warehouse, Store, Layers, DollarSign, Package, CheckCircle2, 
  AlertTriangle, Filter 
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const CurrentStockReport = () => {
  const { user } = useAuth();

  // Filter States
  const [selectedStore, setSelectedStore] = useState('ALL');
  
  // Report Type (Single Choice from 13 Options)
  const [reportType, setReportType] = useState('Stock Report Details');

  // Value Type (Default, Without Zero, Only Zero, Negative Stock)
  const [valueType, setValueType] = useState('Default');

  // Master Data
  const [stores, setStores] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [rawProducts, setRawProducts] = useState([]);
  const [storeStocks, setStoreStocks] = useState([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
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
        prodsRes, 
        storeStocksRes
      ] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id, category_name').order('name'),
        supabase.from('sub_subcategories').select('id, name, subcategory_id, category_name, subcategory_name').order('name'),
        supabase.from('products').select(`
          id, code, barcode, user_define_barcode, item_name, product_description,
          category_id, subcategory_id, sub_subcategory_id, brand_id, vendor_id,
          purchase_price, mrp, wh_stock, str_stock, status
        `).order('item_name'),
        supabase.from('store_stocks').select('*')
      ]);

      setStores(storesRes.data || []);
      setVendors(vendorsRes.data || []);
      setCategories(catsRes.data || []);
      setSubcategories(subCatsRes.data || []);
      setSubSubcategories(subSubCatsRes.data || []);
      setRawProducts(prodsRes.data || []);
      setStoreStocks(storeStocksRes.data || []);
    } catch (err) {
      console.error('Error fetching master data:', err);
      toast.error('Failed to load stock data');
    }
  };

  // Pure function to calculate stock items and generate report rows
  const computeReportOutput = (rType, vType, storeFilter, prods, sStocks, storeList, vendorList, catList, subCatList, subSubCatList) => {
    if (!prods || prods.length === 0) return null;

    // Group store_stocks by product_id and store_id
    const storeStockMap = new Map(); // key: `${product_id}_${store_id}` -> qty
    const totalBranchStockMap = new Map(); // key: `${product_id}` -> sum of all branch store stocks

    (sStocks || []).forEach(ss => {
      const pId = ss.product_id;
      const sId = ss.store_id;
      const q = Number(ss.stock_qty || 0);
      storeStockMap.set(`${pId}_${sId}`, q);
      totalBranchStockMap.set(pId, (totalBranchStockMap.get(pId) || 0) + q);
    });

    const vendorMap = new Map();
    (vendorList || []).forEach(v => vendorMap.set(v.id, v.name));

    const catMap = new Map();
    (catList || []).forEach(c => catMap.set(c.id, c.name));

    const subCatMap = new Map();
    (subCatList || []).forEach(s => subCatMap.set(s.id, s.name));

    const subSubCatMap = new Map();
    (subSubCatList || []).forEach(ss => subSubCatMap.set(ss.id, ss.name));

    // Calculate individual product stock based on selected Store
    let preparedProducts = prods.map(p => {
      const whStock = Number(p.wh_stock || 0);
      const allBranchStock = totalBranchStockMap.has(p.id) ? totalBranchStockMap.get(p.id) : Number(p.str_stock || 0);

      let effectiveStock = 0;
      let effectiveCentral = whStock;
      let effectiveBranch = allBranchStock;

      if (storeFilter === 'ALL') {
        // ALL = Central Store (Warehouse) + All Branch Stores
        effectiveStock = whStock + allBranchStock;
      } else if (storeFilter === 'CENTRAL_STORE') {
        // Central Store / Warehouse only
        effectiveStock = whStock;
        effectiveBranch = 0;
      } else {
        // Specific Branch Store
        const branchQty = storeStockMap.get(`${p.id}_${storeFilter}`) ?? 0;
        effectiveStock = branchQty;
        effectiveCentral = 0;
        effectiveBranch = branchQty;
      }

      const costPrice = Number(p.purchase_price || 0);
      const mrp = Number(p.mrp || 0);
      const totalCost = effectiveStock * costPrice;
      const totalMrp = effectiveStock * mrp;

      return {
        id: p.id,
        barcode: p.user_define_barcode || p.barcode || p.code || '-',
        code: p.code || '-',
        item_name: p.item_name || 'Item',
        vendor: vendorMap.get(p.vendor_id) || 'General Vendor',
        category: catMap.get(p.category_id) || 'General',
        sub_category: subCatMap.get(p.subcategory_id) || '-',
        sub_subcategory: subSubCatMap.get(p.sub_subcategory_id) || '-',
        central_stock: effectiveCentral,
        branch_stock: effectiveBranch,
        stock: effectiveStock,
        cost_price: costPrice,
        mrp: mrp,
        total_cost: totalCost,
        total_mrp: totalMrp
      };
    });

    // Apply Value Type Filter (Default, Without Zero, Only Zero, Negative Stock)
    if (vType === 'Without Zero') {
      preparedProducts = preparedProducts.filter(p => p.stock !== 0);
    } else if (vType === 'Only Zero') {
      preparedProducts = preparedProducts.filter(p => p.stock === 0);
    } else if (vType === 'Negative Stock') {
      preparedProducts = preparedProducts.filter(p => p.stock < 0);
    }

    let rows = [];

    // Branch logic according to Report Type
    if (rType.includes('Summary')) {
      if (rType.includes('Vendorwise')) {
        // Vendorwise Summary
        const group = {};
        preparedProducts.forEach(p => {
          const k = p.vendor;
          if (!group[k]) {
            group[k] = { name: k, total_items: 0, stock: 0, central_stock: 0, branch_stock: 0, total_cost: 0, total_mrp: 0 };
          }
          group[k].total_items += 1;
          group[k].stock += p.stock;
          group[k].central_stock += p.central_stock;
          group[k].branch_stock += p.branch_stock;
          group[k].total_cost += p.total_cost;
          group[k].total_mrp += p.total_mrp;
        });
        rows = Object.values(group).map((g, idx) => ({
          sl: idx + 1,
          group_title: g.name,
          ...g
        }));
      } else if (rType.includes('Category wise')) {
        // Category wise Summary
        const group = {};
        preparedProducts.forEach(p => {
          const k = p.category;
          if (!group[k]) {
            group[k] = { name: k, total_items: 0, stock: 0, central_stock: 0, branch_stock: 0, total_cost: 0, total_mrp: 0 };
          }
          group[k].total_items += 1;
          group[k].stock += p.stock;
          group[k].central_stock += p.central_stock;
          group[k].branch_stock += p.branch_stock;
          group[k].total_cost += p.total_cost;
          group[k].total_mrp += p.total_mrp;
        });
        rows = Object.values(group).map((g, idx) => ({
          sl: idx + 1,
          group_title: g.name,
          ...g
        }));
      } else if (rType.includes('Sub Category wise')) {
        // Sub Category wise Summary
        const group = {};
        preparedProducts.forEach(p => {
          const k = `${p.category} -> ${p.sub_category}`;
          if (!group[k]) {
            group[k] = { name: p.sub_category, parent: p.category, total_items: 0, stock: 0, central_stock: 0, branch_stock: 0, total_cost: 0, total_mrp: 0 };
          }
          group[k].total_items += 1;
          group[k].stock += p.stock;
          group[k].central_stock += p.central_stock;
          group[k].branch_stock += p.branch_stock;
          group[k].total_cost += p.total_cost;
          group[k].total_mrp += p.total_mrp;
        });
        rows = Object.values(group).map((g, idx) => ({
          sl: idx + 1,
          group_title: g.name,
          parent_title: g.parent,
          ...g
        }));
      } else if (rType.includes('Sub Subcategory wise')) {
        // Sub Subcategory wise Summary
        const group = {};
        preparedProducts.forEach(p => {
          const k = `${p.sub_category} -> ${p.sub_subcategory}`;
          if (!group[k]) {
            group[k] = { name: p.sub_subcategory, parent: p.sub_category, total_items: 0, stock: 0, central_stock: 0, branch_stock: 0, total_cost: 0, total_mrp: 0 };
          }
          group[k].total_items += 1;
          group[k].stock += p.stock;
          group[k].central_stock += p.central_stock;
          group[k].branch_stock += p.branch_stock;
          group[k].total_cost += p.total_cost;
          group[k].total_mrp += p.total_mrp;
        });
        rows = Object.values(group).map((g, idx) => ({
          sl: idx + 1,
          group_title: g.name,
          parent_title: g.parent,
          ...g
        }));
      }
    } else if (rType === 'Store wise Stock Report') {
      // Breakdown by store (Central Store + Each Branch Store)
      const storeBreakdowns = [];

      // 1. Central Store
      const whTotalStock = prods.reduce((s, p) => s + Number(p.wh_stock || 0), 0);
      const whTotalCost = prods.reduce((s, p) => s + (Number(p.wh_stock || 0) * Number(p.purchase_price || 0)), 0);
      const whTotalMrp = prods.reduce((s, p) => s + (Number(p.wh_stock || 0) * Number(p.mrp || 0)), 0);
      storeBreakdowns.push({
        sl: 1,
        store_name: 'Central Store (Warehouse)',
        total_items: prods.filter(p => Number(p.wh_stock || 0) > 0).length,
        stock: whTotalStock,
        total_cost: whTotalCost,
        total_mrp: whTotalMrp
      });

      // 2. Each Branch Store
      (storeList || []).forEach((st, idx) => {
        let bStock = 0;
        let bCost = 0;
        let bMrp = 0;
        let bItems = 0;

        prods.forEach(p => {
          const q = storeStockMap.get(`${p.id}_${st.id}`) || 0;
          if (q !== 0) {
            bItems += 1;
            bStock += q;
            bCost += q * Number(p.purchase_price || 0);
            bMrp += q * Number(p.mrp || 0);
          }
        });

        storeBreakdowns.push({
          sl: idx + 2,
          store_name: st.name,
          total_items: bItems,
          stock: bStock,
          total_cost: bCost,
          total_mrp: bMrp
        });
      });

      rows = storeBreakdowns;
    } else {
      // Detailed Product Listing (Stock Report Details, Vendorwise Details, Barcode wise, Reference wise, etc.)
      if (rType.includes('Vendorwise')) {
        preparedProducts.sort((a, b) => a.vendor.localeCompare(b.vendor) || a.item_name.localeCompare(b.item_name));
      } else if (rType.includes('Reference wise')) {
        preparedProducts.sort((a, b) => a.code.localeCompare(b.code) || a.barcode.localeCompare(b.barcode));
      } else if (rType.includes('Sub Subcategory')) {
        preparedProducts.sort((a, b) => a.sub_subcategory.localeCompare(b.sub_subcategory) || a.item_name.localeCompare(b.item_name));
      } else {
        preparedProducts.sort((a, b) => a.item_name.localeCompare(b.item_name));
      }

      rows = preparedProducts.map((p, idx) => ({
        sl: idx + 1,
        ...p
      }));
    }

    const totalStock = preparedProducts.reduce((s, p) => s + p.stock, 0);
    const totalCentralStock = preparedProducts.reduce((s, p) => s + p.central_stock, 0);
    const totalBranchStock = preparedProducts.reduce((s, p) => s + p.branch_stock, 0);
    const totalCostValue = preparedProducts.reduce((s, p) => s + p.total_cost, 0);
    const totalMrpValue = preparedProducts.reduce((s, p) => s + p.total_mrp, 0);

    return {
      reportType: rType,
      valueType: vType,
      storeFilter,
      rows,
      totals: {
        total_products: preparedProducts.length,
        total_stock: totalStock,
        total_central_stock: totalCentralStock,
        total_branch_stock: totalBranchStock,
        total_cost_value: totalCostValue,
        total_mrp_value: totalMrpValue
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
    setSelectedStore('ALL');
    setReportType('Stock Report Details');
    setValueType('Default');
    setReportData(null);
    setTableSearch('');
    toast.success('Filters reset');
  };

  // Main Report Fetch & Execution Logic
  const handleShowReport = () => {
    setLoading(true);
    try {
      const computed = computeReportOutput(
        reportType, 
        valueType, 
        selectedStore, 
        rawProducts, 
        storeStocks, 
        stores, 
        vendors, 
        categories, 
        subcategories, 
        subSubcategories
      );
      setReportData(computed);

      if (!computed || computed.rows.length === 0) {
        toast('No matching stock records found.', { icon: 'ℹ️' });
      } else {
        toast.success(`Generated ${computed.rows.length} stock rows`);
      }
    } catch (err) {
      console.error('Error generating stock report:', err);
      toast.error('Failed to generate stock report');
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

  // Standardized PDF Export (Landscape with Signatures)
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
    doc.text(reportData.reportType.toUpperCase(), pageWidth - 14, 14, { align: 'right' });

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

    const storeLabel = selectedStore === 'ALL' ? 'All (All Stores & Warehouse)' : selectedStore === 'CENTRAL_STORE' ? 'Central Store (Warehouse)' : (stores.find(s => s.id === selectedStore)?.name || selectedStore);
    doc.text(`Report Type: ${reportData.reportType}`, 14, 30);
    doc.text(`Store Scope: ${storeLabel} | Filter: ${reportData.valueType}`, 14, 35);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

    // 4. Build Table
    let head = [];
    let body = [];

    if (reportData.reportType.includes('Summary')) {
      head = [['SL', 'Group Name', 'Items Count', 'Central Stock', 'Branch Stock', 'Total Stock', 'Cost Value (TP)', 'MRP Value']];
      displayedRows.forEach((r, idx) => {
        body.push([
          idx + 1,
          r.group_title,
          r.total_items,
          r.central_stock,
          r.branch_stock,
          r.stock,
          Number(r.total_cost).toFixed(2),
          Number(r.total_mrp).toFixed(2)
        ]);
      });
      // Total Row
      body.push([
        'Total',
        `${reportData.rows.length} Summary Groups`,
        reportData.totals.total_products,
        reportData.totals.total_central_stock,
        reportData.totals.total_branch_stock,
        reportData.totals.total_stock,
        Number(reportData.totals.total_cost_value).toFixed(2),
        Number(reportData.totals.total_mrp_value).toFixed(2)
      ]);
    } else if (reportData.reportType === 'Store wise Stock Report') {
      head = [['SL', 'Store Name', 'Active Items', 'Stock Qty', 'Total Cost (TP)', 'Total MRP Value']];
      displayedRows.forEach((r, idx) => {
        body.push([
          idx + 1,
          r.store_name,
          r.total_items,
          r.stock,
          Number(r.total_cost).toFixed(2),
          Number(r.total_mrp).toFixed(2)
        ]);
      });
      body.push([
        'Total',
        `${reportData.rows.length} Stores`,
        reportData.totals.total_products,
        reportData.totals.total_stock,
        Number(reportData.totals.total_cost_value).toFixed(2),
        Number(reportData.totals.total_mrp_value).toFixed(2)
      ]);
    } else {
      head = [['SL', 'Barcode', 'Item Name', 'Category', 'Vendor', 'Central Stock', 'Branch Stock', 'Total Stock', 'Cost Price', 'MRP', 'Cost Value', 'MRP Value']];
      displayedRows.forEach((r, idx) => {
        body.push([
          idx + 1,
          r.barcode,
          r.item_name,
          r.category,
          r.vendor,
          r.central_stock,
          r.branch_stock,
          r.stock,
          Number(r.cost_price).toFixed(2),
          Number(r.mrp).toFixed(2),
          Number(r.total_cost).toFixed(2),
          Number(r.total_mrp).toFixed(2)
        ]);
      });
      body.push([
        'Total',
        '',
        `${reportData.rows.length} Items Listed`,
        '',
        '',
        reportData.totals.total_central_stock,
        reportData.totals.total_branch_stock,
        reportData.totals.total_stock,
        '',
        '',
        Number(reportData.totals.total_cost_value).toFixed(2),
        Number(reportData.totals.total_mrp_value).toFixed(2)
      ]);
    }

    autoTable(doc, {
      head: head,
      body: body,
      startY: 40,
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

    // 5. Signatures Block (Image 2)
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

    doc.save(`Current_Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF Downloaded");
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || reportData.rows.length === 0) {
      toast.error("Please click 'Show' first to generate report");
      return;
    }

    let exportData = [];

    if (reportData.reportType.includes('Summary')) {
      exportData = reportData.rows.map((r, idx) => ({
        'SL': idx + 1,
        'Group Name': r.group_title,
        'Items Count': r.total_items,
        'Central Store Stock': r.central_stock,
        'Branch Store Stock': r.branch_stock,
        'Total Stock Qty': r.stock,
        'Total Cost Value (TP)': Number(r.total_cost).toFixed(2),
        'Total MRP Value': Number(r.total_mrp).toFixed(2)
      }));

      exportData.push({
        'SL': 'Total',
        'Group Name': `${reportData.rows.length} Summary Groups`,
        'Items Count': reportData.totals.total_products,
        'Central Store Stock': reportData.totals.total_central_stock,
        'Branch Store Stock': reportData.totals.total_branch_stock,
        'Total Stock Qty': reportData.totals.total_stock,
        'Total Cost Value (TP)': Number(reportData.totals.total_cost_value).toFixed(2),
        'Total MRP Value': Number(reportData.totals.total_mrp_value).toFixed(2)
      });
    } else if (reportData.reportType === 'Store wise Stock Report') {
      exportData = reportData.rows.map((r, idx) => ({
        'SL': idx + 1,
        'Store Name': r.store_name,
        'Active Items': r.total_items,
        'Stock Qty': r.stock,
        'Total Cost (TP)': Number(r.total_cost).toFixed(2),
        'Total MRP Value': Number(r.total_mrp).toFixed(2)
      }));

      exportData.push({
        'SL': 'Total',
        'Store Name': `${reportData.rows.length} Stores`,
        'Active Items': reportData.totals.total_products,
        'Stock Qty': reportData.totals.total_stock,
        'Total Cost (TP)': Number(reportData.totals.total_cost_value).toFixed(2),
        'Total MRP Value': Number(reportData.totals.total_mrp_value).toFixed(2)
      });
    } else {
      exportData = reportData.rows.map((r, idx) => ({
        'SL': idx + 1,
        'Barcode': r.barcode,
        'Item Name': r.item_name,
        'Category': r.category,
        'Sub Category': r.sub_category,
        'Sub Subcategory': r.sub_subcategory,
        'Vendor': r.vendor,
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
        'Sub Subcategory': '',
        'Vendor': '',
        'Central Store Stock': reportData.totals.total_central_stock,
        'Branch Store Stock': reportData.totals.total_branch_stock,
        'Total Current Stock': reportData.totals.total_stock,
        'Cost Price (TP)': '',
        'Sale Price (MRP)': '',
        'Total Cost Value (TP)': Number(reportData.totals.total_cost_value).toFixed(2),
        'Total MRP Value': Number(reportData.totals.total_mrp_value).toFixed(2)
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Current Stock");
    XLSX.writeFile(wb, `Current_Stock_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel Downloaded");
  };

  const reportTypeList = [
    'Stock Report Details',
    'Vendorwise Stock Report 1 Details',
    'Vendorwise Stock Report 2 Details',
    'Vendorwise Stock Report Group By Barcode',
    'Vendorwise Stock Report Summary',
    'Category wise Stock Report Summary',
    'Sub Category wise Stock Report Summary',
    'Sub Subcategory wise Stock Report Summary',
    'Sub Subcategory wise Stock Report Details',
    'Barcode wise Stock Report With Vendor',
    'Barcode wise Stock Report Without Vendor',
    'Reference wise Stock Report',
    'Store wise Stock Report'
  ];

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Top Header Title */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '18px' }}>
        Current Stock Report
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
        
        {/* Store Dropdown Row */}
        <div style={{ maxWidth: '480px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '12.5px', color: '#334155', fontWeight: 600 }}>Store</label>
            <select 
              value={selectedStore} 
              onChange={e => setSelectedStore(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px',
                fontSize: '12.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                backgroundColor: '#fff',
                color: '#1e293b',
                outline: 'none'
              }}
            >
              <option value="ALL">All Stores & Central Store (Warehouse)</option>
              <option value="CENTRAL_STORE">Central Store (Warehouse Only)</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Report Type Vertical List (13 Options from Screenshot) */}
        <div style={{ marginBottom: '22px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
            Report Type
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reportTypeList.map(type => (
              <label 
                key={type} 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  color: reportType === type ? '#2e6f40' : 'var(--text-primary)',
                  fontWeight: reportType === type ? 600 : 400
                }}
              >
                <input 
                  type="radio" 
                  name="stockReportTypeRadio"
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

        {/* Value Type Horizontal Section (Default, Without Zero, Only Zero, Negative Stock) */}
        <div style={{ marginBottom: '22px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
            Value Type
          </h4>
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
            {['Default', 'Without Zero', 'Only Zero', 'Negative Stock'].map(type => (
              <label 
                key={type} 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  color: valueType === type ? '#2e6f40' : 'var(--text-primary)',
                  fontWeight: valueType === type ? 600 : 400
                }}
              >
                <input 
                  type="radio" 
                  name="stockValueTypeRadio"
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
              <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase' }}>Products Cataloged</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0c4a6e', marginTop: '4px' }}>
                {reportData.totals.total_products}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.78rem', color: '#065f46', fontWeight: 600, textTransform: 'uppercase' }}>Central Store (WH)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#047857', marginTop: '4px' }}>
                {reportData.totals.total_central_stock} Units
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
              <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Branch Stores Stock</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#14532d', marginTop: '4px' }}>
                {reportData.totals.total_branch_stock} Units
              </div>
            </div>

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
                  {reportData.reportType.includes('Summary') ? (
                    // Summary Columns
                    <>
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 10px' }}>Group / Category Name</th>
                      {reportData.reportType.includes('Sub') && <th style={{ padding: '10px 10px' }}>Parent</th>}
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>Items Count</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Central Stock (WH)</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Branch Stock</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Total Stock</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Cost Value (TP)</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>MRP Value</th>
                    </>
                  ) : reportData.reportType === 'Store wise Stock Report' ? (
                    // Store wise Columns
                    <>
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 10px' }}>Store Name</th>
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>Active Items</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Current Stock Qty</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Total Cost (TP)</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right' }}>Total MRP Value</th>
                    </>
                  ) : (
                    // Detail Columns
                    <>
                      <th style={{ padding: '10px 8px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '10px 8px' }}>Barcode</th>
                      <th style={{ padding: '10px 8px' }}>Item Name</th>
                      <th style={{ padding: '10px 8px' }}>Category</th>
                      {!reportData.reportType.includes('Without Vendor') && <th style={{ padding: '10px 8px' }}>Vendor</th>}
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Central WH</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Branch</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Stock</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cost (TP)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cost Val</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP Val</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
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
                      {reportData.reportType.includes('Summary') ? (
                        <>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2e6f40' }}>{r.group_title}</td>
                          {reportData.reportType.includes('Sub') && <td style={{ padding: '8px 10px' }}>{r.parent_title || '-'}</td>}
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{r.total_items}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.central_stock}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.branch_stock}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: r.stock > 0 ? '#166534' : r.stock < 0 ? '#dc2626' : '#64748b' }}>
                            {r.stock}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{Number(r.total_mrp).toFixed(2)}</td>
                        </>
                      ) : reportData.reportType === 'Store wise Stock Report' ? (
                        <>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2e6f40' }}>{r.store_name}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{r.total_items}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{r.stock}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{Number(r.total_mrp).toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '8px 8px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 8px', fontWeight: 600, color: '#2e6f40' }}>{r.barcode}</td>
                          <td style={{ padding: '8px 8px', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.item_name}>
                            {r.item_name}
                          </td>
                          <td style={{ padding: '8px 8px' }}>{r.category}</td>
                          {!reportData.reportType.includes('Without Vendor') && <td style={{ padding: '8px 8px' }}>{r.vendor}</td>}
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{r.central_stock}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right' }}>{r.branch_stock}</td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: r.stock > 0 ? '#166534' : r.stock < 0 ? '#dc2626' : '#64748b' }}>
                            {r.stock}
                          </td>
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
                    {reportData.reportType.includes('Summary') ? (
                      <>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>Total</td>
                        <td colSpan={reportData.reportType.includes('Sub') ? 2 : 1} style={{ padding: '10px 10px' }}>{reportData.rows.length} Summary Groups</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>{reportData.totals.total_products}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>{reportData.totals.total_central_stock}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>{reportData.totals.total_branch_stock}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost_value).toFixed(2)}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_mrp_value).toFixed(2)}</td>
                      </>
                    ) : reportData.reportType === 'Store wise Stock Report' ? (
                      <>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>Total</td>
                        <td style={{ padding: '10px 10px' }}>{reportData.rows.length} Stores</td>
                        <td style={{ padding: '10px 10px', textAlign: 'center' }}>{reportData.totals.total_products}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost_value).toFixed(2)}</td>
                        <td style={{ padding: '10px 10px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_mrp_value).toFixed(2)}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>Total</td>
                        <td colSpan={!reportData.reportType.includes('Without Vendor') ? 4 : 3} style={{ padding: '10px 8px' }}>{reportData.rows.length} Products</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_central_stock}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_branch_stock}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_stock}</td>
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

export default CurrentStockReport;
