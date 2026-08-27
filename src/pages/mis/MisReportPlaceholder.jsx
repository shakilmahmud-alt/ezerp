import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Clock } from 'lucide-react';

const MisReportPlaceholder = ({ title }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = title || location.pathname.split('/').pop().replace(/-/g, ' ').toUpperCase();

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '30px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', backgroundColor: 'rgba(2, 132, 199, 0.1)', borderRadius: '8px', color: '#0284c7' }}>
              <FileText size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 'bold' }}>{pageTitle}</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Management Information System (MIS) Report</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/mis')}
            style={{
              padding: '6px 14px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 500
            }}
          >
            <ArrowLeft size={14} /> Back to MIS Home
          </button>
        </div>

        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px dashed #cbd5e1'
        }}>
          <Clock size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#334155' }}>Report Module Ready</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b', maxWidth: '500px', marginInline: 'auto' }}>
            This report section is linked and ready. Please provide the required filters, columns, and data specifications to configure this report view.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MisReportPlaceholder;
