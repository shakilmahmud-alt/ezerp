import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  RotateCcw, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../../../components/CustomSelect';

const ItemwisePurchaseReturnReport = () => {
  const { user } = useAuth();

  // Helper for today's date (YYYY-MM-DD)
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Filter States (Matching Screenshot Layout)
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

  // Report Type (4 Options matching Screenshot)
  const [reportType, setReportType] = useState('Details');
  const reportTypeOptions = ['Details', 'Summary', 'Shop Wise Details', 'Shop Wise Summary'];

  // 2. Dropdown Master Data Lists
  const [storesList, setStoresList] = useState([]);
  const [storeTypesList, setStoreTypesList] = useState(['ALL', 'Central Store', 'Store', 'Retail', 'Warehouse', 'Branch', 'Franchise']);
  const [vendorsList, setVendorsList] = useState([]);
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
      const [storesRes, vendorsRes, brandsRes, catsRes, subcatsRes, subSubcatsRes, pmRes, prodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, code, name, contact_no, vendor_type').order('name'),
        supabase.from('brands').select('id, name, code').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id').order('name'),
        supabase.from('sub_subcategories').select('id, name, category_name, subcategory_name').order('name'),
        supabase.from('payment_methods').select('id, name, code').order('name'),
        supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, category_id, subcategory_id, brand_id, vendor_id, country_of_origin, purchase_price, mrp, category:category_id(name), subcategory:subcategory_id(name), brand:brand_id(name)')
      ]);

      const fetchedStores = storesRes.data || [];
      setStoresList(fetchedStores);
      setVendorsList(vendorsRes.data || []);
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
      console.error('Error loading master data:', err);
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
    setCurrentPage(1);
    toast.success('Filters reloaded to default');
  };

  // Main Handle Show: Query and aggregate data
  const handleShowReport = async () => {
    setLoading(true);
    setTableSearch('');
    setCurrentPage(1);

    try {
      // 1. Query purchase_returns within Date Range
      let prQuery = supabase
        .from('purchase_returns')
        .select('*')
        .order('return_date', { ascending: false });

      if (fromDate) prQuery = prQuery.gte('return_date', fromDate);
      if (toDate) prQuery = prQuery.lte('return_date', toDate);
      if (selectedVendor !== 'ALL') prQuery = prQuery.eq('vendor_id', selectedVendor);

      const { data: prData, error: prErr } = await prQuery;
      if (prErr) throw prErr;

      let returns = prData || [];

      // Filter by Store
      if (selectedStore !== 'ALL') {
        returns = returns.filter(r => r.store_id === selectedStore || (r.store_name || '').toLowerCase().includes(selectedStore.toLowerCase()));
      }

      // Filter by Store Type
      if (storeType !== 'ALL') {
        returns = returns.filter(r => {
          if (storeType === 'Central Store') {
            return !r.store_name || r.store_name === 'Central Store' || r.store_name.toLowerCase().includes('central');
          }
          const sObj = storesList.find(s => s.id === r.store_id || s.name === r.store_name);
          return sObj?.shop_type?.toLowerCase() === storeType.toLowerCase();
        });
      }

      // Filter by Payment Method
      if (paymentMethod !== 'ALL') {
        returns = returns.filter(r => {
          const pm = (r.payment_method || r.payment_type || '').toLowerCase();
          return pm.includes(paymentMethod.toLowerCase());
        });
      }

      if (returns.length === 0) {
        setReportData({
          reportType,
          fromDate,
          toDate,
          storeType,
          selectedStore,
          selectedVendor,
          rows: [],
          totals: {
            total_challans: 0,
            total_items: 0,
            total_rtn_qty: 0,
            total_cost_value: 0,
            total_sale_value: 0
          }
        });
        toast('No purchase return records found for the selected criteria');
        setLoading(false);
        return;
      }

      // 2. Query purchase_return_items
      const returnIds = returns.map(r => r.id);
      const { data: itemsData, error: itemsErr } = await supabase
        .from('purchase_return_items')
        .select('*')
        .in('purchase_return_id', returnIds);

      if (itemsErr) throw itemsErr;

      const itemsByReturnId = new Map();
      (itemsData || []).forEach(item => {
        if (!itemsByReturnId.has(item.purchase_return_id)) {
          itemsByReturnId.set(item.purchase_return_id, []);
        }
        itemsByReturnId.get(item.purchase_return_id).push(item);
      });

      // 3. Assemble and Filter Item Level Data
      let rawRows = [];
      let totalRtnQty = 0;
      let totalCostVal = 0;
      let totalSaleVal = 0;

      returns.forEach(ret => {
        const vObj = vendorsList.find(v => v.id === ret.vendor_id);
        const vendorName = vObj?.name || 'Vendor';
        const storeDisplayName = ret.store_name || 'Central Store';
        const items = itemsByReturnId.get(ret.id) || [];

        items.forEach(it => {
          const prod = productsMap.get(it.product_id) || productsMap.get(String(it.product_id));
          const barcode = prod?.barcode || prod?.user_define_barcode || it.barcode || '-';
          const code = prod?.code || '-';
          const itemName = prod?.item_name || it.product_name || 'Item';
          const categoryName = prod?.category?.name || '-';
          const subcategoryName = prod?.subcategory?.name || '-';
          const brandName = prod?.brand?.name || '-';

          // Filters on Product attributes
          if (selectedBrand !== 'ALL' && prod?.brand_id !== selectedBrand) return;
          if (selectedCategory !== 'ALL' && prod?.category_id !== selectedCategory) return;
          if (selectedSubCategory !== 'ALL' && prod?.subcategory_id !== selectedSubCategory) return;

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
            const coo = (prod?.country_of_origin || '').toLowerCase();
            if (!coo.includes(countryOfOriginInput.trim().toLowerCase())) return;
          }

          const qty = Number(it.return_qty || 0);
          const cpu = Number(it.cost_price || prod?.purchase_price || 0);
          const mrp = Number(it.sale_price || prod?.mrp || 0);
          const costVal = it.line_amount ? Number(it.line_amount) : (qty * cpu);
          const saleVal = qty * mrp;

          totalRtnQty += qty;
          totalCostVal += costVal;
          totalSaleVal += saleVal;

          rawRows.push({
            id: it.id,
            return_id: ret.id,
            product_id: it.product_id,
            challan_no: ret.challan_no || '-',
            return_date: ret.return_date || (ret.created_at || '').slice(0, 10),
            store_name: storeDisplayName,
            vendor_name: vendorName,
            reference_no: ret.reference_no || '-',
            barcode: barcode,
            item_code: code,
            product_name: itemName,
            category: categoryName,
            subcategory: subcategoryName,
            brand: brandName,
            cpu: cpu,
            mrp: mrp,
            return_qty: qty,
            cost_value: costVal,
            sale_value: saleVal,
            reason: it.return_reason || '-'
          });
        });
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
              mrp: r.mrp,
              return_qty: 0,
              cost_value: 0,
              sale_value: 0
            });
          }
          const grp = itemMap.get(key);
          grp.return_qty += r.return_qty;
          grp.cost_value += r.cost_value;
          grp.sale_value += r.sale_value;
        });
        finalRows = Array.from(itemMap.values());
      } else if (reportType === 'Shop Wise Summary') {
        // Group by Store
        const shopMap = new Map();
        rawRows.forEach(r => {
          const key = r.store_name || 'Central Store';
          if (!shopMap.has(key)) {
            shopMap.set(key, {
              store_name: key,
              challans: new Set(),
              items: new Set(),
              return_qty: 0,
              cost_value: 0,
              sale_value: 0
            });
          }
          const grp = shopMap.get(key);
          grp.challans.add(r.challan_no);
          grp.items.add(r.product_id || r.barcode);
          grp.return_qty += r.return_qty;
          grp.cost_value += r.cost_value;
          grp.sale_value += r.sale_value;
        });
        finalRows = Array.from(shopMap.values()).map(g => ({
          store_name: g.store_name,
          total_challans: g.challans.size,
          total_items: g.items.size,
          return_qty: g.return_qty,
          cost_value: g.cost_value,
          sale_value: g.sale_value
        }));
      } else if (reportType === 'Shop Wise Details') {
        // Sort by store name then date
        finalRows = [...rawRows].sort((a, b) => (a.store_name || '').localeCompare(b.store_name || ''));
      } else {
        // Details
        finalRows = rawRows;
      }

      setReportData({
        reportType,
        fromDate,
        toDate,
        storeType,
        selectedStore,
        selectedVendor,
        rows: finalRows,
        totals: {
          total_items: rawRows.length,
          total_rtn_qty: totalRtnQty,
          total_cost_value: totalCostVal,
          total_sale_value: totalSaleVal
        }
      });

      toast.success(`Itemwise Purchase Return Report generated (${finalRows.length} records)`);
    } catch (err) {
      console.error('Error generating Itemwise Purchase Return Report:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtered rows based on Table Search
  const displayedRows = useMemo(() => {
    if (!reportData?.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;
    const q = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(r => {
      return (
        (r.challan_no || '').toLowerCase().includes(q) ||
        (r.store_name || '').toLowerCase().includes(q) ||
        (r.vendor_name || '').toLowerCase().includes(q) ||
        (r.barcode || '').toLowerCase().includes(q) ||
        (r.item_code || '').toLowerCase().includes(q) ||
        (r.product_name || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q) ||
        (r.brand || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
      );
    });
  }, [reportData, tableSearch]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return displayedRows.slice(start, start + rowsPerPage);
  }, [displayedRows, currentPage]);

  const totalPages = Math.ceil(displayedRows.length / rowsPerPage) || 1;

  // Export Excel
  const handleExportExcel = () => {
    if (!reportData || !displayedRows.length) {
      toast.error('No report data to export');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      let exportRows = [];

      if (reportData.reportType === 'Shop Wise Summary') {
        exportRows = displayedRows.map((r, idx) => ({
          'SL': idx + 1,
          'Store / Branch': r.store_name,
          'Total Challans': r.total_challans,
          'Total Items': r.total_items,
          'Total Rtn Qty': r.return_qty,
          'Total Cost Value (Tk)': r.cost_value.toFixed(2),
          'Total Sale Value (Tk)': r.sale_value.toFixed(2)
        }));
        exportRows.push({
          'SL': '',
          'Store / Branch': 'TOTAL SUMMARY',
          'Total Challans': '',
          'Total Items': reportData.totals.total_items,
          'Total Rtn Qty': reportData.totals.total_rtn_qty,
          'Total Cost Value (Tk)': reportData.totals.total_cost_value.toFixed(2),
          'Total Sale Value (Tk)': reportData.totals.total_sale_value.toFixed(2)
        });
      } else if (reportData.reportType === 'Summary') {
        exportRows = displayedRows.map((r, idx) => ({
          'SL': idx + 1,
          'Barcode': r.barcode,
          'Item Code': r.item_code,
          'Product Name': r.product_name,
          'Category': r.category,
          'Brand': r.brand,
          'CPU (Tk)': r.cpu.toFixed(2),
          'MRP (Tk)': r.mrp.toFixed(2),
          'Total Rtn Qty': r.return_qty,
          'Total Cost Value (Tk)': r.cost_value.toFixed(2),
          'Total Sale Value (Tk)': r.sale_value.toFixed(2)
        }));
        exportRows.push({
          'SL': '',
          'Barcode': 'TOTAL SUMMARY',
          'Item Code': '',
          'Product Name': `${displayedRows.length} Items`,
          'Category': '',
          'Brand': '',
          'CPU (Tk)': '',
          'MRP (Tk)': '',
          'Total Rtn Qty': reportData.totals.total_rtn_qty,
          'Total Cost Value (Tk)': reportData.totals.total_cost_value.toFixed(2),
          'Total Sale Value (Tk)': reportData.totals.total_sale_value.toFixed(2)
        });
      } else if (reportData.reportType === 'Shop Wise Details') {
        exportRows = displayedRows.map((r, idx) => ({
          'SL': idx + 1,
          'Store / Branch': r.store_name,
          'Challan No': r.challan_no,
          'Return Date': r.return_date,
          'Vendor': r.vendor_name,
          'Barcode': r.barcode,
          'Product Name': r.product_name,
          'Category': r.category,
          'CPU (Tk)': r.cpu.toFixed(2),
          'MRP (Tk)': r.mrp.toFixed(2),
          'Rtn Qty': r.return_qty,
          'Cost Value (Tk)': r.cost_value.toFixed(2),
          'Sale Value (Tk)': r.sale_value.toFixed(2),
          'Reason': r.reason
        }));
        exportRows.push({
          'SL': '',
          'Store / Branch': 'TOTAL SUMMARY',
          'Challan No': '',
          'Return Date': '',
          'Vendor': '',
          'Barcode': '',
          'Product Name': `${reportData.totals.total_items} Items`,
          'Category': '',
          'CPU (Tk)': '',
          'MRP (Tk)': '',
          'Rtn Qty': reportData.totals.total_rtn_qty,
          'Cost Value (Tk)': reportData.totals.total_cost_value.toFixed(2),
          'Sale Value (Tk)': reportData.totals.total_sale_value.toFixed(2),
          'Reason': ''
        });
      } else {
        exportRows = displayedRows.map((r, idx) => ({
          'SL': idx + 1,
          'Challan No': r.challan_no,
          'Return Date': r.return_date,
          'Store': r.store_name,
          'Vendor': r.vendor_name,
          'Barcode': r.barcode,
          'Product Name': r.product_name,
          'Category': r.category,
          'CPU (Tk)': r.cpu.toFixed(2),
          'MRP (Tk)': r.mrp.toFixed(2),
          'Rtn Qty': r.return_qty,
          'Cost Value (Tk)': r.cost_value.toFixed(2),
          'Sale Value (Tk)': r.sale_value.toFixed(2),
          'Reason': r.reason
        }));
        exportRows.push({
          'SL': '',
          'Challan No': 'TOTAL SUMMARY',
          'Return Date': '',
          'Store': '',
          'Vendor': '',
          'Barcode': '',
          'Product Name': `${reportData.totals.total_items} Items`,
          'Category': '',
          'CPU (Tk)': '',
          'MRP (Tk)': '',
          'Rtn Qty': reportData.totals.total_rtn_qty,
          'Cost Value (Tk)': reportData.totals.total_cost_value.toFixed(2),
          'Sale Value (Tk)': reportData.totals.total_sale_value.toFixed(2),
          'Reason': ''
        });
      }

      const ws = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Itemwise Purchase Return');
      XLSX.writeFile(wb, `Itemwise_Purchase_Return_Report_${reportData.fromDate}_to_${reportData.toDate}.xlsx`);
      toast.success('Excel downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel');
    }
  };

  // Export PDF (Matching MIS Standard Format)
  const handleExportPDF = () => {
    if (!reportData || !displayedRows.length) {
      toast.error('No report data to export');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Top Green Banner (#2e6f40)
      doc.setFillColor(46, 111, 64);
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("EZ ERP MANAGEMENT INFORMATION SYSTEM (MIS)", 14, 11);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.text(`ITEMWISE PURCHASE RETURN REPORT (${reportData.reportType.toUpperCase()})`, 14, 17.5);

      const printDateStr = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      const loggedInUser = JSON.parse(localStorage.getItem('erp_user') || '{}');
      const rawUser = loggedInUser?.user_metadata?.full_name || 
        loggedInUser?.user_metadata?.name || 
        loggedInUser?.full_name || 
        loggedInUser?.name || 
        loggedInUser?.username || 
        user?.username || 
        user?.name || 
        'Super Admin';
      const preparedByName = (rawUser === 'msmraqeeb@gmail.com' || rawUser === 'admin@email.com') ? 'Super Admin' : rawUser;

      doc.setFontSize(8);
      doc.text(`Generated: ${printDateStr}`, pageWidth - 14, 11, { align: 'right' });
      doc.text(`User: ${preparedByName}`, pageWidth - 14, 17.5, { align: 'right' });

      // 2. Filter Criteria Subheader
      const vendorName = selectedVendor !== 'ALL' ? (vendorsList.find(v => v.id === selectedVendor)?.name || 'Selected Vendor') : 'ALL';
      const storeName = selectedStore !== 'ALL' ? (storesList.find(s => s.id === selectedStore)?.name || 'Selected Store') : 'ALL';
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`Date Range: ${reportData.fromDate} to ${reportData.toDate}   |   Report Type: ${reportData.reportType}   |   Store Type: ${reportData.storeType}   |   Store: ${storeName}   |   Vendor: ${vendorName}`, 14, 30);

      let headers = [];
      let body = [];

      if (reportData.reportType === 'Shop Wise Summary') {
        headers = [['SL', 'Store / Branch Name', 'Total Challans', 'Total Items', 'Total Return Qty', 'Total Cost Value (Tk)', 'Total Sale Value (Tk)']];
        body = displayedRows.map((r, idx) => [
          idx + 1,
          r.store_name,
          r.total_challans,
          r.total_items,
          r.return_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2)
        ]);
        body.push([
          '', 'TOTAL SUMMARY', '', reportData.totals.total_items, reportData.totals.total_rtn_qty,
          reportData.totals.total_cost_value.toFixed(2),
          reportData.totals.total_sale_value.toFixed(2)
        ]);
      } else if (reportData.reportType === 'Summary') {
        headers = [['SL', 'Barcode', 'Item Code', 'Product Name', 'Category', 'Brand', 'CPU (Tk)', 'MRP (Tk)', 'Total Rtn Qty', 'Total Cost Value (Tk)', 'Total Sale Value (Tk)']];
        body = displayedRows.map((r, idx) => [
          idx + 1,
          r.barcode,
          r.item_code,
          r.product_name,
          r.category,
          r.brand,
          r.cpu.toFixed(2),
          r.mrp.toFixed(2),
          r.return_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2)
        ]);
        body.push([
          '', 'TOTAL SUMMARY', '', `${displayedRows.length} Items`, '', '', '', '',
          reportData.totals.total_rtn_qty,
          reportData.totals.total_cost_value.toFixed(2),
          reportData.totals.total_sale_value.toFixed(2)
        ]);
      } else if (reportData.reportType === 'Shop Wise Details') {
        headers = [['SL', 'Store / Branch', 'Challan No', 'Date', 'Vendor', 'Barcode', 'Product Name', 'Category', 'CPU (Tk)', 'MRP (Tk)', 'Rtn Qty', 'Cost Val (Tk)', 'Sale Val (Tk)', 'Reason']];
        body = displayedRows.map((r, idx) => [
          idx + 1,
          r.store_name,
          r.challan_no,
          r.return_date,
          r.vendor_name,
          r.barcode,
          r.product_name,
          r.category,
          r.cpu.toFixed(2),
          r.mrp.toFixed(2),
          r.return_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2),
          r.reason
        ]);
        body.push([
          '', 'TOTAL SUMMARY', '', '', '', '', `${reportData.totals.total_items} Items`, '', '', '',
          reportData.totals.total_rtn_qty,
          reportData.totals.total_cost_value.toFixed(2),
          reportData.totals.total_sale_value.toFixed(2),
          ''
        ]);
      } else {
        headers = [['SL', 'Challan No', 'Date', 'Store', 'Vendor', 'Barcode', 'Product Name', 'Category', 'CPU (Tk)', 'MRP (Tk)', 'Rtn Qty', 'Cost Val (Tk)', 'Sale Val (Tk)', 'Reason']];
        body = displayedRows.map((r, idx) => [
          idx + 1,
          r.challan_no,
          r.return_date,
          r.store_name,
          r.vendor_name,
          r.barcode,
          r.product_name,
          r.category,
          r.cpu.toFixed(2),
          r.mrp.toFixed(2),
          r.return_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2),
          r.reason
        ]);
        body.push([
          '', 'TOTAL SUMMARY', '', '', '', '', `${reportData.totals.total_items} Items`, '', '', '',
          reportData.totals.total_rtn_qty,
          reportData.totals.total_cost_value.toFixed(2),
          reportData.totals.total_sale_value.toFixed(2),
          ''
        ]);
      }

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 36,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 30, 30] },
        headStyles: { fillColor: [46, 111, 64], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        didParseCell: function (data) {
          if (data.row.index === body.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 245, 240];
            data.cell.styles.textColor = [10, 60, 20];
          }
        },
        margin: { top: 10, left: 14, right: 14 }
      });

      // 4. Signatures
      const finalY = doc.lastAutoTable.finalY || 160;
      const sigY = Math.max(finalY + 24, pageHeight - 20);

      doc.setDrawColor(160, 174, 192);
      doc.setLineWidth(0.4);

      // Posted By (Left)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(preparedByName, 47.5, sigY - 2.5, { align: 'center' });
      doc.line(20, sigY, 75, sigY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Posted By', 47.5, sigY + 5, { align: 'center' });

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

      doc.save(`Itemwise_Purchase_Return_Report_${reportData.fromDate}_to_${reportData.toDate}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* 1. Header Title */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
          Itemwise Purchase Return Report
        </h1>
      </div>

      {/* 2. Filter Box (Exact 2-Column Grid Matching Screenshot) */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '14px 28px', marginBottom: '20px' }}>
          
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
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 3: Payment Method & Vendor */}
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
              Vendor
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={selectedVendor}
                onChange={(e) => { setSelectedVendor(e.target.value); setReportData(null); }}
              >
                <option value="ALL">ALL</option>
                {vendorsList.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 4: Brand & Category */}
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

          {/* Row 5: Sub Category & Sub Subcategory */}
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

          {/* Row 6: Item Name & Country of Origin */}
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

          {/* Row 7: Barcode */}
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

        </div>

        {/* Report Type (4 Round Green Radio Options matching Screenshot) */}
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
                    color: isSelected ? '#166534' : '#334155',
                    userSelect: 'none'
                  }}
                >
                  {/* Round Green Radio Bullet matching Image */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid #2e6f40' : '1.5px solid #94a3b8',
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
            
            {/* Show Button (.btn-theme Emerald Green Glossy) */}
            <button
              onClick={handleShowReport}
              disabled={loading}
              className="btn-theme"
              style={{
                padding: '6px 22px',
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

            {/* Reload Button (Glossy Aero Ruby Red .btn-danger) */}
            <button
              onClick={handleReload}
              disabled={loading}
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
              <RotateCcw size={14} />
              Reload
            </button>

            {/* Download PDF Button (.btn-theme Emerald Green Glossy) */}
            {reportData && (
              <>
                <button
                  onClick={handleExportPDF}
                  className="btn-theme"
                  style={{
                    padding: '6px 18px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={14} />
                  Download PDF
                </button>

                {/* Download Excel Button (White background with green outline) */}
                <button
                  onClick={handleExportExcel}
                  style={{
                    padding: '6px 18px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #16a34a',
                    color: '#16a34a',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                >
                  <FileSpreadsheet size={14} />
                  Download Excel
                </button>
              </>
            )}

          </div>
        </div>

      </div>

      {/* 3. Output Report Results Area */}
      {reportData && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>

          {/* Results Header Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '16px'
          }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                Itemwise Purchase Return ({reportData.reportType})
              </h2>
              <div style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                Date Range: <strong>{reportData.fromDate}</strong> to <strong>{reportData.toDate}</strong> | Store: <strong>{reportData.selectedStore !== 'ALL' ? (storesList.find(s => s.id === reportData.selectedStore)?.name || 'Store') : 'All Stores'}</strong> | Vendor: <strong>{reportData.selectedVendor !== 'ALL' ? (vendorsList.find(v => v.id === reportData.selectedVendor)?.name || 'Vendor') : 'All Vendors'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              
              {/* Search Inside Results */}
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text"
                  placeholder="Search in table..."
                  value={tableSearch}
                  onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                  style={{
                    padding: '6px 12px 6px 30px',
                    fontSize: '12.5px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    width: '220px'
                  }}
                />
              </div>

              {/* Print / PDF Button (.btn-theme Emerald Green Glossy) */}
              <button
                onClick={handleExportPDF}
                className="btn-theme"
                style={{
                  padding: '6px 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <Printer size={14} />
                Print / PDF
              </button>

            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#2e6f40', color: '#fff', borderBottom: '2px solid #1e4b2b' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '40px' }}>SL</th>
                  {reportType === 'Shop Wise Summary' ? (
                    <>
                      <th style={{ padding: '8px 10px' }}>Store / Branch Name</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Challans</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Items</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Return Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Cost Value (Tk)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Sale Value (Tk)</th>
                    </>
                  ) : reportType === 'Summary' ? (
                    <>
                      <th style={{ padding: '8px 10px' }}>Barcode</th>
                      <th style={{ padding: '8px 10px' }}>Item Code</th>
                      <th style={{ padding: '8px 10px' }}>Product Name</th>
                      <th style={{ padding: '8px 10px' }}>Category</th>
                      <th style={{ padding: '8px 10px' }}>Brand</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>CPU (Tk)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>MRP (Tk)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Rtn Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Cost Value (Tk)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Sale Value (Tk)</th>
                    </>
                  ) : reportType === 'Shop Wise Details' ? (
                    <>
                      <th style={{ padding: '8px 10px' }}>Store / Branch</th>
                      <th style={{ padding: '8px 10px' }}>Challan No</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Date</th>
                      <th style={{ padding: '8px 10px' }}>Vendor</th>
                      <th style={{ padding: '8px 10px' }}>Barcode</th>
                      <th style={{ padding: '8px 10px' }}>Product Name</th>
                      <th style={{ padding: '8px 10px' }}>Category</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>CPU (Tk)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>MRP (Tk)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rtn Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cost Val (Tk)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sale Val (Tk)</th>
                      <th style={{ padding: '8px 10px' }}>Reason</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '8px 10px' }}>Challan No</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Date</th>
                      <th style={{ padding: '8px 10px' }}>Store</th>
                      <th style={{ padding: '8px 10px' }}>Vendor</th>
                      <th style={{ padding: '8px 10px' }}>Barcode</th>
                      <th style={{ padding: '8px 10px' }}>Product Name</th>
                      <th style={{ padding: '8px 10px' }}>Category</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>CPU (Tk)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>MRP (Tk)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Rtn Qty</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cost Val (Tk)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Sale Val (Tk)</th>
                      <th style={{ padding: '8px 10px' }}>Reason</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No records match the current filter.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((r, idx) => {
                    const rowSL = (currentPage - 1) * rowsPerPage + idx + 1;
                    return (
                      <tr 
                        key={idx}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#f8fafc'; }}
                      >
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b' }}>{rowSL}</td>
                        {reportType === 'Shop Wise Summary' ? (
                          <>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{r.store_name}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{r.total_challans}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{r.total_items}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#2e6f40' }}>{r.return_qty}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{r.cost_value.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{r.sale_value.toFixed(2)}</td>
                          </>
                        ) : reportType === 'Summary' ? (
                          <>
                            <td style={{ padding: '7px 10px' }}>{r.barcode}</td>
                            <td style={{ padding: '7px 10px' }}>{r.item_code}</td>
                            <td style={{ padding: '7px 10px', fontWeight: 500 }}>{r.product_name}</td>
                            <td style={{ padding: '7px 10px' }}>{r.category}</td>
                            <td style={{ padding: '7px 10px' }}>{r.brand}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>{r.cpu.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>{r.mrp.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#2e6f40' }}>{r.return_qty}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{r.cost_value.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{r.sale_value.toFixed(2)}</td>
                          </>
                        ) : reportType === 'Shop Wise Details' ? (
                          <>
                            <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0369a1' }}>{r.store_name}</td>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{r.challan_no}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>{r.return_date}</td>
                            <td style={{ padding: '7px 10px' }}>{r.vendor_name}</td>
                            <td style={{ padding: '7px 10px' }}>{r.barcode}</td>
                            <td style={{ padding: '7px 10px', fontWeight: 500 }}>{r.product_name}</td>
                            <td style={{ padding: '7px 10px' }}>{r.category}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>{r.cpu.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>{r.mrp.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#2e6f40' }}>{r.return_qty}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{r.cost_value.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{r.sale_value.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px' }}>{r.reason}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '7px 10px', fontWeight: 600 }}>{r.challan_no}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>{r.return_date}</td>
                            <td style={{ padding: '7px 10px' }}>{r.store_name}</td>
                            <td style={{ padding: '7px 10px' }}>{r.vendor_name}</td>
                            <td style={{ padding: '7px 10px' }}>{r.barcode}</td>
                            <td style={{ padding: '7px 10px', fontWeight: 500 }}>{r.product_name}</td>
                            <td style={{ padding: '7px 10px' }}>{r.category}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>{r.cpu.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right' }}>{r.mrp.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#2e6f40' }}>{r.return_qty}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{r.cost_value.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{r.sale_value.toFixed(2)}</td>
                            <td style={{ padding: '7px 10px' }}>{r.reason}</td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {displayedRows.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#f0f5f0', fontWeight: 'bold', color: '#0a3c14', borderTop: '2px solid #2e6f40' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}></td>
                    <td style={{ padding: '8px 10px' }}>TOTAL SUMMARY</td>
                    {reportType === 'Shop Wise Summary' ? (
                      <>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}></td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_items}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_rtn_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_cost_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_sale_value.toFixed(2)}</td>
                      </>
                    ) : reportType === 'Summary' ? (
                      <>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}>{displayedRows.length} Items</td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_rtn_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_cost_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_sale_value.toFixed(2)}</td>
                      </>
                    ) : reportType === 'Shop Wise Details' ? (
                      <>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}>{reportData.totals.total_items} Items</td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_rtn_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_cost_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_sale_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px' }}></td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}>{reportData.totals.total_items} Items</td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px' }}></td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_rtn_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_cost_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{reportData.totals.total_sale_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px' }}></td>
                      </>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, displayedRows.length)} of {displayedRows.length} entries
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    backgroundColor: currentPage === 1 ? '#f1f5f9' : '#fff',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    color: currentPage === 1 ? '#94a3b8' : '#334155'
                  }}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      backgroundColor: currentPage === page ? '#2e6f40' : '#fff',
                      color: currentPage === page ? '#fff' : '#334155',
                      fontWeight: currentPage === page ? 'bold' : 'normal',
                      cursor: 'pointer'
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#fff',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    color: currentPage === totalPages ? '#94a3b8' : '#334155'
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

export default ItemwisePurchaseReturnReport;
