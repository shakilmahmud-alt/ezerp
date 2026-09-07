import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  Calendar, Layers, Package, DollarSign, Store, Tag, ShoppingCart, Truck,
  FileText, CheckCircle2, Clock, Building2, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../../../components/CustomSelect';

const ItemWiseDeliveryReport = () => {
  const { user } = useAuth();

  // Helper for today's date (YYYY-MM-DD)
  const getTodayDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 1. Search Criteria Form States (Matching Screenshot Exactly)
  // Left Column:
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [fromStoreType, setFromStoreType] = useState('ALL');
  const [toStoreType, setToStoreType] = useState('ALL');
  const [deliveryStatus, setDeliveryStatus] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');

  // Right Column:
  const [toDate, setToDate] = useState(getTodayDate());
  const [deliveryFromStore, setDeliveryFromStore] = useState('ALL');
  const [deliveryToStore, setDeliveryToStore] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('ALL');

  // Report Types (6 options matching screenshot):
  // 1. Details
  // 2. Summary
  // 3. Shop Wise Details
  // 4. Shop Wise Summary
  // 5. Month Wise Details
  // 6. Month Wise Summary
  const [reportType, setReportType] = useState('Details');
  const reportTypeOptions = [
    'Details',
    'Summary',
    'Shop Wise Details',
    'Shop Wise Summary',
    'Month Wise Details',
    'Month Wise Summary'
  ];

  // 2. Master Data Lists
  const [storesList, setStoresList] = useState([]);
  const [storeTypesList, setStoreTypesList] = useState(['ALL', 'Store', 'Retail', 'Warehouse', 'Branch', 'Franchise']);
  const [vendorsList, setVendorsList] = useState([]);
  const [brandsList, setBrandsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [subSubcategoriesList, setSubSubcategoriesList] = useState([]);
  const [productsMap, setProductsMap] = useState(new Map());

  // 3. Output / Generated Report State (strictly null on mount, only populates on Show click)
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  // Initial Load of Master Dropdowns
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [storesRes, vendorsRes, brandsRes, catsRes, subcatsRes, subSubcatsRes, prodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type, is_central').order('name'),
        supabase.from('vendors').select('id, code, name').order('name'),
        supabase.from('brands').select('id, name, code').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id').order('name'),
        supabase.from('sub_subcategories').select('id, name, category_name, subcategory_name').order('name'),
        supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, category_id, subcategory_id, brand_id, vendor_id, country_of_origin, purchase_price, mrp, category:category_id(name), brand:brand_id(name), vendor:vendor_id(name)')
      ]);

      const fetchedStores = storesRes.data || [];
      setStoresList(fetchedStores);

      const types = ['ALL', ...new Set(fetchedStores.map(s => s.shop_type).filter(Boolean))];
      if (types.length > 1) {
        setStoreTypesList(types);
      }

      setVendorsList(vendorsRes.data || []);
      setBrandsList(brandsRes.data || []);
      setCategoriesList(catsRes.data || []);
      setSubcategoriesList(subcatsRes.data || []);
      setSubSubcategoriesList(subSubcatsRes.data || []);

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
      console.error('Error loading master data in ItemWiseDeliveryReport:', err);
      toast.error('Failed to load filter dropdowns');
    }
  };

  // Filtered dropdowns based on selections
  const availableFromStores = useMemo(() => {
    if (fromStoreType === 'ALL') return storesList;
    return storesList.filter(s => s.shop_type?.toLowerCase() === fromStoreType.toLowerCase());
  }, [storesList, fromStoreType]);

  const availableToStores = useMemo(() => {
    if (toStoreType === 'ALL') return storesList;
    return storesList.filter(s => s.shop_type?.toLowerCase() === toStoreType.toLowerCase());
  }, [storesList, toStoreType]);

  const availableSubcategories = useMemo(() => {
    if (selectedCategory === 'ALL') return subcategoriesList;
    return subcategoriesList.filter(s => s.category_id === selectedCategory);
  }, [subcategoriesList, selectedCategory]);

  const availableSubSubcategories = useMemo(() => {
    if (selectedSubCategory === 'ALL') return subSubcategoriesList;
    const subObj = subcategoriesList.find(s => s.id === selectedSubCategory);
    if (!subObj) return subSubcategoriesList;
    return subSubcategoriesList.filter(ss => ss.subcategory_name === subObj.name || ss.subcategory_id === selectedSubCategory);
  }, [subSubcategoriesList, subcategoriesList, selectedSubCategory]);

  // Main Show Button Click: Calculate and set report data
  const handleShowReport = async () => {
    setLoading(true);
    setTableSearch('');
    setCurrentPage(1);

    try {
      // 1. Query delivery / requisition records within date range
      let reqQuery = supabase
        .from('requisitions')
        .select('*')
        .gte('requisition_date', fromDate)
        .lte('requisition_date', toDate)
        .order('requisition_date', { ascending: false });

      if (deliveryToStore !== 'ALL') {
        reqQuery = reqQuery.eq('shop_id', deliveryToStore);
      }

      const { data: reqData, error: reqErr } = await reqQuery;
      if (reqErr) console.warn("requisitions query note:", reqErr);

      // Query store_requisitions for cross-compatibility
      let sReqQuery = supabase
        .from('store_requisitions')
        .select('*')
        .gte('requisition_date', fromDate)
        .lte('requisition_date', toDate)
        .order('requisition_date', { ascending: false });

      if (deliveryToStore !== 'ALL') {
        sReqQuery = sReqQuery.eq('shop_id', deliveryToStore);
      }

      const { data: sReqData, error: sReqErr } = await sReqQuery;
      if (sReqErr) console.warn("store_requisitions query note:", sReqErr);

      // Merge and deduplicate delivery headers
      const deliveryMap = new Map();

      (reqData || []).forEach(r => {
        const challan = r.challan_no || r.requisition_no;
        if (!challan) return;

        const storeObj = storesList.find(s => s.id === r.shop_id || s.name?.toLowerCase() === r.shop_name?.toLowerCase());
        let effectiveStatus = r.status || 'Delivered';
        if (effectiveStatus === 'Receive Challan') effectiveStatus = 'Received';

        const key = challan;
        if (!deliveryMap.has(key)) {
          deliveryMap.set(key, {
            id: r.id,
            challan_no: challan,
            ref_no: r.requisition_no || r.challan_no || '-',
            requisition_date: (r.requisition_date || r.created_at || '').slice(0, 10),
            delivery_from: 'Central Store',
            from_shop_type: 'Warehouse',
            delivery_to_id: r.shop_id,
            delivery_to_name: r.shop_name || storeObj?.name || 'Store',
            to_shop_type: storeObj?.shop_type || 'Store',
            status: effectiveStatus,
            source: 'requisitions',
            fallback_id: r.id
          });
        } else {
          const existing = deliveryMap.get(key);
          if (effectiveStatus === 'Received') {
            existing.status = 'Received';
          }
          if (r.requisition_no && r.requisition_no.startsWith('REQ')) {
            existing.ref_no = r.requisition_no;
          }
        }
      });

      (sReqData || []).forEach(r => {
        if (!r.requisition_no) return;
        const challan = r.requisition_no;
        const storeObj = storesList.find(s => s.id === r.shop_id || s.name?.toLowerCase() === r.shop_name?.toLowerCase());
        let effectiveStatus = r.status || 'Approved';
        if (effectiveStatus === 'Receive Challan') effectiveStatus = 'Received';

        if (deliveryMap.has(challan)) {
          const existing = deliveryMap.get(challan);
          existing.store_req_id = r.id;
          if (effectiveStatus === 'Received') existing.status = 'Received';
        } else if (r.status === 'Approved' || r.status === 'Delivered' || r.status === 'Received') {
          deliveryMap.set(challan, {
            id: r.id,
            challan_no: challan,
            ref_no: r.requisition_no,
            requisition_date: (r.requisition_date || r.created_at || '').slice(0, 10),
            delivery_from: 'Central Store',
            from_shop_type: 'Warehouse',
            delivery_to_id: r.shop_id,
            delivery_to_name: r.shop_name || storeObj?.name || 'Store',
            to_shop_type: storeObj?.shop_type || 'Store',
            status: effectiveStatus,
            source: 'store_requisitions',
            store_req_id: r.id
          });
        }
      });

      let allDeliveries = Array.from(deliveryMap.values());

      // Filter strictly by Date Range
      allDeliveries = allDeliveries.filter(d => {
        const dateStr = d.requisition_date;
        if (fromDate && dateStr && dateStr < fromDate) return false;
        if (toDate && dateStr && dateStr > toDate) return false;
        return true;
      });

      // Filter by From Store Type
      if (fromStoreType !== 'ALL') {
        allDeliveries = allDeliveries.filter(d => {
          return d.from_shop_type?.toLowerCase() === fromStoreType.toLowerCase() ||
                 (fromStoreType === 'Warehouse' && d.delivery_from === 'Central Store');
        });
      }

      // Filter by To Store Type
      if (toStoreType !== 'ALL') {
        allDeliveries = allDeliveries.filter(d => {
          return d.to_shop_type?.toLowerCase() === toStoreType.toLowerCase();
        });
      }

      // Filter by Delivery From Store
      if (deliveryFromStore !== 'ALL') {
        allDeliveries = allDeliveries.filter(d => {
          return d.delivery_from?.toLowerCase().includes(deliveryFromStore.toLowerCase());
        });
      }

      // Filter by Delivery To Store
      if (deliveryToStore !== 'ALL') {
        allDeliveries = allDeliveries.filter(d => {
          return d.delivery_to_id === deliveryToStore || d.delivery_to_name?.toLowerCase() === deliveryToStore.toLowerCase();
        });
      }

      // Filter by Delivery Status
      if (deliveryStatus !== 'ALL') {
        allDeliveries = allDeliveries.filter(d => {
          return (d.status || '').toLowerCase() === deliveryStatus.toLowerCase();
        });
      }

      if (allDeliveries.length === 0) {
        setReportData({
          reportType,
          fromDate,
          toDate,
          fromStoreType,
          toStoreType,
          deliveryFromStore,
          deliveryToStore,
          rows: [],
          totals: {
            total_deliveries: 0,
            total_items: 0,
            total_del_qty: 0,
            total_cost_value: 0,
            total_sale_value: 0
          }
        });
        toast('No delivery records found for the selected criteria');
        setLoading(false);
        return;
      }

      // 2. Fetch line items for deliveries
      const reqIds = allDeliveries.map(d => d.fallback_id || (d.source === 'requisitions' ? d.id : null)).filter(Boolean);
      const storeReqIds = allDeliveries.map(d => d.store_req_id || (d.source === 'store_requisitions' ? d.id : null)).filter(Boolean);

      let reqItems = [];
      let storeReqItems = [];

      if (reqIds.length > 0) {
        const { data: riData } = await supabase
          .from('requisition_items')
          .select('*')
          .in('requisition_id', reqIds);
        if (riData) reqItems = riData;
      }

      if (storeReqIds.length > 0) {
        const { data: sriData } = await supabase
          .from('store_requisition_items')
          .select('*')
          .in('requisition_id', storeReqIds);
        if (sriData) storeReqItems = sriData;
      }

      // Map line items by parent ID
      const reqItemsMap = new Map();
      reqItems.forEach(item => {
        if (!reqItemsMap.has(item.requisition_id)) reqItemsMap.set(item.requisition_id, []);
        reqItemsMap.get(item.requisition_id).push(item);
      });

      const storeReqItemsMap = new Map();
      storeReqItems.forEach(item => {
        if (!storeReqItemsMap.has(item.requisition_id)) storeReqItemsMap.set(item.requisition_id, []);
        storeReqItemsMap.get(item.requisition_id).push(item);
      });

      // Assemble item-level records
      let detailedRows = [];

      allDeliveries.forEach((del) => {
        let items = [];
        if (del.fallback_id && reqItemsMap.has(del.fallback_id)) {
          items = reqItemsMap.get(del.fallback_id);
        } else if (del.store_req_id && storeReqItemsMap.has(del.store_req_id)) {
          items = storeReqItemsMap.get(del.store_req_id);
        } else if (reqItemsMap.has(del.id)) {
          items = reqItemsMap.get(del.id);
        } else if (storeReqItemsMap.has(del.id)) {
          items = storeReqItemsMap.get(del.id);
        }

        items.forEach((item, itemIdx) => {
          const barcode = item.barcode || item.product_code || '';
          const pInfo = productsMap.get(barcode) || (item.product_id ? productsMap.get(item.product_id) : null);

          const itemName = item.product_name || pInfo?.item_name || 'Delivery Item';
          const code = item.product_code || pInfo?.code || barcode;
          const categoryId = pInfo?.category_id;
          const categoryName = item.category || pInfo?.category?.name || 'General';
          const subcategoryId = pInfo?.subcategory_id;
          const brandId = pInfo?.brand_id;
          const brandName = pInfo?.brand?.name || 'General';
          const vendorId = pInfo?.vendor_id;
          const vendorName = pInfo?.vendor?.name || 'General Vendor';

          const cpu = Number(item.cpu || pInfo?.purchase_price || 0);
          const mrp = Number(item.mrp || pInfo?.mrp || 0);
          const delQty = Number(
            item.approve_qty !== undefined && item.approve_qty !== null ? item.approve_qty :
            item.app_qty !== undefined && item.app_qty !== null ? item.app_qty :
            item.del_qty !== undefined && item.del_qty !== null ? item.del_qty :
            (item.req_qty || 0)
          );
          const costVal = Number(item.cost_value || (cpu * delQty));
          const saleVal = mrp * delQty;

          // Format Month e.g. "Sep 2026"
          let monthStr = '';
          if (del.requisition_date) {
            const dt = new Date(del.requisition_date);
            if (!isNaN(dt.getTime())) {
              monthStr = dt.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            }
          }

          detailedRows.push({
            id: `${del.id}-${item.id || itemIdx}`,
            challan_no: del.challan_no,
            ref_no: del.ref_no,
            date: del.requisition_date,
            month: monthStr,
            delivery_from: del.delivery_from,
            delivery_to: del.delivery_to_name,
            delivery_to_id: del.delivery_to_id,
            barcode: barcode || '-',
            code: code || '-',
            item_name: itemName,
            category_id: categoryId,
            category: categoryName,
            subcategory_id: subcategoryId,
            brand_id: brandId,
            brand: brandName,
            vendor_id: vendorId,
            vendor: vendorName,
            cpu: cpu,
            mrp: mrp,
            del_qty: delQty,
            cost_value: costVal,
            sale_value: saleVal,
            status: del.status
          });
        });
      });

      // Filter by Vendor
      if (selectedVendor !== 'ALL') {
        detailedRows = detailedRows.filter(r => r.vendor_id === selectedVendor || r.vendor?.toLowerCase() === selectedVendor.toLowerCase());
      }

      // Filter by Brand
      if (selectedBrand !== 'ALL') {
        detailedRows = detailedRows.filter(r => r.brand_id === selectedBrand || r.brand?.toLowerCase() === selectedBrand.toLowerCase());
      }

      // Filter by Category
      if (selectedCategory !== 'ALL') {
        detailedRows = detailedRows.filter(r => r.category_id === selectedCategory || r.category?.toLowerCase() === selectedCategory.toLowerCase());
      }

      // Filter by Sub Category
      if (selectedSubCategory !== 'ALL') {
        detailedRows = detailedRows.filter(r => r.subcategory_id === selectedSubCategory);
      }

      // Filter by Item Name input (if not 'ALL' and not empty)
      if (itemNameInput && itemNameInput !== 'ALL' && itemNameInput.trim() !== '') {
        const term = itemNameInput.trim().toLowerCase();
        detailedRows = detailedRows.filter(r => r.item_name?.toLowerCase().includes(term));
      }

      // Filter by Barcode input (if not 'ALL' and not empty)
      if (barcodeInput && barcodeInput !== 'ALL' && barcodeInput.trim() !== '') {
        const bTerm = barcodeInput.trim().toLowerCase();
        detailedRows = detailedRows.filter(r => r.barcode?.toLowerCase().includes(bTerm) || r.code?.toLowerCase().includes(bTerm));
      }

      if (detailedRows.length === 0) {
        setReportData({
          reportType,
          fromDate,
          toDate,
          fromStoreType,
          toStoreType,
          deliveryFromStore,
          deliveryToStore,
          rows: [],
          totals: {
            total_deliveries: 0,
            total_items: 0,
            total_del_qty: 0,
            total_cost_value: 0,
            total_sale_value: 0
          }
        });
        toast('No matching items found for the selected criteria');
        setLoading(false);
        return;
      }

      // 3. Format Rows according to 6 Report Types
      let finalRows = [];

      if (reportType === 'Summary') {
        // Group by Barcode / Item Code
        const itemGroups = new Map();
        detailedRows.forEach(r => {
          const key = r.barcode && r.barcode !== '-' ? r.barcode : r.code;
          if (!itemGroups.has(key)) {
            itemGroups.set(key, {
              id: key,
              barcode: r.barcode,
              code: r.code,
              item_name: r.item_name,
              category: r.category,
              brand: r.brand,
              vendor: r.vendor,
              cpu: r.cpu,
              mrp: r.mrp,
              del_qty: 0,
              cost_value: 0,
              sale_value: 0,
              delivery_count: 0
            });
          }
          const ig = itemGroups.get(key);
          ig.del_qty += r.del_qty;
          ig.cost_value += r.cost_value;
          ig.sale_value += r.sale_value;
          ig.delivery_count += 1;
        });
        finalRows = Array.from(itemGroups.values());

      } else if (reportType === 'Shop Wise Details') {
        // Sorted and Grouped by Shop / Delivery To
        finalRows = [...detailedRows].sort((a, b) => (a.delivery_to || '').localeCompare(b.delivery_to || ''));

      } else if (reportType === 'Shop Wise Summary') {
        // Group by Delivery To Shop
        const shopGroups = new Map();
        detailedRows.forEach(r => {
          const key = r.delivery_to || 'Store';
          if (!shopGroups.has(key)) {
            shopGroups.set(key, {
              id: key,
              delivery_to: key,
              challans_set: new Set(),
              total_items: 0,
              del_qty: 0,
              cost_value: 0,
              sale_value: 0
            });
          }
          const sg = shopGroups.get(key);
          sg.challans_set.add(r.challan_no);
          sg.total_items += 1;
          sg.del_qty += r.del_qty;
          sg.cost_value += r.cost_value;
          sg.sale_value += r.sale_value;
        });
        finalRows = Array.from(shopGroups.values()).map(sg => ({
          ...sg,
          total_challans: sg.challans_set.size
        }));

      } else if (reportType === 'Month Wise Details') {
        // Sorted and Grouped by Month
        finalRows = [...detailedRows].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      } else if (reportType === 'Month Wise Summary') {
        // Group by Month
        const monthGroups = new Map();
        detailedRows.forEach(r => {
          const key = r.month || 'Other';
          if (!monthGroups.has(key)) {
            monthGroups.set(key, {
              id: key,
              month: key,
              challans_set: new Set(),
              total_items: 0,
              del_qty: 0,
              cost_value: 0,
              sale_value: 0
            });
          }
          const mg = monthGroups.get(key);
          mg.challans_set.add(r.challan_no);
          mg.total_items += 1;
          mg.del_qty += r.del_qty;
          mg.cost_value += r.cost_value;
          mg.sale_value += r.sale_value;
        });
        finalRows = Array.from(monthGroups.values()).map(mg => ({
          ...mg,
          total_challans: mg.challans_set.size
        }));

      } else {
        // Details (Default)
        finalRows = detailedRows;
      }

      // Calculate totals
      const uniqueChallans = new Set(detailedRows.map(r => r.challan_no)).size;
      const totalDelQty = detailedRows.reduce((sum, r) => sum + r.del_qty, 0);
      const totalCostVal = detailedRows.reduce((sum, r) => sum + r.cost_value, 0);
      const totalSaleVal = detailedRows.reduce((sum, r) => sum + r.sale_value, 0);

      setReportData({
        reportType,
        fromDate,
        toDate,
        fromStoreType,
        toStoreType,
        deliveryFromStore,
        deliveryToStore,
        rows: finalRows,
        detailedRows: detailedRows,
        totals: {
          total_deliveries: uniqueChallans,
          total_items: detailedRows.length,
          total_del_qty: totalDelQty,
          total_cost_value: totalCostVal,
          total_sale_value: totalSaleVal
        }
      });

      toast.success(`Item Wise Delivery Report generated (${finalRows.length} records)`);
    } catch (err) {
      console.error("Error generating item wise delivery report:", err);
      toast.error('Failed to generate delivery report');
    } finally {
      setLoading(false);
    }
  };

  // Reset Filters
  const handleReload = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setFromStoreType('ALL');
    setToStoreType('ALL');
    setDeliveryFromStore('ALL');
    setDeliveryToStore('ALL');
    setDeliveryStatus('ALL');
    setSelectedVendor('ALL');
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setBarcodeInput('ALL');
    setReportType('Details');
    setTableSearch('');
    setReportData(null);
    setCurrentPage(1);
    toast.success('Filters reset. Click Show to generate fresh report.');
  };

  // Filter Table Search
  const filteredRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;

    const term = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(row => {
      return Object.values(row).some(val => 
        val !== null && val !== undefined && String(val).toLowerCase().includes(term)
      );
    });
  }, [reportData, tableSearch]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  // 4. Excel Export
  const handleExportExcel = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first by clicking Show');
      return;
    }

    try {
      let exportData = [];
      const activeReportType = reportData.reportType;

      if (activeReportType === 'Summary') {
        exportData = reportData.rows.map((r, idx) => ({
          'SL': idx + 1,
          'Barcode': r.barcode,
          'Item Code': r.code,
          'Item Name': r.item_name,
          'Category': r.category,
          'Brand': r.brand,
          'Vendor': r.vendor,
          'CPU (Tk)': r.cpu.toFixed(2),
          'MRP (Tk)': r.mrp.toFixed(2),
          'Total Del Qty': r.del_qty,
          'Total Cost Value (Tk)': r.cost_value.toFixed(2),
          'Total Sale Value (Tk)': r.sale_value.toFixed(2)
        }));
      } else if (activeReportType === 'Shop Wise Summary') {
        exportData = reportData.rows.map((r, idx) => ({
          'SL': idx + 1,
          'Delivery To Store': r.delivery_to,
          'Total Challans': r.total_challans,
          'Total Item Lines': r.total_items,
          'Total Del Qty': r.del_qty,
          'Total Cost Value (Tk)': r.cost_value.toFixed(2),
          'Total Sale Value (Tk)': r.sale_value.toFixed(2)
        }));
      } else if (activeReportType === 'Month Wise Summary') {
        exportData = reportData.rows.map((r, idx) => ({
          'SL': idx + 1,
          'Month': r.month,
          'Total Deliveries': r.total_challans,
          'Total Item Lines': r.total_items,
          'Total Del Qty': r.del_qty,
          'Total Cost Value (Tk)': r.cost_value.toFixed(2),
          'Total Sale Value (Tk)': r.sale_value.toFixed(2)
        }));
      } else {
        exportData = reportData.rows.map((r, idx) => ({
          'SL': idx + 1,
          'Challan No': r.challan_no,
          'Date': r.date,
          'Month': r.month,
          'Delivery From': r.delivery_from,
          'Delivery To': r.delivery_to,
          'Barcode': r.barcode,
          'Item Code': r.code,
          'Item Name': r.item_name,
          'Category': r.category,
          'Brand': r.brand,
          'Vendor': r.vendor,
          'CPU (Tk)': r.cpu.toFixed(2),
          'MRP (Tk)': r.mrp.toFixed(2),
          'Del Qty': r.del_qty,
          'Cost Value (Tk)': r.cost_value.toFixed(2),
          'Sale Value (Tk)': r.sale_value.toFixed(2),
          'Status': r.status
        }));
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Item Wise Delivery Report');
      XLSX.writeFile(wb, `Item_Wise_Delivery_Report_${reportData.fromDate || fromDate}_to_${reportData.toDate || toDate}.xlsx`);
      toast.success('Excel downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel');
    }
  };

  // 5. PDF Export
  const handleDownloadPDF = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      toast.error('Please generate report first by clicking Show');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Top Green Banner
      doc.setFillColor(46, 111, 64);
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("EZ ERP MANAGEMENT INFORMATION SYSTEM (MIS)", 14, 11);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.text(`ITEM WISE DELIVERY REPORT (${(reportData.reportType || reportType).toUpperCase()})`, 14, 17.5);

      const printDateStr = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      const preparedByName = (user?.username === 'msmraqeeb@gmail.com' || user?.username === 'admin@email.com') 
        ? 'Super Admin' 
        : (user?.name || user?.username || 'Executive');

      doc.setFontSize(8);
      doc.text(`Generated: ${printDateStr}`, pageWidth - 14, 11, { align: 'right' });
      doc.text(`User: ${preparedByName}`, pageWidth - 14, 17.5, { align: 'right' });

      // Filter Criteria Subheader
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      doc.text(`Date Range: ${reportData.fromDate || fromDate} to ${reportData.toDate || toDate}   |   Report Type: ${reportData.reportType}   |   From Store: ${reportData.fromStoreType || fromStoreType}   |   To Store: ${reportData.toStoreType || toStoreType}`, 14, 30);

      // AutoTable columns & rows
      let headers = [];
      let body = [];
      const activeReportType = reportData.reportType;

      if (activeReportType === 'Summary') {
        headers = [['SL', 'Barcode', 'Item Code', 'Item Name', 'Category', 'Brand', 'CPU (Tk)', 'MRP (Tk)', 'Del Qty', 'Cost Value (Tk)', 'Sale Value (Tk)']];
        body = reportData.rows.map((r, idx) => [
          idx + 1,
          r.barcode,
          r.code,
          r.item_name,
          r.category,
          r.brand,
          r.cpu.toFixed(2),
          r.mrp.toFixed(2),
          r.del_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2)
        ]);
        body.push([
          '', '', '', 'TOTAL SUMMARY', '', '', '', '',
          reportData.totals.total_del_qty,
          reportData.totals.total_cost_value.toFixed(2),
          reportData.totals.total_sale_value.toFixed(2)
        ]);
      } else if (activeReportType === 'Shop Wise Summary') {
        headers = [['SL', 'Delivery To Store', 'Total Challans', 'Total Items', 'Total Del Qty', 'Total Cost Value (Tk)', 'Total Sale Value (Tk)']];
        body = reportData.rows.map((r, idx) => [
          idx + 1,
          r.delivery_to,
          r.total_challans,
          r.total_items,
          r.del_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2)
        ]);
        body.push([
          '', 'TOTAL SUMMARY', reportData.totals.total_deliveries, reportData.totals.total_items,
          reportData.totals.total_del_qty,
          reportData.totals.total_cost_value.toFixed(2),
          reportData.totals.total_sale_value.toFixed(2)
        ]);
      } else if (activeReportType === 'Month Wise Summary') {
        headers = [['SL', 'Month', 'Total Deliveries', 'Total Items', 'Total Del Qty', 'Total Cost Value (Tk)', 'Total Sale Value (Tk)']];
        body = reportData.rows.map((r, idx) => [
          idx + 1,
          r.month,
          r.total_challans,
          r.total_items,
          r.del_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2)
        ]);
        body.push([
          '', 'TOTAL SUMMARY', reportData.totals.total_deliveries, reportData.totals.total_items,
          reportData.totals.total_del_qty,
          reportData.totals.total_cost_value.toFixed(2),
          reportData.totals.total_sale_value.toFixed(2)
        ]);
      } else {
        headers = [['SL', 'Challan No', 'Date', 'Delivery To', 'Barcode', 'Item Name', 'Category', 'CPU (Tk)', 'MRP (Tk)', 'Del Qty', 'Cost Value (Tk)', 'Sale Value (Tk)', 'Status']];
        body = reportData.rows.map((r, idx) => [
          idx + 1,
          r.challan_no,
          r.date,
          r.delivery_to,
          r.barcode,
          r.item_name,
          r.category,
          r.cpu.toFixed(2),
          r.mrp.toFixed(2),
          r.del_qty,
          r.cost_value.toFixed(2),
          r.sale_value.toFixed(2),
          r.status
        ]);
        body.push([
          '', 'TOTAL SUMMARY', '', '', '', `${reportData.totals.total_items} Items`, '', '', '',
          reportData.totals.total_del_qty,
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

      // Signatures at bottom
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

      doc.save(`Item_Wise_Delivery_Report_${reportData.fromDate || fromDate}_to_${reportData.toDate || toDate}.pdf`);
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
          Item Wise Delivery Report
        </h1>
      </div>

      {/* 2. Filter Box (Exact Matching Screenshot Layout) */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        
        {/* Top 2-Column Grid Filters (7 Rows Matching Screenshot) */}
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
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  outline: 'none'
                }}
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
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Row 2: From Store Type & Delivery From Store */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              From Store Type
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={fromStoreType}
                onChange={(e) => { setFromStoreType(e.target.value); setReportData(null); }}
              >
                {storeTypesList.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Delivery From Store
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={deliveryFromStore}
                onChange={(e) => { setDeliveryFromStore(e.target.value); setReportData(null); }}
              >
                <option value="ALL">Select Store</option>
                <option value="Central Store">Central Store</option>
                {availableFromStores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 3: To Store Type & Delivery To Store */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              To Store Type
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={toStoreType}
                onChange={(e) => { setToStoreType(e.target.value); setReportData(null); }}
              >
                {storeTypesList.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Delivery To Store
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={deliveryToStore}
                onChange={(e) => { setDeliveryToStore(e.target.value); setReportData(null); }}
              >
                <option value="ALL">Select Store</option>
                {availableToStores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 4: Delivery Status & Vendor */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Delivery Status
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={deliveryStatus}
                onChange={(e) => { setDeliveryStatus(e.target.value); setReportData(null); }}
              >
                <option value="ALL">-- ALL --</option>
                <option value="Delivered">Delivered</option>
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Cancelled">Cancelled</option>
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

          {/* Row 5: Brand & Category */}
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
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubCategory('ALL');
                  setSelectedSubSubcategory('ALL');
                  setReportData(null);
                }}
              >
                <option value="ALL">ALL</option>
                {categoriesList.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 6: Sub Category & Sub Subcategory */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Sub Category
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={selectedSubCategory}
                onChange={(e) => {
                  setSelectedSubCategory(e.target.value);
                  setSelectedSubSubcategory('ALL');
                  setReportData(null);
                }}
              >
                <option value="ALL">ALL</option>
                {availableSubcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
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

          {/* Row 7: Item Name & Barcode */}
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
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  outline: 'none'
                }}
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
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  outline: 'none'
                }}
              />
            </div>
          </div>

        </div>

        {/* Report Type (6 Horizontal Radio Options Matching Screenshot) */}
        <div style={{ marginTop: '20px', marginBottom: '22px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
            Report Type
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
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
                  {/* Round Green Radio Button matching ERP standard */}
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
            
            {/* Show Button (.btn-info Sky Blue) */}
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

            {/* Show Excel Button (.btn-info Sky Blue) */}
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

            {/* Download PDF Button (.btn-theme Emerald Green) */}
            <button
              onClick={handleDownloadPDF}
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

            {/* Reload Button (.btn-danger Ruby Red) */}
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

      {/* 3. Output Table (Strictly shown only when user clicks Show) */}
      {reportData && (
        <div style={{ marginTop: '24px' }}>
          
          {/* KPI Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '18px'
          }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                <Truck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Deliveries</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{reportData.totals.total_deliveries}</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                <Package size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Item Lines</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{reportData.totals.total_items}</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Del Qty</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{reportData.totals.total_del_qty} Pcs</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Cost Value</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>Tk {reportData.totals.total_cost_value.toFixed(2)}</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '14px 18px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7e22ce' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Total Sale Value</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#7e22ce' }}>Tk {reportData.totals.total_sale_value.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            overflow: 'hidden'
          }}>
            
            {/* Table Action Bar */}
            <div style={{
              padding: '12px 18px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#fafbfc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  {reportData.reportType} Records ({filteredRows.length})
                </span>
              </div>

              {/* Table Search */}
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search in table..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 12px 6px 32px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Table Content */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#fff' }}>
                    {reportData.reportType === 'Summary' ? (
                      <>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Barcode</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Code</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Name</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Vendor</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>CPU (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>MRP (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Del Qty</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Cost Value (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>Sale Value (Tk)</th>
                      </>
                    ) : reportData.reportType === 'Shop Wise Summary' ? (
                      <>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Delivery To Store</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Total Challans</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Total Items</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Del Qty</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Cost Value (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>Sale Value (Tk)</th>
                      </>
                    ) : reportData.reportType === 'Month Wise Summary' ? (
                      <>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Month</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Total Deliveries</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Total Items</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Del Qty</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Cost Value (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>Sale Value (Tk)</th>
                      </>
                    ) : reportData.reportType === 'Shop Wise Details' ? (
                      <>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Delivery To Store</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Challan No</th>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Date</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Barcode</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Name</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>CPU (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>MRP (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Del Qty</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Cost Value (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Sale Value (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                      </>
                    ) : reportData.reportType === 'Month Wise Details' ? (
                      <>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Month</th>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Date</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Challan No</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Delivery To</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Barcode</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Name</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>CPU (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>MRP (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Del Qty</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Cost Value (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Sale Value (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>SL</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Challan No</th>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Date</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Delivery To</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Barcode</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Item Name</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Category</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Brand</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>CPU (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>MRP (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Del Qty</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Cost Value (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid rgba(255,255,255,0.1)' }}>Sale Value (Tk)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                        No records matching the search filter
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const actualIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                      const isEven = idx % 2 === 0;

                      return (
                        <tr 
                          key={row.id || idx}
                          style={{
                            backgroundColor: isEven ? '#fff' : '#f8fafc',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isEven ? '#fff' : '#f8fafc'}
                        >
                          {reportData.reportType === 'Summary' ? (
                            <>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{actualIdx}</td>
                              <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{row.barcode}</td>
                              <td style={{ padding: '9px 12px', color: '#334155' }}>{row.code}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 500, color: '#0f172a' }}>{row.item_name}</td>
                              <td style={{ padding: '9px 12px', color: '#64748b' }}>{row.category}</td>
                              <td style={{ padding: '9px 12px', color: '#64748b' }}>{row.brand}</td>
                              <td style={{ padding: '9px 12px', color: '#64748b' }}>{row.vendor}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.cpu.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.mrp.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{row.del_qty}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>{row.cost_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#7e22ce' }}>{row.sale_value.toFixed(2)}</td>
                            </>
                          ) : reportData.reportType === 'Shop Wise Summary' ? (
                            <>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{actualIdx}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{row.delivery_to}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.total_challans}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.total_items}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{row.del_qty}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>{row.cost_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#7e22ce' }}>{row.sale_value.toFixed(2)}</td>
                            </>
                          ) : reportData.reportType === 'Month Wise Summary' ? (
                            <>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{actualIdx}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{row.month}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.total_challans}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.total_items}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{row.del_qty}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>{row.cost_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#7e22ce' }}>{row.sale_value.toFixed(2)}</td>
                            </>
                          ) : reportData.reportType === 'Shop Wise Details' ? (
                            <>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{actualIdx}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{row.delivery_to}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0284c7' }}>{row.challan_no}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{row.date}</td>
                              <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11.5px', color: '#334155' }}>{row.barcode}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 500, color: '#0f172a' }}>{row.item_name}</td>
                              <td style={{ padding: '9px 12px', color: '#64748b' }}>{row.category}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.cpu.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.mrp.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{row.del_qty}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>{row.cost_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#7e22ce' }}>{row.sale_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: row.status === 'Received' ? '#ecfdf5' : '#eff6ff',
                                  color: row.status === 'Received' ? '#059669' : '#0284c7'
                                }}>
                                  {row.status}
                                </span>
                              </td>
                            </>
                          ) : reportData.reportType === 'Month Wise Details' ? (
                            <>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{actualIdx}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{row.month}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{row.date}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0284c7' }}>{row.challan_no}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 500, color: '#0f172a' }}>{row.delivery_to}</td>
                              <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11.5px', color: '#334155' }}>{row.barcode}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 500, color: '#0f172a' }}>{row.item_name}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.cpu.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.mrp.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{row.del_qty}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>{row.cost_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#7e22ce' }}>{row.sale_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: row.status === 'Received' ? '#ecfdf5' : '#eff6ff',
                                  color: row.status === 'Received' ? '#059669' : '#0284c7'
                                }}>
                                  {row.status}
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{actualIdx}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0284c7' }}>{row.challan_no}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b' }}>{row.date}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 500, color: '#0f172a' }}>{row.delivery_to}</td>
                              <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11.5px', color: '#334155' }}>{row.barcode}</td>
                              <td style={{ padding: '9px 12px', fontWeight: 500, color: '#0f172a' }}>{row.item_name}</td>
                              <td style={{ padding: '9px 12px', color: '#64748b' }}>{row.category}</td>
                              <td style={{ padding: '9px 12px', color: '#64748b' }}>{row.brand}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.cpu.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', color: '#334155' }}>{row.mrp.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{row.del_qty}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>{row.cost_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#7e22ce' }}>{row.sale_value.toFixed(2)}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor: row.status === 'Received' ? '#ecfdf5' : '#eff6ff',
                                  color: row.status === 'Received' ? '#059669' : '#0284c7'
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
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #cbd5e1', fontWeight: 'bold' }}>
                    {reportData.reportType === 'Summary' ? (
                      <>
                        <td colSpan={9} style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          Total Summary:
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          {reportData.totals.total_del_qty}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          Tk {reportData.totals.total_cost_value.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          Tk {reportData.totals.total_sale_value.toFixed(2)}
                        </td>
                      </>
                    ) : reportData.reportType === 'Shop Wise Summary' || reportData.reportType === 'Month Wise Summary' ? (
                      <>
                        <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          Total Summary:
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          {reportData.totals.total_del_qty}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          Tk {reportData.totals.total_cost_value.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          Tk {reportData.totals.total_sale_value.toFixed(2)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td colSpan={10} style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          Total Summary ({reportData.totals.total_items} Items):
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          {reportData.totals.total_del_qty}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          Tk {reportData.totals.total_cost_value.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#166534' }}>
                          Tk {reportData.totals.total_sale_value.toFixed(2)}
                        </td>
                        <td></td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div style={{
                padding: '12px 18px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fff'
              }}>
                <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                  Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filteredRows.length)} of {filteredRows.length} entries
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: currentPage === 1 ? '#f1f5f9' : '#fff',
                      color: currentPage === 1 ? '#94a3b8' : '#334155',
                      fontSize: '12px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '5px 10px', fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: currentPage === totalPages ? '#f1f5f9' : '#fff',
                      color: currentPage === totalPages ? '#94a3b8' : '#334155',
                      fontSize: '12px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};

export default ItemWiseDeliveryReport;
