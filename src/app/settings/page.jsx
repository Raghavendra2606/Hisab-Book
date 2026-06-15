'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Building2, Key, MapPin, Plus, Save, User, Loader2, Lock } from 'lucide-react';

export default function SettingsPage() {
  const { companyName, checkAuth } = useAuth();
  
  // Profile settings state
  const [username, setUsername] = useState('');
  const [compName, setCompName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  // Sites state
  const [sites, setSites] = useState([]);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteLocation, setNewSiteLocation] = useState('');
  const [sitesLoading, setSitesLoading] = useState(true);
  const [siteSubmitLoading, setSiteSubmitLoading] = useState(false);

  useEffect(() => {
    // Pre-fill profile details
    setCompName(companyName);
    fetchSites();
  }, [companyName]);

  const fetchSites = async () => {
    try {
      setSitesLoading(true);
      const res = await fetch('/api/sites');
      const data = await res.json();
      if (!data.error) {
        setSites(data);
      }
    } catch (e) {
      console.error("Failed to fetch sites:", e);
    } finally {
      setSitesLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMessage({ text: '', type: '' });
    setProfileLoading(true);

    try {
      const body = { action: 'update', companyName: compName };
      if (username) body.username = username;
      if (newPassword) {
        body.password = currentPassword;
        body.newPassword = newPassword;
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.error) {
        setProfileMessage({ text: data.error, type: 'error' });
      } else {
        setProfileMessage({ text: 'Profile updated successfully!', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setUsername('');
        await checkAuth(); // Refresh company name in global layout
      }
    } catch (e) {
      setProfileMessage({ text: 'Failed to update settings.', type: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;
    
    setSiteSubmitLoading(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSiteName, location: newSiteLocation })
      });
      const data = await res.json();

      if (!data.error) {
        setNewSiteName('');
        setNewSiteLocation('');
        fetchSites();
      }
    } catch (e) {
      console.error("Failed to add site:", e);
    } finally {
      setSiteSubmitLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 2-Column Responsive Layout */}
      <div className="dashboard-sections">
        
        {/* Left Side: General Profile Settings */}
        <div className="ui-card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="var(--primary)" />
              <span>Contractor Settings</span>
            </h2>
          </div>

          {profileMessage.text && (
            <div 
              style={{
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: profileMessage.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: profileMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${profileMessage.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
              }}
            >
              {profileMessage.text}
            </div>
          )}

          <form onSubmit={handleProfileUpdate}>
            <div className="form-group">
              <label>Company Name (Contractor Brand)</label>
              <input 
                type="text" 
                className="form-input"
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                placeholder="e.g. Purnima Construction"
                required
              />
            </div>

            <div className="form-group">
              <label>Change Username (Optional)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
                <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div style={{ margin: '24px 0', borderTop: '1px solid var(--border)' }}></div>
            
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>
              Change Password
            </h3>

            <div className="form-group">
              <label>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="password" 
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required only to change password"
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="password" 
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <Key size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={profileLoading}>
              {profileLoading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <Save size={18} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Construction Sites Management */}
        <div className="ui-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={20} color="var(--primary)" />
              <span>Project & Site Management</span>
            </h2>
          </div>

          {/* Add Site Form */}
          <form onSubmit={handleAddSite} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <input 
                  type="text" 
                  className="form-input"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="Site / Project Name (e.g. Sector 62)"
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <input 
                  type="text" 
                  className="form-input"
                  value={newSiteLocation}
                  onChange={(e) => setNewSiteLocation(e.target.value)}
                  placeholder="Location / Address"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 14px' }} disabled={siteSubmitLoading}>
                {siteSubmitLoading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              </button>
            </div>
          </form>

          {/* Sites Directory */}
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>
            Active Construction Sites ({sites.length})
          </h3>

          {sitesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
              <Loader2 className="animate-spin" size={24} color="var(--primary)" />
            </div>
          ) : sites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
              No sites defined yet. Add active sites to log worker locations.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '350px', paddingRight: '4px' }}>
              {sites.map((site) => (
                <div 
                  key={site._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)'
                  }}
                >
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{site.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{site.location || 'No location given'}</div>
                  </div>
                  <span className="badge badge-success">Active</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
