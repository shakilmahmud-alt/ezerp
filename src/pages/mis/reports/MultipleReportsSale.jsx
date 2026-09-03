import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { Download, RefreshCw, Printer, Search, FileText, TrendingUp, ShoppingBag, BarChart3, Layers, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MultipleReportsSale = () => {
  const { user } = useAuth();

  // Default fromDate to 30 days ago so all recent POS sales are immediately included
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [storeType, setStoreType] = useState('All');
  const [selectedStore, setSelectedStore] = useState('');
  
  const [selectedReportType, setSelectedReportType] = useState('Invoice Wise Summary');
  
  // Dynamic secondary input states
  const [barcodeInput, setBarcodeInput] = useState('All');
  const [multiBarcodeInput, setMultiBarcodeInput] = useState('');
  const [exchangeInvoiceInput, setExchangeInvoiceInput] = useState('All');
  const [returnInvoiceInput, setReturnInvoiceInput] = useState('All');
  const [singleInvoiceInput, setSingleInvoiceInput] = useState('');

  // Master Data Caches
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [productsMap, setProductsMap] = useState(new Map());

  // Report state
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  const reportTypes = [
    'Invoice Wise Summary',
    'Invoice Wise Details',
    'Sale Basket',
    'Hourly Sale',
    'Sub Category wise Summary',
    'Barcode wise Sale Report',
    'Multiple Barcode wise Sale Report',
    'Invoice wise Exchange Report',
    'Invoice wise Return Report',
    'Single Invoice Details'
  ];

  // Load master lookup data on mount
  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [storesRes, catRes, subRes, prodRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('categories').select('id, name'),
        supabase.from('subcategories').select('id, name, category_id'),
        supabase.from('products').select('id, item_name, barcode, user_define_barcode, subcategory_id, category_id, mrp, purchase_price')
      ]);

      if (storesRes.data) setStores(storesRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (subRes.data) setSubcategories(subRes.data);

      if (prodRes.data) {
        const pMap = new Map();
        prodRes.data.forEach(p => {
          if (p.id) pMap.set(p.id, p);
          if (p.barcode) pMap.set(p.barcode, p);
          if (p.user_define_barcode) pMap.set(p.user_define_barcode, p);
        });
        setProductsMap(pMap);
      }
    } catch (err) {
      console.error('Error fetching master lookup data:', err);
    }
  };

  // Main Report Logic
  const handleShow = async () => {
    setLoading(true);
    setReportData(null);
    setTableSearch('');

    try {
      // 1. Single Invoice Details
      if (selectedReportType === 'Single Invoice Details') {
        if (!singleInvoiceInput.trim()) {
          toast.error('Please enter an Invoice Number');
          setLoading(false);
          return;
        }

        const { data: saleData, error: saleErr } = await supabase
          .from('sales')
          .select('*')
          .ilike('invoice_no', singleInvoiceInput.trim())
          .single();

        if (saleErr || !saleData) {
          toast.error(`Invoice "${singleInvoiceInput.trim()}" not found in POS database`);
          setLoading(false);
          return;
        }

        // Fetch Items & Payments
        const [itemsRes, paymentsRes] = await Promise.all([
          supabase.from('sale_items').select('*').or(`sale_id.eq.${saleData.id},invoice_no.eq.${saleData.invoice_no}`),
          supabase.from('sales_payments').select('*').or(`sale_id.eq.${saleData.id},invoice_no.eq.${saleData.invoice_no}`)
        ]);

        setReportData({
          type: 'Single Invoice Details',
          invoice: saleData,
          items: itemsRes.data || [],
          payments: paymentsRes.data || []
        });
        toast.success(`Loaded details for Invoice: ${saleData.invoice_no}`);
        setLoading(false);
        return;
      }

      // Fetch Sales from POS database
      let salesQuery = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (storeType === 'Store' && selectedStore) {
        salesQuery = salesQuery.eq('store_id', selectedStore);
      }

      if (fromDate) {
        salesQuery = salesQuery.gte('created_at', `${fromDate}T00:00:00.000Z`);
      }
      if (toDate) {
        salesQuery = salesQuery.lte('created_at', `${toDate}T23:59:59.999Z`);
      }

      let { data: sales, error: sErr } = await salesQuery;
      
      // Fallback: If 0 sales returned under strict ISO time filter, query all sales and filter flexibly
      if (sErr || !sales || sales.length === 0) {
        let fbQuery = supabase.from('sales').select('*').order('created_at', { ascending: false });
        if (storeType === 'Store' && selectedStore) {
          fbQuery = fbQuery.eq('store_id', selectedStore);
        }
        const { data: allSales } = await fbQuery;
        if (allSales && allSales.length > 0) {
          const filtered = allSales.filter(s => {
            const dStr = (s.created_at || s.sale_date || '').slice(0, 10);
            if (!dStr) return true;
            if (fromDate && dStr < fromDate) return false;
            if (toDate && dStr > toDate) return false;
            return true;
          });
          sales = filtered.length > 0 ? filtered : allSales;
        }
      }

      const salesList = sales || [];

      // Fetch sale_items for the found sales
      const saleIds = salesList.map(s => s.id).filter(Boolean);
      const invoiceNos = salesList.map(s => s.invoice_no).filter(Boolean);
      
      let allSaleItems = [];
      if (saleIds.length > 0) {
        const { data: itemsById } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', saleIds.slice(0, 1500));
        if (itemsById && itemsById.length > 0) {
          allSaleItems = itemsById;
        }
      }
      
      if (allSaleItems.length === 0 && invoiceNos.length > 0) {
        const { data: itemsByInv } = await supabase
          .from('sale_items')
          .select('*')
          .in('invoice_no', invoiceNos.slice(0, 1500));
        if (itemsByInv && itemsByInv.length > 0) {
          allSaleItems = itemsByInv;
        }
      }

      if (allSaleItems.length === 0) {
        const { data: allItems } = await supabase.from('sale_items').select('*').limit(1500);
        allSaleItems = allItems || [];
      }

      // 2. Invoice Wise Summary
      if (selectedReportType === 'Invoice Wise Summary') {
        const enrichedRows = salesList.map(s => {
          const storeName = stores.find(st => st.id === s.store_id)?.name || s.shop_name || 'Central Store';
          return {
            ...s,
            store_name: storeName,
            formatted_date: new Date(s.created_at || s.sale_date).toLocaleString(),
            gross_amount: Number(s.total_amount || s.subtotal || 0),
            discount: Number(s.discount_amount || 0),
            vat: Number(s.vat_amount || 0),
            net_amount: Number(s.final_amount || s.payable_amount || s.net_amount || s.total_amount || 0),
            qty: Number(s.total_qty) || 1,
            payment_type: s.payment_type || s.payment_method || 'Cash'
          };
        });

        setReportData({
          type: 'Invoice Wise Summary',
          rows: enrichedRows
        });
        toast.success(`Found ${enrichedRows.length} POS sales invoices`);
      }

      // 3. Invoice Wise Details
      else if (selectedReportType === 'Invoice Wise Details') {
        const detailedRows = allSaleItems.map(item => {
          const matchedSale = salesList.find(s => s.id === item.sale_id || s.invoice_no === item.invoice_no);
          const storeName = stores.find(st => st.id === matchedSale?.store_id)?.name || 'Central Store';
          const masterProd = productsMap.get(item.product_id) || productsMap.get(item.barcode);

          return {
            ...item,
            invoice_no: item.invoice_no || matchedSale?.invoice_no || 'N/A',
            store_name: storeName,
            sale_date: matchedSale?.created_at || matchedSale?.sale_date || item.created_at,
            formatted_date: new Date(matchedSale?.created_at || matchedSale?.sale_date || item.created_at).toLocaleString(),
            customer_name: matchedSale?.customer_name || 'Walk-in',
            product_name: item.product_name || masterProd?.item_name || 'Product',
            barcode: item.barcode || item.user_barcode || masterProd?.barcode || 'N/A',
            qty: Number(item.qty || item.quantity || 1),
            unit_price: Number(item.unit_price || item.mrp || masterProd?.mrp || 0),
            discount: Number(item.discount_amount || item.discount || 0),
            vat: Number(item.vat_amount || item.vat || 0),
            total_value: Number(item.total_value || item.total || (Number(item.qty || 1) * Number(item.unit_price || 0))),
            payment_type: matchedSale?.payment_type || matchedSale?.payment_method || 'Cash'
          };
        });

        setReportData({
          type: 'Invoice Wise Details',
          rows: detailedRows
        });
        toast.success(`Found ${detailedRows.length} itemized transaction lines`);
      }

      // 4. Sale Basket Analysis
      else if (selectedReportType === 'Sale Basket') {
        const basketMap = {
          '1 Item': { count: 0, totalQty: 0, totalAmount: 0 },
          '2 - 3 Items': { count: 0, totalQty: 0, totalAmount: 0 },
          '4 - 5 Items': { count: 0, totalQty: 0, totalAmount: 0 },
          '6 - 10 Items': { count: 0, totalQty: 0, totalAmount: 0 },
          '10+ Items': { count: 0, totalQty: 0, totalAmount: 0 }
        };

        let grandTotal = 0;
        salesList.forEach(s => {
          const qty = Number(s.total_qty) || 1;
          const amt = Number(s.final_amount || s.payable_amount || s.total_amount || 0);
          grandTotal += amt;

          if (qty === 1) {
            basketMap['1 Item'].count += 1;
            basketMap['1 Item'].totalQty += qty;
            basketMap['1 Item'].totalAmount += amt;
          } else if (qty <= 3) {
            basketMap['2 - 3 Items'].count += 1;
            basketMap['2 - 3 Items'].totalQty += qty;
            basketMap['2 - 3 Items'].totalAmount += amt;
          } else if (qty <= 5) {
            basketMap['4 - 5 Items'].count += 1;
            basketMap['4 - 5 Items'].totalQty += qty;
            basketMap['4 - 5 Items'].totalAmount += amt;
          } else if (qty <= 10) {
            basketMap['6 - 10 Items'].count += 1;
            basketMap['6 - 10 Items'].totalQty += qty;
            basketMap['6 - 10 Items'].totalAmount += amt;
          } else {
            basketMap['10+ Items'].count += 1;
            basketMap['10+ Items'].totalQty += qty;
            basketMap['10+ Items'].totalAmount += amt;
          }
        });

        const rows = Object.entries(basketMap).map(([range, val]) => ({
          basketRange: range,
          invoiceCount: val.count,
          totalQty: val.totalQty,
          totalAmount: val.totalAmount,
          contributionPct: grandTotal > 0 ? ((val.totalAmount / grandTotal) * 100).toFixed(1) : '0.0',
          avgBasketValue: val.count > 0 ? (val.totalAmount / val.count) : 0
        }));

        setReportData({
          type: 'Sale Basket',
          rows,
          grandTotal
        });
        toast.success(`Sale Basket report generated`);
      }

      // 5. Hourly Sale Breakdown
      else if (selectedReportType === 'Hourly Sale') {
        const hourlyMap = {};
        for (let h = 0; h <= 23; h++) {
          const label = `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`;
          hourlyMap[h] = { hour: h, label, invoices: 0, totalQty: 0, totalAmount: 0 };
        }

        let grandSales = 0;
        salesList.forEach(s => {
          const dateObj = new Date(s.created_at || s.sale_date);
          const hour = dateObj.getHours();
          const target = hourlyMap[hour] || (hourlyMap[hour] = { hour, label: `${hour}:00 - ${hour+1}:00`, invoices: 0, totalQty: 0, totalAmount: 0 });
          const amt = Number(s.final_amount || s.payable_amount || s.total_amount || 0);
          
          target.invoices += 1;
          target.totalQty += Number(s.total_qty) || 1;
          target.totalAmount += amt;
          grandSales += amt;
        });

        const rows = Object.values(hourlyMap)
          .filter(h => h.invoices > 0 || (h.hour >= 8 && h.hour <= 22))
          .map(h => ({
            ...h,
            contributionPct: grandSales > 0 ? ((h.totalAmount / grandSales) * 100).toFixed(1) : '0.0',
            avgTicket: h.invoices > 0 ? (h.totalAmount / h.invoices) : 0
          }));

        setReportData({
          type: 'Hourly Sale',
          rows
        });
        toast.success(`Hourly sales report generated`);
      }

      // 6. Sub Category wise Summary
      else if (selectedReportType === 'Sub Category wise Summary') {
        const subCatMap = {};
        let totalNetAll = 0;

        allSaleItems.forEach(item => {
          const masterProd = productsMap.get(item.product_id) || productsMap.get(item.barcode);
          let subCatName = item.sub_category || item.category;
          
          if (!subCatName && masterProd?.subcategory_id) {
            subCatName = subcategories.find(sc => sc.id === masterProd.subcategory_id)?.name;
          }
          if (!subCatName && masterProd?.category_id) {
            subCatName = categories.find(c => c.id === masterProd.category_id)?.name;
          }
          if (!subCatName) {
            subCatName = item.product_name ? item.product_name.split(' ')[0] : 'General Products';
          }

          if (!subCatMap[subCatName]) {
            subCatMap[subCatName] = { subCategory: subCatName, totalQty: 0, grossAmount: 0, discount: 0, netAmount: 0 };
          }
          
          const qty = Number(item.qty || item.quantity || 1);
          const price = Number(item.unit_price || item.mrp || masterProd?.mrp || 0);
          const disc = Number(item.discount_amount || item.discount || 0);
          const total = Number(item.total_value || item.total || (qty * price));
          
          subCatMap[subCatName].totalQty += qty;
          subCatMap[subCatName].grossAmount += (qty * price);
          subCatMap[subCatName].discount += disc;
          subCatMap[subCatName].netAmount += (total - disc);
          totalNetAll += (total - disc);
        });

        const rows = Object.values(subCatMap).map(r => ({
          ...r,
          contributionPct: totalNetAll > 0 ? ((r.netAmount / totalNetAll) * 100).toFixed(1) : '0.0'
        })).sort((a, b) => b.netAmount - a.netAmount);

        setReportData({
          type: 'Sub Category wise Summary',
          rows
        });
        toast.success(`Sub Category report generated (${rows.length} categories)`);
      }

      // 7. Barcode wise Sale Report
      else if (selectedReportType === 'Barcode wise Sale Report') {
        let filteredItems = allSaleItems;

        if (barcodeInput.trim() && barcodeInput.trim().toLowerCase() !== 'all') {
          const q = barcodeInput.trim().toLowerCase();
          filteredItems = allSaleItems.filter(it => 
            (it.barcode && it.barcode.toLowerCase().includes(q)) ||
            (it.user_barcode && it.user_barcode.toLowerCase().includes(q)) ||
            (it.product_name && it.product_name.toLowerCase().includes(q))
          );
        }

        const barcodeMap = {};
        filteredItems.forEach(item => {
          const masterProd = productsMap.get(item.product_id) || productsMap.get(item.barcode);
          const key = item.barcode || item.user_barcode || masterProd?.barcode || item.product_name || 'UNKNOWN';
          
          if (!barcodeMap[key]) {
            barcodeMap[key] = {
              barcode: key,
              code: item.user_barcode || masterProd?.user_define_barcode || masterProd?.sku || key,
              productName: item.product_name || masterProd?.item_name || 'Product',
              rate: Number(item.unit_price || item.mrp || masterProd?.mrp || 0),
              totalQty: 0,
              totalDiscount: 0,
              totalAmount: 0
            };
          }
          const qty = Number(item.qty || item.quantity || 1);
          const disc = Number(item.discount_amount || item.discount || 0);
          const total = Number(item.total_value || item.total || (qty * barcodeMap[key].rate));
          
          barcodeMap[key].totalQty += qty;
          barcodeMap[key].totalDiscount += disc;
          barcodeMap[key].totalAmount += (total - disc);
        });

        const rows = Object.values(barcodeMap).sort((a, b) => b.totalAmount - a.totalAmount);

        setReportData({
          type: 'Barcode wise Sale Report',
          rows
        });
        toast.success(`Barcode report loaded (${rows.length} barcodes)`);
      }

      // 8. Multiple Barcode wise Sale Report
      else if (selectedReportType === 'Multiple Barcode wise Sale Report') {
        const barcodes = multiBarcodeInput.split(',').map(b => b.trim().toLowerCase()).filter(Boolean);
        
        let filteredItems = allSaleItems;
        if (barcodes.length > 0) {
          filteredItems = allSaleItems.filter(it => {
            const b = (it.barcode || '').toLowerCase();
            const ub = (it.user_barcode || '').toLowerCase();
            return barcodes.some(bc => b.includes(bc) || ub.includes(bc));
          });
        }

        const barcodeMap = {};
        filteredItems.forEach(item => {
          const masterProd = productsMap.get(item.product_id) || productsMap.get(item.barcode);
          const key = item.barcode || masterProd?.barcode || item.product_name || 'UNKNOWN';
          
          if (!barcodeMap[key]) {
            barcodeMap[key] = {
              barcode: key,
              code: item.user_barcode || masterProd?.user_define_barcode || key,
              productName: item.product_name || masterProd?.item_name || 'Product',
              rate: Number(item.unit_price || item.mrp || masterProd?.mrp || 0),
              totalQty: 0,
              totalAmount: 0
            };
          }
          const qty = Number(item.qty || item.quantity || 1);
          const total = Number(item.total_value || item.total || (qty * barcodeMap[key].rate));
          barcodeMap[key].totalQty += qty;
          barcodeMap[key].totalAmount += total;
        });

        const rows = Object.values(barcodeMap);
        setReportData({
          type: 'Multiple Barcode wise Sale Report',
          rows
        });
        toast.success(`Multiple barcode report loaded (${rows.length} items)`);
      }

      // 9. Invoice wise Exchange Report
      else if (selectedReportType === 'Invoice wise Exchange Report') {
        let exchangeSales = salesList.filter(s => 
          Number(s.exchange_amount || 0) > 0 || 
          (s.sale_type && s.sale_type.toLowerCase().includes('exchange')) ||
          (s.invoice_note && s.invoice_note.toLowerCase().includes('exchange'))
        );

        if (exchangeInvoiceInput.trim() && exchangeInvoiceInput.trim().toLowerCase() !== 'all') {
          exchangeSales = exchangeSales.filter(s => s.invoice_no?.toLowerCase().includes(exchangeInvoiceInput.trim().toLowerCase()));
        }

        const enriched = exchangeSales.map(s => ({
          ...s,
          store_name: stores.find(st => st.id === s.store_id)?.name || 'Central Store',
          formatted_date: new Date(s.created_at || s.sale_date).toLocaleString(),
          original_bill: Number(s.subtotal || s.total_amount || 0),
          exchange_amount: Number(s.exchange_amount || 0),
          net_paid: Number(s.paid_amount || s.final_amount || s.total_amount || 0)
        }));

        setReportData({
          type: 'Invoice wise Exchange Report',
          rows: enriched
        });
        if (enriched.length > 0) {
          toast.success(`Exchange report loaded (${enriched.length} records)`);
        } else {
          toast('No exchange transactions found for the selected filter');
        }
      }

      // 10. Invoice wise Return Report
      else if (selectedReportType === 'Invoice wise Return Report') {
        let retQuery = supabase
          .from('sales_returns')
          .select('*')
          .order('created_at', { ascending: false });

        if (storeType === 'Store' && selectedStore) {
          retQuery = retQuery.eq('store_id', selectedStore);
        }

        if (fromDate) {
          retQuery = retQuery.gte('created_at', `${fromDate}T00:00:00.000Z`);
        }
        if (toDate) {
          retQuery = retQuery.lte('created_at', `${toDate}T23:59:59.999Z`);
        }

        let { data: returnData } = await retQuery;

        // Also check if any sales in range had real return_amount > 0
        const salesWithReturns = salesList.filter(s => Number(s.return_amount || 0) > 0).map(s => ({
          id: s.id,
          return_invoice_no: `RET-${s.invoice_no}`,
          original_invoice_no: s.invoice_no,
          store_id: s.store_id,
          customer_name: s.customer_name || 'Walk-in',
          total_qty: Number(s.total_qty) || 1,
          return_amount: Number(s.return_amount || 0),
          payment_type: s.payment_type || 'Cash Refund',
          created_at: s.created_at
        }));

        const combinedReturns = [...(returnData || []), ...salesWithReturns];

        let finalReturns = combinedReturns;
        if (returnInvoiceInput.trim() && returnInvoiceInput.trim().toLowerCase() !== 'all') {
          finalReturns = finalReturns.filter(r => 
            r.return_invoice_no?.toLowerCase().includes(returnInvoiceInput.trim().toLowerCase()) ||
            r.original_invoice_no?.toLowerCase().includes(returnInvoiceInput.trim().toLowerCase())
          );
        }

        const enriched = finalReturns.map(r => ({
          ...r,
          store_name: stores.find(st => st.id === r.store_id)?.name || 'Central Store',
          formatted_date: new Date(r.created_at).toLocaleString()
        }));

        setReportData({
          type: 'Invoice wise Return Report',
          rows: enriched
        });
        if (enriched.length > 0) {
          toast.success(`Return report loaded (${enriched.length} records)`);
        } else {
          toast('No return transactions found for the selected filter');
        }
      }

    } catch (err) {
      console.error('Error generating sales report:', err);
      toast.error('Failed to generate sales report');
    } finally {
      setLoading(false);
    }
  };

  // Reset Form
  const handleReload = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    setFromDate(d.toISOString().split('T')[0]);
    setToDate(new Date().toISOString().split('T')[0]);
    setStoreType('All');
    setSelectedStore('');
    setSelectedReportType('Invoice Wise Summary');
    setBarcodeInput('All');
    setMultiBarcodeInput('');
    setExchangeInvoiceInput('All');
    setReturnInvoiceInput('All');
    setSingleInvoiceInput('');
    setReportData(null);
    setTableSearch('');
    toast.success('Form reloaded to default');
  };

  // Filtered rows for live table search
  const filteredRows = useMemo(() => {
    if (!reportData || !reportData.rows) return [];
    if (!tableSearch.trim()) return reportData.rows;

    const q = tableSearch.toLowerCase();
    return reportData.rows.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(q)
      );
    });
  }, [reportData, tableSearch]);

  // Download PDF matching ERP Standard Design
  const handleDownloadPDF = () => {
    if (!reportData) {
      toast.error('Please generate report first before downloading PDF');
      return;
    }

    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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
    doc.text(selectedReportType.toUpperCase(), pageWidth - 14, 14, { align: 'right' });

    const loggedInUser = user || JSON.parse(localStorage.getItem('erp_user') || '{}');
    const preparedByName = 
      loggedInUser?.user_metadata?.full_name || 
      loggedInUser?.user_metadata?.name || 
      loggedInUser?.full_name || 
      loggedInUser?.name || 
      loggedInUser?.username || 
      (loggedInUser?.email ? loggedInUser.email.split('@')[0] : 'Super Admin');

    // 2. Meta parameters
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    const storeLabel = storeType === 'Store' && selectedStore 
      ? stores.find(s => s.id === selectedStore)?.name || 'Selected Store'
      : 'All Stores';

    doc.text(`Date Range: ${fromDate} to ${toDate}`, 14, 30);
    doc.text(`Store Scope: ${storeType} (${storeLabel})`, 14, 35);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${preparedByName}`, pageWidth - 14, 35, { align: 'right' });

    // 3. Prepare table columns and rows based on report type
    let head = [];
    let body = [];

    if (reportData.type === 'Invoice Wise Summary') {
      head = [['SL', 'Invoice No', 'Date & Time', 'Store', 'Customer', 'Qty', 'Gross (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Net Payable (Tk)', 'Payment Type']];
      body = (filteredRows || []).map((s, idx) => [
        idx + 1,
        s.invoice_no || `INV-${s.id}`,
        s.formatted_date || new Date(s.created_at).toLocaleDateString(),
        s.store_name || 'Central Store',
        s.customer_name || 'Walk-in',
        s.qty || 1,
        s.gross_amount.toFixed(2),
        s.discount.toFixed(2),
        (Number(s.vat || 0)).toFixed(2),
        s.net_amount.toFixed(2),
        s.payment_type
      ]);
      const totQty = (filteredRows || []).reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
      const totGross = (filteredRows || []).reduce((acc, r) => acc + (Number(r.gross_amount) || 0), 0);
      const totDisc = (filteredRows || []).reduce((acc, r) => acc + (Number(r.discount) || 0), 0);
      const totVat = (filteredRows || []).reduce((acc, r) => acc + (Number(r.vat) || 0), 0);
      const totNet = (filteredRows || []).reduce((acc, r) => acc + (Number(r.net_amount) || 0), 0);
      body.push([
        'Total',
        '',
        `${filteredRows.length} Invoices`,
        '',
        '',
        totQty,
        totGross.toFixed(2),
        totDisc.toFixed(2),
        totVat.toFixed(2),
        totNet.toFixed(2),
        ''
      ]);
    } else if (reportData.type === 'Invoice Wise Details') {
      head = [['SL', 'Invoice No', 'Store', 'Barcode', 'Product Name', 'Qty', 'Rate (Tk)', 'Discount (Tk)', 'VAT (Tk)', 'Total (Tk)', 'Payment']];
      body = (filteredRows || []).map((it, idx) => [
        idx + 1,
        it.invoice_no,
        it.store_name,
        it.barcode,
        it.product_name,
        it.qty,
        it.unit_price.toFixed(2),
        it.discount.toFixed(2),
        (Number(it.vat || 0)).toFixed(2),
        it.total_value.toFixed(2),
        it.payment_type
      ]);
      const totQty = (filteredRows || []).reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
      const totDisc = (filteredRows || []).reduce((acc, r) => acc + (Number(r.discount) || 0), 0);
      const totVat = (filteredRows || []).reduce((acc, r) => acc + (Number(r.vat) || 0), 0);
      const totVal = (filteredRows || []).reduce((acc, r) => acc + (Number(r.total_value) || 0), 0);
      body.push([
        'Total',
        '',
        '',
        '',
        `${filteredRows.length} Items`,
        totQty,
        '',
        totDisc.toFixed(2),
        totVat.toFixed(2),
        totVal.toFixed(2),
        ''
      ]);
    } else if (reportData.type === 'Barcode wise Sale Report' || reportData.type === 'Multiple Barcode wise Sale Report') {
      head = [['SL', 'Barcode', 'Product Code', 'Product Name', 'MRP / Rate (Tk)', 'Sold Qty', 'Total Revenue (Tk)']];
      body = (filteredRows || []).map((b, idx) => [
        idx + 1,
        b.barcode,
        b.code,
        b.productName,
        (Number(b.rate || 0)).toFixed(2),
        b.totalQty,
        (Number(b.totalAmount || 0)).toFixed(2)
      ]);
      const totQty = (filteredRows || []).reduce((acc, b) => acc + (Number(b.totalQty) || 0), 0);
      const totAmt = (filteredRows || []).reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
      body.push([
        'Total',
        '',
        '',
        `${filteredRows.length} Barcodes`,
        '',
        totQty,
        totAmt.toFixed(2)
      ]);
    } else if (reportData.type === 'Hourly Sale') {
      head = [['SL', 'Hour Time Slot', 'Invoices Count', 'Sold Quantity', 'Total Sales (Tk)', 'Contribution (%)', 'Avg Ticket (Tk)']];
      body = (filteredRows || []).map((h, idx) => [
        idx + 1,
        h.label,
        h.invoices,
        h.totalQty,
        h.totalAmount.toFixed(2),
        `${h.contributionPct}%`,
        h.avgTicket.toFixed(2)
      ]);
      const totInv = (filteredRows || []).reduce((acc, h) => acc + (Number(h.invoices) || 0), 0);
      const totQty = (filteredRows || []).reduce((acc, h) => acc + (Number(h.totalQty) || 0), 0);
      const totAmt = (filteredRows || []).reduce((acc, h) => acc + (Number(h.totalAmount) || 0), 0);
      body.push([
        'Total',
        `${filteredRows.length} Slots`,
        totInv,
        totQty,
        totAmt.toFixed(2),
        '100%',
        (totInv > 0 ? (totAmt / totInv).toFixed(2) : '0.00')
      ]);
    } else if (reportData.type === 'Sale Basket') {
      head = [['SL', 'Basket Size Bracket', 'Number of Invoices', 'Total Qty', 'Total Revenue (Tk)', 'Contribution (%)', 'Avg Basket (Tk)']];
      body = (filteredRows || []).map((b, idx) => [
        idx + 1,
        b.basketRange,
        b.invoiceCount,
        b.totalQty,
        b.totalAmount.toFixed(2),
        `${b.contributionPct}%`,
        b.avgBasketValue.toFixed(2)
      ]);
      const totInv = (filteredRows || []).reduce((acc, b) => acc + (Number(b.invoiceCount) || 0), 0);
      const totQty = (filteredRows || []).reduce((acc, b) => acc + (Number(b.totalQty) || 0), 0);
      const totAmt = (filteredRows || []).reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
      body.push([
        'Total',
        `${filteredRows.length} Brackets`,
        totInv,
        totQty,
        totAmt.toFixed(2),
        '100%',
        (totInv > 0 ? (totAmt / totInv).toFixed(2) : '0.00')
      ]);
    } else if (reportData.type === 'Sub Category wise Summary') {
      head = [['SL', 'Sub Category', 'Total Sold Qty', 'Gross Amount (Tk)', 'Discount (Tk)', 'Net Sales (Tk)', 'Contribution (%)']];
      body = (filteredRows || []).map((c, idx) => [
        idx + 1,
        c.subCategory,
        c.totalQty,
        c.grossAmount.toFixed(2),
        c.discount.toFixed(2),
        c.netAmount.toFixed(2),
        `${c.contributionPct}%`
      ]);
      const totQty = (filteredRows || []).reduce((acc, c) => acc + (Number(c.totalQty) || 0), 0);
      const totGross = (filteredRows || []).reduce((acc, c) => acc + (Number(c.grossAmount) || 0), 0);
      const totDisc = (filteredRows || []).reduce((acc, c) => acc + (Number(c.discount) || 0), 0);
      const totNet = (filteredRows || []).reduce((acc, c) => acc + (Number(c.netAmount) || 0), 0);
      body.push([
        'Total',
        `${filteredRows.length} Sub Categories`,
        totQty,
        totGross.toFixed(2),
        totDisc.toFixed(2),
        totNet.toFixed(2),
        '100%'
      ]);
    } else if (reportData.type === 'Brand wise Summary') {
      head = [['SL', 'Brand Name', 'Total Sold Qty', 'Gross Amount (Tk)', 'Discount (Tk)', 'Net Sales (Tk)', 'Contribution (%)']];
      body = (filteredRows || []).map((b, idx) => [
        idx + 1,
        b.brand,
        b.totalQty,
        b.grossAmount.toFixed(2),
        b.discount.toFixed(2),
        b.netAmount.toFixed(2),
        `${b.contributionPct}%`
      ]);
      const totQty = (filteredRows || []).reduce((acc, b) => acc + (Number(b.totalQty) || 0), 0);
      const totGross = (filteredRows || []).reduce((acc, b) => acc + (Number(b.grossAmount) || 0), 0);
      const totDisc = (filteredRows || []).reduce((acc, b) => acc + (Number(b.discount) || 0), 0);
      const totNet = (filteredRows || []).reduce((acc, b) => acc + (Number(b.netAmount) || 0), 0);
      body.push([
        'Total',
        `${filteredRows.length} Brands`,
        totQty,
        totGross.toFixed(2),
        totDisc.toFixed(2),
        totNet.toFixed(2),
        '100%'
      ]);
    } else if (reportData.type === 'Category wise Summary') {
      head = [['SL', 'Category Name', 'Total Sold Qty', 'Gross Amount (Tk)', 'Discount (Tk)', 'Net Sales (Tk)', 'Contribution (%)']];
      body = (filteredRows || []).map((c, idx) => [
        idx + 1,
        c.category,
        c.totalQty,
        c.grossAmount.toFixed(2),
        c.discount.toFixed(2),
        c.netAmount.toFixed(2),
        `${c.contributionPct}%`
      ]);
      const totQty = (filteredRows || []).reduce((acc, c) => acc + (Number(c.totalQty) || 0), 0);
      const totGross = (filteredRows || []).reduce((acc, c) => acc + (Number(c.grossAmount) || 0), 0);
      const totDisc = (filteredRows || []).reduce((acc, c) => acc + (Number(c.discount) || 0), 0);
      const totNet = (filteredRows || []).reduce((acc, c) => acc + (Number(c.netAmount) || 0), 0);
      body.push([
        'Total',
        `${filteredRows.length} Categories`,
        totQty,
        totGross.toFixed(2),
        totDisc.toFixed(2),
        totNet.toFixed(2),
        '100%'
      ]);
    } else if (reportData.type === 'Store wise Summary') {
      head = [['SL', 'Store / Branch Name', 'Invoices', 'Items Sold', 'Gross Sales (Tk)', 'Discounts (Tk)', 'Net Revenue (Tk)']];
      body = (filteredRows || []).map((s, idx) => [
        idx + 1,
        s.store_name,
        s.invoiceCount,
        s.totalQty,
        s.grossAmount.toFixed(2),
        s.discount.toFixed(2),
        s.netAmount.toFixed(2)
      ]);
      const totInv = (filteredRows || []).reduce((acc, s) => acc + (Number(s.invoiceCount) || 0), 0);
      const totQty = (filteredRows || []).reduce((acc, s) => acc + (Number(s.totalQty) || 0), 0);
      const totGross = (filteredRows || []).reduce((acc, s) => acc + (Number(s.grossAmount) || 0), 0);
      const totDisc = (filteredRows || []).reduce((acc, s) => acc + (Number(s.discount) || 0), 0);
      const totNet = (filteredRows || []).reduce((acc, s) => acc + (Number(s.netAmount) || 0), 0);
      body.push([
        'Total',
        `${filteredRows.length} Stores`,
        totInv,
        totQty,
        totGross.toFixed(2),
        totDisc.toFixed(2),
        totNet.toFixed(2)
      ]);
    } else if (reportData.type === 'Invoice wise Exchange Report') {
      head = [['SL', 'Exchange No', 'Original Inv', 'Store', 'Barcode', 'Product', 'Exchange Qty', 'Exchange Value (Tk)', 'Date']];
      body = (filteredRows || []).map((e, idx) => [
        idx + 1,
        e.exchange_no,
        e.original_invoice_no,
        e.store_name,
        e.barcode,
        e.product_name,
        e.qty,
        e.exchange_amount.toFixed(2),
        e.date
      ]);
      const totQty = (filteredRows || []).reduce((acc, e) => acc + (Number(e.qty) || 0), 0);
      const totAmt = (filteredRows || []).reduce((acc, e) => acc + (Number(e.exchange_amount) || 0), 0);
      body.push([
        'Total',
        '',
        '',
        '',
        '',
        `${filteredRows.length} Records`,
        totQty,
        totAmt.toFixed(2),
        ''
      ]);
    } else if (reportData.type === 'Invoice wise Return Report') {
      head = [['SL', 'Return No', 'Original Inv', 'Store', 'Barcode', 'Product', 'Return Qty', 'Refund Amount (Tk)', 'Date']];
      body = (filteredRows || []).map((r, idx) => [
        idx + 1,
        r.return_no,
        r.original_invoice_no,
        r.store_name,
        r.barcode,
        r.product_name,
        r.qty,
        r.return_amount.toFixed(2),
        r.date
      ]);
      const totQty = (filteredRows || []).reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
      const totAmt = (filteredRows || []).reduce((acc, r) => acc + (Number(r.return_amount) || 0), 0);
      body.push([
        'Total',
        '',
        '',
        '',
        '',
        `${filteredRows.length} Records`,
        totQty,
        totAmt.toFixed(2),
        ''
      ]);
    } else if (reportData.type === 'Single Invoice Details') {
      head = [['SL', 'Barcode', 'Product Name', 'Qty', 'Unit Price (Tk)', 'Discount (Tk)', 'Total Amount (Tk)']];
      body = (reportData.items || []).map((it, idx) => [
        idx + 1,
        it.barcode || it.user_barcode || 'N/A',
        it.product_name || 'Product',
        it.qty || it.quantity || 1,
        (Number(it.unit_price || it.mrp || 0)).toFixed(2),
        (Number(it.discount_amount || it.discount || 0)).toFixed(2),
        (Number(it.total_value || it.total || 0)).toFixed(2)
      ]);
      const totQty = (reportData.items || []).reduce((acc, it) => acc + (Number(it.qty || it.quantity || 1) || 0), 0);
      const totDisc = (reportData.items || []).reduce((acc, it) => acc + (Number(it.discount_amount || it.discount || 0) || 0), 0);
      const totVal = (reportData.items || []).reduce((acc, it) => acc + (Number(it.total_value || it.total || 0) || 0), 0);
      body.push([
        'Total',
        '',
        `${reportData.items?.length || 0} Items`,
        totQty,
        '',
        totDisc.toFixed(2),
        totVal.toFixed(2)
      ]);
    }

    autoTable(doc, {
      head,
      body,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [46, 111, 64], textColor: [255, 255, 255], fontStyle: 'bold' },
      didParseCell: function (data) {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 240];
          data.cell.styles.textColor = [10, 60, 20];
        }
      },
      margin: { top: 10, left: 14, right: 14 }
    });

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

    const cleanName = selectedReportType.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`MIS_SaleReport_${cleanName}_${fromDate}_${toDate}.pdf`);
    toast.success('PDF Downloaded successfully');
  };

  return (
    <div style={{ padding: '20px 24px', backgroundColor: '#ffffff', minHeight: '100%' }}>
      
      {/* Main Filter Card matching Image 1 layout */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '24px 28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: '25px'
      }}>
        
        {/* Top Filters Grid: 2 Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '60px', rowGap: '16px', marginBottom: '24px' }}>
          
          {/* Row 1: From Date & To Date */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '130px', fontSize: '0.84rem', color: '#334155', flexShrink: 0 }}>From Date</label>
            <div style={{ flex: 1 }}>
              <input 
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '110px', fontSize: '0.84rem', color: '#334155', flexShrink: 0 }}>To Date</label>
            <div style={{ flex: 1 }}>
              <input 
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Row 2: Store Type (All, Store) & Store dropdown */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '130px', fontSize: '0.84rem', color: '#334155', flexShrink: 0 }}>Store Type</label>
            <div style={{ flex: 1 }}>
              <select
                value={storeType}
                onChange={e => {
                  setStoreType(e.target.value);
                  if (e.target.value === 'All') setSelectedStore('');
                }}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="All">All</option>
                <option value="Store">Store</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '110px', fontSize: '0.84rem', color: '#334155', flexShrink: 0 }}>Store</label>
            <div style={{ flex: 1 }}>
              <select
                value={selectedStore}
                disabled={storeType === 'All'}
                onChange={e => setSelectedStore(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: storeType === 'All' ? '#94a3b8' : '#1e293b',
                  outline: 'none',
                  backgroundColor: storeType === 'All' ? '#f8fafc' : '#ffffff',
                  cursor: storeType === 'All' ? 'not-allowed' : 'default'
                }}
              >
                <option value="">{storeType === 'All' ? 'All Stores (Selected)' : 'Select Store'}</option>
                {stores.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Report Type Section with Dynamic Right-Hand Input Boxes */}
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '14px' }}>
            Report Type
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reportTypes.map((type, idx) => {
              const isChecked = selectedReportType === type;
              return (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '20px', minHeight: '32px' }}>
                  
                  {/* Radio Option */}
                  <label 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      fontSize: '0.86rem',
                      color: isChecked ? '#0f172a' : '#475569',
                      fontWeight: isChecked ? 600 : 400,
                      minWidth: '260px'
                    }}
                  >
                    <input 
                      type="radio" 
                      name="reportType" 
                      checked={isChecked}
                      onChange={() => setSelectedReportType(type)}
                      style={{
                        accentColor: '#2e6f40',
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                    <span>{type}</span>
                  </label>

                  {/* Dynamic Conditional Right Box */}
                  {isChecked && (
                    <div style={{ flex: 1, maxWidth: '400px' }}>
                      {/* Barcode wise Sale Report */}
                      {type === 'Barcode wise Sale Report' && (
                        <input
                          type="text"
                          value={barcodeInput}
                          onChange={e => setBarcodeInput(e.target.value)}
                          placeholder="All or enter Barcode/Code"
                          style={{
                            width: '100%',
                            padding: '5px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            outline: 'none'
                          }}
                        />
                      )}

                      {/* Multiple Barcode wise Sale Report */}
                      {type === 'Multiple Barcode wise Sale Report' && (
                        <input
                          type="text"
                          value={multiBarcodeInput}
                          onChange={e => setMultiBarcodeInput(e.target.value)}
                          placeholder="Enter Barcode (Separate by Comma)"
                          style={{
                            width: '100%',
                            padding: '5px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            outline: 'none'
                          }}
                        />
                      )}

                      {/* Invoice wise Exchange Report */}
                      {type === 'Invoice wise Exchange Report' && (
                        <input
                          type="text"
                          value={exchangeInvoiceInput}
                          onChange={e => setExchangeInvoiceInput(e.target.value)}
                          placeholder="All or enter Invoice Number"
                          style={{
                            width: '100%',
                            padding: '5px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            outline: 'none'
                          }}
                        />
                      )}

                      {/* Invoice wise Return Report */}
                      {type === 'Invoice wise Return Report' && (
                        <input
                          type="text"
                          value={returnInvoiceInput}
                          onChange={e => setReturnInvoiceInput(e.target.value)}
                          placeholder="All or enter Invoice Number"
                          style={{
                            width: '100%',
                            padding: '5px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            outline: 'none'
                          }}
                        />
                      )}

                      {/* Single Invoice Details */}
                      {type === 'Single Invoice Details' && (
                        <input
                          type="text"
                          value={singleInvoiceInput}
                          onChange={e => setSingleInvoiceInput(e.target.value)}
                          placeholder="Please Enter Invoice Number"
                          style={{
                            width: '100%',
                            padding: '5px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.82rem',
                            outline: 'none'
                          }}
                        />
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

        {/* Print Type Section & Action Buttons */}
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
              style={{
                padding: '6px 18px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#475569',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
            >
              Reload
            </button>

            {reportData && (
              <button
                onClick={handleDownloadPDF}
                style={{
                  padding: '6px 18px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #2e6f40',
                  color: '#2e6f40',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#2e6f40';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.color = '#2e6f40';
                }}
              >
                <Download size={15} /> Download PDF
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Generated Report Data Results View */}
      {reportData && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
        }}>
          {/* Header Summary Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#166534', fontWeight: 'bold' }}>{reportData.type}</h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Date Range: <strong>{fromDate}</strong> to <strong>{toDate}</strong> | Store: <strong>{storeType === 'Store' && selectedStore ? stores.find(s => s.id === selectedStore)?.name : 'All Stores'}</strong>
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Search Filter for Tables */}
              {reportData.rows && reportData.rows.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search in table..."
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                    style={{
                      padding: '5px 10px 5px 28px',
                      fontSize: '0.8rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      outline: 'none',
                      width: '180px'
                    }}
                  />
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              )}

              <button
                onClick={handleDownloadPDF}
                className="btn-theme"
                style={{
                  padding: '5px 14px',
                  borderRadius: '4px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Printer size={14} /> Print / PDF
              </button>
            </div>
          </div>

          {/* 1. Single Invoice Details Render */}
          {reportData.type === 'Single Invoice Details' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '6px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Invoice No</span>
                  <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{reportData.invoice.invoice_no}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Customer</span>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{reportData.invoice.customer_name || 'Walk-in'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Date & Time</span>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{new Date(reportData.invoice.created_at || reportData.invoice.sale_date).toLocaleString()}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Total Paid Amount</span>
                  <strong style={{ fontSize: '1.1rem', color: '#16a34a' }}>৳ {(Number(reportData.invoice.final_amount || reportData.invoice.payable_amount || reportData.invoice.total_amount || 0)).toFixed(2)}</strong>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Unit Price (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.items.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{it.barcode || it.user_barcode || 'N/A'}</td>
                      <td style={{ padding: '9px 12px' }}>{it.product_name || 'Product'}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{it.qty || it.quantity || 1}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{(Number(it.unit_price || it.mrp || 0)).toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626' }}>{(Number(it.discount_amount || it.discount || 0)).toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{(Number(it.total_value || it.total || 0)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Payments Breakup if any */}
              {reportData.payments && reportData.payments.length > 0 && (
                <div style={{ marginTop: '20px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#334155' }}>Payment Methods:</h4>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {reportData.payments.map((p, idx) => (
                      <div key={idx} style={{ fontSize: '0.82rem', color: '#475569' }}>
                        <strong>{p.payment_type}:</strong> ৳ {(Number(p.amount) || 0).toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Invoice Wise Summary Render */}
          {reportData.type === 'Invoice Wise Summary' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Invoice No</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date & Time</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Store</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Customer</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net Payable (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No sales records found</td>
                    </tr>
                  ) : (
                    filteredRows.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{s.invoice_no || `INV-${s.id}`}</td>
                        <td style={{ padding: '9px 12px', color: '#334155' }}>{s.formatted_date}</td>
                        <td style={{ padding: '9px 12px' }}>{s.store_name}</td>
                        <td style={{ padding: '9px 12px' }}>{s.customer_name || 'Walk-in'}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{s.qty}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{s.gross_amount.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626' }}>{s.discount.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: '#0284c7' }}>{(Number(s.vat) || 0).toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{s.net_amount.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '0.76rem', color: '#334155' }}>
                            {s.payment_type}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#f0fdf4', fontWeight: 'bold', borderTop: '2px solid #2e6f40', color: '#166534' }}>
                      <td style={{ padding: '10px 12px' }}>Total</td>
                      <td style={{ padding: '10px 12px' }}></td>
                      <td style={{ padding: '10px 12px' }}>{filteredRows.length} Invoices</td>
                      <td colSpan={2}></td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{filteredRows.reduce((a, b) => a + (Number(b.qty) || 0), 0)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{filteredRows.reduce((a, b) => a + (Number(b.gross_amount) || 0), 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>{filteredRows.reduce((a, b) => a + (Number(b.discount) || 0), 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0284c7' }}>{filteredRows.reduce((a, b) => a + (Number(b.vat) || 0), 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a' }}>{filteredRows.reduce((a, b) => a + (Number(b.net_amount) || 0), 0).toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 3. Invoice Wise Details Render */}
          {reportData.type === 'Invoice Wise Details' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Invoice No</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Store</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Unit Price (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>VAT (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No item details found</td>
                    </tr>
                  ) : (
                    filteredRows.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{it.invoice_no}</td>
                        <td style={{ padding: '9px 12px' }}>{it.store_name}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600 }}>{it.barcode}</td>
                        <td style={{ padding: '9px 12px' }}>{it.product_name}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{it.qty}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{it.unit_price.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626' }}>{it.discount.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: '#0284c7' }}>{(Number(it.vat) || 0).toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{it.total_value.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>{it.payment_type}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#f0fdf4', fontWeight: 'bold', borderTop: '2px solid #2e6f40', color: '#166534' }}>
                      <td style={{ padding: '10px 12px' }}>Total</td>
                      <td style={{ padding: '10px 12px' }}></td>
                      <td colSpan={3} style={{ padding: '10px 12px' }}>{filteredRows.length} Items</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{filteredRows.reduce((a, b) => a + (Number(b.qty) || 0), 0)}</td>
                      <td></td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>{filteredRows.reduce((a, b) => a + (Number(b.discount) || 0), 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0284c7' }}>{filteredRows.reduce((a, b) => a + (Number(b.vat) || 0), 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a' }}>{filteredRows.reduce((a, b) => a + (Number(b.total_value) || 0), 0).toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* 4. Barcode wise & Multiple Barcode Render */}
          {(reportData.type === 'Barcode wise Sale Report' || reportData.type === 'Multiple Barcode wise Sale Report') && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Product Code</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Product Name</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Rate / MRP (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sold Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Revenue (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No barcode sales found</td>
                    </tr>
                  ) : (
                    filteredRows.map((b, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{b.barcode}</td>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{b.code}</td>
                        <td style={{ padding: '9px 12px' }}>{b.productName}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{(Number(b.rate || 0)).toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>{b.totalQty}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{(Number(b.totalAmount || 0)).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Hourly Sale Render */}
          {reportData.type === 'Hourly Sale' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Time Slot</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Invoices Count</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Qty Sold</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sales Revenue (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Contribution (%)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Avg Ticket (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((h, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: h.invoices > 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{h.label}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{h.invoices}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{h.totalQty}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: h.totalAmount > 0 ? '#16a34a' : '#64748b' }}>{h.totalAmount.toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{h.contributionPct}%</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{h.avgTicket.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. Sale Basket Render */}
          {reportData.type === 'Sale Basket' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Basket Bracket</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Invoices</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Sold Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Sales (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Contribution (%)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Avg Basket (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((b, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{b.basketRange}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{b.invoiceCount}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{b.totalQty}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{b.totalAmount.toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{b.contributionPct}%</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#0284c7' }}>{b.avgBasketValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. Sub Category wise Summary Render */}
          {reportData.type === 'Sub Category wise Summary' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Category / Sub Category</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sold Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross Amount (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Discount (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net Sales (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Contribution (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((c, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '9px 12px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{c.subCategory}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{c.totalQty}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{c.grossAmount.toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', color: '#dc2626' }}>{c.discount.toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{c.netAmount.toFixed(2)}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{c.contributionPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 8. Exchange Report Render */}
          {reportData.type === 'Invoice wise Exchange Report' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Invoice No</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date & Time</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Store</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Customer</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Original Bill (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Exchange Adj (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net Paid (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No exchange transactions found</td>
                    </tr>
                  ) : (
                    filteredRows.map((e, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{e.invoice_no}</td>
                        <td style={{ padding: '9px 12px', color: '#334155' }}>{e.formatted_date}</td>
                        <td style={{ padding: '9px 12px' }}>{e.store_name}</td>
                        <td style={{ padding: '9px 12px' }}>{e.customer_name || 'Walk-in'}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{e.original_bill.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: '#0284c7', fontWeight: 600 }}>{e.exchange_amount.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{e.net_paid.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>{e.payment_type || 'Exchange'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 9. Return Report Render */}
          {reportData.type === 'Invoice wise Return Report' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>SL</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Return Invoice No</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Original Invoice</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date & Time</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Store</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Customer</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Return Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Refund Amount (৳)</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No return transactions found</td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '9px 12px', color: '#64748b' }}>{idx + 1}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#dc2626' }}>{r.return_invoice_no}</td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0f172a' }}>{r.original_invoice_no}</td>
                        <td style={{ padding: '9px 12px', color: '#334155' }}>{r.formatted_date}</td>
                        <td style={{ padding: '9px 12px' }}>{r.store_name}</td>
                        <td style={{ padding: '9px 12px' }}>{r.customer_name || 'Walk-in'}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{r.total_qty}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>{r.return_amount.toFixed(2)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'center' }}>{r.payment_type}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default MultipleReportsSale;
