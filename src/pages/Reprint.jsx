import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from '../components/CustomSelect';

const SectionWrapper = ({ title, children, rightContent }) => (
  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', backgroundColor: 'var(--card-bg)', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
    {(title || rightContent) && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
        {rightContent}
      </div>
    )}
    {children}
  </div>
);

const REPRINT_TYPES = [
  'Purchase Order',
  'Purchase Receive Challan',
  'Purchase Return Challan',
  'Store Delivery Challan',
  'Store Delivery Challan Summary',
  'DML Challan',
  'Store Delivery Receive Challan',
  'Circular Price Change',
  'Store Requisition(Ecom)',
  'Store Requisition'
];

const Reprint = () => {
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedStore, setSelectedStore] = useState('Central Store');
  
  const [documentList, setDocumentList] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase.from('stores').select('id, name').eq('status', 'ACTIVE').order('name');
        if (data) setStores(data);
      } catch (err) {
        console.error("Failed to load stores");
      }
    };
    fetchInitialData();
  }, []);

  // Fetch document numbers when Type or Dates change
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!selectedType) {
        setDocumentList([]);
        return;
      }
      
      setIsLoading(true);
      try {
        let docs = [];
        
        // Dynamic fetch based on type
        if (selectedType === 'Purchase Order') {
          let query = supabase
            .from('purchase_orders')
            .select('po_number')
            .gte('order_date', fromDate)
            .lte('order_date', toDate);
            
          if (selectedStore && selectedStore !== '-- All --') {
            query = query.eq('delivery_to', selectedStore);
          }
            
          const { data, error } = await query;
          if (!error && data) docs = data.map(d => d.po_number).filter(Boolean);
        } 
        else if (selectedType === 'DML Challan') {
          const { data, error } = await supabase
            .from('damage_and_lost')
            .select('id')
            .gte('dml_date', fromDate)
            .lte('dml_date', toDate);
            
          if (!error && data) docs = data.map(d => String(d.id));
        }
        else if (selectedType === 'Store Requisition(Ecom)' || selectedType === 'Store Requisition') {
          let query = supabase
            .from('requisitions')
            .select('requisition_no')
            .gte('requisition_date', fromDate)
            .lte('requisition_date', toDate);
            
          if (selectedStore && selectedStore !== '-- All --') {
            const s = stores.find(s => s.name === selectedStore);
            if (s) {
              query = query.eq('shop_id', s.id);
            } else {
              query = query.eq('shop_id', '00000000-0000-0000-0000-000000000000');
            }
          }
            
          const { data, error } = await query;
          if (!error && data) docs = data.map(d => d.requisition_no).filter(Boolean);
        }
        else if (selectedType === 'Purchase Receive Challan') {
          let query = supabase
            .from('purchase_receives')
            .select('last_challan_no')
            .gte('purchase_date', fromDate)
            .lte('purchase_date', toDate)
            .eq('status', 'Saved');
            
          if (selectedStore && selectedStore !== '-- All --') {
            query = query.eq('delivery_to', selectedStore);
          }
            
          const { data, error } = await query;
          if (!error && data) docs = data.map(d => d.last_challan_no).filter(Boolean);
        }
        else if (selectedType === 'Store Delivery Challan' || selectedType === 'Store Delivery Challan Summary') {
          let query = supabase
            .from('requisitions')
            .select('challan_no, requisition_no')
            .gte('requisition_date', fromDate)
            .lte('requisition_date', toDate)
            .not('status', 'eq', 'Receive Challan')
            .not('requisition_no', 'like', 'SDR%');
            
          if (selectedStore && selectedStore !== '-- All --') {
            if (selectedStore === 'Central Store') {
              // Central store is the sender, so show all delivery challans
            } else {
              // Delivery challans shouldn't show up for receiver stores
              query = query.eq('shop_id', '00000000-0000-0000-0000-000000000000');
            }
          }
          const { data, error } = await query;
          if (!error && data) {
            const arr = data.map(d => d.challan_no || d.requisition_no).filter(Boolean);
            docs = [...new Set(arr)];
          }
        }
        else if (selectedType === 'Store Delivery Receive Challan') {
          let query = supabase
            .from('requisitions')
            .select('requisition_no')
            .gte('requisition_date', fromDate)
            .lte('requisition_date', toDate)
            .eq('status', 'Receive Challan');
            
          if (selectedStore && selectedStore !== '-- All --') {
            const s = stores.find(s => s.name === selectedStore);
            if (s) {
              query = query.eq('shop_id', s.id);
            } else {
              query = query.eq('shop_id', '00000000-0000-0000-0000-000000000000');
            }
          }
          const { data, error } = await query;
          if (!error && data) docs = data.map(d => d.requisition_no).filter(Boolean);
        }
        else if (selectedType === 'Purchase Return Challan') {
          const { data, error } = await supabase
            .from('purchase_returns')
            .select('challan_no')
            .gte('return_date', fromDate)
            .lte('return_date', toDate);
          if (!error && data) docs = data.map(d => d.challan_no).filter(Boolean);
        }
        else {
          docs = [];
        }

        setDocumentList(docs);
        setSelectedDocument('');
      } catch (err) {
        console.error(err);
        toast.error("Failed to load documents");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [selectedType, fromDate, toDate, selectedStore, stores]);

  const getLabelForType = () => {
    if (!selectedType) return 'Document No';
    return `${selectedType} No`;
  };

  const handleReprint = async () => {
    if (!selectedType) {
      toast.error('Please select a Type');
      return;
    }
    if (!selectedDocument) {
      toast.error(`Please select a ${getLabelForType()}`);
      return;
    }

    setIsLoading(true);
    let headerInfo = {};
    let items = [];

    try {
      if (selectedType === 'Purchase Order') {
        const { data: po } = await supabase.from('purchase_orders').select('*, vendors(name)').eq('po_number', selectedDocument).single();
        const { data: poItems } = await supabase.from('purchase_order_items').select('*, products(item_name, barcode, sale_vat_percent)').eq('purchase_order_id', po?.id);
        
        let docNumber = po?.po_number || selectedDocument;
        if (!docNumber.startsWith('#')) docNumber = `#${docNumber}`;

        headerInfo = {
          title: 'PURCHASE ORDER CHALLAN',
          docNo: docNumber,
          date: po?.order_date,
          orderNo: '',
          deliveryTo: po?.delivery_to || 'Central Store',
          vendorName: po?.vendors?.name || 'N/A',
          remarks: po?.reference_no || 'N/A',
          isDuplicate: true
        };
        
        let totalQty = 0;
        let totalFreeQty = 0;
        let totalValue = 0;
        let totalDiscAmt = 0;
        let totalVat = 0;
        let totalAmount = 0;

        items = (poItems || []).map((i, idx) => {
          const qty = Number(i.qty || 0);
          const purPrice = Number(i.pur_price || 0);
          const mrp = Number(i.mrp_price || 0);
          const disc = Number(i.disc_percent || 0);
          const freeQty = Number(i.free_qty || 0);
          const val = qty * purPrice;
          const discAmt = (val * disc) / 100;
          const vatRate = Number(i.products?.sale_vat_percent || 0);
          const vatAmt = ((val - discAmt) * vatRate) / 100;
          const lineAmt = val - discAmt + vatAmt;

          totalQty += qty;
          totalFreeQty += freeQty;
          totalValue += val;
          totalDiscAmt += discAmt;
          totalVat += vatAmt;
          totalAmount += lineAmt;

          return [
            idx + 1,
            i.products?.barcode || '-',
            i.products?.item_name || '',
            purPrice.toFixed(2),
            mrp.toFixed(2),
            qty,
            disc,
            freeQty,
            val.toFixed(2),
            discAmt.toFixed(2),
            vatAmt.toFixed(2),
            lineAmt.toFixed(2)
          ];
        });

        // Add Summary Row
        items.push([
          'Total',
          '',
          '',
          '',
          '',
          totalQty,
          '',
          totalFreeQty,
          totalValue.toFixed(2),
          totalDiscAmt.toFixed(2),
          totalVat.toFixed(2),
          totalAmount.toFixed(2)
        ]);

      } else if (selectedType === 'DML Challan') {
        const { data: dml } = await supabase.from('damage_and_lost').select('*').eq('id', selectedDocument).single();
        const { data: dmlItems } = await supabase.from('damage_and_lost_items').select('*, products(item_name, barcode)').eq('damage_and_lost_id', dml?.id);

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: dml?.id,
          date: dml?.dml_date,
          orderNo: '',
          deliveryTo: '',
          vendorName: '',
          remarks: dml?.reference_no
        };

        items = (dmlItems || []).map((i, idx) => ([
          idx + 1,
          i.products?.barcode || i.barcode || '',
          i.products?.item_name || '',
          Number(i.dml_qty || 0).toFixed(2) + ' PCS',
          '0.00',
          Number(i.cpu || 0).toFixed(2),
          Number(i.sale_price || 0).toFixed(2),
          '0.00',
          Number(i.amount || 0).toFixed(2)
        ]));

      } else if (selectedType === 'Store Requisition(Ecom)' || selectedType === 'Store Requisition') {
        const { data: req } = await supabase.from('requisitions').select('*, stores(name)').eq('requisition_no', selectedDocument).single();
        const { data: reqItems } = await supabase.from('requisition_items').select('*, products(item_name, barcode, mrp)').eq('requisition_id', req?.id);

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: req?.requisition_no,
          date: req?.requisition_date,
          orderNo: '',
          deliveryTo: req?.stores?.name || '',
          vendorName: '',
          remarks: ''
        };

        items = (reqItems || []).map((i, idx) => ([
          idx + 1,
          i.products?.barcode || '',
          i.products?.item_name || '',
          Number(i.req_qty || 0).toFixed(2) + ' PCS',
          '0.00',
          '0.00',
          Number(i.products?.mrp || 0).toFixed(2),
          '0.00',
          '0.00' // amount 0 for requisition
        ]));

      } else if (selectedType === 'Purchase Receive Challan') {
        const { data: pr } = await supabase.from('purchase_receives').select('*, vendors(name), purchase_orders(po_number)').eq('last_challan_no', selectedDocument).single();
        const { data: prItems } = await supabase.from('purchase_receive_items').select('*, products(item_name, barcode)').eq('purchase_receive_id', pr?.id);

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: pr?.last_challan_no,
          date: pr?.purchase_date,
          orderNo: pr?.purchase_orders?.po_number || 'DIRECT',
          deliveryTo: pr?.delivery_to || selectedStore,
          vendorName: pr?.vendors?.name || '',
          remarks: pr?.reference_no || ''
        };

        items = (prItems || []).map((i, idx) => ([
          idx + 1,
          i.products?.barcode || '',
          i.products?.item_name || '',
          Number(i.rcv_qty || 0).toFixed(2) + ' PCS',
          Number(i.free_qty || 0).toFixed(2) + ' PCS',
          Number(i.pur_price || 0).toFixed(2),
          Number(i.sale_price || 0).toFixed(2),
          Number(i.disc_percent || 0).toFixed(2) + '%',
          Number(i.line_amount || 0).toFixed(2)
        ]));

      } else if (selectedType === 'Purchase Return Challan') {
        const { data: prt } = await supabase.from('purchase_returns').select('*, vendors(name)').eq('challan_no', selectedDocument).single();
        const { data: prtItems } = await supabase.from('purchase_return_items').select('*, products(item_name, barcode)').eq('purchase_return_id', prt?.id);

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: prt?.challan_no,
          date: prt?.return_date,
          orderNo: '',
          deliveryTo: '',
          vendorName: prt?.vendors?.name || '',
          remarks: prt?.reference_no || ''
        };

        items = (prtItems || []).map((i, idx) => ([
          idx + 1,
          i.products?.barcode || '',
          i.products?.item_name || '',
          Number(i.return_qty || 0).toFixed(2) + ' PCS',
          '0.00',
          Number(i.cost_price || 0).toFixed(2),
          Number(i.sale_price || 0).toFixed(2),
          '0.00',
          Number(i.line_amount || 0).toFixed(2)
        ]));

      } else if (selectedType === 'Store Delivery Challan' || selectedType === 'Store Delivery Challan Summary') {
        const { data: req } = await supabase.from('requisitions')
          .select('*, stores(name)')
          .or(`challan_no.eq.${selectedDocument},requisition_no.eq.${selectedDocument}`)
          .not('status', 'eq', 'Receive Challan')
          .not('requisition_no', 'like', 'SDR%')
          .single();
        const { data: reqItems } = await supabase.from('requisition_items').select('*, products(item_name, barcode, mrp)').eq('requisition_id', req?.id);

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: req?.challan_no || req?.requisition_no,
          date: req?.requisition_date,
          orderNo: '',
          deliveryTo: req?.stores?.name || '',
          vendorName: '',
          remarks: ''
        };

        items = (reqItems || []).map((i, idx) => {
          const qty = Number(i.approve_qty) || 0;
          const cpu = Number(i.cpu) || 0;
          const mrp = Number(i.products?.mrp || i.mrp) || 0;
          return [
            idx + 1,
            i.products?.barcode || i.barcode || '',
            i.products?.item_name || i.product_name || '',
            qty.toFixed(2) + ' PCS',
            Number(i.bal_qty || 0).toFixed(2) + ' PCS',
            cpu.toFixed(2),
            mrp.toFixed(2),
            (Number(i.cost_value) || (cpu * qty)).toFixed(2),
            (mrp * qty).toFixed(2)
          ];
        });

      } else if (selectedType === 'Store Delivery Receive Challan') {
        const { data: req } = await supabase.from('requisitions')
          .select('*, stores(name)')
          .or(`challan_no.eq.${selectedDocument},requisition_no.eq.${selectedDocument}`)
          .eq('status', 'Receive Challan')
          .single();
        const { data: reqItems } = await supabase.from('requisition_items').select('*, products(item_name, barcode, mrp)').eq('requisition_id', req?.id);

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: req?.requisition_no || '', // the SDR number
          date: req?.requisition_date,
          orderNo: req?.challan_no || '', // the DLV number
          deliveryTo: req?.stores?.name || '',
          vendorName: '',
          remarks: ''
        };

        items = (reqItems || []).map((i, idx) => {
          const qty = Number(i.approve_qty) || 0;
          const mrp = Number(i.products?.mrp || i.mrp) || 0;
          return [
            idx + 1,
            i.products?.barcode || i.barcode || '',
            i.products?.item_name || i.product_name || '',
            qty.toFixed(2) + ' PCS',
            '0.00 PCS',
            '0.00',
            mrp.toFixed(2),
            '0.00',
            (mrp * qty).toFixed(2)
          ];
        });

      } else {
        // Mock fallback for types not built yet
        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: selectedDocument,
          date: new Date().toISOString().split('T')[0],
          orderNo: 'DIRECT',
          deliveryTo: selectedStore,
          vendorName: 'N/A',
          remarks: 'N/A'
        };
        items = [];
      }

      // Generate PDF
      const isLandscape = (selectedType === 'Purchase Order');
      const doc = new jsPDF(isLandscape ? 'landscape' : 'portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Company Header (Center)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(46, 111, 64);
      doc.text("EZ ERP", pageWidth / 2, 13, { align: 'center' });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      doc.text("House: 352, Lane: 05, 2nd floor, Baridhara DOHS, Dhaka-1212, Bangladesh", pageWidth / 2, 18, { align: 'center' });

      // 2. Top Right details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(46, 111, 64);
      doc.text(headerInfo.title || 'CHALLAN', pageWidth - 14, 13, { align: 'right' });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text(`Challan No: ${headerInfo.docNo || ''}`, pageWidth - 14, 18.5, { align: 'right' });
      if (headerInfo.date) doc.text(`Purchase Date: ${headerInfo.date}`, pageWidth - 14, 23, { align: 'right' });
      if (headerInfo.deliveryTo) doc.text(`Delivery To: ${headerInfo.deliveryTo}`, pageWidth - 14, 27.5, { align: 'right' });
      
      // Duplicate badge right below Delivery To
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(220, 38, 38);
      doc.text(`[DUPLICATE]`, pageWidth - 14, 32, { align: 'right' });

      // 3. Top Left details
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      if (headerInfo.vendorName) {
        doc.text(`Vendor Name:`, 14, 18.5);
        doc.setFont("helvetica", "normal");
        doc.text(`${headerInfo.vendorName}`, 42, 18.5);
      }
      if (headerInfo.remarks) {
        doc.setFont("helvetica", "bold");
        doc.text(`Reference No:`, 14, 23);
        doc.setFont("helvetica", "normal");
        doc.text(`${headerInfo.remarks}`, 42, 23);
      }

      // 4. Table Layout
      let startY = 36;
      let tableHead = [['SL', 'Barcode', 'Item Name', 'Pur. Price', 'MRP', 'Qty', 'Disc(%)', 'Free Qty', 'Value', 'Dis.Amt', 'VAT', 'Amount']];

      if (selectedType === 'Purchase Order') {
        tableHead = [['SL', 'Barcode', 'Item Name', 'Pur. Price', 'MRP', 'Qty', 'Disc(%)', 'Free Qty', 'Value', 'Dis.Amt', 'VAT', 'Amount']];
      } else if (selectedType === 'Store Delivery Receive Challan' || selectedType === 'Store Delivery Challan' || selectedType === 'Store Delivery Challan Summary') {
        tableHead = [['SL', 'Barcode', 'Item Name', 'Del Qty', 'C. Stock', 'CPU', 'Sale Price', 'Cost Value', 'Sale Value']];
      } else if (selectedType === 'DML Challan') {
        tableHead = [['SL', 'Barcode', 'Item Name', 'DML Qty', 'UOM', 'CPU', 'Sale Price', 'VAT', 'Amount']];
      }

      autoTable(doc, {
        startY: startY,
        head: tableHead,
        body: items,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8, textColor: [30, 30, 30] },
        headStyles: { fillColor: [46, 111, 64], fontStyle: 'bold', textColor: [255, 255, 255], halign: 'right' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'left', cellWidth: isLandscape ? 26 : 22 },
          2: { halign: 'left', cellWidth: 'auto' },
          3: { halign: 'right', cellWidth: isLandscape ? 20 : 18 },
          4: { halign: 'right', cellWidth: isLandscape ? 20 : 18 },
          5: { halign: 'right', cellWidth: isLandscape ? 16 : 14 },
          6: { halign: 'right', cellWidth: isLandscape ? 16 : 14 },
          7: { halign: 'right', cellWidth: isLandscape ? 16 : 14 },
          8: { halign: 'right', cellWidth: isLandscape ? 22 : 18 },
          9: { halign: 'right', cellWidth: isLandscape ? 18 : 16 },
          10: { halign: 'right', cellWidth: isLandscape ? 18 : 16 },
          11: { halign: 'right', cellWidth: isLandscape ? 24 : 18 }
        },
        didParseCell: function (data) {
          if (data.section === 'head') {
            if (data.column.index === 0) data.cell.styles.halign = 'center';
            if (data.column.index === 1 || data.column.index === 2) data.cell.styles.halign = 'left';
          }
          if (data.row.index === items.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 245, 240];
            data.cell.styles.textColor = [10, 60, 20];
          }
        },
        margin: { top: 10, left: 14, right: 14 }
      });

      const finalY = doc.lastAutoTable.finalY || startY + 50;

      // 5. Signatures
      const sigY = Math.max(finalY + 26, pageHeight - 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setLineWidth(0.4);
      doc.setDrawColor(120, 120, 120);
      doc.setTextColor(40, 40, 40);
      
      // Posted By
      doc.line(20, sigY, 70, sigY);
      doc.setFont("helvetica", "bold");
      doc.text('Posted By', 45, sigY + 5, { align: 'center' });

      // Checked By
      doc.setFont("helvetica", "bold");
      doc.line(pageWidth / 2 - 25, sigY, pageWidth / 2 + 25, sigY);
      doc.text('Checked By', pageWidth / 2, sigY + 5, { align: 'center' });

      // Authorized Signature
      doc.setFont("helvetica", "bold");
      doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
      doc.text('Authorized Signature', pageWidth - 45, sigY + 5, { align: 'center' });

      doc.save(`Reprint_${String(headerInfo.docNo || selectedDocument).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
      toast.success("Reprint PDF Generated");

    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      
      <SectionWrapper title="Reprint">
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', maxWidth: '1000px' }}>
          
          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 200px', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>From</label>
              <input 
                type="date" 
                className="input-animated" 
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>TO</label>
              <input 
                type="date" 
                className="input-animated" 
                value={toDate} 
                onChange={e => setToDate(e.target.value)} 
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type</label>
            <CustomSelect 
              className="input-animated" 
              value={selectedType} 
              onChange={e => setSelectedType(e.target.value)}
              style={{ width: '100%', maxWidth: '600px' }}
            >
              <option value="">-- Select --</option>
              {REPRINT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </CustomSelect>
          </div>

          {/* Store */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Store</label>
            <CustomSelect 
              className="input-animated" 
              value={selectedStore} 
              onChange={e => setSelectedStore(e.target.value)}
              style={{ width: '100%', maxWidth: '600px' }}
            >
              <option value="">-- All --</option>
              <option value="Central Store">Central Store</option>
              {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </CustomSelect>
          </div>

          {/* Document No */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', minHeight: '20px' }}>
              {selectedType ? getLabelForType() : 'Document No'}
            </label>
            <CustomSelect 
              className="input-animated" 
              value={selectedDocument} 
              onChange={e => setSelectedDocument(e.target.value)}
              style={{ width: '100%', maxWidth: '600px' }}
              disabled={isLoading || documentList.length === 0}
            >
              <option value="">-- Select --</option>
              {documentList.map(doc => (
                <option key={doc} value={doc}>{doc}</option>
              ))}
            </CustomSelect>
            {isLoading && <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading...</span>}
            {!isLoading && selectedType && documentList.length === 0 && (
              <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: 'var(--danger)' }}>No documents found for this period.</span>
            )}
          </div>

          {/* Reprint Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button className="btn-theme" 
              onClick={handleReprint}
              disabled={isLoading}
              style={{ 
                padding: '10px 40px', 
                backgroundColor: 'var(--accent-primary)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: isLoading ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold',
                transition: 'all 0.3s'
              }}
            >
              {isLoading ? 'Wait...' : 'Reprint'}
            </button>
          </div>

        </div>

      </SectionWrapper>
    </div>
  );
};

export default Reprint;
