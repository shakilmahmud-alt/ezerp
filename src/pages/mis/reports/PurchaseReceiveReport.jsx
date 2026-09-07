import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  Calendar, Layers, Package, DollarSign, Store, Tag, ShoppingCart, Truck, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../../../components/CustomSelect';

const PurchaseReceiveReport = () => {
  const { user } = useAuth();

  // Helper for today's date
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Top Filters State matching Screenshot
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [deliveryStoreType, setDeliveryStoreType] = useState('ALL');
  const [selectedDeliveryTo, setSelectedDeliveryTo] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [purchaseType, setPurchaseType] = useState('ALL');

  // 2. Report Type Radio Selection (11 Sub-Reports)
  const [selectedReportType, setSelectedReportType] = useState('Challan wise Details');

  // Dynamic Secondary Inputs for Selected Report Type
  const [challanInput, setChallanInput] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('ALL');
  const [multiBarcodeInput, setMultiBarcodeInput] = useState('');
  const [referenceInput, setReferenceInput] = useState('ALL');

  // 3. Dropdown Master Data Lists
  const [storesList, setStoresList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [productsMap, setProductsMap] = useState(new Map());

  // 4. Output / Generated Report State (STRICT RULE: null on mount, only populates on Show button click)
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // 11 Sub-Report Definitions
  const reportOptions = [
    { id: 'Challan wise Details', label: 'Challan wise Details', hasInput: true, inputType: 'challan' },
    { id: 'Challan wise Summary', label: 'Challan wise Summary', hasInput: false },
    { id: 'Barcode wise', label: 'Barcode wise', hasInput: true, inputType: 'barcode' },
    { id: 'Multiple Barcode wise', label: 'Multiple Barcode wise', hasInput: true, inputType: 'multi_barcode' },
    { id: 'Reference Wise Report', label: 'Reference Wise Report', hasInput: true, inputType: 'reference' },
    { id: 'Purchase Vat Report', label: 'Purchase Vat Report', hasInput: false },
    { id: 'Category wise Report', label: 'Category wise Report', hasInput: false },
    { id: 'Sub Category wise Report', label: 'Sub Category wise Report', hasInput: false },
    { id: 'Item Name wise Report', label: 'Item Name wise Report', hasInput: false },
    { id: 'Vendor wise Receive Return & Current Stock Report', label: 'Vendor wise Receive Return & Current Stock Report', hasInput: false },
    { id: 'Vendor Wise Summary Report', label: 'Vendor Wise Summary Report', hasInput: false }
  ];

  // Fetch Dropdown Master Data on Mount (NO report auto-generation)
  useEffect(() => {
    fetchMasterDropdowns();
  }, []);

  const fetchMasterDropdowns = async () => {
    try {
      const [storesRes, vendorsRes, catsRes, subcatsRes, prodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('vendors').select('id, code, name, contact_no, vendor_type, vat_registration_no').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id').order('name'),
        supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, category_id, subcategory_id, brand_id, vendor_id, purchase_price, mrp, sale_vat_percent, wh_stock, str_stock')
      ]);

      setStoresList(storesRes.data || []);
      setVendorsList(vendorsRes.data || []);
      setCategoriesList(catsRes.data || []);
      setSubcategoriesList(subcatsRes.data || []);

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
      console.error('Error fetching master dropdowns:', err);
      toast.error('Failed to load filter dropdowns');
    }
  };

  // Filtered Stores for dropdowns
  const availableStores = useMemo(() => {
    if (storeType === 'ALL') return storesList;
    return storesList.filter(s => s.shop_type?.toLowerCase() === storeType.toLowerCase() || storeType === 'ALL');
  }, [storesList, storeType]);

  const availableDeliveryStores = useMemo(() => {
    if (deliveryStoreType === 'ALL') return storesList;
    return storesList.filter(s => s.shop_type?.toLowerCase() === deliveryStoreType.toLowerCase() || deliveryStoreType === 'ALL');
  }, [storesList, deliveryStoreType]);

  // Main Handle Show: Executes only on user button click with STRICT date filtering
  const handleShow = async () => {
    setLoading(true);
    setTableSearch('');

    try {
      // 1. Fetch Purchase Receives from DB
      const { data: allPrs, error: prErr } = await supabase
        .from('purchase_receives')
        .select('*')
        .order('purchase_date', { ascending: false });

      if (prErr) console.error("PR Query error:", prErr);

      // STRICT Date and Filter Verification (No fallback to all dates)
      const filteredPRs = (allPrs || []).filter(pr => {
        const pDate = (pr.purchase_date || pr.from_date || pr.to_date || pr.created_at || '').slice(0, 10);
        if (fromDate && pDate && pDate < fromDate) return false;
        if (toDate && pDate && pDate > toDate) return false;
        if (!pDate && (fromDate || toDate)) return false;

        if (selectedVendor !== 'ALL' && pr.vendor_id !== selectedVendor) return false;
        if (statusFilter !== 'ALL' && pr.status !== statusFilter) return false;

        if (selectedDeliveryTo !== 'ALL') {
          const targetStoreObj = storesList.find(s => s.id === selectedDeliveryTo);
          const targetStoreName = targetStoreObj?.name?.toLowerCase();
          const dt = (pr.delivery_to || '').toLowerCase();
          if (dt !== selectedDeliveryTo.toLowerCase() && (!targetStoreName || !dt.includes(targetStoreName))) {
            return false;
          }
        }

        if (purchaseType !== 'ALL') {
          const v = vendorsList.find(v => v.id === pr.vendor_id);
          if (v?.vendor_type?.toLowerCase() !== purchaseType.toLowerCase()) return false;
        }

        return true;
      });

      // If no PRs match the strict date range and filters, return empty results immediately
      if (filteredPRs.length === 0) {
        setReportData({
          type: selectedReportType,
          rows: []
        });
        toast(`No purchase receive records found for ${fromDate} to ${toDate}`);
        setLoading(false);
        return;
      }

      // Fetch Items strictly for the filtered PRs
      const prIds = filteredPRs.map(p => p.id).filter(Boolean);
      let allPrItems = [];
      if (prIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('purchase_receive_items')
          .select('*')
          .in('purchase_receive_id', prIds);
        allPrItems = itemsData || [];
      }

      // Fetch Purchase Orders for cross-referencing PO numbers
      const poIds = [...new Set(filteredPRs.map(p => p.purchase_order_id).filter(Boolean))];
      let poMap = new Map();
      if (poIds.length > 0) {
        const { data: pos } = await supabase.from('purchase_orders').select('id, po_number, reference_no').in('id', poIds);
        (pos || []).forEach(po => {
          poMap.set(po.id, po);
          poMap.set(String(po.id), po);
        });
      }

      // Fetch Purchase Returns for Vendor Return & Current Stock sub-report
      const { data: returnsData } = await supabase.from('purchase_returns').select('*');

      // -------------------------------------------------------------
      // 1. Challan wise Details (Sorted by Challan No and Date)
      // -------------------------------------------------------------
      if (selectedReportType === 'Challan wise Details') {
        let items = allPrItems.map((item, idx) => {
          const parentPr = filteredPRs.find(pr => pr.id === item.purchase_receive_id) || {};
          const matchedPo = poMap.get(parentPr.purchase_order_id);
          const vendor = vendorsList.find(v => v.id === parentPr.vendor_id);
          const prod = productsMap.get(item.product_id) || {};

          const rcvQty = Number(item.rcv_qty || 0);
          const poQty = Number(item.po_qty || rcvQty);
          const purPrice = Number(item.pur_price || prod.purchase_price || 0);
          const discPercent = Number(item.disc_percent || 0);
          const value = rcvQty * purPrice;
          const discAmt = (value * discPercent) / 100;
          const vatRate = (prod.sale_vat_percent && Number(prod.sale_vat_percent) > 0 && Number(prod.sale_vat_percent) <= 1)
            ? Number((Number(prod.sale_vat_percent) * 100).toFixed(2))
            : Number(prod.sale_vat_percent || 7.50);
          const vatAmt = ((value - discAmt) * vatRate) / 100;
          const lineAmt = Number(item.line_amount) || (value - discAmt + vatAmt);

          return {
            id: item.id || idx,
            challan_no: parentPr.last_challan_no || parentPr.reference_no || `PR-${parentPr.id || idx}`,
            po_number: matchedPo?.po_number || 'Direct Receive',
            receive_date: parentPr.purchase_date || parentPr.created_at?.slice(0, 10) || fromDate,
            vendor_name: vendor?.name || 'Local Supplier',
            delivery_to: parentPr.delivery_to || 'Central Store',
            barcode: prod.barcode || prod.user_define_barcode || 'N/A',
            item_name: prod.item_name || 'Received Product',
            po_qty: poQty,
            rcv_qty: rcvQty,
            pur_price: purPrice,
            value: value,
            discount: discAmt,
            vat: vatAmt,
            line_amount: lineAmt
          };
        });

        // Group & Sort items by Challan No and Date so all items of the same challan appear in sequence
        items.sort((a, b) => {
          if (a.challan_no !== b.challan_no) {
            return a.challan_no.localeCompare(b.challan_no);
          }
          return a.item_name.localeCompare(b.item_name);
        });

        if (challanInput && challanInput !== 'ALL' && challanInput.trim()) {
          const q = challanInput.trim().toLowerCase();
          items = items.filter(it => it.challan_no.toLowerCase().includes(q) || it.po_number.toLowerCase().includes(q));
        }

        setReportData({
          type: 'Challan wise Details',
          rows: items
        });
        toast.success(`Found ${items.length} itemized receive records`);
      }

      // -------------------------------------------------------------
      // 2. Challan wise Summary
      // -------------------------------------------------------------
      else if (selectedReportType === 'Challan wise Summary') {
        const rows = filteredPRs.map((pr, idx) => {
          const matchedPo = poMap.get(pr.purchase_order_id);
          const vendor = vendorsList.find(v => v.id === pr.vendor_id);
          const prItems = allPrItems.filter(i => i.purchase_receive_id === pr.id);
          const totalQty = prItems.reduce((sum, i) => sum + (Number(i.rcv_qty) || 0), 0);
          const totalVal = Number(pr.total_value || 0) || prItems.reduce((sum, i) => sum + (Number(i.rcv_qty || 0) * Number(i.pur_price || 0)), 0);
          const disc = Number(pr.total_discount || 0);
          const vat = Number(pr.vat_amount || ((totalVal - disc) * 0.075));
          const net = Number(pr.net_amount || (totalVal - disc + vat));

          return {
            id: pr.id || idx,
            challan_no: pr.last_challan_no || `PR-${pr.id || idx}`,
            po_number: matchedPo?.po_number || 'Direct Receive',
            reference_no: pr.reference_no || '-',
            receive_date: pr.purchase_date || pr.created_at?.slice(0, 10) || fromDate,
            vendor_name: vendor?.name || 'Local Supplier',
            delivery_to: pr.delivery_to || 'Central Store',
            status: pr.status || 'Saved',
            total_items: prItems.length || 1,
            total_qty: totalQty || 1,
            total_value: totalVal,
            discount: disc,
            vat: vat,
            net_amount: net
          };
        });

        rows.sort((a, b) => a.challan_no.localeCompare(b.challan_no));

        setReportData({
          type: 'Challan wise Summary',
          rows: rows
        });
        toast.success(`Found ${rows.length} purchase receive challans`);
      }

      // -------------------------------------------------------------
      // 3. Barcode wise
      // -------------------------------------------------------------
      else if (selectedReportType === 'Barcode wise') {
        const grouped = {};
        allPrItems.forEach(item => {
          const prod = productsMap.get(item.product_id) || {};
          const bc = prod.barcode || prod.user_define_barcode || 'NO-BARCODE';
          if (!grouped[bc]) {
            const vendor = vendorsList.find(v => v.id === prod.vendor_id);
            const cat = categoriesList.find(c => c.id === prod.category_id);
            grouped[bc] = {
              barcode: bc,
              code: prod.code || '',
              item_name: prod.item_name || 'Product',
              category: cat?.name || 'General',
              brand: prod.brand_id ? 'Brand' : '-',
              vendor: vendor?.name || 'Supplier',
              total_qty: 0,
              total_val: 0,
              total_vat: 0,
              total_amt: 0
            };
          }

          const qty = Number(item.rcv_qty || 0);
          const price = Number(item.pur_price || prod.purchase_price || 0);
          const val = qty * price;
          const vat = val * 0.075;
          grouped[bc].total_qty += qty;
          grouped[bc].total_val += val;
          grouped[bc].total_vat += vat;
          grouped[bc].total_amt += (val + vat);
        });

        let rows = Object.values(grouped).map(g => ({
          ...g,
          avg_price: g.total_qty > 0 ? (g.total_val / g.total_qty) : 0
        }));

        if (barcodeInput && barcodeInput !== 'ALL' && barcodeInput.trim()) {
          const q = barcodeInput.trim().toLowerCase();
          rows = rows.filter(r => r.barcode.toLowerCase().includes(q) || r.item_name.toLowerCase().includes(q));
        }

        setReportData({
          type: 'Barcode wise',
          rows: rows
        });
        toast.success(`Found ${rows.length} received barcodes`);
      }

      // -------------------------------------------------------------
      // 4. Multiple Barcode wise
      // -------------------------------------------------------------
      else if (selectedReportType === 'Multiple Barcode wise') {
        const grouped = {};
        allPrItems.forEach(item => {
          const prod = productsMap.get(item.product_id) || {};
          const bc = prod.barcode || prod.user_define_barcode || 'NO-BARCODE';
          if (!grouped[bc]) {
            const vendor = vendorsList.find(v => v.id === prod.vendor_id);
            const cat = categoriesList.find(c => c.id === prod.category_id);
            grouped[bc] = {
              barcode: bc,
              code: prod.code || '',
              item_name: prod.item_name || 'Product',
              category: cat?.name || 'General',
              brand: '-',
              vendor: vendor?.name || 'Supplier',
              total_qty: 0,
              total_val: 0,
              total_vat: 0,
              total_amt: 0
            };
          }

          const qty = Number(item.rcv_qty || 0);
          const price = Number(item.pur_price || prod.purchase_price || 0);
          const val = qty * price;
          const vat = val * 0.075;
          grouped[bc].total_qty += qty;
          grouped[bc].total_val += val;
          grouped[bc].total_vat += vat;
          grouped[bc].total_amt += (val + vat);
        });

        let rows = Object.values(grouped).map(g => ({
          ...g,
          avg_price: g.total_qty > 0 ? (g.total_val / g.total_qty) : 0
        }));

        if (multiBarcodeInput.trim()) {
          const tokens = multiBarcodeInput.split(/[\s,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
          if (tokens.length > 0) {
            rows = rows.filter(r => tokens.some(t => r.barcode.toLowerCase().includes(t) || r.code.toLowerCase().includes(t)));
          }
        }

        setReportData({
          type: 'Multiple Barcode wise',
          rows: rows
        });
        toast.success(`Found ${rows.length} matched barcodes`);
      }

      // -------------------------------------------------------------
      // 5. Reference Wise Report
      // -------------------------------------------------------------
      else if (selectedReportType === 'Reference Wise Report') {
        let rows = filteredPRs.map((pr, idx) => {
          const matchedPo = poMap.get(pr.purchase_order_id);
          const vendor = vendorsList.find(v => v.id === pr.vendor_id);
          const prItems = allPrItems.filter(i => i.purchase_receive_id === pr.id);
          const totalQty = prItems.reduce((sum, i) => sum + (Number(i.rcv_qty) || 0), 0);
          const totalVal = Number(pr.total_value || 0);
          const vat = Number(pr.vat_amount || (totalVal * 0.075));
          const net = Number(pr.net_amount || (totalVal + vat));

          return {
            id: pr.id || idx,
            reference_no: pr.reference_no || `REF-${pr.id || idx}`,
            challan_no: pr.last_challan_no || '-',
            po_number: matchedPo?.po_number || 'Direct',
            receive_date: pr.purchase_date || pr.created_at?.slice(0, 10) || fromDate,
            vendor_name: vendor?.name || 'Local Supplier',
            delivery_to: pr.delivery_to || 'Central Store',
            total_qty: totalQty || 1,
            total_value: totalVal,
            vat: vat,
            net_amount: net
          };
        });

        if (referenceInput && referenceInput !== 'ALL' && referenceInput.trim()) {
          const q = referenceInput.trim().toLowerCase();
          rows = rows.filter(r => r.reference_no.toLowerCase().includes(q) || r.challan_no.toLowerCase().includes(q));
        }

        setReportData({
          type: 'Reference Wise Report',
          rows: rows
        });
        toast.success(`Found ${rows.length} reference records`);
      }

      // -------------------------------------------------------------
      // 6. Purchase Vat Report
      // -------------------------------------------------------------
      else if (selectedReportType === 'Purchase Vat Report') {
        const rows = filteredPRs.map((pr, idx) => {
          const vendor = vendorsList.find(v => v.id === pr.vendor_id);
          const totalVal = Number(pr.total_value || 0);
          const disc = Number(pr.total_discount || 0);
          const taxableVal = totalVal - disc;
          const vat = Number(pr.vat_amount || (taxableVal * 0.075));
          const net = Number(pr.net_amount || (taxableVal + vat));

          return {
            id: pr.id || idx,
            challan_no: pr.last_challan_no || `PR-${pr.id || idx}`,
            receive_date: pr.purchase_date || pr.created_at?.slice(0, 10) || fromDate,
            vendor_name: vendor?.name || 'Supplier',
            vat_reg_no: vendor?.vat_registration_no || 'Mushak-6.3',
            delivery_to: pr.delivery_to || 'Central Store',
            taxable_value: taxableVal,
            vat_rate: 7.50,
            vat_amount: vat,
            total_amount: net
          };
        });

        setReportData({
          type: 'Purchase Vat Report',
          rows: rows
        });
        toast.success(`Found ${rows.length} purchase VAT records`);
      }

      // -------------------------------------------------------------
      // 7. Category wise Report
      // -------------------------------------------------------------
      else if (selectedReportType === 'Category wise Report') {
        const catMap = {};
        allPrItems.forEach(item => {
          const prod = productsMap.get(item.product_id) || {};
          const cat = categoriesList.find(c => c.id === prod.category_id);
          const cName = cat?.name || 'Unassigned Category';

          if (!catMap[cName]) {
            catMap[cName] = {
              category_name: cName,
              items_count: 0,
              total_qty: 0,
              total_val: 0,
              total_vat: 0,
              total_amt: 0
            };
          }

          const qty = Number(item.rcv_qty || 0);
          const price = Number(item.pur_price || prod.purchase_price || 0);
          const val = qty * price;
          const vat = val * 0.075;

          catMap[cName].items_count += 1;
          catMap[cName].total_qty += qty;
          catMap[cName].total_val += val;
          catMap[cName].total_vat += vat;
          catMap[cName].total_amt += (val + vat);
        });

        const totalNetAll = Object.values(catMap).reduce((sum, c) => sum + c.total_amt, 0);

        const rows = Object.values(catMap).map(c => ({
          ...c,
          contribution_pct: totalNetAll > 0 ? ((c.total_amt / totalNetAll) * 100).toFixed(2) : '0.00'
        }));

        setReportData({
          type: 'Category wise Report',
          rows: rows
        });
        toast.success(`Generated Category analysis (${rows.length} categories)`);
      }

      // -------------------------------------------------------------
      // 8. Sub Category wise Report
      // -------------------------------------------------------------
      else if (selectedReportType === 'Sub Category wise Report') {
        const subcatMap = {};
        allPrItems.forEach(item => {
          const prod = productsMap.get(item.product_id) || {};
          const cat = categoriesList.find(c => c.id === prod.category_id);
          const subcat = subcategoriesList.find(s => s.id === prod.subcategory_id);
          const scKey = `${cat?.name || 'General'} > ${subcat?.name || 'General'}`;

          if (!subcatMap[scKey]) {
            subcatMap[scKey] = {
              category_name: cat?.name || 'General',
              subcategory_name: subcat?.name || 'General',
              items_count: 0,
              total_qty: 0,
              total_val: 0,
              total_vat: 0,
              total_amt: 0
            };
          }

          const qty = Number(item.rcv_qty || 0);
          const price = Number(item.pur_price || prod.purchase_price || 0);
          const val = qty * price;
          const vat = val * 0.075;

          subcatMap[scKey].items_count += 1;
          subcatMap[scKey].total_qty += qty;
          subcatMap[scKey].total_val += val;
          subcatMap[scKey].total_vat += vat;
          subcatMap[scKey].total_amt += (val + vat);
        });

        const totalNetAll = Object.values(subcatMap).reduce((sum, s) => sum + s.total_amt, 0);

        const rows = Object.values(subcatMap).map(s => ({
          ...s,
          contribution_pct: totalNetAll > 0 ? ((s.total_amt / totalNetAll) * 100).toFixed(2) : '0.00'
        }));

        setReportData({
          type: 'Sub Category wise Report',
          rows: rows
        });
        toast.success(`Generated Subcategory analysis (${rows.length} subcategories)`);
      }

      // -------------------------------------------------------------
      // 9. Item Name wise Report
      // -------------------------------------------------------------
      else if (selectedReportType === 'Item Name wise Report') {
        const itemMap = {};
        allPrItems.forEach(item => {
          const prod = productsMap.get(item.product_id) || {};
          const iName = prod.item_name || item.product_name || 'Product';
          if (!itemMap[iName]) {
            const vendor = vendorsList.find(v => v.id === prod.vendor_id);
            const cat = categoriesList.find(c => c.id === prod.category_id);
            itemMap[iName] = {
              item_name: iName,
              barcode: prod.barcode || prod.user_define_barcode || '-',
              category: cat?.name || 'General',
              brand: prod.brand_id ? 'Brand' : '-',
              vendor: vendor?.name || 'Supplier',
              total_qty: 0,
              total_val: 0,
              total_vat: 0,
              total_amt: 0
            };
          }

          const qty = Number(item.rcv_qty || 0);
          const price = Number(item.pur_price || prod.purchase_price || 0);
          const val = qty * price;
          const vat = val * 0.075;

          itemMap[iName].total_qty += qty;
          itemMap[iName].total_val += val;
          itemMap[iName].total_vat += vat;
          itemMap[iName].total_amt += (val + vat);
        });

        const rows = Object.values(itemMap).map(i => ({
          ...i,
          avg_price: i.total_qty > 0 ? (i.total_val / i.total_qty) : 0
        }));

        setReportData({
          type: 'Item Name wise Report',
          rows: rows
        });
        toast.success(`Generated Item Name wise report (${rows.length} items)`);
      }

      // -------------------------------------------------------------
      // 10. Vendor wise Receive Return & Current Stock Report
      // -------------------------------------------------------------
      else if (selectedReportType === 'Vendor wise Receive Return & Current Stock Report') {
        const rows = vendorsList.map(v => {
          const vPrs = filteredPRs.filter(pr => pr.vendor_id === v.id);
          const vPrIds = vPrs.map(p => p.id);
          const vItems = allPrItems.filter(i => vPrIds.includes(i.purchase_receive_id));
          const rcvQty = vItems.reduce((sum, i) => sum + (Number(i.rcv_qty) || 0), 0);
          const rcvVal = vPrs.reduce((sum, p) => sum + (Number(p.total_value) || 0), 0);

          const vReturns = (returnsData || []).filter(r => r.vendor_id === v.id);
          const retQty = vReturns.reduce((sum, r) => sum + (Number(r.total_qty) || 0), 0);
          const retVal = vReturns.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

          const netQty = Math.max(0, rcvQty - retQty);
          const netVal = Math.max(0, rcvVal - retVal);

          let stockQty = 0;
          let stockVal = 0;
          productsMap.forEach(p => {
            if (p.vendor_id === v.id) {
              const sq = Number(p.wh_stock || 0) + Number(p.str_stock || 0);
              stockQty += sq;
              stockVal += sq * Number(p.purchase_price || 0);
            }
          });

          return {
            id: v.id,
            vendor_name: v.name,
            rcv_qty: rcvQty,
            rcv_val: rcvVal,
            ret_qty: retQty,
            ret_val: retVal,
            net_qty: netQty,
            net_val: netVal,
            stock_qty: stockQty,
            stock_val: stockVal
          };
        }).filter(v => v.rcv_qty > 0 || v.stock_qty > 0 || v.ret_qty > 0 || selectedVendor === v.id);

        setReportData({
          type: 'Vendor wise Receive Return & Current Stock Report',
          rows: rows
        });
        toast.success(`Generated Vendor Stock analysis (${rows.length} vendors)`);
      }

      // -------------------------------------------------------------
      // 11. Vendor Wise Summary Report
      // -------------------------------------------------------------
      else if (selectedReportType === 'Vendor Wise Summary Report') {
        const rows = vendorsList.map(v => {
          const vPrs = filteredPRs.filter(pr => pr.vendor_id === v.id);
          const vPrIds = vPrs.map(p => p.id);
          const vItems = allPrItems.filter(i => vPrIds.includes(i.purchase_receive_id));
          const totalQty = vItems.reduce((sum, i) => sum + (Number(i.rcv_qty) || 0), 0);
          const grossVal = vPrs.reduce((sum, p) => sum + (Number(p.total_value) || 0), 0);
          const disc = vPrs.reduce((sum, p) => sum + (Number(p.total_discount) || 0), 0);
          const vat = vPrs.reduce((sum, p) => sum + (Number(p.vat_amount) || 0), 0);
          const net = vPrs.reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0);

          return {
            id: v.id,
            vendor_code: v.code || '-',
            vendor_name: v.name,
            contact_no: v.contact_no || 'N/A',
            vendor_type: v.vendor_type || 'Local',
            challans_count: vPrs.length,
            total_qty: totalQty,
            gross_value: grossVal,
            discount: disc,
            vat: vat,
            net_amount: net
          };
        }).filter(v => v.challans_count > 0 || selectedVendor === v.id);

        setReportData({
          type: 'Vendor Wise Summary Report',
          rows: rows
        });
        toast.success(`Generated Vendor Summary (${rows.length} vendors)`);
      }

    } catch (err) {
      console.error('Error generating Purchase Receive Report:', err);
      toast.error('Failed to generate report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reload Button: Resets filters and clears report output
  const handleReload = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setStoreType('ALL');
    setSelectedStore('ALL');
    setDeliveryStoreType('ALL');
    setSelectedDeliveryTo('ALL');
    setSelectedVendor('ALL');
    setStatusFilter('ALL');
    setPurchaseType('ALL');
    setChallanInput('ALL');
    setBarcodeInput('ALL');
    setMultiBarcodeInput('');
    setReferenceInput('ALL');
    setReportData(null);
    setTableSearch('');
    toast.success('Filters reset. Click Show to generate report.');
  };

  // In-table Live Search Filtering
  const filteredRows = useMemo(() => {
    if (!reportData?.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;
    const q = tableSearch.toLowerCase().trim();
    return reportData.rows.filter(row => {
      return Object.values(row).some(val => 
        String(val || '').toLowerCase().includes(q)
      );
    });
  }, [reportData, tableSearch]);

  // -------------------------------------------------------------
  // PDF Export Engine (Matching EXACT Image 3 MIS Layout & Signatures)
  // -------------------------------------------------------------
  const handleDownloadPDF = () => {
    if (!reportData || filteredRows.length === 0) {
      toast.error('No report data to export');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Top Header with Dark Green Banner (Image 3)
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
    doc.text(reportData.type.toUpperCase(), pageWidth - 14, 14, { align: 'right' });

    // Prepared By user name
    const loggedInUser = user || JSON.parse(localStorage.getItem('erp_user') || '{}');
    const preparedByName = 
      loggedInUser?.user_metadata?.full_name || 
      loggedInUser?.user_metadata?.name || 
      loggedInUser?.full_name || 
      loggedInUser?.name || 
      loggedInUser?.username || 
      (loggedInUser?.email ? loggedInUser.email.split('@')[0] : 'Super Admin');

    // 2. Metadata Section below Banner
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    const storeLabel = selectedStore !== 'ALL' 
      ? storesList.find(s => s.id === selectedStore)?.name || 'Selected Store'
      : 'All (All Stores)';

    doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 30);
    doc.text(`Store Scope: ${storeType} (${storeLabel})`, 14, 35);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

    let head = [];
    let body = [];

    // 1. Challan wise Details PDF
    if (reportData.type === 'Challan wise Details') {
      head = [['SL', 'Challan No', 'PO No', 'Date', 'Vendor', 'Delivery To', 'Barcode', 'Item Name', 'PO Qty', 'Rcv Qty', 'Price (Tk)', 'Value (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Total (Tk)']];
      body = filteredRows.map((r, idx) => [
        idx + 1,
        r.challan_no,
        r.po_number,
        r.receive_date,
        r.vendor_name,
        r.delivery_to,
        r.barcode,
        r.item_name,
        r.po_qty,
        r.rcv_qty,
        r.pur_price.toFixed(2),
        r.value.toFixed(2),
        r.discount.toFixed(2),
        r.vat.toFixed(2),
        r.line_amount.toFixed(2)
      ]);
      const totPo = filteredRows.reduce((sum, r) => sum + r.po_qty, 0);
      const totRcv = filteredRows.reduce((sum, r) => sum + r.rcv_qty, 0);
      const totVal = filteredRows.reduce((sum, r) => sum + r.value, 0);
      const totDisc = filteredRows.reduce((sum, r) => sum + r.discount, 0);
      const totVat = filteredRows.reduce((sum, r) => sum + r.vat, 0);
      const totLine = filteredRows.reduce((sum, r) => sum + r.line_amount, 0);
      body.push(['Total', '', '', '', '', '', `${filteredRows.length} Items`, '', totPo, totRcv, '', totVal.toFixed(2), totDisc.toFixed(2), totVat.toFixed(2), totLine.toFixed(2)]);
    }

    // 2. Challan wise Summary PDF
    else if (reportData.type === 'Challan wise Summary') {
      head = [['SL', 'Challan No', 'PO No', 'Reference No', 'Date', 'Vendor', 'Delivery To', 'Status', 'Items', 'Total Qty', 'Total Value (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Net Amount (Tk)']];
      body = filteredRows.map((r, idx) => [
        idx + 1,
        r.challan_no,
        r.po_number,
        r.reference_no,
        r.receive_date,
        r.vendor_name,
        r.delivery_to,
        r.status,
        r.total_items,
        r.total_qty,
        r.total_value.toFixed(2),
        r.discount.toFixed(2),
        r.vat.toFixed(2),
        r.net_amount.toFixed(2)
      ]);
      const totQty = filteredRows.reduce((sum, r) => sum + r.total_qty, 0);
      const totVal = filteredRows.reduce((sum, r) => sum + r.total_value, 0);
      const totDisc = filteredRows.reduce((sum, r) => sum + r.discount, 0);
      const totVat = filteredRows.reduce((sum, r) => sum + r.vat, 0);
      const totNet = filteredRows.reduce((sum, r) => sum + r.net_amount, 0);
      body.push(['Total', '', '', '', `${filteredRows.length} Challans`, '', '', '', '', totQty, totVal.toFixed(2), totDisc.toFixed(2), totVat.toFixed(2), totNet.toFixed(2)]);
    }

    // 3 & 4. Barcode wise & Multi Barcode PDF
    else if (reportData.type === 'Barcode wise' || reportData.type === 'Multiple Barcode wise') {
      head = [['SL', 'Barcode', 'Item Name', 'Category', 'Vendor', 'Rcv Qty', 'Avg Price (Tk)', 'Total Value (Tk)', 'VAT (Tk)', 'Total Amount (Tk)']];
      body = filteredRows.map((r, idx) => [
        idx + 1,
        r.barcode,
        r.item_name,
        r.category,
        r.vendor,
        r.total_qty,
        r.avg_price.toFixed(2),
        r.total_val.toFixed(2),
        r.total_vat.toFixed(2),
        r.total_amt.toFixed(2)
      ]);
      const totQty = filteredRows.reduce((sum, r) => sum + r.total_qty, 0);
      const totVal = filteredRows.reduce((sum, r) => sum + r.total_val, 0);
      const totVat = filteredRows.reduce((sum, r) => sum + r.total_vat, 0);
      const totAmt = filteredRows.reduce((sum, r) => sum + r.total_amt, 0);
      body.push(['Total', `${filteredRows.length} Barcodes`, '', '', '', totQty, '', totVal.toFixed(2), totVat.toFixed(2), totAmt.toFixed(2)]);
    }

    // 5. Reference Wise Report PDF
    else if (reportData.type === 'Reference Wise Report') {
      head = [['SL', 'Reference No', 'Challan No', 'PO No', 'Date', 'Vendor', 'Delivery To', 'Total Qty', 'Total Value (Tk)', 'VAT (Tk)', 'Net Amount (Tk)']];
      body = filteredRows.map((r, idx) => [
        idx + 1,
        r.reference_no,
        r.challan_no,
        r.po_number,
        r.receive_date,
        r.vendor_name,
        r.delivery_to,
        r.total_qty,
        r.total_value.toFixed(2),
        r.vat.toFixed(2),
        r.net_amount.toFixed(2)
      ]);
      const totQty = filteredRows.reduce((sum, r) => sum + r.total_qty, 0);
      const totVal = filteredRows.reduce((sum, r) => sum + r.total_value, 0);
      const totVat = filteredRows.reduce((sum, r) => sum + r.vat, 0);
      const totNet = filteredRows.reduce((sum, r) => sum + r.net_amount, 0);
      body.push(['Total', `${filteredRows.length} References`, '', '', '', '', '', totQty, totVal.toFixed(2), totVat.toFixed(2), totNet.toFixed(2)]);
    }

    // 6. Purchase Vat Report PDF
    else if (reportData.type === 'Purchase Vat Report') {
      head = [['SL', 'Challan No', 'Date', 'Vendor', 'VAT Reg No', 'Delivery To', 'Taxable Value (Tk)', 'VAT Rate (%)', 'VAT Amount (Tk)', 'Total Amount (Tk)']];
      body = filteredRows.map((r, idx) => [
        idx + 1,
        r.challan_no,
        r.receive_date,
        r.vendor_name,
        r.vat_reg_no,
        r.delivery_to,
        r.taxable_value.toFixed(2),
        `${r.vat_rate.toFixed(2)}%`,
        r.vat_amount.toFixed(2),
        r.total_amount.toFixed(2)
      ]);
      const totTax = filteredRows.reduce((sum, r) => sum + r.taxable_value, 0);
      const totVat = filteredRows.reduce((sum, r) => sum + r.vat_amount, 0);
      const totAmt = filteredRows.reduce((sum, r) => sum + r.total_amount, 0);
      body.push(['Total', `${filteredRows.length} Challans`, '', '', '', '', totTax.toFixed(2), '', totVat.toFixed(2), totAmt.toFixed(2)]);
    }

    // 7 & 8. Category & Subcategory PDF
    else if (reportData.type === 'Category wise Report' || reportData.type === 'Sub Category wise Report') {
      const isSub = reportData.type === 'Sub Category wise Report';
      head = isSub
        ? [['SL', 'Category', 'Sub Category', 'Items Count', 'Received Qty', 'Total Value (Tk)', 'VAT (Tk)', 'Total Amount (Tk)', 'Contribution (%)']]
        : [['SL', 'Category Name', 'Items Count', 'Received Qty', 'Total Value (Tk)', 'VAT (Tk)', 'Total Amount (Tk)', 'Contribution (%)']];
      
      body = filteredRows.map((r, idx) => isSub ? [
        idx + 1,
        r.category_name,
        r.subcategory_name,
        r.items_count,
        r.total_qty,
        r.total_val.toFixed(2),
        r.total_vat.toFixed(2),
        r.total_amt.toFixed(2),
        `${r.contribution_pct}%`
      ] : [
        idx + 1,
        r.category_name,
        r.items_count,
        r.total_qty,
        r.total_val.toFixed(2),
        r.total_vat.toFixed(2),
        r.total_amt.toFixed(2),
        `${r.contribution_pct}%`
      ]);

      const totQty = filteredRows.reduce((sum, r) => sum + r.total_qty, 0);
      const totVal = filteredRows.reduce((sum, r) => sum + r.total_val, 0);
      const totVat = filteredRows.reduce((sum, r) => sum + r.total_vat, 0);
      const totAmt = filteredRows.reduce((sum, r) => sum + r.total_amt, 0);
      body.push(['Total', `${filteredRows.length} Groups`, '', '', totQty, totVal.toFixed(2), totVat.toFixed(2), totAmt.toFixed(2), '100%']);
    }

    // 9. Item Name wise Report PDF
    else if (reportData.type === 'Item Name wise Report') {
      head = [['SL', 'Item Name', 'Barcode', 'Category', 'Vendor', 'Received Qty', 'Avg Price (Tk)', 'Total Value (Tk)', 'VAT (Tk)', 'Total Amount (Tk)']];
      body = filteredRows.map((r, idx) => [
        idx + 1,
        r.item_name,
        r.barcode,
        r.category,
        r.vendor,
        r.total_qty,
        r.avg_price.toFixed(2),
        r.total_val.toFixed(2),
        r.total_vat.toFixed(2),
        r.total_amt.toFixed(2)
      ]);
      const totQty = filteredRows.reduce((sum, r) => sum + r.total_qty, 0);
      const totVal = filteredRows.reduce((sum, r) => sum + r.total_val, 0);
      const totVat = filteredRows.reduce((sum, r) => sum + r.total_vat, 0);
      const totAmt = filteredRows.reduce((sum, r) => sum + r.total_amt, 0);
      body.push(['Total', `${filteredRows.length} Items`, '', '', '', totQty, '', totVal.toFixed(2), totVat.toFixed(2), totAmt.toFixed(2)]);
    }

    // 10. Vendor wise Receive Return & Current Stock Report PDF
    else if (reportData.type === 'Vendor wise Receive Return & Current Stock Report') {
      head = [['SL', 'Vendor Name', 'Rcv Qty', 'Rcv Value (Tk)', 'Return Qty', 'Return Value (Tk)', 'Net Rcv Qty', 'Net Rcv Value (Tk)', 'Stock Qty', 'Stock Value (Tk)']];
      body = filteredRows.map((r, idx) => [
        idx + 1,
        r.vendor_name,
        r.rcv_qty,
        r.rcv_val.toFixed(2),
        r.ret_qty,
        r.ret_val.toFixed(2),
        r.net_qty,
        r.net_val.toFixed(2),
        r.stock_qty,
        r.stock_val.toFixed(2)
      ]);
      const totRcvQty = filteredRows.reduce((sum, r) => sum + r.rcv_qty, 0);
      const totRcvVal = filteredRows.reduce((sum, r) => sum + r.rcv_val, 0);
      const totRetQty = filteredRows.reduce((sum, r) => sum + r.ret_qty, 0);
      const totRetVal = filteredRows.reduce((sum, r) => sum + r.ret_val, 0);
      const totNetQty = filteredRows.reduce((sum, r) => sum + r.net_qty, 0);
      const totNetVal = filteredRows.reduce((sum, r) => sum + r.net_val, 0);
      const totStkQty = filteredRows.reduce((sum, r) => sum + r.stock_qty, 0);
      const totStkVal = filteredRows.reduce((sum, r) => sum + r.stock_val, 0);
      body.push(['Total', `${filteredRows.length} Vendors`, totRcvQty, totRcvVal.toFixed(2), totRetQty, totRetVal.toFixed(2), totNetQty, totNetVal.toFixed(2), totStkQty, totStkVal.toFixed(2)]);
    }

    // 11. Vendor Wise Summary Report PDF
    else if (reportData.type === 'Vendor Wise Summary Report') {
      head = [['SL', 'Code', 'Vendor Name', 'Contact No', 'Type', 'Challans', 'Rcv Qty', 'Gross Value (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Net Payable (Tk)']];
      body = filteredRows.map((r, idx) => [
        idx + 1,
        r.vendor_code,
        r.vendor_name,
        r.contact_no,
        r.vendor_type,
        r.challans_count,
        r.total_qty,
        r.gross_value.toFixed(2),
        r.discount.toFixed(2),
        r.vat.toFixed(2),
        r.net_amount.toFixed(2)
      ]);
      const totChallans = filteredRows.reduce((sum, r) => sum + r.challans_count, 0);
      const totQty = filteredRows.reduce((sum, r) => sum + r.total_qty, 0);
      const totGross = filteredRows.reduce((sum, r) => sum + r.gross_value, 0);
      const totDisc = filteredRows.reduce((sum, r) => sum + r.discount, 0);
      const totVat = filteredRows.reduce((sum, r) => sum + r.vat, 0);
      const totNet = filteredRows.reduce((sum, r) => sum + r.net_amount, 0);
      body.push(['Total', '', `${filteredRows.length} Vendors`, '', '', totChallans, totQty, totGross.toFixed(2), totDisc.toFixed(2), totVat.toFixed(2), totNet.toFixed(2)]);
    }

    autoTable(doc, {
      head,
      body,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [46, 111, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      didParseCell: function(data) {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 240];
          data.cell.styles.textColor = [10, 60, 20];
        }
      },
      margin: { top: 10, left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable?.finalY || 100;
    const sigY = Math.max(finalY + 22, pageHeight - 24);

    // Bottom Signatures (Matching Image 3)
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

    const cleanName = reportData.type.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`MIS_PurchaseReceive_${cleanName}_${fromDate}_to_${toDate}.pdf`);
    toast.success('PDF downloaded successfully');
  };

  // Excel Export
  const handleDownloadExcel = () => {
    if (!reportData || filteredRows.length === 0) {
      toast.error('No report data to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase_Receive_Report');
    const safeTitle = reportData.type.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Purchase_Receive_${safeTitle}_${fromDate}_to_${toDate}.xlsx`);
    toast.success('Excel downloaded successfully');
  };

  return (
    <div style={{ padding: '16px 20px', backgroundColor: '#f8fafc', minHeight: '100%', fontSize: '0.82rem', fontFamily: 'inherit' }}>
      
      {/* Page Title */}
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: '0 0 16px 0' }}>
        Purchase Receive Report
      </h1>

      {/* Main Filter & Options Card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '18px' }}>
        
        {/* Top Filters Grid matching User's Screenshot */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px 24px', marginBottom: '18px' }}>
          
          {/* Row 1 Left: From Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>From Date</label>
            <input 
              type="date" 
              value={fromDate} 
              onChange={e => setFromDate(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
            />
          </div>

          {/* Row 1 Right: To Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>To Date</label>
            <input 
              type="date" 
              value={toDate} 
              onChange={e => setToDate(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
            />
          </div>

          {/* Row 2 Left: Store Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Store Type</label>
            <select
              value={storeType}
              onChange={e => {
                setStoreType(e.target.value);
                setSelectedStore('ALL');
              }}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">ALL</option>
              <option value="Store">Store</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Central Store">Central Store</option>
            </select>
          </div>

          {/* Row 2 Right: Store */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Store</label>
            <select
              value={selectedStore}
              onChange={e => setSelectedStore(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">Select Store</option>
              {availableStores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Row 3 Left: Delivery Store Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Delivery Store Type</label>
            <select
              value={deliveryStoreType}
              onChange={e => {
                setDeliveryStoreType(e.target.value);
                setSelectedDeliveryTo('ALL');
              }}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">ALL</option>
              <option value="Store">Store</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Central Store">Central Store</option>
            </select>
          </div>

          {/* Row 3 Right: Delivery To */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Delivery To</label>
            <select
              value={selectedDeliveryTo}
              onChange={e => setSelectedDeliveryTo(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">ALL</option>
              {availableDeliveryStores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Row 4 Left: Vendor */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Vendor</label>
            <select
              value={selectedVendor}
              onChange={e => setSelectedVendor(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">Select Vendor</option>
              {vendorsList.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.code || 'Vendor'})</option>
              ))}
            </select>
          </div>

          {/* Row 4 Right: Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">-- ALL --</option>
              <option value="Saved">Saved</option>
              <option value="Approved">Approved</option>
              <option value="Received">Received</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Row 5 Left: Purchase Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600, color: '#334155' }}>Purchase Type</label>
            <select
              value={purchaseType}
              onChange={e => setPurchaseType(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none', backgroundColor: '#fff' }}
            >
              <option value="ALL">-- ALL --</option>
              <option value="Local">Local</option>
              <option value="Import">Import</option>
            </select>
          </div>

        </div>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '14px 0 16px 0' }} />

        {/* Report Type Selection (11 Sub-Reports) */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
            Report Type
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reportOptions.map((opt) => {
              const isSelected = selectedReportType === opt.id;
              return (
                <div key={opt.id} style={{ display: 'grid', gridTemplateColumns: '320px 1fr', alignItems: 'center', gap: '15px' }}>
                  
                  {/* Radio Label */}
                  <label 
                    onClick={() => setSelectedReportType(opt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#166534' : '#334155',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid #2e6f40' : '1.5px solid #94a3b8',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
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
                    <span>{opt.label}</span>
                  </label>

                  {/* Secondary Dynamic Input (visible only when selected) */}
                  {isSelected && opt.hasInput && (
                    <div style={{ maxWidth: '400px' }}>
                      {opt.inputType === 'challan' && (
                        <input
                          type="text"
                          value={challanInput}
                          onChange={e => setChallanInput(e.target.value)}
                          placeholder="ALL or enter Challan No..."
                          style={{ width: '100%', padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
                        />
                      )}
                      {opt.inputType === 'barcode' && (
                        <input
                          type="text"
                          value={barcodeInput}
                          onChange={e => setBarcodeInput(e.target.value)}
                          placeholder="ALL or enter Barcode..."
                          style={{ width: '100%', padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
                        />
                      )}
                      {opt.inputType === 'multi_barcode' && (
                        <input
                          type="text"
                          value={multiBarcodeInput}
                          onChange={e => setMultiBarcodeInput(e.target.value)}
                          placeholder="Enter barcodes separated by comma or space..."
                          style={{ width: '100%', padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
                        />
                      )}
                      {opt.inputType === 'reference' && (
                        <input
                          type="text"
                          value={referenceInput}
                          onChange={e => setReferenceInput(e.target.value)}
                          placeholder="ALL or enter Reference No..."
                          style={{ width: '100%', padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem', outline: 'none' }}
                        />
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />

        {/* Print Type & Action Buttons */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
            Print Type
          </h3>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleShow}
              disabled={loading}
              className="btn-theme"
              style={{
                padding: '6px 20px',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? 'Processing...' : 'Show'}
            </button>

            <button
              onClick={handleReload}
              disabled={loading}
              className="btn-danger"
              style={{
                padding: '6px 18px',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} />
              Reload
            </button>

            {reportData && (
              <>
                <button
                  onClick={handleDownloadPDF}
                  className="btn-theme"
                  style={{
                    padding: '6px 18px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={14} />
                  Download PDF
                </button>

                <button
                  onClick={handleDownloadExcel}
                  style={{
                    padding: '6px 18px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #16a34a',
                    color: '#16a34a',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FileSpreadsheet size={14} />
                  Download Excel
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Report Output Table Card (STRICT RULE: Only rendered when Show is clicked) */}
      {reportData && (
        <div className="animate-fade-in" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>
                {reportData.type}
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Date Range: <strong>{fromDate}</strong> to <strong>{toDate}</strong> | 
                Store: <strong>{selectedStore !== 'ALL' ? (storesList.find(s => s.id === selectedStore)?.name || selectedStore) : 'All Stores'}</strong> | 
                Vendor: <strong>{selectedVendor !== 'ALL' ? (vendorsList.find(v => v.id === selectedVendor)?.name || selectedVendor) : 'All Vendors'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search in table..."
                  value={tableSearch}
                  onChange={e => setTableSearch(e.target.value)}
                  style={{
                    padding: '6px 12px 6px 30px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.82rem',
                    width: '200px',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                onClick={handleDownloadPDF}
                className="btn-theme"
                style={{
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={13} />
                Print / PDF
              </button>
            </div>
          </div>

          {/* 1. Challan wise Details Table */}
          {reportData.type === 'Challan wise Details' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Challan No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>PO No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Vendor</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Delivery To</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>PO Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Rcv Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Price (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Disc (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={15} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{r.challan_no}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{r.po_number}</td>
                        <td style={{ padding: '8px 10px' }}>{r.receive_date}</td>
                        <td style={{ padding: '8px 10px' }}>{r.vendor_name}</td>
                        <td style={{ padding: '8px 10px' }}>{r.delivery_to}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 500, color: '#0369a1' }}>{r.barcode}</td>
                        <td style={{ padding: '8px 10px' }}>{r.item_name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.po_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{r.rcv_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.pur_price.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626' }}>{r.discount.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>{r.vat.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.line_amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#dcfce7', fontWeight: 700, color: '#166534', borderTop: '2px solid #86efac' }}>
                      <td style={{ padding: '9px 10px' }}>Total</td>
                      <td colSpan={7} style={{ padding: '9px 10px' }}>{filteredRows.length} Items Listed</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.po_qty, 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.rcv_qty, 0)}</td>
                      <td style={{ padding: '9px 10px' }}></td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.value, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.discount, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.vat, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.line_amount, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 2. Challan wise Summary Table */}
          {reportData.type === 'Challan wise Summary' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Challan No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>PO No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Ref No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Vendor</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Delivery To</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Items</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Gross Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Disc (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Net Amount (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={14} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{r.challan_no}</td>
                        <td style={{ padding: '8px 10px' }}>{r.po_number}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{r.reference_no}</td>
                        <td style={{ padding: '8px 10px' }}>{r.receive_date}</td>
                        <td style={{ padding: '8px 10px' }}>{r.vendor_name}</td>
                        <td style={{ padding: '8px 10px' }}>{r.delivery_to}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '0.75rem', fontWeight: 600 }}>{r.status}</span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.total_items}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.total_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.total_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626' }}>{r.discount.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>{r.vat.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>{r.net_amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#dcfce7', fontWeight: 700, color: '#166534', borderTop: '2px solid #86efac' }}>
                      <td style={{ padding: '9px 10px' }}>Total</td>
                      <td colSpan={8} style={{ padding: '9px 10px' }}>{filteredRows.length} Challans</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.total_qty, 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_value, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.discount, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.vat, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.net_amount, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 3 & 4. Barcode wise & Multi Barcode Table */}
          {(reportData.type === 'Barcode wise' || reportData.type === 'Multiple Barcode wise') && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Vendor</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Received Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Avg Price (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Amount (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0369a1' }}>{r.barcode}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 500 }}>{r.item_name}</td>
                        <td style={{ padding: '8px 10px' }}>{r.category}</td>
                        <td style={{ padding: '8px 10px' }}>{r.vendor}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{r.total_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.avg_price.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.total_val.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>{r.total_vat.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.total_amt.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#dcfce7', fontWeight: 700, color: '#166534', borderTop: '2px solid #86efac' }}>
                      <td style={{ padding: '9px 10px' }}>Total</td>
                      <td colSpan={4} style={{ padding: '9px 10px' }}>{filteredRows.length} Barcodes</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.total_qty, 0)}</td>
                      <td style={{ padding: '9px 10px' }}></td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_val, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_vat, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_amt, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 5. Reference Wise Report Table */}
          {reportData.type === 'Reference Wise Report' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Reference No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Challan No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>PO No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Vendor</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Delivery To</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Net Amount (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{r.reference_no}</td>
                        <td style={{ padding: '8px 10px' }}>{r.challan_no}</td>
                        <td style={{ padding: '8px 10px' }}>{r.po_number}</td>
                        <td style={{ padding: '8px 10px' }}>{r.receive_date}</td>
                        <td style={{ padding: '8px 10px' }}>{r.vendor_name}</td>
                        <td style={{ padding: '8px 10px' }}>{r.delivery_to}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.total_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.total_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>{r.vat.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>{r.net_amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#dcfce7', fontWeight: 700, color: '#166534', borderTop: '2px solid #86efac' }}>
                      <td style={{ padding: '9px 10px' }}>Total</td>
                      <td colSpan={6} style={{ padding: '9px 10px' }}>{filteredRows.length} References</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.total_qty, 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_value, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.vat, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.net_amount, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 6. Purchase Vat Report Table */}
          {reportData.type === 'Purchase Vat Report' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Challan No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Receive Date</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Vendor</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>VAT Reg No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Delivery To</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Taxable Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center' }}>VAT Rate (%)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>VAT Amount (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Amount (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{r.challan_no}</td>
                        <td style={{ padding: '8px 10px' }}>{r.receive_date}</td>
                        <td style={{ padding: '8px 10px' }}>{r.vendor_name}</td>
                        <td style={{ padding: '8px 10px', color: '#0369a1' }}>{r.vat_reg_no}</td>
                        <td style={{ padding: '8px 10px' }}>{r.delivery_to}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.taxable_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{r.vat_rate.toFixed(2)}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>{r.vat_amount.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>{r.total_amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#dcfce7', fontWeight: 700, color: '#166534', borderTop: '2px solid #86efac' }}>
                      <td style={{ padding: '9px 10px' }}>Total</td>
                      <td colSpan={5} style={{ padding: '9px 10px' }}>{filteredRows.length} Challans</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.taxable_value, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px' }}></td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.vat_amount, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_amount, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 7 & 8. Category & Sub Category wise Table */}
          {(reportData.type === 'Category wise Report' || reportData.type === 'Sub Category wise Report') && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Category</th>
                    {reportData.type === 'Sub Category wise Report' && (
                      <th style={{ padding: '9px 10px', textAlign: 'left' }}>Sub Category</th>
                    )}
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Items Count</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Received Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Amount (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Contribution (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.category_name}</td>
                        {reportData.type === 'Sub Category wise Report' && (
                          <td style={{ padding: '8px 10px' }}>{r.subcategory_name}</td>
                        )}
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.items_count}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.total_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.total_val.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>{r.total_vat.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.total_amt.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{r.contribution_pct}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#dcfce7', fontWeight: 700, color: '#166534', borderTop: '2px solid #86efac' }}>
                      <td style={{ padding: '9px 10px' }}>Total</td>
                      <td colSpan={reportData.type === 'Sub Category wise Report' ? 3 : 2} style={{ padding: '9px 10px' }}>{filteredRows.length} Groups</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.total_qty, 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_val, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_vat, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_amt, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 9. Item Name wise Report Table */}
          {reportData.type === 'Item Name wise Report' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Vendor</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Received Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Avg Price (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Total Amount (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{r.item_name}</td>
                        <td style={{ padding: '8px 10px', color: '#0369a1' }}>{r.barcode}</td>
                        <td style={{ padding: '8px 10px' }}>{r.category}</td>
                        <td style={{ padding: '8px 10px' }}>{r.vendor}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{r.total_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.avg_price.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.total_val.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>{r.total_vat.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.total_amt.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#dcfce7', fontWeight: 700, color: '#166534', borderTop: '2px solid #86efac' }}>
                      <td style={{ padding: '9px 10px' }}>Total</td>
                      <td colSpan={4} style={{ padding: '9px 10px' }}>{filteredRows.length} Items Listed</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.total_qty, 0)}</td>
                      <td style={{ padding: '9px 10px' }}></td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_val, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_vat, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.total_amt, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 10. Vendor wise Receive Return & Current Stock Table */}
          {reportData.type === 'Vendor wise Receive Return & Current Stock Report' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Vendor Name</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Rcv Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Rcv Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Return Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Return Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Net Rcv Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Net Rcv Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Stock Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Stock Value (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.vendor_name}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{r.rcv_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.rcv_val.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626' }}>{r.ret_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626' }}>{r.ret_val.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.net_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.net_val.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0369a1', fontWeight: 600 }}>{r.stock_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0369a1' }}>{r.stock_val.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#dcfce7', fontWeight: 700, color: '#166534', borderTop: '2px solid #86efac' }}>
                      <td style={{ padding: '9px 10px' }}>Total</td>
                      <td style={{ padding: '9px 10px' }}>{filteredRows.length} Vendors</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.rcv_qty, 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.rcv_val, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.ret_qty, 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.ret_val, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.net_qty, 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.net_val, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.stock_qty, 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.stock_val, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 11. Vendor Wise Summary Report Table */}
          {reportData.type === 'Vendor Wise Summary Report' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Code</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Vendor Name</th>
                    <th style={{ padding: '9px 10px', textAlign: 'left' }}>Contact No</th>
                    <th style={{ padding: '9px 10px', textAlign: 'center' }}>Type</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Challans</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Received Qty</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Gross Value (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '9px 10px', textAlign: 'right' }}>Net Payable (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={11} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0369a1' }}>{r.vendor_code}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>{r.vendor_name}</td>
                        <td style={{ padding: '8px 10px' }}>{r.contact_no}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '0.75rem', fontWeight: 600 }}>{r.vendor_type}</span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>{r.challans_count}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{r.total_qty}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>{r.gross_value.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626' }}>{r.discount.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>{r.vat.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>{r.net_amount.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#dcfce7', fontWeight: 700, color: '#166534', borderTop: '2px solid #86efac' }}>
                      <td style={{ padding: '9px 10px' }}>Total</td>
                      <td colSpan={4} style={{ padding: '9px 10px' }}>{filteredRows.length} Vendors Listed</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.challans_count, 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>{filteredRows.reduce((sum, r) => sum + r.total_qty, 0)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.gross_value, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.discount, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.vat, 0).toFixed(2)}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>৳ {filteredRows.reduce((sum, r) => sum + r.net_amount, 0).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default PurchaseReceiveReport;
