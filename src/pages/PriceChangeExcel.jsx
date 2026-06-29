import React, { useState } from 'react';
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

const PriceChangeExcel = () => {
  const [circularName, setCircularName] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  
  const [selectedStores, setSelectedStores] = useState([]);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const storesList = ['Central Store', 'Shop'];

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
      ['A00014802', '', '6000', '7000', 'N'],
      ['6292358068588', '', '3850', '5000', 'Y']
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

  const handleUpload = () => {
    if (!excelFile) {
      toast.error("Please choose a file first");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsLoading(true);
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        const barcodes = json.map(row => String(row.BARCODE)).filter(Boolean);
        
        const { data: dbProducts, error } = await supabase
          .from('products')
          .select('barcode, item_name, purchase_price, mrp')
          .in('barcode', barcodes);

        if (error) throw error;

        const productMap = {};
        if (dbProducts) {
          dbProducts.forEach(p => {
            productMap[p.barcode] = p;
          });
        }

        const mappedItems = json.map((row, index) => {
          const barcode = String(row.BARCODE);
          const dbProd = productMap[barcode];
          return {
            sl: index + 1,
            code: barcode,
            name: dbProd ? dbProd.item_name : 'Not Found',
            currentCpu: dbProd ? dbProd.purchase_price : 0,
            newCpu: row.CPU !== "" ? row.CPU : (dbProd ? dbProd.purchase_price : 0),
            currentMrp: dbProd ? dbProd.mrp : (row.PRV_MRP || 0),
            newMrp: row.MRP !== "" ? row.MRP : (row.PRV_MRP || 0)
          };
        });

        setItems(mappedItems);
        toast.success("Excel uploaded successfully");
      } catch (err) {
        console.error(err);
        toast.error("Error reading Excel file");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(excelFile);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Company Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("EG ERP", pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text("House:352,Lane:05,2nd floor,Baridhara DOHS,", pageWidth / 2, 20, { align: 'center' });
    doc.text("Dhaka , Dhaka-1212 Bangladesh", pageWidth / 2, 24, { align: 'center' });

    // Top Right details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PRICE CHANGE CIRCULAR', pageWidth - 14, 15, { align: 'right' });
    
    doc.setFontSize(8);
    doc.text(`CIRCULAR NAME: ${circularName}`, pageWidth - 14, 20, { align: 'right' });
    doc.text(`EFFECTIVE DATE: ${effectiveDate}`, pageWidth - 14, 25, { align: 'right' });
    doc.text(`STORES: ${selectedStores.join(', ')}`, pageWidth - 14, 30, { align: 'right' });
    
    // Print Date
    const printDate = new Date().toLocaleString('en-US');
    doc.setFontSize(7);
    doc.text(`PRINT DATE: ${printDate}`, pageWidth - 14, 40, { align: 'right' });

    // Table
    let startY = 45;

    const tableCols = [['S/L', 'BARCODE', 'DISPLAY_NAME', 'CURRENT CPU', 'NEW CPU', 'CURRENT MRP', 'NEW MRP']];
    const tableBody = items.map(item => [
      item.sl,
      item.code,
      item.name,
      Number(item.currentCpu).toFixed(2),
      Number(item.newCpu).toFixed(2),
      Number(item.currentMrp).toFixed(2),
      Number(item.newMrp).toFixed(2)
    ]);

    autoTable(doc, {
      startY: startY,
      head: tableCols,
      body: tableBody,
      theme: 'plain',
      styles: { fontSize: 7, cellPadding: 1, textColor: [0, 0, 0] },
      headStyles: { fontStyle: 'bold', lineWidth: { top: 0.5, bottom: 0.5 }, lineColor: 0, textColor: [0, 0, 0] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    const finalY = doc.lastAutoTable.finalY + 5;
    
    // Summary
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL ITEMS: ${items.length}`, pageWidth - 14, finalY, { align: 'right' });

    // Signatures
    const sigY = finalY + 30;
    doc.setLineWidth(0.5);
    
    doc.text('Admin', 30, sigY - 2, { align: 'center' });
    doc.line(14, sigY, 46, sigY);
    doc.text('Posted By', 30, sigY + 4, { align: 'center' });

    doc.line(80, sigY, 130, sigY);
    doc.text('Checked By', 105, sigY + 4, { align: 'center' });

    doc.line(160, sigY, pageWidth - 14, sigY);
    doc.text('Authorized Signatory', 178, sigY + 4, { align: 'center' });

    doc.save(`Price_Change_${circularName}.pdf`);
  };

  const handleSave = async () => {
    if (!circularName) return toast.error("Please enter Circular Name");
    if (!effectiveDate) return toast.error("Please enter Effective Date");
    if (selectedStores.length === 0) return toast.error("Please select at least one store");
    if (items.length === 0) return toast.error("No product data to save");

    setIsLoading(true);
    try {
      // 1. Try to save to circular table (fail gracefully if table does not exist)
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
      } else if (circularError) {
        console.error("Circular insert error:", circularError);
      }

      // 2. Update products table
      for (const item of items) {
        if (item.name !== 'Not Found') {
          await supabase
            .from('products')
            .update({
              purchase_price: Number(item.newCpu),
              mrp: Number(item.newMrp)
            })
            .eq('barcode', item.code);
        }
      }
      
      toast.success("Price changes applied successfully");
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
          <button className="btn-theme" 
            onClick={handleExport}
            style={{ padding: '8px 40px', backgroundColor: '#38bdf8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Export
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'red', marginBottom: '4px' }}>Select XLS File *</span>
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

          <button className="btn-theme" 
            onClick={handleUpload}
            disabled={isLoading}
            style={{ padding: '8px 50px', backgroundColor: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
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
                    <td style={{ padding: '10px 8px' }}>{item.code}</td>
                    <td style={{ padding: '10px 8px', color: item.name === 'Not Found' ? 'red' : 'inherit' }}>{item.name}</td>
                    <td style={{ padding: '10px 8px' }}>{item.currentCpu}</td>
                    <td style={{ padding: '10px 8px' }}>{item.newCpu}</td>
                    <td style={{ padding: '10px 8px' }}>{item.currentMrp}</td>
                    <td style={{ padding: '10px 8px' }}>{item.newMrp}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
          <button 
            onClick={handleSave}
            disabled={isLoading}
            style={{ 
              padding: '8px 25px', 
              backgroundColor: '#e5e7eb', 
              color: '#4b5563', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontWeight: 'bold'
            }}
           className="btn-theme">
            Save
          </button>
          <button className="btn-danger" 
            onClick={handleReset}
            style={{ 
              padding: '8px 25px', 
              backgroundColor: '#f3f4f6', 
              color: '#9ca3af', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontWeight: 'bold'
            }}
          >
            Reset
          </button>
        </div>
      </SectionWrapper>
    </div>
  );
};

export default PriceChangeExcel;
