import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Printer, Search, FileSpreadsheet, 
  TrendingUp, ShoppingBag, DollarSign, Percent, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ItemwiseProfitReport = () => {
  const { user } = useAuth();

  // Date Range (default: beginning of current month/year to today)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Form Search Criteria States
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');

  // Master Data States
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [subSubcategories, setSubSubcategories] = useState([]);
  const [productsList, setProductsList] = useState([]);

  // Report Execution & UI State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [tableSearch, setTableSearch] = useState('');

  // Initial Load of master dropdowns
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [
        brandsRes,
        catsRes,
        subCatsRes,
        subSubCatsRes,
        prodsRes
      ] = await Promise.all([
        supabase.from('brands').select('id, name').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id, category_name').order('name'),
        supabase.from('sub_subcategories').select('id, name, subcategory_id, category_name, subcategory_name').order('name'),
        supabase.from('products').select(`
          id, code, barcode, user_define_barcode, item_name, 
          category_id, subcategory_id, sub_subcategory_id, brand_id, vendor_id, 
          purchase_price, mrp
        `).order('item_name')
      ]);

      setBrands(brandsRes.data || []);
      setCategories(catsRes.data || []);
      setSubcategories(subCatsRes.data || []);
      setSubSubcategories(subSubCatsRes.data || []);
      setProductsList(prodsRes.data || []);
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

  // Filtered Sub-Subcategories based on selected Subcategory
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
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setReportData(null);
    setTableSearch('');
    toast.success('Filters reset');
  };

  // Main Report Generation Logic (Fetches POS Sales and calculates Profit)
  const handleShowReport = async () => {
    setLoading(true);

    try {
      // 1. Fetch sales and sale items from POS
      const [salesRes, saleItemsRes] = await Promise.all([
        supabase.from('sales').select('id, invoice_no, store_id, store_name, created_at').order('created_at', { ascending: false }),
        supabase.from('sale_items').select('*').order('created_at', { ascending: false })
      ]);

      const salesList = salesRes.data || [];
      const saleItemsList = saleItemsRes.data || [];

      // Fast lookup maps
      const brandMap = new Map();
      brands.forEach(b => brandMap.set(b.id, b.name));

      const catMap = new Map();
      categories.forEach(c => catMap.set(c.id, c.name));

      const subCatMap = new Map();
      subcategories.forEach(s => subCatMap.set(s.id, s.name));

      const subSubCatMap = new Map();
      subSubcategories.forEach(ss => subSubCatMap.set(ss.id, ss.name));

      const productMap = new Map();
      productsList.forEach(p => {
        if (p.id) productMap.set(p.id, p);
        if (p.barcode) productMap.set(String(p.barcode).trim(), p);
        if (p.user_define_barcode) productMap.set(String(p.user_define_barcode).trim(), p);
        if (p.code) productMap.set(String(p.code).trim(), p);
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

      // Aggregate sale items by Product (Barcode)
      const itemMap = new Map();

      saleItemsList.forEach(item => {
        const sale = salesById.get(item.sale_id) || salesById.get(item.invoice_no);
        if (!sale && !salesById.has(item.sale_id)) return;

        // Resolve product
        const p = productMap.get(item.product_id) || productMap.get(item.barcode) || productMap.get(item.user_barcode);
        const barcodeVal = item.user_barcode || item.barcode || p?.user_define_barcode || p?.barcode || p?.code || '-';
        const itemName = item.product_name || p?.item_name || 'Item';
        const brandName = brandMap.get(p?.brand_id) || '-';
        const catName = catMap.get(p?.category_id) || '-';
        const subCatName = subCatMap.get(p?.subcategory_id) || '-';
        const subSubCatName = subSubCatMap.get(p?.sub_subcategory_id) || '-';

        // Apply Search Filters
        if (selectedBrand !== 'ALL' && brandName.toLowerCase() !== selectedBrand.toLowerCase()) return;
        if (selectedCategory !== 'ALL' && catName.toLowerCase() !== selectedCategory.toLowerCase()) return;
        if (selectedSubCategory !== 'ALL' && subCatName.toLowerCase() !== selectedSubCategory.toLowerCase()) return;
        if (selectedSubSubcategory !== 'ALL' && subSubCatName.toLowerCase() !== selectedSubSubcategory.toLowerCase()) return;
        if (itemNameInput !== 'ALL' && itemNameInput.trim()) {
          const q = itemNameInput.trim().toLowerCase();
          const matchName = itemName.toLowerCase().includes(q);
          const matchBarcode = String(barcodeVal).toLowerCase().includes(q);
          if (!matchName && !matchBarcode) return;
        }

        const qty = Number(item.qty || 1);
        const costPrice = Number(p?.purchase_price || 0);
        const mrp = Number(p?.mrp || item.unit_price || 0);
        const unitPrice = Number(item.unit_price || mrp);
        const discAmt = Number(item.discount_amount || 0);

        // Net sale value for this line item (gross - discount)
        const netSaleVal = Number(item.total_value) > 0 ? Number(item.total_value) : (qty * unitPrice - discAmt);
        const costVal = qty * costPrice;

        const key = String(barcodeVal).trim();
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            barcode: barcodeVal,
            item_name: itemName,
            category: catName,
            sub_category: subCatName,
            sub_subcategory: subSubCatName,
            brand: brandName,
            cost_price: costPrice,
            mrp: mrp,
            sold_qty: 0,
            total_cost: 0,
            total_net_sale: 0,
            invoices_count: 0
          });
        }

        const curr = itemMap.get(key);
        curr.sold_qty += qty;
        curr.total_cost += costVal;
        curr.total_net_sale += netSaleVal;
        curr.invoices_count += 1;
      });

      // Calculate profit and margin percentages per product
      const rows = Array.from(itemMap.values()).map((r, idx) => {
        const profit = r.total_net_sale - r.total_cost;
        const profitPctTp = r.total_cost > 0 ? ((profit / r.total_cost) * 100) : 0;
        const profitPctMrp = r.total_net_sale > 0 ? ((profit / r.total_net_sale) * 100) : 0;

        return {
          sl: idx + 1,
          ...r,
          profit,
          profit_pct_tp: profitPctTp,
          profit_pct_mrp: profitPctMrp
        };
      });

      // Compute Overall Totals
      const totalItems = rows.length;
      const totalQty = rows.reduce((s, r) => s + r.sold_qty, 0);
      const totalCost = rows.reduce((s, r) => s + r.total_cost, 0);
      const totalSale = rows.reduce((s, r) => s + r.total_net_sale, 0);
      const totalProfit = totalSale - totalCost;
      const overallProfitPctTp = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;
      const overallProfitPctMrp = totalSale > 0 ? ((totalProfit / totalSale) * 100) : 0;

      const result = {
        rows,
        totals: {
          total_items: totalItems,
          total_qty: totalQty,
          total_cost: totalCost,
          total_net_sale: totalSale,
          total_profit: totalProfit,
          overall_profit_pct_tp: overallProfitPctTp,
          overall_profit_pct_mrp: overallProfitPctMrp
        }
      };

      setReportData(result);

      if (rows.length === 0) {
        toast('No sales records match the selected filters.', { icon: 'ℹ️' });
      } else {
        toast.success(`Loaded ${rows.length} product records`);
      }
    } catch (err) {
      console.error('Error generating profit report:', err);
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

    // 2. Top Right Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(46, 111, 64);
    doc.text("ITEMWISE PROFIT REPORT", pageWidth - 14, 13, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(`Period: ${fromDate} to ${toDate}`, pageWidth - 14, 18.5, { align: 'right' });
    doc.text(`Source: POS Sales`, pageWidth - 14, 23, { align: 'right' });

    // 3. Top Left Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text("Brand:", 14, 18.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedBrand}`, 38, 18.5);

    doc.setFont("helvetica", "bold");
    doc.text("Category:", 14, 23);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedCategory}`, 38, 23);

    doc.setFont("helvetica", "bold");
    doc.text("Sub Category:", 14, 27.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedSubCategory}`, 38, 27.5);

    // 4. Build Table
    const head = [[
      'SL', 'Barcode', 'Item Name', 'Category', 'Brand', 
      'Qty', 'Cost (TP)', 'MRP', 'Total Cost', 'Net Sale', 
      'Profit (৳)', 'Profit % (TP)', 'Profit % (MRP)'
    ]];

    const body = [];
    displayedRows.forEach((r, idx) => {
      body.push([
        idx + 1,
        r.barcode,
        r.item_name,
        r.category,
        r.brand,
        r.sold_qty,
        Number(r.cost_price).toFixed(2),
        Number(r.mrp).toFixed(2),
        Number(r.total_cost).toFixed(2),
        Number(r.total_net_sale).toFixed(2),
        Number(r.profit).toFixed(2),
        `${Number(r.profit_pct_tp).toFixed(2)}%`,
        `${Number(r.profit_pct_mrp).toFixed(2)}%`
      ]);
    });

    // Total Row
    body.push([
      'Total',
      '',
      `${reportData.rows.length} Items Sold`,
      '',
      '',
      reportData.totals.total_qty,
      '',
      '',
      Number(reportData.totals.total_cost).toFixed(2),
      Number(reportData.totals.total_net_sale).toFixed(2),
      Number(reportData.totals.total_profit).toFixed(2),
      `${Number(reportData.totals.overall_profit_pct_tp).toFixed(2)}%`,
      `${Number(reportData.totals.overall_profit_pct_mrp).toFixed(2)}%`
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
        1: { halign: 'left', cellWidth: 24 },
        2: { halign: 'left' },
        3: { halign: 'left', cellWidth: 22 },
        4: { halign: 'left', cellWidth: 20 },
        5: { halign: 'right', cellWidth: 14 },
        6: { halign: 'right', cellWidth: 18 },
        7: { halign: 'right', cellWidth: 18 },
        8: { halign: 'right', cellWidth: 22 },
        9: { halign: 'right', cellWidth: 22 },
        10: { halign: 'right', cellWidth: 22 },
        11: { halign: 'right', cellWidth: 20 },
        12: { halign: 'right', cellWidth: 20 }
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

    doc.save(`Itemwise_Profit_Report_${fromDate}_to_${toDate}.pdf`);
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
      'Sold Quantity': r.sold_qty,
      'Cost Price (TP)': Number(r.cost_price).toFixed(2),
      'Sale Price (MRP)': Number(r.mrp).toFixed(2),
      'Total Cost (৳)': Number(r.total_cost).toFixed(2),
      'Total Net Sale (৳)': Number(r.total_net_sale).toFixed(2),
      'Profit (৳)': Number(r.profit).toFixed(2),
      'Profit % (TP)': `${Number(r.profit_pct_tp).toFixed(2)}%`,
      'Profit % (MRP)': `${Number(r.profit_pct_mrp).toFixed(2)}%`
    }));

    // Add Summary Row at the bottom of Excel
    exportData.push({
      'SL': 'Total',
      'Barcode': '',
      'Item Name': `${reportData.rows.length} Items Sold`,
      'Category': '',
      'Sub Category': '',
      'Sub Subcategory': '',
      'Brand': '',
      'Sold Quantity': reportData.totals.total_qty,
      'Cost Price (TP)': '',
      'Sale Price (MRP)': '',
      'Total Cost (৳)': Number(reportData.totals.total_cost).toFixed(2),
      'Total Net Sale (৳)': Number(reportData.totals.total_net_sale).toFixed(2),
      'Profit (৳)': Number(reportData.totals.total_profit).toFixed(2),
      'Profit % (TP)': `${Number(reportData.totals.overall_profit_pct_tp).toFixed(2)}%`,
      'Profit % (MRP)': `${Number(reportData.totals.overall_profit_pct_mrp).toFixed(2)}%`
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Itemwise Profit");
    XLSX.writeFile(wb, `Itemwise_Profit_Report_${fromDate}_to_${toDate}.xlsx`);
    toast.success("Excel Downloaded");
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Top Header Title */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '18px' }}>
        Itemwise Profit Report By Search Criteria
      </h2>

      {/* Main Filter Panel - Exact 2 Column Inline Grid */}
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

            {/* Brand */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center' }}>
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

          </div>
        </div>

        {/* Action Buttons Section - Windows 7 Aero Style Matching Project Standard */}
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
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
        }}>
          
          {/* Summary KPI Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            
            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
              <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Items Sold</div>
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
              <div style={{ fontSize: '0.78rem', color: '#854d0e', fontWeight: 600, textTransform: 'uppercase' }}>Total Cost (TP)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#713f12', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_cost).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f5f3ff', border: '1px solid #ede9fe' }}>
              <div style={{ fontSize: '0.78rem', color: '#5b21b6', fontWeight: 600, textTransform: 'uppercase' }}>Total Net Sale</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4c1d95', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_net_sale).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: reportData.totals.total_profit >= 0 ? '#ecfdf5' : '#fef2f2', border: reportData.totals.total_profit >= 0 ? '1px solid #a7f3d0' : '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.78rem', color: reportData.totals.total_profit >= 0 ? '#065f46' : '#991b1b', fontWeight: 600, textTransform: 'uppercase' }}>Total Profit</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: reportData.totals.total_profit >= 0 ? '#047857' : '#b91c1c', marginTop: '4px' }}>
                ৳ {Number(reportData.totals.total_profit).toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fdf4ff', border: '1px solid #fae8ff' }}>
              <div style={{ fontSize: '0.78rem', color: '#86198f', fontWeight: 600, textTransform: 'uppercase' }}>Profit % (TP)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#701a75', marginTop: '4px' }}>
                {Number(reportData.totals.overall_profit_pct_tp).toFixed(2)}%
              </div>
            </div>

          </div>

          {/* Quick Table Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Itemwise Profit Analysis ({displayedRows.length} Items)
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
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Sold Qty</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cost Price (TP)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>MRP</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total Cost</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Net Sale</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Profit (৳)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Profit % (TP)</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Profit % (MRP)</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
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
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{r.sold_qty}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.cost_price).toFixed(2)}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.mrp).toFixed(2)}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right' }}>{Number(r.total_cost).toFixed(2)}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{Number(r.total_net_sale).toFixed(2)}</td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: r.profit >= 0 ? '#166534' : '#dc2626' }}>
                        {Number(r.profit).toFixed(2)}
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>
                        {Number(r.profit_pct_tp).toFixed(2)}%
                      </td>
                      <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600, color: '#854d0e' }}>
                        {Number(r.profit_pct_mrp).toFixed(2)}%
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
                    <td colSpan={5} style={{ padding: '10px 8px' }}>{reportData.rows.length} Items Sold</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                    <td style={{ padding: '10px 8px' }}></td>
                    <td style={{ padding: '10px 8px' }}></td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_cost).toFixed(2)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>৳ {Number(reportData.totals.total_net_sale).toFixed(2)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: reportData.totals.total_profit >= 0 ? '#166534' : '#dc2626' }}>
                      ৳ {Number(reportData.totals.total_profit).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#0284c7' }}>
                      {Number(reportData.totals.overall_profit_pct_tp).toFixed(2)}%
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#854d0e' }}>
                      {Number(reportData.totals.overall_profit_pct_mrp).toFixed(2)}%
                    </td>
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

export default ItemwiseProfitReport;
