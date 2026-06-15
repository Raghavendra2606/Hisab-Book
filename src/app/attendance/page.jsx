'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  MapPin, 
  UserCheck, 
  CheckCircle2, 
  Loader2, 
  Save, 
  Building2,
  HardHat,
  Info
} from 'lucide-react';

export default function AttendancePage() {
  const [workers, setWorkers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  // Filter States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSite, setSelectedSite] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Attendance Sheet state (workerId -> { status, notes, site })
  const [attendanceSheet, setAttendanceSheet] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Whenever the date changes, reload attendance for that date
  useEffect(() => {
    if (selectedDate) {
      fetchAttendanceForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch Workers
      const workersRes = await fetch('/api/workers');
      const workersData = await workersRes.json();
      
      // Fetch Sites
      const sitesRes = await fetch('/api/sites');
      const sitesData = await sitesRes.json();

      let activeWorkers = [];
      if (!workersData.error && Array.isArray(workersData)) {
        // Only keep active workers for attendance logs
        activeWorkers = workersData.filter(w => w.status === 'Active');
        setWorkers(activeWorkers);
      }
      if (!sitesData.error && Array.isArray(sitesData)) {
        setSites(sitesData);
      }

      await fetchAttendanceForDate(selectedDate, activeWorkers);

    } catch (e) {
      console.error("Failed to load initial data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceForDate = async (date, activeWorkersList = null) => {
    try {
      const res = await fetch(`/api/attendance?date=${date}`);
      const data = await res.json();
      
      let workersToUse = activeWorkersList || workers;
      if (!Array.isArray(workersToUse)) {
        workersToUse = [];
      }

      if (data && !data.error && Array.isArray(data)) {
        // Map existing attendance records
        const sheet = {};
        
        // Pre-fill sheet with workers
        workersToUse.forEach(worker => {
          sheet[worker._id] = {
            status: 'Absent', // default status is Absent unless set
            site: worker.site || 'Main Site',
            notes: ''
          };
        });

        // Overlay saved records
        data.forEach(record => {
          if (sheet[record.workerId]) {
            sheet[record.workerId] = {
              status: record.status,
              site: record.site || sheet[record.workerId].site,
              notes: record.notes || ''
            };
          }
        });

        setAttendanceSheet(sheet);
      }
    } catch (e) {
      console.error("Failed to fetch attendance:", e);
    }
  };

  const handleStatusChange = (workerId, newStatus) => {
    setAttendanceSheet(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        status: newStatus
      }
    }));
  };

  const handleNotesChange = (workerId, text) => {
    setAttendanceSheet(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        notes: text
      }
    }));
  };

  const handleWorkerSiteChange = (workerId, siteName) => {
    setAttendanceSheet(prev => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        site: siteName
      }
    }));
  };

  const handleMarkAllPresent = () => {
    const updated = { ...attendanceSheet };
    filteredWorkers.forEach(w => {
      if (updated[w._id]) {
        updated[w._id].status = 'Present';
      }
    });
    setAttendanceSheet(updated);
    setMessage({ text: 'Marked all filtered workers as Present.', type: 'info' });
  };

  const handleSaveAttendance = async () => {
    setMessage({ text: '', type: '' });
    setSaveLoading(true);

    try {
      const records = Object.keys(attendanceSheet).map(workerId => ({
        workerId,
        status: attendanceSheet[workerId].status,
        site: attendanceSheet[workerId].site,
        notes: attendanceSheet[workerId].notes
      }));

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, records })
      });
      const data = await res.json();

      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: `Attendance for ${selectedDate} saved successfully!`, type: 'success' });
        // Auto-dismiss alert after 4 seconds
        setTimeout(() => setMessage({ text: '', type: '' }), 4000);
      }
    } catch (e) {
      setMessage({ text: 'Failed to connect. Please try again.', type: 'error' });
    } finally {
      setSaveLoading(false);
    }
  };

  // Filter list of active workers
  const filteredWorkers = workers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSite = selectedSite === 'All' || w.site === selectedSite;
    return matchesSearch && matchesSite;
  });

  // Calculate live tallies
  let presentTally = 0;
  let halfDayTally = 0;
  let absentTally = 0;

  filteredWorkers.forEach(w => {
    const record = attendanceSheet[w._id];
    if (record) {
      if (record.status === 'Present') presentTally++;
      else if (record.status === 'Half Day') halfDayTally++;
      else if (record.status === 'Absent') absentTally++;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Filters & Actions Panel */}
      <div className="ui-card">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexGrow: 1, maxWidth: '800px' }}>
            {/* Date Selector */}
            <div className="form-group" style={{ marginBottom: 0, width: 'auto', minWidth: '160px' }}>
              <label>Working Date</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <Calendar size={15} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Site Filter */}
            <div className="form-group" style={{ marginBottom: 0, width: 'auto', minWidth: '160px' }}>
              <label>Filter by Site</label>
              <div style={{ position: 'relative' }}>
                <select 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                >
                  <option value="All">All Sites</option>
                  {sites.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                </select>
                <MapPin size={15} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Worker Name Search */}
            <div className="form-group" style={{ marginBottom: 0, flexGrow: 1, minWidth: '200px' }}>
              <label>Search worker</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  placeholder="Enter worker's name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button className="btn btn-secondary" onClick={handleMarkAllPresent}>
              <UserCheck size={18} />
              <span>Mark All Present</span>
            </button>
          </div>

        </div>
      </div>

      {/* Tallies Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Filtered List</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{filteredWorkers.length}</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', textAlign: 'center', color: 'var(--success)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Present</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{presentTally}</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', textAlign: 'center', color: 'var(--warning)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Half Day</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{halfDayTally}</div>
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', textAlign: 'center', color: 'var(--danger)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Absent</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{absentTally}</div>
        </div>
      </div>

      {/* Save Status Banner */}
      {message.text && (
        <div 
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: message.type === 'success' ? 'var(--success-bg)' : message.type === 'info' ? 'var(--info-bg)' : 'var(--danger-bg)',
            color: message.type === 'success' ? 'var(--success)' : message.type === 'info' ? 'var(--info)' : 'var(--danger)',
            border: `1px solid ${message.type === 'success' ? 'var(--success)' : message.type === 'info' ? 'var(--info)' : 'var(--danger)'}`
          }}
        >
          <Info size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Attendance Grid sheet */}
      <div className="ui-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 className="animate-spin" size={36} color="var(--primary)" />
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            No active workers found under the selected filters. Verify active list in Workers Directory.
          </div>
        ) : (
          <div className="attendance-grid">
            {filteredWorkers.map(worker => {
              const record = attendanceSheet[worker._id] || { status: 'Absent', site: worker.site || 'Main Site', notes: '' };
              
              return (
                <div key={worker._id} className="attendance-row">
                  {/* Left: Worker description */}
                  <div className="worker-meta" style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="name">{worker.name}</span>
                      <span className="badge badge-info" style={{ fontSize: '10px', padding: '2px 6px' }}>{worker.role}</span>
                    </div>
                    
                    {/* Site assignments & daily wage description */}
                    <div className="details" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
                      <span>Rate: ₹{worker.dailyWage}/day</span>
                      <span>•</span>
                      
                      {/* Active site selector for worker today */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <Building2 size={12} />
                        <select 
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            fontSize: '13px', 
                            color: 'var(--text-secondary)',
                            fontWeight: 500,
                            paddingRight: '12px',
                            cursor: 'pointer' 
                          }}
                          value={record.site}
                          onChange={(e) => handleWorkerSiteChange(worker._id, e.target.value)}
                        >
                          {sites.length === 0 ? <option value="Main Site">Main Site</option> : (
                            sites.map(s => <option key={s._id} value={s.name}>{s.name}</option>)
                          )}
                        </select>
                      </span>
                    </div>
                  </div>

                  {/* Right: Notes text box and status switcher */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input 
                      type="text"
                      className="form-input"
                      style={{ width: '180px', fontSize: '13px', padding: '6px 10px', height: '36px' }}
                      placeholder="Add brief note..."
                      value={record.notes}
                      onChange={(e) => handleNotesChange(worker._id, e.target.value)}
                    />

                    {/* Touch selectors */}
                    <div className="status-selector">
                      <button 
                        type="button"
                        className={`status-btn present ${record.status === 'Present' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(worker._id, 'Present')}
                      >
                        Present
                      </button>
                      <button 
                        type="button"
                        className={`status-btn halfday ${record.status === 'Half Day' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(worker._id, 'Half Day')}
                      >
                        Half Day
                      </button>
                      <button 
                        type="button"
                        className={`status-btn absent ${record.status === 'Absent' ? 'active' : ''}`}
                        onClick={() => handleStatusChange(worker._id, 'Absent')}
                      >
                        Absent
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Save CTA */}
        {!loading && filteredWorkers.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <button className="btn btn-primary" style={{ minWidth: '180px' }} onClick={handleSaveAttendance} disabled={saveLoading}>
              {saveLoading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <Save size={18} />
                  <span>Save Attendance</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
