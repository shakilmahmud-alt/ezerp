import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  Printer, Tag, ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../../../components/CustomSelect';

const CircularPriceChangedReport = () => {
  const { user } = useAuth();

  // Helper for today's date (YYYY-MM-DD)
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Filter States (Matching Image 2 Layout)
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');
  const [circularNoInput, setCircularNoInput] = useState('ALL');
  const [circularNameInput, setCircularNameInput] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('ALL');

  // 2. Dropdown Master Data Lists
  const [storesList, setStoresList] = useState([]);
  const [storeTypesList, setStoreTypesList] = useState(['ALL', 'Central Store', 'Warehouse', 'Store', 'Retail', 'Branch', 'Franchise']);
  const [brandsList, setBrandsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [subSubcategoriesList, setSubSubcategoriesList] = useState([]);
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
      const [storesRes, brandsRes, catsRes, subcatsRes, subSubcatsRes, prodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('brands').select('id, name, code').order('name'),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('subcategories').select('id, name, category_id').order('name'),
        supabase.from('sub_subcategories').select('id, name, category_name, subcategory_name').order('name'),
        supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, category_id, subcategory_id, sub_subcategory_id, brand_id, purchase_price, mrp')
      ]);

      const fetchedStores = storesRes.data || [];
      setStoresList(fetchedStores);
      setBrandsList(brandsRes.data || []);
      setCategoriesList(catsRes.data || []);
      setSubcategoriesList(subcatsRes.data || []);
      setSubSubcategoriesList(subSubcatsRes.data || []);

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
      console.error('Error loading master data in CircularPriceChangedReport:', err);
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
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSelectedSubCategory('ALL');
    setSelectedSubSubcategory('ALL');
    setItemNameInput('ALL');
    setCircularNoInput('ALL');
    setCircularNameInput('ALL');
    setBarcodeInput('ALL');
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
      // 1. Fetch circulars from promotions table
      const { data: promotionsData, error: promoErr } = await supabase
        .from('promotions')
        .select('*')
        .gte('valid_from', fromDate)
        .lte('valid_from', toDate)
        .order('valid_from', { ascending: false });

      if (promoErr) {
        console.error('Promotions fetch error:', promoErr);
      }

      // 2. Fetch promotion_items for all fetched promotions
      let promoItems = [];
      if (promotionsData && promotionsData.length > 0) {
        const promoIds = promotionsData.map(p => p.id);
        const { data: piData, error: piErr } = await supabase
          .from('promotion_items')
          .select('*')
          .in('promotion_id', promoIds);
        if (!piErr && piData) {
          promoItems = piData;
        }
      }

      // 3. Also check price_change_circulars if available
      let priceChangeCirculars = [];
      let priceChangeItems = [];
      try {
        const { data: pccData } = await supabase
          .from('price_change_circulars')
          .select('*')
          .gte('effective_date', fromDate)
          .lte('effective_date', toDate);
        if (pccData && pccData.length > 0) {
          priceChangeCirculars = pccData;
          const { data: pcciData } = await supabase
            .from('price_change_circular_items')
            .select('*')
            .in('circular_id', pccData.map(c => c.id));
          if (pcciData) priceChangeItems = pcciData;
        }
      } catch (e) {
        // Table may have RLS
      }

      // 4. Map and unify all circular change records
      const unifiedRows = [];

      // Helper to accurately extract current & new CPU and MRP from promotion/circular item records
      const extractPriceDetails = (item, prod) => {
        let currentCpu = Number(item.current_cpu || prod?.purchase_price || 0);
        let newCpu = Number(item.new_cpu || currentCpu);
        let currentMrp = Number(item.current_mrp || 0);
        let newMrp = Number(item.new_mrp || 0);
        let diffMrp = 0;
        let changePercent = 0;

        // 1. If item.item contains JSON string
        let parsedJson = null;
        if (typeof item.item === 'string' && item.item.trim().startsWith('{')) {
          try {
            parsedJson = JSON.parse(item.item);
          } catch (e) {}
        }

        if (parsedJson && (parsedJson.currentMrp !== undefined || parsedJson.newMrp !== undefined)) {
          currentCpu = Number(parsedJson.currentCpu ?? (prod?.purchase_price || 0));
          newCpu = Number(parsedJson.newCpu ?? currentCpu);
          currentMrp = Number(parsedJson.currentMrp ?? (prod?.mrp || 0));
          newMrp = Number(parsedJson.newMrp ?? currentMrp);
          diffMrp = Number(parsedJson.diffMrp ?? (newMrp - currentMrp));
          changePercent = parsedJson.changePercent !== undefined
            ? Number(parsedJson.changePercent)
            : (currentMrp > 0 ? Number(((diffMrp / currentMrp) * 100).toFixed(2)) : 0);
          return { currentCpu, newCpu, currentMrp, newMrp, diffMrp, changePercent };
        }

        // 2. If item.item is pipe-delimited (currentCpu|newCpu|currentMrp|newMrp)
        if (typeof item.item === 'string' && item.item.includes('|')) {
          const parts = item.item.split('|').map(s => Number(s.trim()));
          if (parts.length >= 4 && !isNaN(parts[2]) && !isNaN(parts[3])) {
            currentCpu = !isNaN(parts[0]) && parts[0] > 0 ? parts[0] : Number(prod?.purchase_price || 0);
            newCpu = !isNaN(parts[1]) && parts[1] > 0 ? parts[1] : currentCpu;
            currentMrp = parts[2];
            newMrp = parts[3];
            diffMrp = newMrp - currentMrp;
            changePercent = currentMrp > 0 ? Number(((diffMrp / currentMrp) * 100).toFixed(2)) : 0;
            return { currentCpu, newCpu, currentMrp, newMrp, diffMrp, changePercent };
          }
        }

        // 3. Check vendor_contribution_amount (stored currentMrp) & discount_amount (stored newMrp)
        const vendorContrAmt = Number(item.vendor_contribution_amount || 0);
        const discAmt = Number(item.discount_amount || 0);
        const vendorContrPct = Number(item.vendor_contribution_percent || 0);
        const discPct = Number(item.discount_percent || 0);

        if (vendorContrAmt > 0 && discAmt > 0 && vendorContrAmt !== discAmt) {
          currentMrp = vendorContrAmt;
          newMrp = discAmt;
          if (vendorContrPct > 0) currentCpu = vendorContrPct;
          if (discPct > 0) newCpu = discPct;
          diffMrp = newMrp - currentMrp;
          changePercent = currentMrp > 0 ? Number(((diffMrp / currentMrp) * 100).toFixed(2)) : 0;
          return { currentCpu, newCpu, currentMrp, newMrp, diffMrp, changePercent };
        }

        // 4. If current_mrp and new_mrp were populated in circular items table
        if (currentMrp > 0 || newMrp > 0) {
          if (currentMrp === 0) currentMrp = Number(prod?.mrp || 0);
          if (newMrp === 0) newMrp = currentMrp;
          diffMrp = newMrp - currentMrp;
          changePercent = currentMrp > 0 ? Number(((diffMrp / currentMrp) * 100).toFixed(2)) : 0;
          return { currentCpu, newCpu, currentMrp, newMrp, diffMrp, changePercent };
        }

        // 5. If discount_amount was delta (+9.00), and prod.mrp was updated in DB to new price (600.00)
        if (discAmt !== 0) {
          newMrp = Number(prod?.mrp || 0);
          currentMrp = newMrp - discAmt;
          diffMrp = discAmt;
          changePercent = discPct > 0 ? discPct : (currentMrp > 0 ? Number(((diffMrp / currentMrp) * 100).toFixed(2)) : 0);
          return { currentCpu, newCpu, currentMrp, newMrp, diffMrp, changePercent };
        }

        // Fallback if unchanged
        currentMrp = Number(prod?.mrp || 0);
        newMrp = currentMrp;
        diffMrp = 0;
        changePercent = 0;
        return { currentCpu, newCpu, currentMrp, newMrp, diffMrp, changePercent };
      };

      // Process promotions
      (promotionsData || []).forEach(promo => {
        const matchingItems = promoItems.filter(pi => pi.promotion_id === promo.id);
        matchingItems.forEach(item => {
          const barcode = String(item.barcode || item.user_barcode || '').trim();
          const prod = productsMap.get(barcode) || null;

          const catName = categoriesList.find(c => c.id === prod?.category_id)?.name || item.category || '-';
          const subCatName = subcategoriesList.find(s => s.id === prod?.subcategory_id)?.name || item.sub_category || '-';
          const brandName = brandsList.find(b => b.id === prod?.brand_id)?.name || item.brand || '-';

          const priceDetails = extractPriceDetails(item, prod);

          unifiedRows.push({
            id: item.id || Math.random().toString(),
            circularNo: promo.circular_code || `#${promo.id?.slice(0, 8)}` || '-',
            circularName: promo.circular_name || '-',
            effectiveDate: promo.valid_from ? promo.valid_from.split('T')[0] : (promo.created_at ? promo.created_at.split('T')[0] : '-'),
            store: promo.stores || 'Central Store',
            storeType: promo.stores?.includes('Central') ? 'Central Store' : 'Store',
            barcode: barcode || '-',
            code: prod?.code || barcode || '-',
            itemName: item.description || prod?.item_name || 'Product',
            categoryId: prod?.category_id || '',
            categoryName: catName,
            subcategoryId: prod?.subcategory_id || '',
            subcategoryName: subCatName,
            subSubcategoryId: prod?.sub_subcategory_id || '',
            brandId: prod?.brand_id || '',
            brandName: brandName,
            currentCpu: priceDetails.currentCpu,
            newCpu: priceDetails.newCpu,
            currentMrp: priceDetails.currentMrp,
            newMrp: priceDetails.newMrp,
            diffMrp: priceDetails.diffMrp,
            changePercent: priceDetails.changePercent
          });
        });
      });

      // Process price_change_circulars if any
      (priceChangeCirculars || []).forEach(pcc => {
        const matchingItems = priceChangeItems.filter(pci => pci.circular_id === pcc.id);
        matchingItems.forEach(item => {
          const barcode = String(item.barcode || '').trim();
          const prod = productsMap.get(barcode) || null;

          const catName = categoriesList.find(c => c.id === prod?.category_id)?.name || '-';
          const subCatName = subcategoriesList.find(s => s.id === prod?.subcategory_id)?.name || '-';
          const brandName = brandsList.find(b => b.id === prod?.brand_id)?.name || '-';

          const priceDetails = extractPriceDetails(item, prod);

          unifiedRows.push({
            id: item.id || Math.random().toString(),
            circularNo: `#${pcc.id?.slice(0, 8)}` || '-',
            circularName: pcc.circular_name || '-',
            effectiveDate: pcc.effective_date ? pcc.effective_date.split('T')[0] : '-',
            store: pcc.stores || 'Central Store',
            storeType: pcc.stores?.includes('Central') ? 'Central Store' : 'Store',
            barcode: barcode || '-',
            code: prod?.code || barcode || '-',
            itemName: prod?.item_name || 'Product',
            categoryId: prod?.category_id || '',
            categoryName: catName,
            subcategoryId: prod?.subcategory_id || '',
            subcategoryName: subCatName,
            subSubcategoryId: prod?.sub_subcategory_id || '',
            brandId: prod?.brand_id || '',
            brandName: brandName,
            currentCpu: priceDetails.currentCpu,
            newCpu: priceDetails.newCpu,
            currentMrp: priceDetails.currentMrp,
            newMrp: priceDetails.newMrp,
            diffMrp: priceDetails.diffMrp,
            changePercent: priceDetails.changePercent
          });
        });
      });

      // 5. Apply Client-side Filters
      const filtered = unifiedRows.filter(row => {
        // Store Type
        if (storeType !== 'ALL') {
          if (storeType === 'Central Store' && !row.store?.toLowerCase().includes('central')) return false;
          if (storeType !== 'Central Store' && !row.store?.toLowerCase().includes(storeType.toLowerCase())) return false;
        }

        // Store
        if (selectedStore !== 'ALL' && selectedStore !== 'Select Store') {
          if (!row.store?.toLowerCase().includes(selectedStore.toLowerCase())) return false;
        }

        // Brand
        if (selectedBrand !== 'ALL') {
          if (row.brandId !== selectedBrand && row.brandName !== selectedBrand) return false;
        }

        // Category
        if (selectedCategory !== 'ALL') {
          if (row.categoryId !== selectedCategory && row.categoryName !== selectedCategory) return false;
        }

        // Subcategory
        if (selectedSubCategory !== 'ALL') {
          if (row.subcategoryId !== selectedSubCategory && row.subcategoryName !== selectedSubCategory) return false;
        }

        // Sub Subcategory
        if (selectedSubSubcategory !== 'ALL') {
          if (row.subSubcategoryId !== selectedSubSubcategory) return false;
        }

        // Item Name input
        if (itemNameInput && itemNameInput !== 'ALL' && itemNameInput.trim() !== '') {
          const q = itemNameInput.trim().toLowerCase();
          if (!row.itemName?.toLowerCase().includes(q)) return false;
        }

        // Circular No input
        if (circularNoInput && circularNoInput !== 'ALL' && circularNoInput.trim() !== '') {
          const q = circularNoInput.trim().toLowerCase().replace('#', '');
          if (!row.circularNo?.toLowerCase().replace('#', '').includes(q)) return false;
        }

        // Circular Name input
        if (circularNameInput && circularNameInput !== 'ALL' && circularNameInput.trim() !== '') {
          const q = circularNameInput.trim().toLowerCase();
          if (!row.circularName?.toLowerCase().includes(q)) return false;
        }

        // Barcode input
        if (barcodeInput && barcodeInput !== 'ALL' && barcodeInput.trim() !== '') {
          const q = barcodeInput.trim().toLowerCase();
          if (!row.barcode?.toLowerCase().includes(q) && !row.code?.toLowerCase().includes(q)) return false;
        }

        return true;
      });

      setReportData(filtered);
      if (filtered.length === 0) {
        toast.error('No circular price change records found matching the criteria.');
      } else {
        toast.success(`Found ${filtered.length} price change record(s).`);
      }
    } catch (err) {
      console.error('Error in handleShowReport:', err);
      toast.error('Failed to generate report. Please try again.');
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtered rows for in-table search
  const displayRows = useMemo(() => {
    if (!reportData) return [];
    if (!tableSearch.trim()) return reportData;
    const q = tableSearch.trim().toLowerCase();
    return reportData.filter(r => 
      r.circularNo?.toLowerCase().includes(q) ||
      r.circularName?.toLowerCase().includes(q) ||
      r.barcode?.toLowerCase().includes(q) ||
      r.itemName?.toLowerCase().includes(q) ||
      r.categoryName?.toLowerCase().includes(q) ||
      r.brandName?.toLowerCase().includes(q) ||
      r.store?.toLowerCase().includes(q)
    );
  }, [reportData, tableSearch]);

  // Aggregated Summary Statistics
  const summaryStats = useMemo(() => {
    if (!reportData || reportData.length === 0) {
      return { totalRecords: 0, totalCurrentMrp: 0, totalNewMrp: 0, totalDiffMrp: 0, distinctCirculars: 0 };
    }
    const totalRecords = reportData.length;
    const distinctCirculars = new Set(reportData.map(r => r.circularNo)).size;
    const totalCurrentMrp = reportData.reduce((acc, r) => acc + Number(r.currentMrp || 0), 0);
    const totalNewMrp = reportData.reduce((acc, r) => acc + Number(r.newMrp || 0), 0);
    const totalDiffMrp = totalNewMrp - totalCurrentMrp;

    return { totalRecords, totalCurrentMrp, totalNewMrp, totalDiffMrp, distinctCirculars };
  }, [reportData]);

  // Pagination calculation
  const totalPages = Math.ceil(displayRows.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return displayRows.slice(start, start + rowsPerPage);
  }, [displayRows, currentPage, rowsPerPage]);

  // Generate Standard MIS Landscape Green Banner PDF
  const handleDownloadPDF = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data available to export PDF');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Top Green Banner (#2e6f40)
    doc.setFillColor(46, 111, 64);
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('EZ ERP MANAGEMENT INFORMATION SYSTEM (MIS)', 14, 11);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('CENTRAL INVENTORY & POS SALES ANALYTICS', 14, 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CIRCULAR PRICE CHANGED REPORT (DETAILS)', pageWidth - 14, 14, { align: 'right' });

    // 2. Metadata Section below Banner
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    const storeLabel = selectedStore !== 'ALL' ? selectedStore : (storeType !== 'ALL' ? `Type: ${storeType}` : 'ALL Stores');
    const brandLabel = selectedBrand !== 'ALL' ? (brandsList.find(b => b.id === selectedBrand)?.name || selectedBrand) : 'ALL';
    const catLabel = selectedCategory !== 'ALL' ? (categoriesList.find(c => c.id === selectedCategory)?.name || selectedCategory) : 'ALL';

    const line1Left = `Date Range: ${fromDate} to ${toDate} | Store Scope: ${storeLabel}`;
    const line2Left = `Brand: ${brandLabel} | Category: ${catLabel} | Total Changed Items: ${reportData.length}`;

    const printDateStr = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });

    const currentUserName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Super Admin';
    const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Super Admin' : currentUserName;

    doc.text(line1Left, 14, 30);
    doc.text(line2Left, 14, 35);

    doc.text(`Generated On: ${printDateStr}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${displayName}`, pageWidth - 14, 35, { align: 'right' });

    // 3. Table Columns & Body
    const tableCols = [
      ['SL', 'Circular No', 'Circular Name', 'Date', 'Store', 'Barcode', 'Item Name', 'Category', 'Brand', 'Cur CPU', 'New CPU', 'Cur MRP', 'New MRP', 'Diff (MRP)', 'Change(%)']
    ];

    let sumCurCpu = 0;
    let sumNewCpu = 0;
    let sumCurMrp = 0;
    let sumNewMrp = 0;

    const tableBody = reportData.map((row, idx) => {
      sumCurCpu += Number(row.currentCpu || 0);
      sumNewCpu += Number(row.newCpu || 0);
      sumCurMrp += Number(row.currentMrp || 0);
      sumNewMrp += Number(row.newMrp || 0);

      const diffStr = (row.diffMrp >= 0 ? '+' : '') + Number(row.diffMrp || 0).toFixed(2);
      const pctStr = (row.changePercent >= 0 ? '+' : '') + Number(row.changePercent || 0).toFixed(2) + '%';

      return [
        idx + 1,
        row.circularNo,
        row.circularName,
        row.effectiveDate,
        row.store,
        row.barcode,
        row.itemName,
        row.categoryName,
        row.brandName,
        Number(row.currentCpu || 0).toFixed(2),
        Number(row.newCpu || 0).toFixed(2),
        Number(row.currentMrp || 0).toFixed(2),
        Number(row.newMrp || 0).toFixed(2),
        diffStr,
        pctStr
      ];
    });

    const totalDiff = sumNewMrp - sumCurMrp;

    // Total Row
    tableBody.push([
      'Total',
      '',
      `${reportData.length} Items`,
      '',
      '',
      '',
      '',
      '',
      '',
      sumCurCpu.toFixed(2),
      sumNewCpu.toFixed(2),
      sumCurMrp.toFixed(2),
      sumNewMrp.toFixed(2),
      (totalDiff >= 0 ? '+' : '') + totalDiff.toFixed(2),
      ''
    ]);

    autoTable(doc, {
      startY: 40,
      head: tableCols,
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle', textColor: [30, 30, 30] },
      headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255], halign: 'center' },
      didParseCell: function (data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
          else if ([1, 2, 3, 4, 5, 6, 7, 8].includes(data.column.index)) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        } else if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
          else if ([1, 2, 3, 4, 5, 6, 7, 8].includes(data.column.index)) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        }
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 240];
          data.cell.styles.textColor = [10, 60, 20];
        }
      },
      margin: { top: 10, left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable?.finalY || 100;

    // 4. Signatures (Matching MIS Standard)
    const sigY = Math.max(finalY + 24, pageHeight - 24);
    doc.setDrawColor(160, 174, 192);
    doc.setLineWidth(0.4);

    // Prepared By (Left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(displayName, 47.5, sigY - 2.5, { align: 'center' });
    doc.line(20, sigY, 75, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared By', 47.5, sigY + 5, { align: 'center' });

    // Checked By (Middle)
    doc.line(pageWidth / 2 - 27.5, sigY, pageWidth / 2 + 27.5, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

    // Authorized Signature (Right)
    doc.line(pageWidth - 75, sigY, pageWidth - 20, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature', pageWidth - 47.5, sigY + 5, { align: 'center' });

    doc.save(`Circular_Price_Changed_Report_${fromDate}_to_${toDate}.pdf`);
    toast.success('PDF downloaded successfully');
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const excelRows = reportData.map((row, idx) => ({
      'SL': idx + 1,
      'Circular No': row.circularNo,
      'Circular Name': row.circularName,
      'Effective Date': row.effectiveDate,
      'Store': row.store,
      'Barcode': row.barcode,
      'Item Name': row.itemName,
      'Category': row.categoryName,
      'Brand': row.brandName,
      'Current CPU (Tk)': Number(row.currentCpu || 0),
      'New CPU (Tk)': Number(row.newCpu || 0),
      'Current MRP (Tk)': Number(row.currentMrp || 0),
      'New MRP (Tk)': Number(row.newMrp || 0),
      'Price Difference (Tk)': Number(row.diffMrp || 0),
      'Change (%)': Number(row.changePercent || 0)
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Circular Price Changes');
    XLSX.writeFile(wb, `Circular_Price_Changed_Report_${fromDate}_to_${toDate}.xlsx`);
    toast.success('Excel exported successfully');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Page Title */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
          Circular Price Changed Report
        </h2>
      </div>

      {/* Main Filter Card (Matching Image 2) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        padding: '24px 28px',
        marginBottom: '28px'
      }}>
        
        {/* 2-Column Search Criteria Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '48px',
          rowGap: '16px'
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
                onChange={(e) => { setStoreType(e.target.value); setReportData(null); }}
              >
                {storeTypesList.map(st => (
                  <option key={st} value={st}>{st}</option>
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

          {/* Row 3: Brand & Category */}
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
                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubCategory('ALL'); setSelectedSubSubcategory('ALL'); setReportData(null); }}
              >
                <option value="ALL">ALL</option>
                {categoriesList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 4: Sub Category & Sub Subcategory */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Sub Category
            </label>
            <div style={{ flex: 1 }}>
              <CustomSelect
                value={selectedSubCategory}
                onChange={(e) => { setSelectedSubCategory(e.target.value); setSelectedSubSubcategory('ALL'); setReportData(null); }}
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
                {availableSubSubcategories.map(ssc => (
                  <option key={ssc.id} value={ssc.id}>{ssc.name}</option>
                ))}
              </CustomSelect>
            </div>
          </div>

          {/* Row 5: Item Name & Circular Name */}
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
              Circular Name
            </label>
            <div style={{ flex: 1 }}>
              <input 
                type="text"
                value={circularNameInput}
                onChange={(e) => { setCircularNameInput(e.target.value); setReportData(null); }}
                placeholder="ALL or enter Circular Name..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Row 6: Circular No & Barcode */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '135px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Circular No
            </label>
            <div style={{ flex: 1 }}>
              <input 
                type="text"
                value={circularNoInput}
                onChange={(e) => { setCircularNoInput(e.target.value); setReportData(null); }}
                placeholder="ALL or enter Circular No..."
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

        </div>

        {/* Print Type / Buttons Section */}
        <div style={{ marginTop: '24px' }}>
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
              <Search size={14} />
              {loading ? 'Loading...' : 'Show'}
            </button>

            {/* Reload Button (Aero Red matching Image) */}
            <button
              onClick={handleReload}
              disabled={loading}
              className="btn-danger"
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
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Reload
            </button>
          </div>
        </div>

      </div>

      {/* Rendered Report Area (Only visible after clicking Show) */}
      {reportData !== null && (
        <div className="animate-fade-in">
          
          {/* Top Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Total Products Changed
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                {summaryStats.totalRecords}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Distinct Circulars
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#0284c7', marginTop: '4px' }}>
                {summaryStats.distinctCirculars}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Total Current MRP
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#334155', marginTop: '4px' }}>
                Tk {summaryStats.totalCurrentMrp.toFixed(2)}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Total New MRP Value
              </div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#166534', marginTop: '4px' }}>
                Tk {summaryStats.totalNewMrp.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Table Container Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden'
          }}>
            
            {/* Table Header Action Bar */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: '#f8fafc'
            }}>
              {/* In-table Search */}
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text"
                  value={tableSearch}
                  onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Quick search in results..."
                  style={{
                    width: '100%',
                    padding: '7px 12px 7px 32px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Action Export Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={handleDownloadPDF}
                  className="btn-theme"
                  style={{
                    padding: '6px 18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '4px'
                  }}
                >
                  <Download size={14} />
                  Download PDF
                </button>

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
                    borderRadius: '4px'
                  }}
                >
                  <FileSpreadsheet size={14} />
                  Export Excel
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                  <tr style={{ backgroundColor: '#2e6f40', color: '#ffffff' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, width: '45px' }}>SL</th>
                    <th style={{ padding: '10px 10px', fontWeight: 600 }}>Circular No</th>
                    <th style={{ padding: '10px 10px', fontWeight: 600 }}>Circular Name</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '10px 10px', fontWeight: 600 }}>Store</th>
                    <th style={{ padding: '10px 10px', fontWeight: 600 }}>Barcode</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Item Name</th>
                    <th style={{ padding: '10px 10px', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '10px 10px', fontWeight: 600 }}>Brand</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>Cur CPU</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>New CPU</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>Cur MRP</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>New MRP</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>Diff (MRP)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>Change (%)</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={15} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                        No records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, index) => {
                      const absoluteIndex = (currentPage - 1) * rowsPerPage + index + 1;
                      const isPositive = row.diffMrp >= 0;
                      return (
                        <tr 
                          key={row.id || index}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc'}
                        >
                          <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>{absoluteIndex}</td>
                          <td style={{ padding: '9px 10px', fontWeight: 600, color: '#0369a1' }}>{row.circularNo}</td>
                          <td style={{ padding: '9px 10px', color: '#1e293b' }}>{row.circularName}</td>
                          <td style={{ padding: '9px 8px', color: '#475569' }}>{row.effectiveDate}</td>
                          <td style={{ padding: '9px 10px', color: '#334155' }}>{row.store}</td>
                          <td style={{ padding: '9px 10px', fontFamily: 'monospace', color: '#0f172a' }}>{row.barcode}</td>
                          <td style={{ padding: '9px 12px', fontWeight: 500, color: '#0f172a' }}>{row.itemName}</td>
                          <td style={{ padding: '9px 10px', color: '#475569' }}>{row.categoryName}</td>
                          <td style={{ padding: '9px 10px', color: '#475569' }}>{row.brandName}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', color: '#475569' }}>{Number(row.currentCpu).toFixed(2)}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', color: '#1e293b', fontWeight: 500 }}>{Number(row.newCpu).toFixed(2)}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', color: '#475569' }}>{Number(row.currentMrp).toFixed(2)}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', color: '#166534', fontWeight: 600 }}>{Number(row.newMrp).toFixed(2)}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 600, color: isPositive ? '#166534' : '#dc2626' }}>
                            {isPositive ? '+' : ''}{Number(row.diffMrp).toFixed(2)}
                          </td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 600, color: isPositive ? '#166534' : '#dc2626' }}>
                            {isPositive ? '+' : ''}{Number(row.changePercent).toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Summary / Total Footer Row */}
                {displayRows.length > 0 && (
                  <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 4, backgroundColor: '#f0fdf4', borderTop: '2px solid #86efac' }}>
                    <tr style={{ fontWeight: 700, color: '#14532d' }}>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>Total</td>
                      <td colSpan={8} style={{ padding: '10px 10px' }}>
                        {displayRows.length} Product(s)
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {displayRows.reduce((a, b) => a + Number(b.currentCpu || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {displayRows.reduce((a, b) => a + Number(b.newCpu || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {displayRows.reduce((a, b) => a + Number(b.currentMrp || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {displayRows.reduce((a, b) => a + Number(b.newMrp || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {(displayRows.reduce((a, b) => a + Number(b.newMrp || 0), 0) - displayRows.reduce((a, b) => a + Number(b.currentMrp || 0), 0)).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>-</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#fff'
            }}>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Showing {displayRows.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {Math.min(currentPage * rowsPerPage, displayRows.length)} of {displayRows.length} entries
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: currentPage === 1 ? '#f1f5f9' : '#fff',
                    color: currentPage === 1 ? '#94a3b8' : '#334155',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '12.5px'
                  }}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prevP && p - prevP > 1 && <span style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: p === currentPage ? '1px solid #2e6f40' : '1px solid #cbd5e1',
                            backgroundColor: p === currentPage ? '#2e6f40' : '#fff',
                            color: p === currentPage ? '#fff' : '#334155',
                            fontWeight: p === currentPage ? 600 : 400,
                            cursor: 'pointer',
                            fontSize: '12.5px'
                          }}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })
                }

                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: currentPage === totalPages || totalPages === 0 ? '#f1f5f9' : '#fff',
                    color: currentPage === totalPages || totalPages === 0 ? '#94a3b8' : '#334155',
                    cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12.5px'
                  }}
                >
                  Next
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default CircularPriceChangedReport;
