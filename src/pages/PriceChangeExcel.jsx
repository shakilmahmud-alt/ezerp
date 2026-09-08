import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SectionWrapper = ({ title, children, rightContent }) => (
  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'var(--card-bg)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
    {(title || rightContent) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
        {rightContent}
      </div>
    )}
    {children}
  </div>
);

// Helper to extract value with fuzzy key matching
const getFuzzyRowVal = (row, fieldKeys) => {
  if (!row || typeof row !== 'object') return '';
  const rowKeys = Object.keys(row);
  for (const fk of fieldKeys) {
    if (row[fk] !== undefined && row[fk] !== null && String(row[fk]).trim() !== '') {
      return row[fk];
    }
    const normFk = fk.toLowerCase().replace(/[^a-z0-9]/g, '');
    const foundKey = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normFk);
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
      return row[foundKey];
    }
  }
  return '';
};

const PriceChangeExcel = () => {
  const [circularName, setCircularName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  
  const [selectedStores, setSelectedStores] = useState([]);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [storesList, setStoresList] = useState([]);
  const [productsList, setProductsList] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: storesData } = await supabase
          .from('stores')
          .select('name')
          .eq('status', 'ACTIVE')
          .order('name');
        if (storesData) {
          setStoresList(['Central Store', ...storesData.map(s => s.name)]);
        }

        const { data: prodsData } = await supabase
          .from('products')
          .select('id, code, barcode, user_define_barcode, item_name, purchase_price, mrp')
          .order('item_name');
        if (prodsData) {
          setProductsList(prodsData);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    fetchInitialData();
  }, []);

  const [excelFile, setExcelFile] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleStore = (store) => {
    setSelectedStores(prev => 
      prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store]
    );
  };

  const handleExport = () => {
    const ws_data = [
      ['BARCODE', 'CPU', 'PRV_MRP', 'MRP', 'IS_USR_BARCODE'],
      ['A000001', '370.5', '591', '600', 'N'],
      ['1001100001', '370.5', '591', '600', 'Y']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Price_Change_Template.xlsx");
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setExcelFile(file);
    }
  };

  const findProduct = (allProds, searchVal) => {
    if (!searchVal) return null;
    const term = String(searchVal).trim();
    if (!term) return null;
    const lower = term.toLowerCase();

    // 1. Exact match by code, barcode, user_define_barcode, or id
    let found = allProds.find(p => 
      String(p.code || '').trim() === term ||
      String(p.barcode || '').trim() === term ||
      String(p.user_define_barcode || '').trim() === term ||
      String(p.id || '').trim() === term
    );
    if (found) return found;

    // 2. Case-insensitive match
    found = allProds.find(p => 
      String(p.code || '').trim().toLowerCase() === lower ||
      String(p.barcode || '').trim().toLowerCase() === lower ||
      String(p.user_define_barcode || '').trim().toLowerCase() === lower
    );
    if (found) return found;

    // 3. Match by item_name
    found = allProds.find(p => 
      String(p.item_name || '').trim().toLowerCase() === lower
    );
    return found || null;
  };

  const handleUpload = async () => {
    if (!excelFile) {
      toast.error("Please choose a file first");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsLoading(true);

        // Fetch fresh products list from database to ensure up-to-date mapping
        let currentProducts = productsList;
        const { data: freshProds, error: pErr } = await supabase
          .from('products')
          .select('id, code, barcode, user_define_barcode, item_name, purchase_price, mrp');
        if (!pErr && freshProds && freshProds.length > 0) {
          currentProducts = freshProds;
          setProductsList(freshProds);
        }

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        if (!json || json.length === 0) {
          toast.error("The uploaded Excel file contains no data");
          return;
        }

        const mappedItems = json.map((row, index) => {
          // Identify barcode/code from various possible headers
          const rawCode = String(
            getFuzzyRowVal(row, [
              'BARCODE', 'Barcode', 'barcode',
              'CODE', 'Code', 'code',
              'ITEM_CODE', 'Item_Code', 'Item Code', 'ItemCode',
              'USER_BARCODE', 'User Barcode', 'user_define_barcode', 'UserBarcode',
              'ITEM', 'Item'
            ]) || Object.values(row)[0] || ''
          ).trim();

          const dbProd = findProduct(currentProducts, rawCode);

          const currentCpu = dbProd ? Number(dbProd.purchase_price || 0) : 0;
          const dbMrp = dbProd ? Number(dbProd.mrp || 0) : 0;

          const rawPrvMrp = getFuzzyRowVal(row, ['PRV_MRP', 'PRV MRP', 'CURRENT_MRP', 'Current MRP', 'PREV_MRP', 'OLD_MRP', 'Previous MRP']);
          const currentMrp = (rawPrvMrp !== '' && !isNaN(Number(rawPrvMrp))) ? Number(rawPrvMrp) : dbMrp;

          const rawCpu = getFuzzyRowVal(row, ['CPU', 'Cpu', 'cpu', 'NEW_CPU', 'New CPU', 'Purchase Price', 'PURCHASE_PRICE', 'Cost']);
          const newCpu = (rawCpu !== '' && !isNaN(Number(rawCpu))) ? Number(rawCpu) : currentCpu;

          const rawMrp = getFuzzyRowVal(row, ['MRP', 'Mrp', 'mrp', 'NEW_MRP', 'New MRP', 'Sale Price', 'Price']);
          const newMrp = (rawMrp !== '' && !isNaN(Number(rawMrp))) ? Number(rawMrp) : currentMrp;

          return {
            sl: index + 1,
            code: rawCode || (dbProd?.code || dbProd?.barcode || '-'),
            name: dbProd ? dbProd.item_name : 'Not Found',
            currentCpu: currentCpu,
            newCpu: newCpu,
            currentMrp: currentMrp,
            newMrp: newMrp,
            productId: dbProd ? dbProd.id : null
          };
        });

        setItems(mappedItems);
        toast.success(`Successfully uploaded ${mappedItems.length} items`);
      } catch (err) {
        console.error(err);
        toast.error("Error reading Excel file");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(excelFile);
  };

  const generatePDF = (customData = null) => {
    const dataToUse = customData || {
      circularName: circularName || 'Price Change Circular',
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      selectedStores: selectedStores.length ? selectedStores : ['Central Store'],
      items: items
    };

    const doc = new jsPDF('landscape', 'mm', 'a4');
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
    doc.text("CENTRAL INVENTORY & POS SALES ANALYTICS", 14, 17);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("CIRCULAR PRICE CHANGE REPORT (DETAILS)", pageWidth - 14, 14, { align: 'right' });

    // 2. Metadata Section below Banner
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);

    const line1Left = `Circular Name: ${dataToUse.circularName} | Effective Date: ${dataToUse.effectiveDate}`;
    const line2Left = `Store Scope: ${Array.isArray(dataToUse.selectedStores) ? dataToUse.selectedStores.join(', ') : dataToUse.selectedStores}`;

    const printDateStr = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
    });

    const currentUserName = (localStorage.getItem('erp_user') ? JSON.parse(localStorage.getItem('erp_user'))?.name || JSON.parse(localStorage.getItem('erp_user'))?.username : '') || 'Super Admin';
    const displayName = (currentUserName === 'msmraqeeb@gmail.com' || currentUserName === 'admin@email.com') ? 'Super Admin' : currentUserName;

    doc.text(line1Left, 14, 30);
    doc.text(line2Left, 14, 35);

    doc.text(`Generated On: ${printDateStr}`, pageWidth - 14, 30, { align: 'right' });
    doc.text(`Printed By: ${displayName}`, pageWidth - 14, 35, { align: 'right' });

    // 3. Table Header & Body
    const tableCols = [
      ['SL', 'CODE / BARCODE', 'ITEM NAME', 'CURRENT CPU', 'NEW CPU', 'CURRENT MRP', 'NEW MRP', 'DIFF (MRP)', 'CHANGE (%)']
    ];

    let totalCurrCpu = 0;
    let totalNewCpu = 0;
    let totalCurrMrp = 0;
    let totalNewMrp = 0;

    const tableBody = (dataToUse.items || []).map((item, idx) => {
      const cCpu = Number(item.currentCpu || 0);
      const nCpu = Number(item.newCpu || 0);
      const cMrp = Number(item.currentMrp || 0);
      const nMrp = Number(item.newMrp || 0);
      const diffMrp = nMrp - cMrp;
      const pctChange = cMrp > 0 ? ((diffMrp / cMrp) * 100).toFixed(2) + '%' : '-';

      totalCurrCpu += cCpu;
      totalNewCpu += nCpu;
      totalCurrMrp += cMrp;
      totalNewMrp += nMrp;

      return [
        item.sl || idx + 1,
        item.code || '-',
        item.name || 'Not Found',
        cCpu.toFixed(2),
        nCpu.toFixed(2),
        cMrp.toFixed(2),
        nMrp.toFixed(2),
        (diffMrp >= 0 ? '+' : '') + diffMrp.toFixed(2),
        pctChange
      ];
    });

    const totalDiff = totalNewMrp - totalCurrMrp;

    // Total Row
    tableBody.push([
      'Total',
      '',
      `${(dataToUse.items || []).length} Items`,
      totalCurrCpu.toFixed(2),
      totalNewCpu.toFixed(2),
      totalCurrMrp.toFixed(2),
      totalNewMrp.toFixed(2),
      (totalDiff >= 0 ? '+' : '') + totalDiff.toFixed(2),
      ''
    ]);

    autoTable(doc, {
      startY: 40,
      head: tableCols,
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, valign: 'middle', textColor: [30, 30, 30] },
      headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255], halign: 'center' },
      didParseCell: function (data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
          else if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        } else if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'center';
          else if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        }
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 245, 240];
          data.cell.styles.textColor = [10, 60, 20];
        }
      },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable?.finalY || 100;

    // 4. Signatures
    const sigY = Math.max(finalY + 24, pageHeight - 24);
    doc.setDrawColor(160, 174, 192);
    doc.setLineWidth(0.4);

    // Prepared By (Left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(displayName, 47.5, sigY - 2.5, { align: 'center' });
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

    doc.save(`Price_Change_${String(dataToUse.circularName).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
  };

  const handleSave = async () => {
    if (!circularName) return toast.error("Please enter Circular Name");
    if (!effectiveDate) return toast.error("Please enter Effective Date");
    if (selectedStores.length === 0) return toast.error("Please select at least one store");
    if (items.length === 0) return toast.error("No product data to save");

    setIsLoading(true);
    try {
      const generatedCode = `CPC${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${Math.floor(100 + Math.random() * 900)}`;

      // 1. Save to promotions table for reprint history
      try {
        const { data: promoData, error: promoError } = await supabase
          .from('promotions')
          .insert({
            circular_name: circularName,
            circular_code: generatedCode,
            promotion_type: 'Circular Price Change',
            valid_from: effectiveDate,
            valid_to: effectiveDate,
            stores: selectedStores.join(', ')
          })
          .select()
          .single();

        if (promoData && !promoError) {
          const promoItems = items.map(item => ({
            promotion_id: promoData.id,
            barcode: item.code,
            user_barcode: item.code,
            description: item.name,
            item: JSON.stringify({
              currentCpu: Number(item.currentCpu || 0),
              newCpu: Number(item.newCpu || 0),
              currentMrp: Number(item.currentMrp || 0),
              newMrp: Number(item.newMrp || 0),
              diffMrp: Number(item.newMrp || 0) - Number(item.currentMrp || 0),
              changePercent: item.currentMrp > 0 ? Number((((Number(item.newMrp) - Number(item.currentMrp)) / Number(item.currentMrp)) * 100).toFixed(2)) : 0
            }),
            vendor_contribution_amount: Number(item.currentMrp || 0),
            discount_amount: Number(item.newMrp || 0),
            vendor_contribution_percent: Number(item.currentCpu || 0),
            discount_percent: Number(item.newCpu || 0)
          }));
          await supabase.from('promotion_items').insert(promoItems);
        }
      } catch (pErr) {
        console.warn("Promotion insert error:", pErr);
      }

      // 2. Try to save to price_change_circulars if accessible
      try {
        const { data: circularData, error: circularError } = await supabase
          .from('price_change_circulars')
          .insert({
            circular_name: circularName,
            effective_date: effectiveDate,
            stores: selectedStores.join(', ')
          }).select().single();
        
        if (circularData && !circularError) {
          const payload = items.map(item => ({
            circular_id: circularData.id,
            barcode: item.code,
            current_cpu: item.currentCpu,
            new_cpu: item.newCpu,
            current_mrp: item.currentMrp,
            new_mrp: item.newMrp
          }));
          await supabase.from('price_change_circular_items').insert(payload);
        }
      } catch (cErr) {
        console.warn("Circular insert skipped:", cErr);
      }

      // 3. Update products table
      let updateCount = 0;
      for (const item of items) {
        if (item.name !== 'Not Found') {
          if (item.productId) {
            await supabase
              .from('products')
              .update({
                purchase_price: Number(item.newCpu),
                mrp: Number(item.newMrp)
              })
              .eq('id', item.productId);
            updateCount++;
          } else {
            await supabase
              .from('products')
              .update({
                purchase_price: Number(item.newCpu),
                mrp: Number(item.newMrp)
              })
              .or(`code.eq.${item.code},barcode.eq.${item.code},user_define_barcode.eq.${item.code}`);
            updateCount++;
          }
        }
      }
      
      toast.success(`Price changes applied to ${updateCount} products successfully`);
      generatePDF();
      handleReset();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save price changes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCircularName('');
    setEffectiveDate('');
    setSelectedStores([]);
    setItems([]);
    setExcelFile(null);
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Add Circular Price Change (Excel)
        </h2>
      </div>

      <SectionWrapper title="Circular Information">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Circular Name <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="text" 
              className="input-animated" 
              value={circularName} 
              onChange={e => setCircularName(e.target.value)} 
              style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, paddingLeft: 0 }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Effective Date <span style={{ color: 'red' }}>*</span></label>
            <input 
              type="date" 
              className="input-animated" 
              value={effectiveDate} 
              onChange={e => setEffectiveDate(e.target.value)} 
              style={{ width: '100%', borderBottom: '1px dotted var(--border-color)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, paddingLeft: 0 }}
            />
            <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '4px' }}>dd MMM yyyy</div>
          </div>
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Store</label>
            <div 
              className="input-animated" 
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #ddd' }}
              onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
            >
              <span style={{ color: selectedStores.length ? 'var(--text-primary)' : '#999', fontSize: '0.85rem' }}>
                {selectedStores.length ? selectedStores.join(', ') : 'Select ▼'}
              </span>
            </div>
            {isStoreDropdownOpen && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                backgroundColor: '#fff', 
                border: '1px solid var(--border-color)', 
                borderRadius: '4px', 
                zIndex: 10, 
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
              }}>
                {storesList.map(store => (
                  <label key={store} style={{ display: 'flex', alignItems: 'center', padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedStores.includes(store)} 
                      onChange={() => toggleStore(store)}
                      style={{ marginRight: '10px', accentColor: 'var(--accent-primary)' }}
                    />
                    {store}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper title="Product Details">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <button 
            className="btn-theme" 
            onClick={handleExport}
            style={{ padding: '7px 28px', minWidth: '100px' }}
          >
            Export
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'red', marginBottom: '4px', fontWeight: 600 }}>Select XLS File *</span>
              <input 
                type="file" 
                id="excelFileInput"
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileChange}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ flex: 1 }}></div>

          <button 
            className="btn-theme" 
            onClick={handleUpload}
            disabled={isLoading}
            style={{ padding: '7px 32px', minWidth: '120px' }}
          >
            {isLoading ? 'Wait...' : 'Upload!'}
          </button>
        </div>

        <div style={{ overflowX: 'auto', minHeight: '150px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: '#666' }}>
                <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>SL</th>
                <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>CODE</th>
                <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>Name</th>
                <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>Current CPU</th>
                <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>New CPU</th>
                <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>Current MRP</th>
                <th style={{ padding: '12px 8px', fontWeight: 'bold' }}>New MRP</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No data available</td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.sl} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 8px' }}>{item.sl}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 500 }}>{item.code}</td>
                    <td style={{ padding: '10px 8px', color: item.name === 'Not Found' ? '#dc2626' : 'inherit', fontWeight: item.name === 'Not Found' ? 600 : 400 }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '10px 8px' }}>{item.currentCpu}</td>
                    <td style={{ padding: '10px 8px' }}>{item.newCpu}</td>
                    <td style={{ padding: '10px 8px' }}>{item.currentMrp}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 600, color: '#166534' }}>{item.newMrp}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '40px' }}>
          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="btn-theme"
            style={{ padding: '8px 30px', minWidth: '100px' }}
          >
            Save
          </button>
          <button 
            className="btn-danger" 
            onClick={handleReset}
            style={{ padding: '8px 30px', minWidth: '100px' }}
          >
            Reset
          </button>
        </div>
      </SectionWrapper>
    </div>
  );
};

export default PriceChangeExcel;
