import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-h2">Settings</h1>
          <p className="text-muted">Configure your company profile, users, and preferences.</p>
        </div>
        <button className="btn btn-primary btn-theme">Save Changes</button>
      </div>

      <div className="grid-cards">
        <div className="card glass-panel">
          <h3 className="text-h3" style={{ marginBottom: '16px' }}>Company Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="text-muted" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Company Name</label>
              <input type="text" className="input-glass" defaultValue="EG ERP Limited" />
            </div>
            <div>
              <label className="text-muted" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Base Currency</label>
              <input type="text" className="input-glass" defaultValue="BDT (৳)" disabled />
            </div>
            <div>
              <label className="text-muted" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Language</label>
              <input type="text" className="input-glass" defaultValue="English" disabled />
            </div>
          </div>
        </div>

        <div className="card glass-panel">
          <h3 className="text-h3" style={{ marginBottom: '16px' }}>System Configuration</h3>
          <div className="empty-state" style={{ padding: '20px' }}>
            <SettingsIcon size={32} />
            <p className="text-muted" style={{ marginTop: '8px', fontSize: '0.9rem' }}>Advanced settings will be configured here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
