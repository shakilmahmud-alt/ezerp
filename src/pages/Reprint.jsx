import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
          const { data, error } = await supabase
            .from('purchase_orders')
            .select('po_number')
            .gte('order_date', fromDate)
            .lte('order_date', toDate);
            
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
          const { data, error } = await supabase
            .from('requisitions')
            .select('requisition_no')
            .gte('requisition_date', fromDate)
            .lte('requisition_date', toDate);
            
          if (!error && data) docs = data.map(d => d.requisition_no).filter(Boolean);
        }
        else if (selectedType === 'Purchase Receive Challan') {
          // Fallback if table doesn't exist
          docs = ['PRC-0001'];
        }
        else if (selectedType === 'Store Delivery Challan') {
          docs = ['SDC-1001'];
        }
        else if (selectedType === 'Purchase Return Challan') {
          docs = ['PRTC-5001'];
        }
        else {
          docs = [`${selectedType.substring(0, 3).toUpperCase()}-9901`];
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
  }, [selectedType, fromDate, toDate]);

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
        const { data: poItems } = await supabase.from('purchase_order_items').select('*, products(item_name, barcode)').eq('purchase_order_id', po?.id);
        
        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: po?.po_number,
          date: po?.order_date,
          orderNo: 'DIRECT',
          deliveryTo: po?.delivery_to,
          vendorName: po?.vendors?.name,
          remarks: po?.reference_no
        };
        
        items = (poItems || []).map((i, idx) => ([
          idx + 1,
          i.products?.barcode || '',
          i.products?.item_name || '',
          Number(i.qty || 0).toFixed(2) + ' PCS',
          '0.00',
          Number(i.pur_price || 0).toFixed(2),
          '0.00',
          '0.00',
          Number(i.amount || 0).toFixed(2)
        ]));

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
        const { data: req } = await supabase.from('requisitions').select('*, shops(name)').eq('requisition_no', selectedDocument).single();
        const { data: reqItems } = await supabase.from('requisition_items').select('*, products(item_name, barcode, mrp)').eq('requisition_id', req?.id);

        headerInfo = {
          title: selectedType.toUpperCase(),
          docNo: req?.requisition_no,
          date: req?.requisition_date,
          orderNo: '',
          deliveryTo: req?.shops?.name || '',
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
        items = [
          ['1', '1041000024', 'Example Item 1', '60.00 PCS', '0.00', '95.00', '160.00', '0.00', '5700.00']
        ];
      }

      // Generate PDF matching the image
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
      doc.text(headerInfo.title, pageWidth - 14, 15, { align: 'right' });
      
      doc.setFontSize(8);
      doc.text(`CHALLAN NO # ${headerInfo.docNo || ''}`, pageWidth - 14, 20, { align: 'right' });
      if(headerInfo.date) doc.text(`PURCHASE DATE: ${headerInfo.date}`, pageWidth - 14, 25, { align: 'right' });
      if(headerInfo.orderNo) doc.text(`ORDER NO: ${headerInfo.orderNo}`, pageWidth - 14, 30, { align: 'right' });
      if(headerInfo.deliveryTo) doc.text(`DELIVERY TO: ${headerInfo.deliveryTo}`, pageWidth - 14, 35, { align: 'right' });
      
      doc.text(`(REPRINTED)`, pageWidth - 14, 40, { align: 'right' });

      // Top Left details
      if(headerInfo.vendorName) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`VENDOR NAME: ${headerInfo.vendorName}`, 14, 45);
      }
      if(headerInfo.remarks) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Reference/Remarks: ${headerInfo.remarks}`, 14, 50);
      }
      
      // Print Date
      const printDate = new Date().toLocaleString('en-US');
      doc.setFontSize(7);
      doc.text(`PRINT DATE: ${printDate}`, pageWidth - 14, 50, { align: 'right' });

      // Table
      let startY = 55;
      
      // Calculate totals for footer
      let totalPurQty = 0;
      let totalFreeQty = 0;
      let totalAmount = 0;
      
      items.forEach(row => {
        totalPurQty += parseFloat(row[3]) || 0;
        totalFreeQty += parseFloat(row[4]) || 0;
        totalAmount += parseFloat(row[8]) || 0;
      });

      const subTotal = totalAmount.toFixed(2);
      const discount = "0.00";
      const netAmount = totalAmount.toFixed(2);

      autoTable(doc, {
        startY: startY,
        head: [['S/L', 'BARCODE', 'DISPLAY_NAME', 'PUR QTY', 'FREE QTY', 'PUR PRICE', 'MRP', 'DISC AMT', 'AMOUNT']],
        body: items,
        theme: 'plain',
        styles: { fontSize: 7, cellPadding: 1, textColor: [0, 0, 0] },
        headStyles: { fontStyle: 'bold', lineWidth: { top: 0.5, bottom: 0.5 }, lineColor: 0, textColor: [0, 0, 0] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      const finalY = doc.lastAutoTable.finalY + 5;
      
      // Totals Section
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('SUB TOTAL:', 110, finalY, { align: 'right' });
      doc.text(totalPurQty.toFixed(2), 125, finalY, { align: 'right' });
      doc.text(totalFreeQty.toFixed(2), 140, finalY, { align: 'right' });
      doc.text(subTotal, pageWidth - 14, finalY, { align: 'right' });
      
      doc.text('DISCOUNT:', 140, finalY + 5, { align: 'right' });
      doc.text(discount, pageWidth - 14, finalY + 5, { align: 'right' });

      doc.text('ADDTIONAL COST:', 140, finalY + 10, { align: 'right' });
      doc.text('0.00', pageWidth - 14, finalY + 10, { align: 'right' });

      // Total line
      doc.setLineWidth(0.5);
      doc.line(110, finalY + 12, pageWidth - 14, finalY + 12);

      doc.text('NET AMOUNT:', 140, finalY + 16, { align: 'right' });
      doc.text(netAmount, pageWidth - 14, finalY + 16, { align: 'right' });

      // Signatures
      const sigY = finalY + 40;
      doc.setLineWidth(0.5);
      
      // Posted By
      doc.text('Admin', 30, sigY - 2, { align: 'center' }); // Mock username
      doc.line(14, sigY, 46, sigY);
      doc.text('Posted By', 30, sigY + 4, { align: 'center' });

      // Checked By
      doc.line(80, sigY, 130, sigY);
      doc.text('Checked By', 105, sigY + 4, { align: 'center' });

      // Authorized Signatory
      doc.line(160, sigY, pageWidth - 14, sigY);
      doc.text('Authorized Signatory', 178, sigY + 4, { align: 'center' });

      doc.save(`Reprint_${selectedDocument}.pdf`);
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
            <select 
              className="input-animated" 
              value={selectedType} 
              onChange={e => setSelectedType(e.target.value)}
              style={{ width: '100%', maxWidth: '600px' }}
            >
              <option value="">-- Select --</option>
              {REPRINT_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Store */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Store</label>
            <select 
              className="input-animated" 
              value={selectedStore} 
              onChange={e => setSelectedStore(e.target.value)}
              style={{ width: '100%', maxWidth: '600px' }}
            >
              <option value="">-- All --</option>
              <option value="Central Store">Central Store</option>
              <option value="Shop">Shop</option>
            </select>
          </div>

          {/* Document No */}
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', minHeight: '20px' }}>
              {selectedType ? getLabelForType() : 'Document No'}
            </label>
            <select 
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
            </select>
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
