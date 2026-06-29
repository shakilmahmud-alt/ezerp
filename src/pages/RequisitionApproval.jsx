import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Search, ChevronDown } from 'lucide-react';

const RequisitionApproval = () => {
  const [view, setView] = useState('list'); // 'list' or 'details'
  const [requisitions, setRequisitions] = useState([]);
  const [search, setSearch] = useState('');
  
  const [selectedReq, setSelectedReq] = useState(null);
  const [reqItems, setReqItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionDropdown, setActionDropdown] = useState(null);

  useEffect(() => {
    if (view === 'list') {
      fetchRequisitions();
    }
  }, [view]);

  const fetchRequisitions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_requisitions')
        .select('*')
        .order('requisition_date', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn('Table not created yet');
          setRequisitions([]);
        } else {
          throw error;
        }
      } else {
        setRequisitions(data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load requisitions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequisitionDetails = async (reqId) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_requisition_items')
        .select('*')
        .eq('requisition_id', reqId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReqItems(data || []);
      setView('details');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action, req) => {
    setActionDropdown(null);
    if (action === 'Show') {
      setSelectedReq(req);
      fetchRequisitionDetails(req.id);
    } else if (action === 'Cancel') {
      if (window.confirm('Are you sure you want to cancel this requisition?')) {
        try {
          const { error } = await supabase
            .from('store_requisitions')
            .update({ status: 'Cancelled' })
            .eq('id', req.id);
          if (error) throw error;
          toast.success('Requisition Cancelled');
          fetchRequisitions();
        } catch (err) {
          toast.error('Failed to cancel');
        }
      }
    } else if (action === 'Print') {
      // Need items to print
      try {
        const { data, error } = await supabase
          .from('store_requisition_items')
          .select('*')
          .eq('requisition_id', req.id);
        if (error) throw error;
        generatePDF(req, data);
      } catch (err) {
        toast.error('Failed to load data for printing');
      }
    }
  };

  const handleItemToggle = (id) => {
    setReqItems(prev => prev.map(item => 
      item.id === id ? { ...item, is_approved: !item.is_approved } : item
    ));
  };

  const handleQtyChange = (id, newQty) => {
    setReqItems(prev => prev.map(item => 
      item.id === id ? { ...item, app_qty: parseFloat(newQty) || 0 } : item
    ));
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      // Update each item
      const updatePromises = reqItems.map(item => 
        supabase
          .from('store_requisition_items')
          .update({ 
            is_approved: item.is_approved,
            app_qty: item.app_qty 
          })
          .eq('id', item.id)
      );
      
      await Promise.all(updatePromises);

      // Update main status
      const { error } = await supabase
        .from('store_requisitions')
        .update({ status: 'Approved' })
        .eq('id', selectedReq.id);

      if (error) throw error;
      
      toast.success('Requisition Approved Successfully');
      setView('list');
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = (req, items) => {
    const doc = new jsPDF('portrait');
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('REQUISITION CHALLAN', pageWidth - 14, 20, { align: 'right' });
    
    doc.setFontSize(12);
    doc.text(req.shop_name || '', 14, 25);
    
    doc.setFontSize(10);
    doc.text(`VENDOR: ${req.vendor || 'ANY'}`, 14, 35);
    
    doc.text(`REQUISITION NO# ${req.requisition_no}`, pageWidth - 14, 30, { align: 'right' });
    const reqDate = new Date(req.requisition_date).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    doc.text(`DATE# ${reqDate}`, pageWidth - 14, 38, { align: 'right' });

    // Table
    const headers = [
      'CODE', 'BARCODE', 'NAME', 'STYLE', 'CATEGORY', 
      'CARTON SIZE', 'CPU', 'MRP', 'APPROVED QTY', 'AVG DAY SALE'
    ];

    const body = items
      .filter(item => item.is_approved !== false)
      .map(item => [
        item.product_code || '',
        item.barcode || '',
        item.product_name || '',
        item.style || '----',
        item.category || '',
        parseFloat(item.carton_size || 1).toFixed(2),
        item.cpu || 0,
        item.mrp || 0,
        parseFloat(item.app_qty || 0).toFixed(2),
        parseFloat(item.avg_days_sale || 0).toFixed(2)
      ]);

    autoTable(doc, {
      startY: 45,
      head: [headers],
      body: body,
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: 1,
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineWidth: 0.5,
        halign: 'center'
      },
      columnStyles: {
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
        9: { halign: 'right' },
      }
    });

    doc.save(`${req.requisition_no}.pdf`);
  };

  const filteredRequisitions = requisitions.filter(r => 
    (r.requisition_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.shop_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (view === 'details' && selectedReq) {
    return (
      <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', fontSize: '13px' }}>
        <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--border-color)', padding: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Store Requisition</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
            <div>
              <div style={{ color: 'gray', fontSize: '11px' }}>Store</div>
              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedReq.shop_name}</div>
            </div>
            <div>
              <div style={{ color: 'gray', fontSize: '11px' }}>Delivery Date</div>
              <div style={{ color: 'var(--text-primary)' }}>{selectedReq.delivery_date ? new Date(selectedReq.delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
            </div>
            <div>
              <div style={{ color: 'gray', fontSize: '11px' }}>Reference No/Requisition No</div>
              <div style={{ color: 'var(--text-primary)' }}>{selectedReq.requisition_no}</div>
            </div>
            <div>
              <div style={{ color: 'gray', fontSize: '11px' }}>Vendor</div>
              <div style={{ color: 'var(--text-primary)' }}>{selectedReq.vendor || 'ANY'}</div>
            </div>
            <div>
              <div style={{ color: 'gray', fontSize: '11px' }}>Total Qty</div>
              <div style={{ color: 'var(--text-primary)' }}>{selectedReq.total_qty}</div>
            </div>
            <div>
              <div style={{ color: 'gray', fontSize: '11px' }}>Total Value</div>
              <div style={{ color: 'var(--text-primary)' }}>{selectedReq.total_value}</div>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '20px 0 10px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '5px' }}>Product Details</h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <th style={{ padding: '8px' }}></th>
                  <th style={{ padding: '8px' }}>Barcode</th>
                  <th style={{ padding: '8px' }}>Product Name</th>
                  <th style={{ padding: '8px' }}>UOM</th>
                  <th style={{ padding: '8px' }}>CPU</th>
                  <th style={{ padding: '8px' }}>MRP</th>
                  <th style={{ padding: '8px' }}>Category</th>
                  <th style={{ padding: '8px' }}>Bal Qty</th>
                  <th style={{ padding: '8px' }}>Stock In CS</th>
                  <th style={{ padding: '8px' }}>Req. Qty</th>
                  <th style={{ padding: '8px' }}>App. Qty</th>
                  <th style={{ padding: '8px' }}>Cost Value</th>
                  <th style={{ padding: '8px' }}>Avg Days Sale</th>
                  <th style={{ padding: '8px' }}>Days Remain</th>
                </tr>
              </thead>
              <tbody>
                {reqItems.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', backgroundColor: item.is_approved ? 'transparent' : 'rgba(255,0,0,0.05)' }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={item.is_approved !== false} 
                        onChange={() => handleItemToggle(item.id)}
                        style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '8px', color: 'var(--accent-primary)', cursor: 'pointer' }}>{item.barcode}</td>
                    <td style={{ padding: '8px' }}>{item.product_name}</td>
                    <td style={{ padding: '8px' }}>{item.uom}</td>
                    <td style={{ padding: '8px' }}>{item.cpu}</td>
                    <td style={{ padding: '8px' }}>{item.mrp}</td>
                    <td style={{ padding: '8px' }}>{item.category}</td>
                    <td style={{ padding: '8px' }}>{item.bal_qty}</td>
                    <td style={{ padding: '8px' }}>{item.stock_in_cs}</td>
                    <td style={{ padding: '8px' }}>{item.req_qty}</td>
                    <td style={{ padding: '8px' }}>
                      <input 
                        type="number" 
                        value={item.app_qty} 
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        style={{ 
                          width: '60px', padding: '4px', border: '1px solid var(--border-color)', 
                          borderRadius: '4px', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)' 
                        }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>{item.cost_value}</td>
                    <td style={{ padding: '8px' }}>{item.avg_days_sale}</td>
                    <td style={{ padding: '8px' }}>{item.days_remain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
            <button 
              onClick={() => generatePDF(selectedReq, reqItems)}
              style={{ padding: '6px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Preview
            </button>
            <button 
              onClick={handleApprove}
              disabled={isLoading || selectedReq.status === 'Approved'}
              style={{ padding: '6px 20px', backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Approve
            </button>
            <button 
              onClick={() => setView('list')}
              style={{ padding: '6px 20px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Requisition List</h2>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'gray' }}>
              <Search size={16} />
            </div>
            <input 
              type="text" 
              placeholder="Search" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ 
                width: '100%', padding: '8px 10px 8px 35px', 
                border: '1px solid var(--border-color)', borderRadius: '4px', 
                backgroundColor: 'transparent', color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <th style={{ padding: '12px 10px' }}>SL.</th>
                <th style={{ padding: '12px 10px' }}>Shop Name</th>
                <th style={{ padding: '12px 10px' }}>Requisition No</th>
                <th style={{ padding: '12px 10px' }}>Requisition Date</th>
                <th style={{ padding: '12px 10px' }}>Vendor</th>
                <th style={{ padding: '12px 10px' }}>Prepared By</th>
                <th style={{ padding: '12px 10px' }}>Status</th>
                <th style={{ padding: '12px 10px', width: '100px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredRequisitions.map((req, index) => (
                <tr key={req.id} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <td style={{ padding: '12px 10px' }}>{index + 1}</td>
                  <td style={{ padding: '12px 10px' }}>{req.shop_name}</td>
                  <td style={{ padding: '12px 10px' }}>{req.requisition_no}</td>
                  <td style={{ padding: '12px 10px' }}>{new Date(req.requisition_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '12px 10px' }}>{req.vendor || 'ANY'}</td>
                  <td style={{ padding: '12px 10px' }}>{req.prepared_by}</td>
                  <td style={{ padding: '12px 10px' }}>
                    <span style={{ 
                      padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                      backgroundColor: req.status === 'Approved' ? 'rgba(0,128,0,0.1)' : req.status === 'Cancelled' ? 'rgba(255,0,0,0.1)' : 'rgba(255,165,0,0.1)',
                      color: req.status === 'Approved' ? 'green' : req.status === 'Cancelled' ? 'red' : 'orange'
                    }}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 10px', position: 'relative' }}>
                    <button 
                      onClick={() => setActionDropdown(actionDropdown === req.id ? null : req.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '5px', 
                        padding: '4px 10px', border: '1px solid var(--border-color)', 
                        borderRadius: '4px', backgroundColor: 'transparent', 
                        color: 'var(--text-primary)', cursor: 'pointer' 
                      }}
                    >
                      Action <ChevronDown size={14} />
                    </button>
                    
                    {actionDropdown === req.id && (
                      <div style={{
                        position: 'absolute', top: '100%', right: '10px', 
                        backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', 
                        borderRadius: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', zIndex: 10,
                        minWidth: '100px'
                      }}>
                        <div onClick={() => handleAction('Print', req)} style={{ padding: '8px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>Print</div>
                        <div onClick={() => handleAction('Show', req)} style={{ padding: '8px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}>Show</div>
                        <div onClick={() => handleAction('Cancel', req)} style={{ padding: '8px 15px', cursor: 'pointer', color: 'red' }}>Cancel</div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRequisitions.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>
                    {isLoading ? 'Loading...' : 'No requisitions found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RequisitionApproval;
