import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  Printer, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../../../components/CustomSelect';

const ItemwiseDamageReport = () => {
  const { user } = useAuth();

  // Helper for today's date (YYYY-MM-DD)
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Filter States (Matching Screenshot Layout)
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');
  const [countryOfOriginInput, setCountryOfOriginInput] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('ALL');
  const [statusInput, setStatusInput] = useState('-- ALL --');

  // Report Type (Details and Summary matching Screenshot)
  const [reportType, setReportType] = useState('Details');
  const reportTypeOptions = ['Details', 'Summary'];

  // 2. Dropdown Master Data Lists
  const [storesList, setStoresList] = useState([]);
  const [storeTypesList, setStoreTypesList] = useState(['ALL', 'Central Store', 'Warehouse', 'Store', 'Retail', 'Branch', 'Franchise']);
  const [brandsList, setBrandsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [subSubcategoriesList, setSubSubcategoriesList] = useState([]);
  const [paymentMethodsList, setPaymentMethodsList] = useState(['ALL', 'Cash', 'Credit', 'Bank', 'Cheque', 'bKash', 'Nagad']);
  const [productsMap, setProductsMap] = useState(new Map());

  // 3. Output / Generated Report State (strictly null on mount; NO auto-load)
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [storesRes, brandsRes, catsRes, subcatsRes, subSubcatsRes, pmRes, prodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('brands').select('id, name, code').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id').order('name'),
        supabase.from('sub_subcategories').select('id, name, category_name, subcategory_name').order('name'),
        supabase.from('payment_methods').select('id, name, code').order('name'),
        supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, category_id, subcategory_id, brand_id, country_of_origin, purchase_price, mrp, category:category_id(name), subcategory:subcategory_id(name), brand:brand_id(name)')
      ]);

      const fetchedStores = storesRes.data || [];
      setStoresList(fetchedStores);
      setBrandsList(brandsRes.data || []);
      setCategoriesList(catsRes.data || []);
      setSubcategoriesList(subcatsRes.data || []);
      setSubSubcategoriesList(subSubcatsRes.data || []);

      if (pmRes.data && pmRes.data.length > 0) {
        setPaymentMethodsList(['ALL', ...new Set(pmRes.data.map(p => p.name).filter(Boolean))]);
      }

      const types = ['ALL', 'Central Store', ...new Set(fetchedStores.map(s => s.shop_type).filter(Boolean))];
      setStoreTypesList(types);

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
      console.error('Error loading master data in ItemwiseDamageReport:', err);
      toast.error('Failed to load filter dropdowns');
    }
  };

  // Filtered stores based on Store Type
  const availableStores = useMemo(() => {
    if (storeType === 'ALL') return storesList;
    if (storeType === 'Central Store') return storesList.filter(s => s.shop_type === 'Warehouse' || s.name?.toLowerCase().includes('central'));
    return storesList.filter(s => s.shop_type?.toLowerCase() === storeType.toLowerCase());
  }, [storesList, storeType]);

  // Filtered subcategories based on Category
  const availableSubcategories = useMemo(() => {
    if (selectedCategory === 'ALL') return subcategoriesList;
    return subcategoriesList.filter(s => s.category_id === selectedCategory);
  }, [subcategoriesList, selectedCategory]);

  // Filtered sub-subcategories based on Subcategory
  const availableSubSubcategories = useMemo(() => {
    if (selectedSubCategory === 'ALL') return subSubcategoriesList;
    const subObj = subcategoriesList.find(s => s.id === selectedSubCategory);
    if (!subObj) return subSubcategoriesList;
    return subSubcategoriesList.filter(ss => ss.subcategory_name === subObj.name || ss.subcategory_id === selectedSubCategory);
  }, [subSubcategoriesList, subcategoriesList, selectedSubCategory]);

  // Handle Reload / Reset Filter values
  const handleReload = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setStoreType('ALL');
    setSelectedStore('ALL');
    setPaymentMethod('ALL');
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setCountryOfOriginInput('ALL');
    setBarcodeInput('ALL');
    setStatusInput('-- ALL --');
    setReportType('Details');
    setReportData(null);
    setTableSearch('');
    setCurrentPage(1);
    toast.success('Filters reloaded to default');
  };

  // Main Handle Show: Query and aggregate data
  const handleShowReport = async () => {
    setLoading(true);
    setTableSearch('');
    setCurrentPage(1);

    try {
      // 1. Query damage_and_lost within Date Range
      let dmlQuery = supabase
        .from('damage_and_lost')
        .select('*')
        .order('dml_date', { ascending: false });

      if (fromDate) dmlQuery = dmlQuery.gte('dml_date', fromDate);
      if (toDate) dmlQuery = dmlQuery.lte('dml_date', toDate);

      const { data: dmlData, error: dmlErr } = await dmlQuery;
      if (dmlErr) throw dmlErr;

      let headers = dmlData || [];

      if (headers.length === 0) {
        setReportData({
          reportType,
          fromDate,
          toDate,
          storeType,
          selectedStore,
          rows: [],
          totals: {
            total_docs: 0,
            total_items: 0,
            total_qty: 0,
            total_loss_amount: 0,
            total_sale_amount: 0
          }
        });
        toast('No damage & lost records found for the selected criteria');
        setLoading(false);
        return;
      }

      // 2. Query damage_and_lost_items
      const dmlIds = headers.map(d => d.id);
      const { data: itemsData, error: itemsErr } = await supabase
        .from('damage_and_lost_items')
        .select('*')
        .in('damage_and_lost_id', dmlIds);

      if (itemsErr) throw itemsErr;

      // Also fetch matching purchase_receives for store/payment details if any
      const refNos = [...new Set(headers.map(d => d.reference_no).filter(Boolean))];
      let prMap = new Map();
      if (refNos.length > 0) {
        const { data: prData } = await supabase
          .from('purchase_receives')
          .select('id, reference_no, delivery_to, payment_method, status')
          .in('reference_no', refNos);

        (prData || []).forEach(pr => {
          if (pr.reference_no) prMap.set(pr.reference_no, pr);
        });
      }

      const itemsByDmlId = new Map();
      (itemsData || []).forEach(item => {
        if (!itemsByDmlId.has(item.damage_and_lost_id)) {
          itemsByDmlId.set(item.damage_and_lost_id, []);
        }
        itemsByDmlId.get(item.damage_and_lost_id).push(item);
      });

      // 3. Assemble and Filter Item Level Data
      let rawRows = [];
      let totalQty = 0;
      let totalLossAmount = 0;
      let totalSaleAmount = 0;

      headers.forEach(dmlHeader => {
        const pr = prMap.get(dmlHeader.reference_no) || {};
        const storeName = dmlHeader.store_name || pr.delivery_to || 'Central Store';
        const matchedStore = storesList.find(s => s.name?.toLowerCase() === storeName?.toLowerCase());
        const sType = dmlHeader.store_type || matchedStore?.shop_type || (storeName.toLowerCase().includes('central') ? 'Central Store' : 'Store');
        const dmlStatus = dmlHeader.status || pr.status || 'Saved';
        const dmlPayment = dmlHeader.payment_method || pr.payment_method || 'Cash';

        // Filter Store Type
        if (storeType !== 'ALL') {
          if (storeType === 'Central Store') {
            const isCentral = storeName.toLowerCase().includes('central') || sType.toLowerCase() === 'warehouse';
            if (!isCentral) return;
          } else {
            if (sType.toLowerCase() !== storeType.toLowerCase()) return;
          }
        }

        // Filter Store
        if (selectedStore !== 'ALL') {
          if (storeName.toLowerCase() !== selectedStore.toLowerCase()) return;
        }

        // Filter Payment Method
        if (paymentMethod !== 'ALL') {
          if (!dmlPayment.toLowerCase().includes(paymentMethod.toLowerCase())) return;
        }

        // Filter Status
        if (statusInput && statusInput !== '-- ALL --' && statusInput !== 'ALL') {
          if (dmlStatus.toLowerCase() !== statusInput.toLowerCase()) return;
        }

        const items = itemsByDmlId.get(dmlHeader.id) || [];

        if (items.length === 0) {
          // If header has no child items
          const qty = Number(dmlHeader.total_qty || 0);
          const loss = Number(dmlHeader.total_value || 0);
          totalQty += qty;
          totalLossAmount += loss;

          rawRows.push({
            id: dmlHeader.id,
            damage_and_lost_id: dmlHeader.id,
            dml_date: dmlHeader.dml_date || (dmlHeader.created_at || '').slice(0, 10),
            challan_no: `DML-${dmlHeader.id?.slice(0, 8)?.toUpperCase()}`,
            reference_no: dmlHeader.reference_no || '-',
            store_name: storeName,
            store_type: sType,
            status: dmlStatus,
            barcode: '-',
            item_code: '-',
            product_name: 'Damage/Lost Batch',
            category: '-',
            subcategory: '-',
            brand: '-',
            cpu: 0,
            sale_price: 0,
            dml_qty: qty,
            unit: 'PCS',
            loss_amount: loss,
            sale_amount: 0,
            reason: dmlHeader.reason || 'Damage/Lost'
          });
        } else {
          items.forEach(it => {
            const prod = productsMap.get(it.product_id) || productsMap.get(it.barcode) || {};
            const barcode = it.barcode || prod.barcode || prod.user_define_barcode || '-';
            const code = prod.code || '-';
            const itemName = prod.item_name || it.product_name || 'Product';
            const categoryName = prod.category?.name || '-';
            const subcategoryName = prod.subcategory?.name || '-';
            const brandName = prod.brand?.name || '-';

            // Filters on Product attributes
            if (selectedBrand !== 'ALL' && prod.brand_id !== selectedBrand) return;
            if (selectedCategory !== 'ALL' && prod.category_id !== selectedCategory) return;
            if (selectedSubCategory !== 'ALL' && prod.subcategory_id !== selectedSubCategory) return;

            // Barcode filter
            if (barcodeInput && barcodeInput.trim() !== 'ALL') {
              const bVal = barcodeInput.trim().toLowerCase();
              if (!barcode.toLowerCase().includes(bVal) && !code.toLowerCase().includes(bVal)) return;
            }

            // Item Name filter
            if (itemNameInput && itemNameInput.trim() !== 'ALL') {
              const iVal = itemNameInput.trim().toLowerCase();
              if (!itemName.toLowerCase().includes(iVal)) return;
            }

            // Country of Origin filter
            if (countryOfOriginInput && countryOfOriginInput.trim() !== 'ALL') {
              const coo = (prod.country_of_origin || '').toLowerCase();
              if (!coo.includes(countryOfOriginInput.trim().toLowerCase())) return;
            }

            const qty = Number(it.dml_qty || 0);
            const cpu = Number(it.cpu || prod.purchase_price || 0);
            const salePrice = Number(it.sale_price || prod.mrp || 0);
            const lossVal = it.amount ? Number(it.amount) : (qty * cpu);
            const saleVal = qty * salePrice;

            totalQty += qty;
            totalLossAmount += lossVal;
            totalSaleAmount += saleVal;

            rawRows.push({
              id: `${dmlHeader.id}_${it.id}`,
              damage_and_lost_id: dmlHeader.id,
              product_id: it.product_id,
              dml_date: dmlHeader.dml_date || (dmlHeader.created_at || '').slice(0, 10),
              challan_no: `DML-${dmlHeader.id?.slice(0, 8)?.toUpperCase()}`,
              reference_no: dmlHeader.reference_no || '-',
              store_name: storeName,
              store_type: sType,
              status: dmlStatus,
              barcode: barcode,
              item_code: code,
              product_name: itemName,
              category: categoryName,
              subcategory: subcategoryName,
              brand: brandName,
              cpu: cpu,
              sale_price: salePrice,
              dml_qty: qty,
              unit: 'PCS',
              loss_amount: lossVal,
              sale_amount: saleVal,
              reason: it.reason || 'Damage/Lost'
            });
          });
        }
      });

      // 4. Format based on selected Report Type
      let finalRows = [];

      if (reportType === 'Summary') {
        // Group by Barcode / Product
        const itemMap = new Map();
        rawRows.forEach(r => {
          const key = r.product_id || r.barcode;
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              barcode: r.barcode,
              item_code: r.item_code,
              product_name: r.product_name,
              category: r.category,
              brand: r.brand,
              cpu: r.cpu,
              sale_price: r.sale_price,
              dml_qty: 0,
              unit: 'PCS',
              loss_amount: 0,
              sale_amount: 0
            });
          }
          const grp = itemMap.get(key);
          grp.dml_qty += r.dml_qty;
          grp.loss_amount += r.loss_amount;
          grp.sale_amount += r.sale_amount;
        });
        finalRows = Array.from(itemMap.values());
      } else {
        // Details
        finalRows = rawRows;
      }

      const totals = {
        total_docs: new Set(rawRows.map(r => r.damage_and_lost_id)).size,
        total_items: finalRows.length,
        total_qty: totalQty,
        total_loss_amount: totalLossAmount,
        total_sale_amount: totalSaleAmount
      };

      setReportData({
        reportType,
        fromDate,
        toDate,
        storeType,
        selectedStore,
        rows: finalRows,
        totals
      });

      toast.success(`Loaded ${finalRows.length} record(s)`);
    } catch (err) {
      console.error('Error in handleShowReport:', err);
      toast.error('Failed to generate report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // Filtered rows for in-table search
  const displayedRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;

    const term = tableSearch.toLowerCase();
    return reportData.rows.filter(row => {
      return Object.values(row).some(val => 
        String(val || '').toLowerCase().includes(term)
      );
    });
  }, [reportData, tableSearch]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return displayedRows.slice(startIndex, startIndex + rowsPerPage);
  }, [displayedRows, currentPage]);

  const totalPages = Math.ceil(displayedRows.length / rowsPerPage) || 1;

  // EXCEL EXPORT
  const handleExportExcel = () => {
    if (!reportData || displayedRows.length === 0) {
      toast.error('No data available to export');
      return;
    }

    try {
      let exportData = [];

      if (reportData.reportType === 'Summary') {
        exportData = displayedRows.map((r, idx) => ({
          'SL': idx + 1,
          'Barcode': r.barcode,
          'Item Code': r.item_code,
          'Product Name': r.product_name,
          'Category': r.category,
          'Brand': r.brand,
          'CPU (Tk)': Number(r.cpu || 0).toFixed(2),
          'Sale Price (Tk)': Number(r.sale_price || 0).toFixed(2),
          'Total DML Qty': r.dml_qty,
          'Unit': 'PCS',
          'Total Loss Cost (Tk)': Number(r.loss_amount || 0).toFixed(2),
          'Total Sale Value (Tk)': Number(r.sale_amount || 0).toFixed(2)
        }));

        exportData.push({
          'SL': '',
          'Barcode': 'TOTAL SUMMARY',
          'Item Code': '',
          'Product Name': `${reportData.totals.total_items} Items`,
          'Category': '',
          'Brand': '',
          'CPU (Tk)': '',
          'Sale Price (Tk)': '',
          'Total DML Qty': reportData.totals.total_qty,
          'Unit': 'PCS',
          'Total Loss Cost (Tk)': Number(reportData.totals.total_loss_amount || 0).toFixed(2),
          'Total Sale Value (Tk)': Number(reportData.totals.total_sale_amount || 0).toFixed(2)
        });
      } else {
        exportData = displayedRows.map((r, idx) => ({
          'SL': idx + 1,
          'DML Date': r.dml_date,
          'Challan No': r.challan_no,
          'Reference No': r.reference_no,
          'Store': r.store_name,
          'Barcode': r.barcode,
          'Item Code': r.item_code,
          'Product Name': r.product_name,
          'Category': r.category,
          'Brand': r.brand,
          'CPU (Tk)': Number(r.cpu || 0).toFixed(2),
          'Sale Price (Tk)': Number(r.sale_price || 0).toFixed(2),
          'DML Qty': r.dml_qty,
          'Unit': 'PCS',
          'Loss Cost (Tk)': Number(r.loss_amount || 0).toFixed(2),
          'Sale Value (Tk)': Number(r.sale_amount || 0).toFixed(2),
          'Reason': r.reason,
          'Status': r.status
        }));

        exportData.push({
          'SL': '',
          'DML Date': 'TOTAL SUMMARY',
          'Challan No': '',
          'Reference No': '',
          'Store': '',
          'Barcode': '',
          'Item Code': '',
          'Product Name': `${reportData.totals.total_items} Items`,
          'Category': '',
          'Brand': '',
          'CPU (Tk)': '',
          'Sale Price (Tk)': '',
          'DML Qty': reportData.totals.total_qty,
          'Unit': 'PCS',
          'Loss Cost (Tk)': Number(reportData.totals.total_loss_amount || 0).toFixed(2),
          'Sale Value (Tk)': Number(reportData.totals.total_sale_amount || 0).toFixed(2),
          'Reason': '',
          'Status': ''
        });
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Itemwise Damage Report');
      XLSX.writeFile(wb, `Itemwise_Damage_Report_${fromDate}_to_${toDate}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to export Excel');
    }
  };

  // PDF EXPORT (Matching Image 2 standard)
  const handleExportPDF = () => {
    if (!reportData || displayedRows.length === 0) {
      toast.error('No data available to print');
      return;
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Header Banner (#2e6f40)
      doc.setFillColor(46, 111, 64);
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("EZ ERP MANAGEMENT INFORMATION SYSTEM (MIS)", 14, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("CENTRAL INVENTORY & POS SALES ANALYTICS", 14, 17);

      // Report Title on Right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const repTitle = `ITEM WISE DAMAGE & LOST REPORT (${reportData.reportType.toUpperCase()})`;
      doc.text(repTitle, pageWidth - 14, 14, { align: 'right' });

      // 2. Metadata Section below Banner
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);

      const storeLabel = selectedStore !== 'ALL' ? selectedStore : (storeType !== 'ALL' ? `Type: ${storeType}` : 'ALL (All Stores)');
      const catLabel = selectedCategory !== 'ALL' ? (categoriesList.find(c => c.id === selectedCategory)?.name || 'Category') : 'All Categories';
      const brandLabel = selectedBrand !== 'ALL' ? (brandsList.find(b => b.id === selectedBrand)?.name || 'Brand') : 'All Brands';

      const printDateStr = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });

      const loggedInUser = user || JSON.parse(localStorage.getItem('erp_user') || '{}');
      const rawUser = loggedInUser?.user_metadata?.full_name || 
        loggedInUser?.user_metadata?.name || 
        loggedInUser?.full_name || 
        loggedInUser?.name || 
        loggedInUser?.username || 
        'Super Admin';
      const preparedByName = (rawUser === 'msmraqeeb@gmail.com' || rawUser === 'admin@email.com') ? 'Super Admin' : rawUser;

      doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 30);
      doc.text(`Store Scope: ${storeLabel} | Category: ${catLabel} | Brand: ${brandLabel}`, 14, 35);
      doc.text(`Generated On: ${printDateStr}`, pageWidth - 14, 30, { align: 'right' });
      doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

      // 3. Table Headers & Body
      let headers = [];
      let body = [];

      if (reportData.reportType === 'Summary') {
        headers = [['SL', 'Barcode', 'Item Code', 'Item Name', 'Category', 'Brand', 'CPU (Tk)', 'Sale (Tk)', 'Total Qty', 'Unit', 'Loss Cost (Tk)', 'Sale Val (Tk)']];
        body = displayedRows.map((r, idx) => [
          idx + 1,
          r.barcode,
          r.item_code,
          r.product_name,
          r.category,
          r.brand,
          Number(r.cpu || 0).toFixed(2),
          Number(r.sale_price || 0).toFixed(2),
          r.dml_qty,
          'PCS',
          Number(r.loss_amount || 0).toFixed(2),
          Number(r.sale_amount || 0).toFixed(2)
        ]);

        body.push([
          'Total',
          `${reportData.totals.total_items} Items`,
          '',
          '',
          '',
          '',
          '',
          '',
          reportData.totals.total_qty,
          'PCS',
          Number(reportData.totals.total_loss_amount || 0).toFixed(2),
          Number(reportData.totals.total_sale_amount || 0).toFixed(2)
        ]);
      } else {
        headers = [['SL', 'Date', 'Challan No', 'Reference', 'Store', 'Barcode', 'Item Name', 'Category', 'CPU (Tk)', 'Sale (Tk)', 'Qty', 'Unit', 'Loss Cost (Tk)', 'Sale Val (Tk)', 'Reason', 'Status']];
        body = displayedRows.map((r, idx) => [
          idx + 1,
          r.dml_date,
          r.challan_no,
          r.reference_no,
          r.store_name,
          r.barcode,
          r.product_name,
          r.category,
          Number(r.cpu || 0).toFixed(2),
          Number(r.sale_price || 0).toFixed(2),
          r.dml_qty,
          'PCS',
          Number(r.loss_amount || 0).toFixed(2),
          Number(r.sale_amount || 0).toFixed(2),
          r.reason,
          r.status
        ]);

        body.push([
          'Total',
          '',
          '',
          '',
          '',
          '',
          `${reportData.totals.total_items} Items`,
          '',
          '',
          '',
          reportData.totals.total_qty,
          'PCS',
          Number(reportData.totals.total_loss_amount || 0).toFixed(2),
          Number(reportData.totals.total_sale_amount || 0).toFixed(2),
          '',
          ''
        ]);
      }

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle', textColor: [30, 30, 30] },
        headStyles: { fillColor: [46, 111, 64], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            else if (reportData.reportType === 'Summary') {
              if (data.column.index === 1 || data.column.index === 2 || data.column.index === 3 || data.column.index === 4 || data.column.index === 5) data.cell.styles.halign = 'left';
              else if (data.column.index === 9) data.cell.styles.halign = 'center';
              else data.cell.styles.halign = 'right';
            } else {
              if ([1, 2, 3, 4, 5, 6, 7, 14, 15].includes(data.column.index)) data.cell.styles.halign = 'left';
              else if (data.column.index === 11) data.cell.styles.halign = 'center';
              else data.cell.styles.halign = 'right';
            }
          } else if (data.section === 'body') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            else if (reportData.reportType === 'Summary') {
              if (data.column.index === 1 || data.column.index === 2 || data.column.index === 3 || data.column.index === 4 || data.column.index === 5) data.cell.styles.halign = 'left';
              else if (data.column.index === 9) data.cell.styles.halign = 'center';
              else data.cell.styles.halign = 'right';
            } else {
              if ([1, 2, 3, 4, 5, 6, 7, 14, 15].includes(data.column.index)) data.cell.styles.halign = 'left';
              else if (data.column.index === 11) data.cell.styles.halign = 'center';
              else data.cell.styles.halign = 'right';
            }
          }
          if (data.row.index === body.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 245, 240];
            data.cell.styles.textColor = [10, 60, 20];
          }
        },
        margin: { top: 10, left: 14, right: 14 }
      });

      // 4. Signatures at Bottom (Matching Image 2)
      const finalY = doc.lastAutoTable?.finalY || 140;
      const sigY = Math.max(finalY + 24, pageHeight - 24);

      doc.setDrawColor(160, 174, 192);
      doc.setLineWidth(0.4);

      // Prepared By (Left)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(preparedByName, 47.5, sigY - 2.5, { align: 'center' });
      doc.line(20, sigY, 75, sigY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared By', 47.5, sigY + 5, { align: 'center' });

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

      doc.save(`Itemwise_Damage_Report_${fromDate}_to_${toDate}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      {/* Page Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '700', 
          color: '#1e293b', 
          margin: 0,
          letterSpacing: '-0.01em'
        }}>
          Itemwise Damage Report
        </h1>
      </div>

      {/* Main Filter Card matching Screenshot layout */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        marginBottom: '24px'
      }}>
        
        {/* 2-Column Search Criteria Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '14px 40px',
          marginBottom: '20px'
        }}>
          
          {/* Row 1: From Date & To Date */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              From Date
            </label>
            <div style={{ flex: 1 }}>
              <input 
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setReportData(null); }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              To Date
            </label>
            <div style={{ flex: 1 }}>
              <input 
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setReportData(null); }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Row 2: Store Type & Store */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Store Type
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={storeType}
                onChange={(e) => { setStoreType(e.target.value); setSelectedStore('ALL'); setReportData(null); }}
              >
                {storeTypesList.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Store
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={selectedStore}
                onChange={(e) => { setSelectedStore(e.target.value); setReportData(null); }}
              >
                <option value="ALL">Select Store</option>
                <option value="Central Store">Central Store</option>
                {availableStores.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 3: Payment Method & Brand */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Payment Method
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={paymentMethod}
                onChange={(e) => { setPaymentMethod(e.target.value); setReportData(null); }}
              >
                {paymentMethodsList.map(pm => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Brand
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={selectedBrand}
                onChange={(e) => { setSelectedBrand(e.target.value); setReportData(null); }}
              >
                <option value="ALL">ALL</option>
                {brandsList.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 4: Category & Sub Category */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Category
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory('ALL'); setReportData(null); }}
              >
                <option value="ALL">ALL</option>
                {categoriesList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Sub Category
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={selectedSubCategory}
                onChange={(e) => { setSelectedSubCategory(e.target.value); setReportData(null); }}
              >
                <option value="ALL">ALL</option>
                {availableSubcategories.map(sc => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 5: Sub Subcategory & Item Name */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Sub Subcategory
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={selectedSubSubcategory}
                onChange={(e) => { setSelectedSubSubcategory(e.target.value); setReportData(null); }}
              >
                <option value="ALL">ALL</option>
                {availableSubSubcategories.map(ss => (
                  <option key={ss.id} value={ss.id}>{ss.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Item Name
            </label>
            <div style={{ flex: 1 }}>
              <input 
                type="text"
                value={itemNameInput}
                onChange={(e) => { setItemNameInput(e.target.value); setReportData(null); }}
                placeholder="ALL or enter Item Name..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Row 6: Country Of Origin & Barcode */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Country Of Origin
            </label>
            <div style={{ flex: 1 }}>
              <input 
                type="text"
                value={countryOfOriginInput}
                onChange={(e) => { setCountryOfOriginInput(e.target.value); setReportData(null); }}
                placeholder="ALL or enter Country..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Barcode
            </label>
            <div style={{ flex: 1 }}>
              <input 
                type="text"
                value={barcodeInput}
                onChange={(e) => { setBarcodeInput(e.target.value); setReportData(null); }}
                placeholder="ALL or enter Barcode..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Row 7: Status */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Status
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={statusInput}
                onChange={(e) => { setStatusInput(e.target.value); setReportData(null); }}
              >
                <option value="-- ALL --">-- ALL --</option>
                <option value="Saved">Saved</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
              </CustomSelect>
            </div>
          </div>

        </div>

        {/* Report Type (Round Green Radio Button matching 2nd Image) */}
        <div style={{ marginTop: '20px', marginBottom: '22px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
            Report Type
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
            {reportTypeOptions.map((option) => {
              const isSelected = reportType === option;
              return (
                <label
                  key={option}
                  onClick={() => { setReportType(option); setReportData(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    fontWeight: isSelected ? 'bold' : 500,
                    color: isSelected ? '#1e293b' : '#475569',
                    userSelect: 'none'
                  }}
                >
                  {/* Round Green Radio Bullet matching Image */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #2e6f40' : '1.5px solid #cbd5e1',
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
        </div>

        {/* Print Type / Buttons */}
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Print Type
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Show Button (Aero Sky Blue matching Image) */}
            <button
              onClick={handleShowReport}
              disabled={loading}
              className="btn-info"
              style={{
                padding: '6px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
              Show
            </button>

            {/* Reload Button (Glossy Aero Ruby Red .btn-danger matching Image) */}
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

      {/* Generated Report Output Section */}
      {reportData && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          
          {/* Top Bar: Table Search + Export Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            
            {/* Table Search */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text"
                placeholder="Search in results..."
                value={tableSearch}
                onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Export Actions (PDF & Excel) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handleExportPDF}
                className="btn-theme"
                style={{
                  padding: '6px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <Printer size={15} />
                Download PDF
              </button>

              <button
                onClick={handleExportExcel}
                className="btn-info"
                style={{
                  padding: '6px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <FileSpreadsheet size={15} />
                Export Excel
              </button>
            </div>

          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #3b8253', width: '45px' }}>SL</th>
                  {reportType === 'Summary' ? (
                    <>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Barcode</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Item Code</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Product Name</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Category</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Brand</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #3b8253' }}>CPU (Tk)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #3b8253' }}>Sale (Tk)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #3b8253' }}>Total Qty</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #3b8253' }}>Unit</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #3b8253' }}>Loss Cost (Tk)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right' }}>Sale Val (Tk)</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Date</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Challan No</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Reference</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Store</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Barcode</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Item Name</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Category</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #3b8253' }}>CPU (Tk)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #3b8253' }}>Sale (Tk)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #3b8253' }}>Qty</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', borderRight: '1px solid #3b8253' }}>Unit</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #3b8253' }}>Loss Cost (Tk)</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #3b8253' }}>Sale Val (Tk)</th>
                      <th style={{ padding: '10px 8px', borderRight: '1px solid #3b8253' }}>Reason</th>
                      <th style={{ padding: '10px 8px' }}>Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={reportType === 'Summary' ? 12 : 16} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      No records match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const rowNumber = (currentPage - 1) * rowsPerPage + idx + 1;
                    return (
                      <tr 
                        key={row.id || idx}
                        style={{ 
                          borderBottom: '1px solid #e2e8f0', 
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ecfdf5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc'; }}
                      >
                        <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0', color: '#64748b' }}>{rowNumber}</td>
                        {reportType === 'Summary' ? (
                          <>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0', fontWeight: 500 }}>{row.barcode}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0', color: '#64748b' }}>{row.item_code}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0', fontWeight: 600, color: '#1e293b' }}>{row.product_name}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{row.category}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{row.brand}</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{Number(row.cpu || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{Number(row.sale_price || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 600 }}>{row.dml_qty}</td>
                            <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0', color: '#64748b' }}>{row.unit || 'PCS'}</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 600, color: '#be123c' }}>{Number(row.loss_amount || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#047857' }}>{Number(row.sale_amount || 0).toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{row.dml_date}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0', fontWeight: 500 }}>{row.challan_no}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{row.reference_no}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{row.store_name}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{row.barcode}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0', fontWeight: 600, color: '#1e293b' }}>{row.product_name}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{row.category}</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{Number(row.cpu || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{Number(row.sale_price || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 600 }}>{row.dml_qty}</td>
                            <td style={{ padding: '8px', textAlign: 'center', borderRight: '1px solid #e2e8f0', color: '#64748b' }}>{row.unit || 'PCS'}</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 600, color: '#be123c' }}>{Number(row.loss_amount || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0', fontWeight: 600, color: '#047857' }}>{Number(row.sale_amount || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0' }}>{row.reason}</td>
                            <td style={{ padding: '8px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: row.status === 'Saved' ? '#dcfce7' : '#f1f5f9',
                                color: row.status === 'Saved' ? '#166534' : '#475569'
                              }}>
                                {row.status}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Table Footer Totals */}
              <tfoot>
                <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #bbf7d0', fontWeight: 'bold', color: '#166534' }}>
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>Total</td>
                  {reportType === 'Summary' ? (
                    <>
                      <td colSpan="2" style={{ padding: '10px 8px' }}>{reportData.totals.total_items} Items</td>
                      <td colSpan="5" style={{ padding: '10px 8px' }}></td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>PCS</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(reportData.totals.total_loss_amount || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(reportData.totals.total_sale_amount || 0).toFixed(2)}</td>
                    </>
                  ) : (
                    <>
                      <td colSpan="4" style={{ padding: '10px 8px' }}></td>
                      <td colSpan="2" style={{ padding: '10px 8px' }}>{reportData.totals.total_items} Items</td>
                      <td colSpan="3" style={{ padding: '10px 8px' }}></td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>PCS</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(reportData.totals.total_loss_amount || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>{Number(reportData.totals.total_sale_amount || 0).toFixed(2)}</td>
                      <td colSpan="2" style={{ padding: '10px 8px' }}></td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              fontSize: '12.5px',
              color: '#64748b'
            }}>
              <div>
                Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, displayedRows.length)} of {displayedRows.length} entries
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === p ? '#2e6f40' : '#ffffff',
                      color: currentPage === p ? '#ffffff' : '#334155',
                      fontWeight: currentPage === p ? 700 : 400,
                      cursor: 'pointer'
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default ItemwiseDamageReport;
