'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  HardHat, 
  Calendar, 
  Trash2, 
  X, 
  Loader2, 
  Building2, 
  CreditCard,
  UserCheck,
  MapPin,
  Check,
  Eye
} from 'lucide-react';

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Labor');
  const [dailyWage, setDailyWage] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [site, setSite] = useState('');
  const [status, setStatus] = useState('Active');
  const [openingBalance, setOpeningBalance] = useState('0');
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Worker Detail/Ledger State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerWorker, setDrawerWorker] = useState(null);
  const [drawerLedger, setDrawerLedger] = useState({ attendance: [], payments: [], stats: {} });
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Standard roles list
  const rolesList = ['Labor', 'Carpenter', 'Supervisor', 'Mason', 'Painter', 'Plumber', 'Electrician', 'Helper'];

  useEffect(() => {
    fetchWorkers();
    fetchSites();
  }, []);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/workers');
      const data = await res.json();
      if (!data.error) {
        setWorkers(data);
      }
    } catch (e) {
      console.error("Error fetching workers:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites');
      const data = await res.json();
      if (!data.error) {
        setSites(data);
        if (data.length > 0) setSite(data[0].name);
      }
    } catch (e) {
      console.error("Error fetching sites:", e);
    }
  };

  const openAddModal = () => {
    setModalMode('create');
    setSelectedWorkerId(null);
    setName('');
    setPhone('');
    setRole('Labor');
    setDailyWage('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    if (sites.length > 0) setSite(sites[0].name);
    else setSite('Main Site');
    setStatus('Active');
    setOpeningBalance('0');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (worker) => {
    setModalMode('edit');
    setSelectedWorkerId(worker._id);
    setName(worker.name);
    setPhone(worker.phone || '');
    setRole(worker.role);
    setDailyWage(worker.dailyWage);
    setJoiningDate(worker.joiningDate);
    setSite(worker.site || 'Main Site');
    setStatus(worker.status);
    setOpeningBalance(worker.openingBalance || 0);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !dailyWage || Number(dailyWage) <= 0) {
      setFormError('Please enter a valid worker name and daily wage rate.');
      return;
    }

    setSubmitLoading(true);

    const body = {
      name,
      phone,
      role,
      dailyWage: Number(dailyWage),
      joiningDate,
      site,
      status,
      openingBalance: Number(openingBalance || 0)
    };

    try {
      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/workers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch(`/api/workers/${selectedWorkerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      const data = await res.json();
      if (data.error) {
        setFormError(data.error);
      } else {
        setIsModalOpen(false);
        fetchWorkers();
      }
    } catch (e) {
      setFormError('Connection issue. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteWorker = async (workerId) => {
    if (!window.confirm("Are you sure you want to delete this worker? All of their attendance logs and salary payment ledger entries will be permanently erased. This cannot be undone!")) {
      return;
    }

    try {
      const res = await fetch(`/api/workers/${workerId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!data.error) {
        if (isDrawerOpen && drawerWorker?._id === workerId) {
          setIsDrawerOpen(false);
        }
        fetchWorkers();
      }
    } catch (e) {
      console.error("Delete worker error:", e);
    }
  };

  const openWorkerDrawer = async (worker) => {
    setDrawerWorker(worker);
    setIsDrawerOpen(true);
    setDrawerLoading(true);

    try {
      // Fetch report data for last 90 days to render worker ledger
      const end = new Date().toISOString().split('T')[0];
      const startObj = new Date();
      startObj.setDate(startObj.getDate() - 90);
      const start = startObj.toISOString().split('T')[0];

      const res = await fetch(`/api/reports?startDate=${start}&endDate=${end}`);
      const data = await res.json();

      if (!data.error) {
        const workerStats = data.reportData.find(w => w.workerId === worker._id) || {
          presentCount: 0,
          halfDayCount: 0,
          absentCount: 0,
          totalEarned: 0,
          totalPaid: 0,
          totalAdvance: 0,
          netPayable: 0
        };

        const workerAttendance = data.rawAttendance.filter(a => a.workerId === worker._id);
        const workerPayments = data.rawPayments.filter(p => p.workerId === worker._id);

        setDrawerLedger({
          attendance: workerAttendance.sort((a, b) => b.date.localeCompare(a.date)),
          payments: workerPayments.sort((a, b) => b.date.localeCompare(a.date)),
          stats: workerStats
        });
      }
    } catch (e) {
      console.error("Drawer fetch error:", e);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Filter computation
  const filteredWorkers = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (w.phone && w.phone.includes(searchQuery));
    const matchesRole = roleFilter === 'All' || w.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Aggregated directory metrics
  const activeCount = workers.filter(w => w.status === 'Active').length;
  const totalDailyPayout = workers
    .filter(w => w.status === 'Active')
    .reduce((acc, curr) => acc + (curr.dailyWage || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Directory Metrics Summary */}
      <div className="metric-grid">
        <div className="metric-card" style={{ '--accent': 'var(--primary)', '--accent-bg': 'var(--primary-light)' }}>
          <div className="metric-header">
            <span>Total Staff Registered</span>
            <div className="metric-icon-box">
              <Users size={18} />
            </div>
          </div>
          <div className="metric-value">{workers.length}</div>
          <div className="metric-footer">{activeCount} Currently Active</div>
        </div>

        <div className="metric-card" style={{ '--accent': 'var(--success)', '--accent-bg': 'var(--success-bg)' }}>
          <div className="metric-header">
            <span>Active Worker Payout</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div className="metric-value">₹{totalDailyPayout.toLocaleString('en-IN')}</div>
          <div className="metric-footer">Total daily cost for full attendance</div>
        </div>
      </div>

      {/* Main Directory Operations */}
      <div className="ui-card">
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '16px',
            marginBottom: '20px' 
          }}
        >
          {/* Search bar & filter selection */}
          <div style={{ display: 'flex', gap: '12px', flexGrow: 1, maxWidth: '600px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '38px' }}
                placeholder="Search worker name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
            </div>
            
            <select 
              className="form-input" 
              style={{ width: 'auto', minWidth: '150px' }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="All">All Roles</option>
              {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Add worker CTA */}
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            <span>Add Worker</span>
          </button>
        </div>

        {/* Directory Output Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 className="animate-spin" size={36} color="var(--primary)" />
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            No workers found matching your search. Create a new worker to build your Hisab list.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Role</th>
                  <th>Daily Wage Rate</th>
                  <th>Contact</th>
                  <th>Default Site</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map((worker) => (
                  <tr key={worker._id}>
                    <td data-label="Worker Name">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: worker.status === 'Active' ? 'var(--primary-light)' : 'var(--border)',
                          color: worker.status === 'Active' ? 'var(--primary)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700
                        }}>
                          {worker.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{worker.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Joined {worker.joiningDate}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Role">
                      <span className="badge badge-info" style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        <HardHat size={12} />
                        {worker.role}
                      </span>
                    </td>
                    <td data-label="Daily Wage">
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        ₹{worker.dailyWage}
                      </strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}> / day</span>
                    </td>
                    <td data-label="Contact">
                      {worker.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                          <Phone size={12} />
                          <span>{worker.phone}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>-</span>
                      )}
                    </td>
                    <td data-label="Default Site">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                        <Building2 size={12} color="var(--text-muted)" />
                        <span>{worker.site || 'Main Site'}</span>
                      </div>
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${worker.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {worker.status}
                      </span>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => openWorkerDrawer(worker)}
                          title="View Ledger Hisab"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => openEditModal(worker)}
                          title="Edit Profile"
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteWorker(worker._id)}
                          title="Delete Worker"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD/EDIT WORKER MODAL DIALOG */}
      {isModalOpen && (
        <div className="modal-overlay modal-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="card-title">{modalMode === 'create' ? "Add New Worker" : "Edit Worker Profile"}</h3>
              <button 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {formError && <div className="auth-error">{formError}</div>}
                
                <div className="form-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter worker's full name"
                    required 
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Role / Trade</label>
                    <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
                      {rolesList.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Daily Wage Rate (₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={dailyWage} 
                      onChange={(e) => setDailyWage(e.target.value)} 
                      placeholder="e.g. 500"
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Contact Phone (Optional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="e.g. 9876543210" 
                    />
                  </div>

                  <div className="form-group">
                    <label>Default Working Site</label>
                    <select className="form-input" value={site} onChange={(e) => setSite(e.target.value)}>
                      {sites.length === 0 ? <option value="Main Site">Main Site</option> : (
                        sites.map(s => <option key={s._id} value={s.name}>{s.name}</option>)
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Joining Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={joiningDate} 
                      onChange={(e) => setJoiningDate(e.target.value)} 
                    />
                  </div>

                  <div className="form-group">
                    <label>Activity Status</label>
                    <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flexGrow: 1 }}>
                    <label>Opening Balance / Due Amount (₹)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={openingBalance} 
                      onChange={(e) => setOpeningBalance(e.target.value)} 
                      placeholder="e.g. 5000 if you owe them, or -2000 if they owe you"
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      Enter a positive number if the contractor owes the worker wages. Enter a negative number if the worker owes an advance.
                    </small>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? <Loader2 className="animate-spin" size={18} /> : (modalMode === 'create' ? "Add Worker" : "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED WORKER LEDGER DRAWER */}
      {isDrawerOpen && drawerWorker && (
        <div className="modal-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '650px', 
              height: '100%', 
              marginRight: 0, 
              marginLeft: 'auto', 
              borderRadius: '20px 0 0 20px',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()} // Stop overlay click closing
          >
            {/* Drawer Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '18px'
                }}>
                  {drawerWorker.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="card-title">{drawerWorker.name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{drawerWorker.role} • Default Site: {drawerWorker.site}</div>
                </div>
              </div>
              <button 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => setIsDrawerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body (Scrollable Content) */}
            <div 
              style={{ 
                padding: '20px', 
                flexGrow: 1, 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '24px' 
              }}
            >
              {drawerLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                  <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                </div>
              ) : (
                <>
                  {/* Financial Summary Cards */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      Ledger Summary (Last 90 Days)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      
                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', backgroundColor: 'var(--bg-app)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Attendance Record</div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '14px', fontWeight: 600 }}>
                          <span style={{ color: 'var(--success)' }}>P: {drawerLedger.stats.presentCount}</span>
                          <span style={{ color: 'var(--warning)' }}>H: {drawerLedger.stats.halfDayCount}</span>
                          <span style={{ color: 'var(--danger)' }}>A: {drawerLedger.stats.absentCount}</span>
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', backgroundColor: 'var(--bg-app)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Wages Earned</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px', color: 'var(--text-primary)' }}>
                          ₹{drawerLedger.stats.totalEarned?.toLocaleString('en-IN') || 0}
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', backgroundColor: 'var(--bg-app)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Advances Taken</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px', color: 'var(--danger)' }}>
                          ₹{drawerLedger.stats.totalAdvance?.toLocaleString('en-IN') || 0}
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', backgroundColor: 'var(--bg-app)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Net Wages Paid</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px', color: 'var(--success)' }}>
                          ₹{drawerLedger.stats.totalPaid?.toLocaleString('en-IN') || 0}
                        </div>
                      </div>

                      <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', backgroundColor: 'var(--bg-app)', gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Opening Balance (Initial Dues)</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '2px', color: (drawerLedger.stats.openingBalance || 0) >= 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
                          ₹{Math.abs(drawerLedger.stats.openingBalance || 0).toLocaleString('en-IN')}
                          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '6px' }}>
                            {(drawerLedger.stats.openingBalance || 0) >= 0 ? '(Contractor owes worker)' : '(Worker owes contractor)'}
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Net Dues banner */}
                    <div 
                      style={{
                        marginTop: '12px',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        backgroundColor: (drawerLedger.stats.netPayable || 0) >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: (drawerLedger.stats.netPayable || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {(drawerLedger.stats.netPayable || 0) >= 0 ? 'Net Wages Payable' : 'Advance Owed by Worker'}
                      </span>
                      <strong style={{ fontSize: '20px', fontFamily: 'var(--font-mono)' }}>
                        ₹{Math.abs(drawerLedger.stats.netPayable || 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>

                  {/* Payment Logs */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', justify: 'between', alignItems: 'center' }}>
                      <span>Recent Payments & Advances</span>
                      <CreditCard size={14} />
                    </h4>
                    {drawerLedger.payments.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '14px' }}>
                        No payments logged in the last 90 days.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {drawerLedger.payments.map((p) => (
                          <div 
                            key={p._id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--bg-card)'
                            }}
                          >
                            <div>
                              <span className={`badge ${p.type === 'Salary Paid' ? 'badge-success' : 'badge-warning'}`} style={{ marginRight: '8px', fontSize: '10px' }}>
                                {p.type === 'Salary Paid' ? 'Salary' : 'Advance'}
                              </span>
                              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.date} • {p.paymentMode}</span>
                              {p.notes && <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '2px' }}>"{p.notes}"</div>}
                            </div>
                            <strong style={{ fontFamily: 'var(--font-mono)' }}>
                              ₹{p.amount}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attendance Log History */}
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', justify: 'between', alignItems: 'center' }}>
                      <span>Recent Attendance Logs</span>
                      <Calendar size={14} />
                    </h4>
                    {drawerLedger.attendance.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '14px' }}>
                        No attendance marked in the last 90 days.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                        {drawerLedger.attendance.map((a) => (
                          <div 
                            key={a._id}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '10px',
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--bg-card)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.date}</span>
                            <span className={`badge ${a.status === 'Present' ? 'badge-success' : a.status === 'Half Day' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '11px', width: '100%', justifyContent: 'center' }}>
                              {a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={() => setIsDrawerOpen(false)} style={{ width: '100%' }}>
                Close Hisab Ledger
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
