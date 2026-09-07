import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import { 
  Download, RefreshCw, Search, FileSpreadsheet, 
  RotateCcw, Printer, FileText, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CustomSelect from '../../../components/CustomSelect';

const StoreDamageAndLostReport = () => {
  const { user } = useAuth();

  // Helper for today's date (YYYY-MM-DD)
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Filter States (Matching Screenshot Layout)
  const [fromDate, setFromDate] = useState(getTodayDate());
  const [toDate, setToDate] = useState(getTodayDate());
  const [storeType, setStoreType] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState('ALL');
  const [barcodeInput, setBarcodeInput] = useState('ALL');
  const [circularNoInput, setCircularNoInput] = useState('ALL');
  const [statusInput, setStatusInput] = useState('-- ALL --');

  // Report Type: Details vs Summary (with Round Green Bullets)
  const [reportType, setReportType] = useState('Details');
  const reportTypeOptions = ['Details', 'Summary'];

  // 2. Dropdown Master Data Lists
  const [storesList, setStoresList] = useState([]);
  const [storeTypesList, setStoreTypesList] = useState(['ALL', 'Central Store', 'Store', 'Retail', 'Warehouse', 'Branch', 'Franchise']);
  const [statusList, setStatusList] = useState(['-- ALL --', 'Saved', 'Approved', 'Pending', 'Rejected', 'Draft']);
  const [productsMap, setProductsMap] = useState(new Map());

  // 3. Output / Generated Report State (strictly null on initial mount; NO auto-load)
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
      const [storesRes, prodsRes] = await Promise.all([
        supabase.from('stores').select('id, name, shop_type').order('name'),
        supabase.from('products').select('id, code, barcode, user_define_barcode, item_name, category_id, purchase_price, mrp, category:category_id(name)')
      ]);

      const fetchedStores = storesRes.data || [];
      setStoresList(fetchedStores);

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
      console.error('Error loading master data in StoreDamageAndLostReport:', err);
      toast.error('Failed to load filter dropdowns');
    }
  };

  // Filtered stores based on selected Store Type
  const availableStores = useMemo(() => {
    if (storeType === 'ALL') return storesList;
    if (storeType === 'Central Store') return storesList.filter(s => s.shop_type === 'Warehouse' || s.name?.toLowerCase().includes('central'));
    return storesList.filter(s => s.shop_type?.toLowerCase() === storeType.toLowerCase());
  }, [storesList, storeType]);

  // Handle Reload / Reset Filter values
  const handleReload = () => {
    setFromDate(getTodayDate());
    setToDate(getTodayDate());
    setStoreType('ALL');
    setSelectedStore('ALL');
    setBarcodeInput('ALL');
    setCircularNoInput('ALL');
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

      if (fromDate) {
        dmlQuery = dmlQuery.gte('dml_date', fromDate);
      }
      if (toDate) {
        dmlQuery = dmlQuery.lte('dml_date', toDate);
      }

      const { data: dmlData, error: dmlError } = await dmlQuery;
      if (dmlError) throw dmlError;

      if (!dmlData || dmlData.length === 0) {
        setReportData({ rows: [], totals: {}, reportType });
        toast('No damage & lost records found for the selected date range', { icon: 'ℹ️' });
        setLoading(false);
        return;
      }

      const dmlIds = dmlData.map(d => d.id);

      // 2. Fetch related items and reference purchase receives
      const [itemsRes, prRes] = await Promise.all([
        supabase
          .from('damage_and_lost_items')
          .select('*')
          .in('damage_and_lost_id', dmlIds),
        supabase
          .from('purchase_receives')
          .select('id, reference_no, delivery_to, status')
      ]);

      if (itemsRes.error) throw itemsRes.error;

      const allItems = itemsRes.data || [];
      const prMap = new Map();
      (prRes.data || []).forEach(pr => {
        if (pr.reference_no) prMap.set(pr.reference_no, pr);
        if (pr.id) prMap.set(pr.id, pr);
      });

      // 3. Map Header info with items
      const enrichedRows = [];

      dmlData.forEach(dmlHeader => {
        const headerRef = dmlHeader.reference_no || '';
        const pr = prMap.get(headerRef) || {};
        
        // Resolve store name and store type
        let storeName = dmlHeader.store_name || pr.delivery_to || 'Central Store';
        const matchedStore = storesList.find(s => s.name?.toLowerCase() === storeName?.toLowerCase());
        const sType = dmlHeader.store_type || matchedStore?.shop_type || (storeName.toLowerCase().includes('central') ? 'Central Store' : 'Store');
        const dmlStatus = dmlHeader.status || pr.status || 'Saved';

        const headerItems = allItems.filter(item => item.damage_and_lost_id === dmlHeader.id);

        if (headerItems.length === 0) {
          // If no items row, create a generic entry
          enrichedRows.push({
            id: dmlHeader.id,
            dml_date: dmlHeader.dml_date || dmlHeader.created_at?.split('T')[0] || '',
            challan_no: `DML-${dmlHeader.id?.slice(0, 8)?.toUpperCase()}`,
            circular_no: dmlHeader.circular_no || dmlHeader.reference_no || '-',
            store_name: storeName,
            store_type: sType,
            status: dmlStatus,
            barcode: '-',
            item_name: 'Damage/Lost Batch',
            category: '-',
            cpu: 0,
            sale_price: 0,
            dml_qty: Number(dmlHeader.total_qty || 0),
            loss_amount: Number(dmlHeader.total_value || 0),
            sale_amount: 0,
            reason: dmlHeader.reason || 'Damage/Lost'
          });
        } else {
          headerItems.forEach(item => {
            const product = productsMap.get(item.product_id) || productsMap.get(item.barcode) || {};
            const itemBarcode = item.barcode || product.barcode || product.user_define_barcode || '-';
            const itemName = product.item_name || item.product_name || item.item_name || 'Product';
            const categoryName = product.category?.name || product.category_name || '-';
            const cpu = Number(item.cpu || product.purchase_price || 0);
            const salePrice = Number(item.sale_price || product.mrp || 0);
            const dmlQty = Number(item.dml_qty || 0);
            const lossAmount = Number(item.amount || (dmlQty * cpu));
            const saleAmount = dmlQty * salePrice;

            enrichedRows.push({
              id: `${dmlHeader.id}_${item.id}`,
              damage_and_lost_id: dmlHeader.id,
              dml_date: dmlHeader.dml_date || dmlHeader.created_at?.split('T')[0] || '',
              challan_no: `DML-${dmlHeader.id?.slice(0, 8)?.toUpperCase()}`,
              circular_no: dmlHeader.circular_no || dmlHeader.reference_no || '-',
              store_name: storeName,
              store_type: sType,
              status: dmlStatus,
              barcode: itemBarcode,
              item_name: itemName,
              category: categoryName,
              cpu: cpu,
              sale_price: salePrice,
              dml_qty: dmlQty,
              loss_amount: lossAmount,
              sale_amount: saleAmount,
              reason: item.reason || 'Damage/Lost'
            });
          });
        }
      });

      // 4. Filter enriched rows based on user input
      const filteredRows = enrichedRows.filter(row => {
        // Store Type filter
        if (storeType !== 'ALL') {
          if (storeType === 'Central Store') {
            const isCentral = row.store_name?.toLowerCase().includes('central') || row.store_type?.toLowerCase() === 'warehouse';
            if (!isCentral) return false;
          } else {
            if (row.store_type?.toLowerCase() !== storeType.toLowerCase()) return false;
          }
        }

        // Store filter
        if (selectedStore !== 'ALL') {
          if (row.store_name?.toLowerCase() !== selectedStore.toLowerCase()) return false;
        }

        // Barcode filter
        if (barcodeInput && barcodeInput.trim() !== '' && barcodeInput.toUpperCase() !== 'ALL') {
          const bTerm = barcodeInput.trim().toLowerCase();
          if (!row.barcode?.toLowerCase().includes(bTerm)) return false;
        }

        // Circular No / Reference No filter
        if (circularNoInput && circularNoInput.trim() !== '' && circularNoInput.toUpperCase() !== 'ALL') {
          const cTerm = circularNoInput.trim().toLowerCase();
          if (!row.circular_no?.toLowerCase().includes(cTerm) && !row.challan_no?.toLowerCase().includes(cTerm)) return false;
        }

        // Status filter
        if (statusInput && statusInput !== '-- ALL --' && statusInput !== 'ALL') {
          if (row.status?.toLowerCase() !== statusInput.toLowerCase()) return false;
        }

        return true;
      });

      // 5. Structure Output based on Report Type
      if (reportType === 'Summary') {
        // Group by Store Name & Store Type
        const storeGroups = new Map();

        filteredRows.forEach(r => {
          const key = `${r.store_name}__${r.store_type}`;
          if (!storeGroups.has(key)) {
            storeGroups.set(key, {
              store_name: r.store_name,
              store_type: r.store_type,
              doc_ids: new Set(),
              item_count: 0,
              total_qty: 0,
              total_loss_amount: 0,
              total_sale_amount: 0,
              status: r.status
            });
          }
          const grp = storeGroups.get(key);
          if (r.damage_and_lost_id) grp.doc_ids.add(r.damage_and_lost_id);
          grp.item_count += 1;
          grp.total_qty += r.dml_qty;
          grp.total_loss_amount += r.loss_amount;
          grp.total_sale_amount += r.sale_amount;
        });

        const summaryRows = Array.from(storeGroups.values()).map(g => ({
          store_name: g.store_name,
          store_type: g.store_type,
          total_docs: g.doc_ids.size || 1,
          total_items: g.item_count,
          total_qty: g.total_qty,
          total_loss_amount: g.total_loss_amount,
          total_sale_amount: g.total_sale_amount,
          status: g.status
        }));

        const totals = {
          total_docs: summaryRows.reduce((sum, r) => sum + r.total_docs, 0),
          total_items: summaryRows.reduce((sum, r) => sum + r.total_items, 0),
          total_qty: summaryRows.reduce((sum, r) => sum + r.total_qty, 0),
          total_loss_amount: summaryRows.reduce((sum, r) => sum + r.total_loss_amount, 0),
          total_sale_amount: summaryRows.reduce((sum, r) => sum + r.total_sale_amount, 0)
        };

        setReportData({
          rows: summaryRows,
          totals: totals,
          reportType: 'Summary'
        });
      } else {
        // Details View
        const totals = {
          total_items: filteredRows.length,
          total_qty: filteredRows.reduce((sum, r) => sum + r.dml_qty, 0),
          total_loss_amount: filteredRows.reduce((sum, r) => sum + r.loss_amount, 0),
          total_sale_amount: filteredRows.reduce((sum, r) => sum + r.sale_amount, 0)
        };

        setReportData({
          rows: filteredRows,
          totals: totals,
          reportType: 'Details'
        });
      }

      toast.success(`Loaded ${filteredRows.length} record(s)`);
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
          'Store Name': r.store_name,
          'Store Type': r.store_type,
          'Total Documents': r.total_docs,
          'Total Items': r.total_items,
          'Total Qty (PCS)': r.total_qty,
          'Total Loss Amount (Tk)': Number(r.total_loss_amount || 0).toFixed(2),
          'Total Sale Value (Tk)': Number(r.total_sale_amount || 0).toFixed(2),
          'Status': r.status
        }));

        exportData.push({
          'SL': '',
          'Store Name': 'TOTAL SUMMARY',
          'Store Type': '',
          'Total Documents': reportData.totals.total_docs,
          'Total Items': reportData.totals.total_items,
          'Total Qty (PCS)': reportData.totals.total_qty,
          'Total Loss Amount (Tk)': Number(reportData.totals.total_loss_amount || 0).toFixed(2),
          'Total Sale Value (Tk)': Number(reportData.totals.total_sale_amount || 0).toFixed(2),
          'Status': ''
        });
      } else {
        exportData = displayedRows.map((r, idx) => ({
          'SL': idx + 1,
          'DML Date': r.dml_date,
          'Challan / DML No': r.challan_no,
          'Circular / Ref No': r.circular_no,
          'Store Name': r.store_name,
          'Store Type': r.store_type,
          'Barcode': r.barcode,
          'Item Name': r.item_name,
          'Category': r.category,
          'CPU (Tk)': Number(r.cpu || 0).toFixed(2),
          'Sale Price (Tk)': Number(r.sale_price || 0).toFixed(2),
          'DML Qty': r.dml_qty,
          'Unit': 'PCS',
          'Loss / Cost (Tk)': Number(r.loss_amount || 0).toFixed(2),
          'Sale Value (Tk)': Number(r.sale_amount || 0).toFixed(2),
          'Reason': r.reason,
          'Status': r.status
        }));

        exportData.push({
          'SL': '',
          'DML Date': 'TOTAL SUMMARY',
          'Challan / DML No': '',
          'Circular / Ref No': '',
          'Store Name': '',
          'Store Type': '',
          'Barcode': '',
          'Item Name': `${reportData.totals.total_items} Items`,
          'Category': '',
          'CPU (Tk)': '',
          'Sale Price (Tk)': '',
          'DML Qty': reportData.totals.total_qty,
          'Unit': 'PCS',
          'Loss / Cost (Tk)': Number(reportData.totals.total_loss_amount || 0).toFixed(2),
          'Sale Value (Tk)': Number(reportData.totals.total_sale_amount || 0).toFixed(2),
          'Reason': '',
          'Status': ''
        });
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Store Damage & Lost Report');
      XLSX.writeFile(wb, `Store_Damage_And_Lost_Report_${fromDate}_to_${toDate}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Failed to export Excel');
    }
  };

  // PDF EXPORT
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
      doc.text('EZ ERP', 14, 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(230, 245, 235);
      doc.text('House: 352, Lane: 05, 2nd floor, Baridhara DOHS, Dhaka-1212, Bangladesh', 14, 15);

      // Report Title on Right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      const repTitle = `STORE DAMAGE & LOST REPORT (${reportData.reportType.toUpperCase()})`;
      doc.text(repTitle, pageWidth - 14, 11, { align: 'right' });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(220, 240, 225);
      doc.text(`Period: ${fromDate} to ${toDate}`, pageWidth - 14, 17, { align: 'right' });

      // 2. Metadata Bar
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 25, pageWidth - 28, 7, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 25, pageWidth - 28, 7, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      
      const storeLabel = selectedStore !== 'ALL' ? selectedStore : (storeType !== 'ALL' ? `Type: ${storeType}` : 'All Stores');
      const circularLabel = circularNoInput && circularNoInput !== 'ALL' ? circularNoInput : 'All';
      const statusLabel = statusInput && statusInput !== '-- ALL --' ? statusInput : 'All Status';
      const currentUser = user?.name || user?.username || 'Admin';
      const preparedByName = (currentUser === 'msmraqeeb@gmail.com' || currentUser === 'admin@email.com') ? 'Admin' : currentUser;

      doc.text(`Store: ${storeLabel}    |    Circular No: ${circularLabel}    |    Status: ${statusLabel}    |    Printed By: ${preparedByName}    |    Print Time: ${new Date().toLocaleString('en-GB')}`, 16, 29.5);

      // 3. Table Headers & Body
      let headers = [];
      let body = [];

      if (reportData.reportType === 'Summary') {
        headers = [['SL', 'Store Name', 'Store Type', 'Total Documents', 'Total Items', 'Total Qty (PCS)', 'Total Loss Amount (Tk)', 'Total Sale Value (Tk)', 'Status']];
        body = displayedRows.map((r, idx) => [
          idx + 1,
          r.store_name,
          r.store_type,
          r.total_docs,
          r.total_items,
          r.total_qty,
          Number(r.total_loss_amount || 0).toFixed(2),
          Number(r.total_sale_amount || 0).toFixed(2),
          r.status
        ]);

        body.push([
          '',
          'TOTAL SUMMARY',
          '',
          `${reportData.totals.total_docs} Docs`,
          reportData.totals.total_items,
          reportData.totals.total_qty,
          Number(reportData.totals.total_loss_amount || 0).toFixed(2),
          Number(reportData.totals.total_sale_amount || 0).toFixed(2),
          ''
        ]);
      } else {
        headers = [['SL', 'Date', 'Challan No', 'Circular/Ref', 'Store', 'Barcode', 'Item Name', 'Category', 'CPU (Tk)', 'Sale (Tk)', 'Qty', 'Loss Cost (Tk)', 'Sale Val (Tk)', 'Reason', 'Status']];
        body = displayedRows.map((r, idx) => [
          idx + 1,
          r.dml_date,
          r.challan_no,
          r.circular_no,
          r.store_name,
          r.barcode,
          r.item_name,
          r.category,
          Number(r.cpu || 0).toFixed(2),
          Number(r.sale_price || 0).toFixed(2),
          r.dml_qty,
          Number(r.loss_amount || 0).toFixed(2),
          Number(r.sale_amount || 0).toFixed(2),
          r.reason,
          r.status
        ]);

        body.push([
          '',
          'TOTAL SUMMARY',
          '',
          '',
          '',
          '',
          `${reportData.totals.total_items} Items`,
          '',
          '',
          '',
          reportData.totals.total_qty,
          Number(reportData.totals.total_loss_amount || 0).toFixed(2),
          Number(reportData.totals.total_sale_amount || 0).toFixed(2),
          '',
          ''
        ]);
      }

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.6, textColor: [30, 30, 30] },
        headStyles: { fillColor: [46, 111, 64], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            else if (reportData.reportType === 'Summary') {
              if (data.column.index === 1 || data.column.index === 2 || data.column.index === 8) data.cell.styles.halign = 'left';
              else data.cell.styles.halign = 'right';
            } else {
              if ([1, 2, 3, 4, 5, 6, 7, 13, 14].includes(data.column.index)) data.cell.styles.halign = 'left';
              else data.cell.styles.halign = 'right';
            }
          } else if (data.section === 'body') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            else if (reportData.reportType === 'Summary') {
              if (data.column.index === 1 || data.column.index === 2 || data.column.index === 8) data.cell.styles.halign = 'left';
              else data.cell.styles.halign = 'right';
            } else {
              if ([1, 2, 3, 4, 5, 6, 7, 13, 14].includes(data.column.index)) data.cell.styles.halign = 'left';
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

      // 4. Signatures at Bottom
      const finalY = doc.lastAutoTable.finalY || 160;
      const sigY = Math.max(finalY + 24, pageHeight - 20);

      doc.setDrawColor(160, 174, 192);
      doc.setLineWidth(0.4);

      // Prepared By (Left)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(preparedByName, 47.5, sigY - 2.5, { align: 'center' });
      doc.line(20, sigY, 75, sigY);
      doc.text('Prepared By', 47.5, sigY + 4.5, { align: 'center' });

      // Checked By (Middle)
      doc.line(pageWidth / 2 - 27.5, sigY, pageWidth / 2 + 27.5, sigY);
      doc.text('Checked By', pageWidth / 2, sigY + 4.5, { align: 'center' });

      // Authorized By (Right)
      doc.line(pageWidth - 75, sigY, pageWidth - 20, sigY);
      doc.text('Authorized By', pageWidth - 47.5, sigY + 4.5, { align: 'center' });

      doc.save(`Store_Damage_And_Lost_Report_${fromDate}_to_${toDate}.pdf`);
      toast.success('PDF generated successfully');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      {/* Page Title */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '700', 
          color: '#1e293b', 
          margin: 0,
          letterSpacing: '-0.01em'
        }}>
          Store Damage & Lost Report
        </h2>
      </div>

      {/* Main Filter Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>

        {/* 2-Column Grid Filters matching screenshot */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          columnGap: '40px',
          rowGap: '16px',
          marginBottom: '24px'
        }}>

          {/* Row 1: From Date | To Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>From Date</label>
            <input 
              type="date"
              className="input-animated"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setReportData(null); }}
              style={{ width: '100%', height: '36px', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>To Date</label>
            <input 
              type="date"
              className="input-animated"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setReportData(null); }}
              style={{ width: '100%', height: '36px', fontSize: '0.875rem' }}
            />
          </div>

          {/* Row 2: Store Type | Store */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>Store Type</label>
            <CustomSelect
              className="input-animated"
              value={storeType}
              onChange={(e) => { 
                setStoreType(e.target.value); 
                setSelectedStore('ALL');
                setReportData(null);
              }}
              style={{ width: '100%', height: '36px', fontSize: '0.875rem' }}
            >
              {storeTypesList.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </CustomSelect>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>Store</label>
            <CustomSelect
              className="input-animated"
              value={selectedStore}
              onChange={(e) => { setSelectedStore(e.target.value); setReportData(null); }}
              style={{ width: '100%', height: '36px', fontSize: '0.875rem' }}
            >
              <option value="ALL">Select Store</option>
              {availableStores.map(st => (
                <option key={st.id} value={st.name}>{st.name}</option>
              ))}
            </CustomSelect>
          </div>

          {/* Row 3: Barcode | Circular No */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>Barcode</label>
            <input 
              type="text"
              className="input-animated"
              value={barcodeInput}
              onChange={(e) => { setBarcodeInput(e.target.value); setReportData(null); }}
              placeholder="ALL"
              style={{ width: '100%', height: '36px', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>Circular No</label>
            <input 
              type="text"
              className="input-animated"
              value={circularNoInput}
              onChange={(e) => { setCircularNoInput(e.target.value); setReportData(null); }}
              placeholder="ALL"
              style={{ width: '100%', height: '36px', fontSize: '0.875rem' }}
            />
          </div>

          {/* Row 4: Status | (Empty) */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>Status</label>
            <CustomSelect
              className="input-animated"
              value={statusInput}
              onChange={(e) => { setStatusInput(e.target.value); setReportData(null); }}
              style={{ width: '100%', height: '36px', fontSize: '0.875rem' }}
            >
              {statusList.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </CustomSelect>
          </div>

          <div></div>

        </div>

        {/* Report Type Section */}
        <div style={{ marginTop: '16px', marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '0.95rem', 
            fontWeight: '700', 
            color: '#1e293b', 
            marginBottom: '12px' 
          }}>
            Report Type
          </div>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
            {reportTypeOptions.map((type) => (
              <div 
                key={type}
                onClick={() => { setReportType(type); setReportData(null); }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                {/* Round Green Bullet Point */}
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: `2px solid ${reportType === type ? '#2e6f40' : '#cbd5e1'}`,
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: reportType === type ? '0 0 3px rgba(46, 111, 64, 0.4)' : 'none'
                }}>
                  {reportType === type && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#2e6f40'
                    }} />
                  )}
                </div>
                <span style={{ 
                  fontSize: '0.9rem', 
                  color: reportType === type ? '#1e293b' : '#64748b',
                  fontWeight: reportType === type ? '600' : 'normal'
                }}>
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Print Type / Action Buttons */}
        <div>
          <div style={{ 
            fontSize: '0.95rem', 
            fontWeight: '700', 
            color: '#1e293b', 
            marginBottom: '12px' 
          }}>
            Print Type
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            
            {/* Show Button (btn-theme) */}
            <button
              type="button"
              className="btn-theme"
              onClick={handleShowReport}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px 20px',
                fontSize: '0.875rem',
                fontWeight: '600',
                minWidth: '90px'
              }}
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
              {loading ? 'Loading...' : 'Show'}
            </button>

            {/* Reload Button (btn-danger) */}
            <button
              type="button"
              className="btn-danger"
              onClick={handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px 20px',
                fontSize: '0.875rem',
                fontWeight: '600',
                minWidth: '90px'
              }}
            >
              <RotateCcw size={14} />
              Reload
            </button>

            {/* Conditional PDF & Excel Download Buttons when report data is loaded */}
            {reportData && reportData.rows.length > 0 && (
              <>
                <button
                  type="button"
                  className="btn-theme"
                  onClick={handleExportPDF}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px 18px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  <Download size={14} />
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px 18px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: '#fff',
                    color: '#2e6f40',
                    border: '1px solid #2e6f40',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FileSpreadsheet size={14} color="#2e6f40" />
                  Download Excel
                </button>
              </>
            )}

          </div>
        </div>

      </div>

      {/* Generated Report Data Table */}
      {reportData && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>

          {/* Table Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>
                Report Result ({reportData.reportType}):
              </span>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {displayedRows.length} record(s)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Search Inside Table */}
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text"
                  placeholder="Search in table..."
                  value={tableSearch}
                  onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
                  className="input-animated"
                  style={{
                    paddingLeft: '32px',
                    height: '34px',
                    fontSize: '0.85rem',
                    width: '220px'
                  }}
                />
              </div>

              {/* Quick Print/PDF Button */}
              <button
                type="button"
                className="btn-theme"
                onClick={handleExportPDF}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}
              >
                <Printer size={14} />
                Print / PDF
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'center', width: '50px' }}>SL</th>
                  {reportData.reportType === 'Summary' ? (
                    <>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Store Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Store Type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Documents</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Items</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Qty (PCS)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Loss Amount (Tk)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Sale Value (Tk)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Status</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Challan No</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Circular / Ref</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Store</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Barcode</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Category</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>CPU (Tk)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sale (Tk)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Loss Cost (Tk)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Sale Value (Tk)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Reason</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={reportData.reportType === 'Summary' ? 9 : 15} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      No matching records found
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const rowSL = (currentPage - 1) * rowsPerPage + idx + 1;
                    return (
                      <tr 
                        key={row.id || idx}
                        style={{ 
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: idx % 2 === 1 ? '#fcfdfc' : '#fff',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f8f3'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 1 ? '#fcfdfc' : '#fff'}
                      >
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>{rowSL}</td>
                        {reportData.reportType === 'Summary' ? (
                          <>
                            <td style={{ padding: '8px 12px', fontWeight: '600', color: '#1e293b' }}>{row.store_name}</td>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>{row.store_type}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>{row.total_docs}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>{row.total_items}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>{row.total_qty}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#b91c1c' }}>
                              {Number(row.total_loss_amount || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                              {Number(row.total_sale_amount || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                backgroundColor: row.status === 'Approved' ? '#ecfdf5' : '#f1f5f9',
                                color: row.status === 'Approved' ? '#047857' : '#475569',
                                border: `1px solid ${row.status === 'Approved' ? '#a7f3d0' : '#e2e8f0'}`
                              }}>
                                {row.status}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '8px 12px', color: '#475569', whiteSpace: 'nowrap' }}>{row.dml_date}</td>
                            <td style={{ padding: '8px 12px', fontWeight: '600', color: '#2e6f40', whiteSpace: 'nowrap' }}>{row.challan_no}</td>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.circular_no}</td>
                            <td style={{ padding: '8px 12px', color: '#1e293b' }}>{row.store_name}</td>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#334155' }}>{row.barcode}</td>
                            <td style={{ padding: '8px 12px', fontWeight: '500', color: '#1e293b' }}>{row.item_name}</td>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.category}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>{Number(row.cpu || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>{Number(row.sale_price || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#1e293b' }}>{row.dml_qty}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: '#b91c1c' }}>
                              {Number(row.loss_amount || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                              {Number(row.sale_amount || 0).toFixed(2)}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>{row.reason}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                backgroundColor: row.status === 'Approved' ? '#ecfdf5' : '#f1f5f9',
                                color: row.status === 'Approved' ? '#047857' : '#475569',
                                border: `1px solid ${row.status === 'Approved' ? '#a7f3d0' : '#e2e8f0'}`
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

              {/* Total Summary Footer Row */}
              {displayedRows.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: '#f0fdf4', borderTop: '2px solid #bbf7d0', fontWeight: '700', color: '#166534' }}>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>Total</td>
                    {reportData.reportType === 'Summary' ? (
                      <>
                        <td style={{ padding: '10px 12px' }}>TOTAL SUMMARY</td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{reportData.totals.total_docs}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{reportData.totals.total_items}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#b91c1c' }}>
                          {Number(reportData.totals.total_loss_amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          {Number(reportData.totals.total_sale_amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '10px 12px' }}>-</td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                        <td style={{ padding: '10px 12px' }}>{reportData.totals.total_items} Items</td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>{reportData.totals.total_qty}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#b91c1c' }}>
                          {Number(reportData.totals.total_loss_amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          {Number(reportData.totals.total_sale_amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                        <td style={{ padding: '10px 12px' }}>-</td>
                      </>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Page {currentPage} of {totalPages} ({displayedRows.length} total items)
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    border: '1px solid #e2e8f0',
                    backgroundColor: currentPage === 1 ? '#f8fafc' : '#fff',
                    color: currentPage === 1 ? '#94a3b8' : '#334155',
                    borderRadius: '4px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    border: '1px solid #e2e8f0',
                    backgroundColor: currentPage === totalPages ? '#f8fafc' : '#fff',
                    color: currentPage === totalPages ? '#94a3b8' : '#334155',
                    borderRadius: '4px',
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

export default StoreDamageAndLostReport;
