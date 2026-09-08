import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  Printer, Tag, ArrowUpDown, Filter, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../../../components/CustomSelect';

const DiscountCircularReport = () => {
  const { user } = useAuth();

  // Helper for today's date (YYYY-MM-DD)
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Filter States (Matching Image 3 Layout)
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState('ALL');
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState('ALL');
  const [itemNameInput, setItemNameInput] = useState('ALL');
  const [promotionType, setPromotionType] = useState('ALL');
  const [promotionNameInput, setPromotionNameInput] = useState('ALL');
  const [circularNoInput, setCircularNoInput] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('ALL');
  const [printType, setPrintType] = useState('Details');

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
      console.error('Error loading master data in DiscountCircularReport:', err);
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
    setPromotionType('ALL');
    setPromotionNameInput('ALL');
    setCircularNoInput('ALL');
    setBarcodeInput('ALL');
    setPrintType('Details');
    setReportData(null);
    setTableSearch('');
    setCurrentPage(1);
    toast.success('Filters reloaded to default');
  };

  // Helper to extract snapshot pricing details
  const extractPriceDetails = (item, prod) => {
    let mrp = Number(prod?.mrp || 0);
    let discPct = Number(item.discount_percent || 0);
    let discAmt = Number(item.discount_amount || 0);
    let venPct = Number(item.vendor_contribution_percent || 0);
    let venAmt = Number(item.vendor_contribution_amount || 0);

    // If item.item is JSON string
    if (typeof item.item === 'string' && item.item.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(item.item);
        if (parsed.currentMrp !== undefined || parsed.newMrp !== undefined) {
          mrp = Number(parsed.currentMrp || parsed.newMrp || prod?.mrp || 0);
          discAmt = Number(parsed.diffMrp || item.discount_amount || 0);
          discPct = Number(parsed.changePercent || item.discount_percent || 0);
        }
      } catch (e) {}
    } else if (typeof item.item === 'string' && item.item.includes('|')) {
      const parts = item.item.split('|').map(s => Number(s.trim()));
      if (parts.length >= 4 && !isNaN(parts[2])) {
        mrp = parts[2];
        if (!isNaN(parts[3])) {
          discAmt = Math.abs(parts[3] - parts[2]);
          discPct = mrp > 0 ? Number(((discAmt / mrp) * 100).toFixed(2)) : 0;
        }
      }
    }

    if (discAmt === 0 && discPct > 0 && mrp > 0) {
      discAmt = (mrp * discPct) / 100;
    }

    return { mrp, discPct, discAmt, venPct, venAmt };
  };

  // Main Handle Show: Query and aggregate data
  const handleShowReport = async () => {
    setLoading(true);
    setTableSearch('');
    setCurrentPage(1);

    try {
      // 1. Fetch promotions
      const { data: promotionsData, error: promoErr } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (promoErr) {
        console.error('Promotions fetch error:', promoErr);
        toast.error('Failed to fetch promotions');
      }

      // Filter promotions by date range (overlapping or created within range)
      const dateFilteredPromos = (promotionsData || []).filter(promo => {
        const validFrom = promo.valid_from ? promo.valid_from.split('T')[0] : '';
        const validTo = promo.valid_to ? promo.valid_to.split('T')[0] : '';
        const createdAt = promo.created_at ? promo.created_at.split('T')[0] : '';

        if (validFrom && validTo) {
          return validFrom <= toDate && validTo >= fromDate;
        }
        if (validFrom) {
          return validFrom >= fromDate && validFrom <= toDate;
        }
        if (createdAt) {
          return createdAt >= fromDate && createdAt <= toDate;
        }
        return true;
      });

      // 2. Fetch promotion_items for all fetched promotions
      let promoItems = [];
      if (dateFilteredPromos.length > 0) {
        const promoIds = dateFilteredPromos.map(p => p.id);
        const { data: piData, error: piErr } = await supabase
          .from('promotion_items')
          .select('*')
          .in('promotion_id', promoIds);
        if (!piErr && piData) {
          promoItems = piData;
        }
      }

      // 3. Map and unify all promotion item records
      const unifiedRows = [];

      dateFilteredPromos.forEach(promo => {
        const matchingItems = promoItems.filter(pi => pi.promotion_id === promo.id);
        const storesText = promo.stores || 'Central Store, Shop';

        const validFromStr = promo.valid_from ? promo.valid_from.split('T')[0] : '';
        const validToStr = promo.valid_to ? promo.valid_to.split('T')[0] : '';
        const validityStr = validFromStr && validToStr 
          ? `${validFromStr} to ${validToStr}` 
          : (validFromStr || validToStr || (promo.created_at ? promo.created_at.split('T')[0] : '-'));

        if (matchingItems.length === 0) {
          // Promo without line items (e.g. general coupon)
          unifiedRows.push({
            id: promo.id,
            circularNo: promo.circular_code || `#${promo.id?.slice(0, 8)}` || '-',
            circularName: promo.circular_name || '-',
            promotionType: promo.promotion_type || 'Circular Discount',
            validity: validityStr,
            validFrom: validFromStr,
            validTo: validToStr,
            store: storesText,
            storeType: storesText.includes('Central') ? 'Central Store' : 'Store',
            barcode: promo.coupon_no || '-',
            code: promo.coupon_no || '-',
            itemName: promo.circular_name || 'Promotion Voucher',
            categoryId: '',
            categoryName: '-',
            subcategoryId: '',
            subcategoryName: '-',
            subSubcategoryId: '',
            brandId: '',
            brandName: '-',
            mrp: Number(promo.coupon_min_purchase || 0),
            discountPct: Number(promo.coupon_disc_val || 0),
            discountAmt: Number(promo.coupon_max_disc_amt || 0),
            vendorContriPct: 0,
            vendorContriAmt: 0
          });
        } else {
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
              promotionType: promo.promotion_type || 'Circular Discount',
              validity: validityStr,
              validFrom: validFromStr,
              validTo: validToStr,
              store: storesText,
              storeType: storesText.includes('Central') ? 'Central Store' : 'Store',
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
              mrp: priceDetails.mrp,
              discountPct: priceDetails.discPct,
              discountAmt: priceDetails.discAmt,
              vendorContriPct: priceDetails.venPct,
              vendorContriAmt: priceDetails.venAmt
            });
          });
        }
      });

      // 4. Apply Client-side Filters
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

        // Promotion Type
        if (promotionType !== 'ALL') {
          if (row.promotionType?.toLowerCase() !== promotionType.toLowerCase()) return false;
        }

        // Promotion Name input
        if (promotionNameInput && promotionNameInput !== 'ALL' && promotionNameInput.trim() !== '') {
          const q = promotionNameInput.trim().toLowerCase();
          if (!row.circularName?.toLowerCase().includes(q)) return false;
        }

        // Circular No input
        if (circularNoInput && circularNoInput !== 'ALL' && circularNoInput.trim() !== '') {
          const q = circularNoInput.trim().toLowerCase().replace('#', '');
          if (!row.circularNo?.toLowerCase().replace('#', '').includes(q)) return false;
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
        toast.error('No discount circular records found matching the criteria.');
      } else {
        toast.success(`Found ${filtered.length} discount circular item(s).`);
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
      r.promotionType?.toLowerCase().includes(q) ||
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
      return { totalRecords: 0, totalMrp: 0, totalDiscAmt: 0, distinctCirculars: 0 };
    }
    const totalRecords = reportData.length;
    const distinctCirculars = new Set(reportData.map(r => r.circularNo)).size;
    const totalMrp = reportData.reduce((acc, r) => acc + Number(r.mrp || 0), 0);
    const totalDiscAmt = reportData.reduce((acc, r) => acc + Number(r.discountAmt || 0), 0);

    return { totalRecords, totalMrp, totalDiscAmt, distinctCirculars };
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
    doc.text('DISCOUNT CIRCULAR REPORT (DETAILS)', pageWidth - 14, 14, { align: 'right' });

    // 2. Metadata Section below Banner
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    const line1Left = `Date Range: ${fromDate} to ${toDate}`;
    const line2Left = `Store Scope: ${selectedStore !== 'ALL' && selectedStore !== 'Select Store' ? selectedStore : storeType} | Promotion Type: ${promotionType} | Brand: ${selectedBrand}`;

    const printDateStr = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
    });

    const currentUserName = user?.name || user?.username || (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Super Admin';
    const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Super Admin' : currentUserName;

    doc.text(line1Left, 14, 30);
    doc.text(line2Left, 14, 35);

    doc.text(`Generated On: ${printDateStr}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${displayName}`, pageWidth - 14, 35, { align: 'right' });

    // 3. Table Columns & Body
    const tableCols = [
      ['SL', 'Circular No', 'Circular Name', 'Type', 'Validity', 'Store Scope', 'Barcode', 'Item Name', 'Category', 'Brand', 'Price (MRP)', 'Disc (%)', 'Disc. Amt', 'Ven. Contri (%)']
    ];

    let sumMrp = 0;
    let sumDiscAmt = 0;

    const tableBody = reportData.map((row, idx) => {
      sumMrp += Number(row.mrp || 0);
      sumDiscAmt += Number(row.discountAmt || 0);

      const dPctStr = Number(row.discountPct || 0) > 0 ? Number(row.discountPct).toFixed(2) + '%' : '0.00%';
      const vPctStr = Number(row.vendorContriPct || 0) > 0 ? Number(row.vendorContriPct).toFixed(2) + '%' : '0.00%';

      return [
        idx + 1,
        row.circularNo,
        row.circularName,
        row.promotionType,
        row.validity,
        row.store,
        row.barcode,
        row.itemName,
        row.categoryName,
        row.brandName,
        Number(row.mrp || 0).toFixed(2),
        dPctStr,
        Number(row.discountAmt || 0).toFixed(2),
        vPctStr
      ];
    });

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
      '',
      sumMrp.toFixed(2),
      '',
      sumDiscAmt.toFixed(2),
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
          else if ([1, 2, 3, 4, 5, 6, 7, 8, 9].includes(data.column.index)) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        } else if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
          else if ([1, 2, 3, 4, 5, 6, 7, 8, 9].includes(data.column.index)) data.cell.styles.halign = 'left';
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

    doc.save(`Discount_Circular_Report_${fromDate}_to_${toDate}.pdf`);
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
      'Promotion Type': row.promotionType,
      'Validity': row.validity,
      'Store': row.store,
      'Barcode': row.barcode,
      'Item Name': row.itemName,
      'Category': row.categoryName,
      'Brand': row.brandName,
      'Price MRP (Tk)': Number(row.mrp || 0),
      'Discount (%)': Number(row.discountPct || 0),
      'Discount Amount (Tk)': Number(row.discountAmt || 0),
      'Vendor Contribution (%)': Number(row.vendorContriPct || 0)
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Discount Circulars');
    XLSX.writeFile(wb, `Discount_Circular_Report_${fromDate}_to_${toDate}.xlsx`);
    toast.success('Excel exported successfully');
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header & Breadcrumb */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
          <span>Promotional Reports</span>
          <ChevronRight size={14} />
          <span style={{ color: '#166534', fontWeight: 600 }}>Discount Circular Report</span>
        </div>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
          Discount Circular Report
        </h1>
      </div>

      {/* Main Filter Panel (Exact Image 3 Layout) */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          columnGap: '40px',
          rowGap: '16px'
        }}>
          {/* Row 1: From Date / To Date */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>

          {/* Row 2: Store Type / Store */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Store Type
            </label>
            <CustomSelect
              options={storeTypesList.map(st => ({ value: st, label: st }))}
              value={storeType}
              onChange={(val) => {
                setStoreType(val);
                setSelectedStore('ALL');
              }}
              placeholder="ALL"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Store
            </label>
            <CustomSelect
              options={[
                { value: 'ALL', label: 'Select Store' },
                ...availableStores.map(s => ({ value: s.name, label: s.name }))
              ]}
              value={selectedStore}
              onChange={(val) => setSelectedStore(val)}
              placeholder="Select Store"
            />
          </div>

          {/* Row 3: Brand / Category */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Brand
            </label>
            <CustomSelect
              options={[
                { value: 'ALL', label: 'ALL' },
                ...brandsList.map(b => ({ value: b.name, label: b.name }))
              ]}
              value={selectedBrand}
              onChange={(val) => setSelectedBrand(val)}
              placeholder="ALL"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Category
            </label>
            <CustomSelect
              options={[
                { value: 'ALL', label: 'ALL' },
                ...categoriesList.map(c => ({ value: c.id, label: c.name }))
              ]}
              value={selectedCategory}
              onChange={(val) => {
                setSelectedCategory(val);
                setSelectedSubCategory('ALL');
                setSelectedSubSubcategory('ALL');
              }}
              placeholder="ALL"
            />
          </div>

          {/* Row 4: Sub Category / Sub Subcategory */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Sub Category
            </label>
            <CustomSelect
              options={[
                { value: 'ALL', label: 'ALL' },
                ...availableSubcategories.map(s => ({ value: s.id, label: s.name }))
              ]}
              value={selectedSubCategory}
              onChange={(val) => {
                setSelectedSubCategory(val);
                setSelectedSubSubcategory('ALL');
              }}
              placeholder="ALL"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Sub Subcategory
            </label>
            <CustomSelect
              options={[
                { value: 'ALL', label: 'ALL' },
                ...availableSubSubcategories.map(ss => ({ value: ss.id, label: ss.name }))
              ]}
              value={selectedSubSubcategory}
              onChange={(val) => setSelectedSubSubcategory(val)}
              placeholder="ALL"
            />
          </div>

          {/* Row 5: Item Name / Promotion Type */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Item Name
            </label>
            <input
              type="text"
              placeholder="ALL"
              value={itemNameInput}
              onChange={(e) => setItemNameInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Promotion Type
            </label>
            <CustomSelect
              options={[
                { value: 'ALL', label: 'ALL' },
                { value: 'Circular Discount', label: 'Circular Discount' },
                { value: 'Buy Get', label: 'Buy Get' },
                { value: 'Coupon', label: 'Coupon' },
                { value: 'Circular Price Change', label: 'Circular Price Change' }
              ]}
              value={promotionType}
              onChange={(val) => setPromotionType(val)}
              placeholder="ALL"
            />
          </div>

          {/* Row 6: Promotion Name / Circular No */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Promotion Name
            </label>
            <input
              type="text"
              placeholder="ALL"
              value={promotionNameInput}
              onChange={(e) => setPromotionNameInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Circular No
            </label>
            <input
              type="text"
              placeholder="ALL"
              value={circularNoInput}
              onChange={(e) => setCircularNoInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>

          {/* Row 7: Barcode */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Barcode
            </label>
            <input
              type="text"
              placeholder="ALL"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>
        </div>

        {/* Print Type & Action Buttons */}
        <div style={{ marginTop: '24px' }}>
          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
            Print Type
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Aero Sky Blue Show Button */}
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
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              <Search size={14} />
              {loading ? 'Loading...' : 'Show'}
            </button>

            {/* Aero Ruby Red Reload Button */}
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
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Reload
            </button>
          </div>
        </div>
      </div>

      {/* Report Results Section (Visible only after clicking Show) */}
      {reportData !== null && (
        <div style={{ marginTop: '20px' }}>
          {/* Summary Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Circular Items
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                {summaryStats.totalRecords}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Distinct Circulars
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>
                {summaryStats.distinctCirculars}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total MRP Value
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#166534', marginTop: '6px' }}>
                Tk {summaryStats.totalMrp.toFixed(2)}
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Discount Value
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', marginTop: '6px' }}>
                Tk {summaryStats.totalDiscAmt.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Table Container Card */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>
            {/* Table Action Bar */}
            <div style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* In-table Search */}
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Quick search in results..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '7px 12px 7px 32px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
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

            {/* Main Table */}
            <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#2e6f40',
                    color: '#fff',
                    position: 'sticky',
                    top: 0,
                    zIndex: 5,
                    borderBottom: '2px solid #1e5a2f'
                  }}>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: '40px' }}>SL</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Circular No</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Circular Name</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Validity</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Store Scope</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Barcode</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Brand</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Price (MRP)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Disc (%)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Disc. Amt</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Ven. Contri (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                        No records match the current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => {
                      const absoluteIndex = (currentPage - 1) * rowsPerPage + idx + 1;
                      return (
                        <tr
                          key={row.id + '-' + idx}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdf4'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#f8fafc'}
                        >
                          <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>{absoluteIndex}</td>
                          <td style={{ padding: '9px 8px', fontWeight: 600, color: '#0284c7' }}>{row.circularNo}</td>
                          <td style={{ padding: '9px 8px', color: '#1e293b' }}>{row.circularName}</td>
                          <td style={{ padding: '9px 8px', color: '#334155' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: row.promotionType === 'Buy Get' ? '#fef3c7' : (row.promotionType === 'Coupon' ? '#e0e7ff' : '#dcfce7'),
                              color: row.promotionType === 'Buy Get' ? '#92400e' : (row.promotionType === 'Coupon' ? '#3730a3' : '#166534')
                            }}>
                              {row.promotionType}
                            </span>
                          </td>
                          <td style={{ padding: '9px 8px', color: '#475569', whiteSpace: 'nowrap' }}>{row.validity}</td>
                          <td style={{ padding: '9px 8px', color: '#475569' }}>{row.store}</td>
                          <td style={{ padding: '9px 8px', fontFamily: 'monospace', color: '#0f172a' }}>{row.barcode}</td>
                          <td style={{ padding: '9px 8px', fontWeight: 500, color: '#0f172a' }}>{row.itemName}</td>
                          <td style={{ padding: '9px 8px', color: '#475569' }}>{row.categoryName}</td>
                          <td style={{ padding: '9px 8px', color: '#475569' }}>{row.brandName}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', color: '#166534', fontWeight: 600 }}>{Number(row.mrp).toFixed(2)}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                            {Number(row.discountPct) > 0 ? `${Number(row.discountPct).toFixed(2)}%` : '0.00%'}
                          </td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>
                            {Number(row.discountAmt).toFixed(2)}
                          </td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', color: '#475569' }}>
                            {Number(row.vendorContriPct) > 0 ? `${Number(row.vendorContriPct).toFixed(2)}%` : '0.00%'}
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
                      <td colSpan={9} style={{ padding: '10px 10px' }}>
                        {displayRows.length} Product(s) / Item(s)
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {displayRows.reduce((a, b) => a + Number(b.mrp || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>-</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {displayRows.reduce((a, b) => a + Number(b.discountAmt || 0), 0).toFixed(2)}
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

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: '1px solid',
                      borderColor: currentPage === pageNum ? '#2e6f40' : '#cbd5e1',
                      backgroundColor: currentPage === pageNum ? '#2e6f40' : '#fff',
                      color: currentPage === pageNum ? '#fff' : '#334155',
                      fontWeight: currentPage === pageNum ? 700 : 400,
                      cursor: 'pointer',
                      fontSize: '12.5px'
                    }}
                  >
                    {pageNum}
                  </button>
                ))}

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

export default DiscountCircularReport;
