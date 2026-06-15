'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  Calendar, 
  CreditCard, 
  Plus, 
  Loader2, 
  TrendingUp,
  HardHat,
  ArrowRight,
  UserCheck,
  IndianRupee
} from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalWorkers: 0, activeWorkers: 0, totalPaid: 0, totalAdvance: 0, netOutstanding: 0 });
  const [payments, setPayments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [sites, setSites] = useState([]);
  const [attendanceToday, setAttendanceToday] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];
      
      // Fetch report summary
      const reportRes = await fetch('/api/reports');
      const reportData = await reportRes.json();
      if (!reportData.error) {
        setSummary(reportData.summary);
      }

      // Fetch recent payments
      const paymentsRes = await fetch('/api/payments');
      const paymentsData = await paymentsRes.json();
      if (!paymentsData.error) {
        setPayments(paymentsData.slice(0, 5)); // top 5 recent
      }

      // Fetch workers
      const workersRes = await fetch('/api/workers');
      const workersData = await workersRes.json();
      if (!workersData.error) {
        setWorkers(workersData.filter(w => w.status === 'Active'));
      }

      // Fetch sites
      const sitesRes = await fetch('/api/sites');
      const sitesData = await sitesRes.json();
      if (!sitesData.error) {
        setSites(sitesData);
      }

      // Fetch today's attendance
      const attRes = await fetch(`/api/attendance?date=${today}`);
      const attData = await attRes.json();
      if (!attData.error) {
        setAttendanceToday(attData);
      }

    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  const getWorkerName = (workerId) => {
    const w = workers.find(item => item._id === workerId);
    return w ? w.name : 'Worker';
  };

  // Compute stats
  const today = new Date().toISOString().split('T')[0];
  const presentTodayCount = attendanceToday.filter(a => a.status === 'Present').length;
  const halfDayTodayCount = attendanceToday.filter(a => a.status === 'Half Day').length;
  
  // Weekly total cash outflow chart calculations
  const paymentsByDate = {};
  payments.forEach(p => {
    paymentsByDate[p.date] = (paymentsByDate[p.date] || 0) + p.amount;
  });

  const chartDates = Object.keys(paymentsByDate).sort().slice(-5);
  const chartAmounts = chartDates.map(d => paymentsByDate[d]);
  const maxAmount = Math.max(...chartAmounts, 1000);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loader2 className="animate-spin" size={36} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Metric Cards Grid */}
      <div className="metric-grid">
        
        {/* Today's Attendance */}
        <div className="metric-card" style={{ '--accent': 'var(--success)', '--accent-bg': 'var(--success-bg)' }}>
          <div className="metric-header">
            <span>Today's Attendance ({today})</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div className="metric-value">
            {presentTodayCount} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Present</span>
            {halfDayTodayCount > 0 && <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--warning)', marginLeft: '8px' }}>({halfDayTodayCount} Half)</span>}
          </div>
          <div className="metric-footer">{summary.activeWorkers - presentTodayCount - halfDayTodayCount} absent / unlogged workers</div>
        </div>

        {/* Active Staff */}
        <div className="metric-card" style={{ '--accent': 'var(--info)', '--accent-bg': 'var(--info-bg)' }}>
          <div className="metric-header">
            <span>Active Workforce</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="metric-value">{summary.activeWorkers}</div>
          <div className="metric-footer">Out of {summary.totalWorkers} total registered staff</div>
        </div>

        {/* Monthly Payout */}
        <div className="metric-card" style={{ '--accent': 'var(--primary)', '--accent-bg': 'var(--primary-light)' }}>
          <div className="metric-header">
            <span>Total Cash Disbursed</span>
            <div className="metric-icon-box">
              <IndianRupee size={16} />
            </div>
          </div>
          <div className="metric-value">₹{(summary.totalPaid + summary.totalAdvance).toLocaleString('en-IN')}</div>
          <div className="metric-footer">Includes ₹{summary.totalAdvance.toLocaleString('en-IN')} in advances</div>
        </div>

        {/* Net Liability */}
        <div className="metric-card" style={{ '--accent': 'var(--danger)', '--accent-bg': 'var(--danger-bg)' }}>
          <div className="metric-header">
            <span>Net Payable Balance</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: summary.netOutstanding >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            ₹{summary.netOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="metric-footer">Pending contractor wages to pay</div>
        </div>

      </div>

      {/* Quick Action Shortcuts */}
      <div className="ui-card">
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
          Quick Action Shortcuts
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          
          <Link href="/attendance" className="btn btn-primary" style={{ padding: '14px', borderRadius: '12px', fontSize: '15px' }}>
            <Calendar size={18} />
            <span>Mark Today's Attendance</span>
          </Link>

          <Link href="/payments" className="btn btn-secondary" style={{ padding: '14px', borderRadius: '12px', fontSize: '15px', border: '1px solid var(--border)' }}>
            <CreditCard size={18} />
            <span>Log Salary / Advance</span>
          </Link>

          <Link href="/workers" className="btn btn-secondary" style={{ padding: '14px', borderRadius: '12px', fontSize: '15px', border: '1px solid var(--border)' }}>
            <Plus size={18} />
            <span>Add New Worker Profile</span>
          </Link>

          <Link href="/reports" className="btn btn-secondary" style={{ padding: '14px', borderRadius: '12px', fontSize: '15px', border: '1px solid var(--border)' }}>
            <ArrowRight size={18} />
            <span>Review Payroll Ledger</span>
          </Link>

        </div>
      </div>

      {/* Detailed Dashboard Analytics Layout */}
      <div className="dashboard-sections">
        
        {/* Left Column: Cash Flow & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Visual SVG cash out bar chart */}
          <div className="ui-card">
            <div className="card-header">
              <h2 className="card-title">Recent Cash Disbursements (₹)</h2>
            </div>
            
            {chartDates.length === 0 ? (
              <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No recent payment transactions logged.
              </div>
            ) : (
              <div className="chart-container" style={{ height: '180px' }}>
                <svg className="svg-chart" viewBox="0 0 400 180" style={{ overflow: 'visible' }}>
                  <line x1="40" y1="20" x2="380" y2="20" stroke="var(--border)" strokeDasharray="3" />
                  <line x1="40" y1="80" x2="380" y2="80" stroke="var(--border)" strokeDasharray="3" />
                  <line x1="40" y1="140" x2="380" y2="140" stroke="var(--border)" />

                  <text x="35" y="24" textAnchor="end" fontSize="9" fill="var(--text-muted)">₹{Math.floor(maxAmount).toLocaleString()}</text>
                  <text x="35" y="84" textAnchor="end" fontSize="9" fill="var(--text-muted)">₹{Math.floor(maxAmount / 2).toLocaleString()}</text>
                  <text x="35" y="144" textAnchor="end" fontSize="9" fill="var(--text-muted)">₹0</text>

                  {chartDates.map((d, idx) => {
                    const amt = chartAmounts[idx];
                    const w = 24;
                    const gap = (340 - w * chartDates.length) / (chartDates.length + 1);
                    const x = 40 + gap + idx * (w + gap);
                    const h = (amt / maxAmount) * 120;
                    const y = 140 - h;

                    return (
                      <g key={d}>
                        <rect x={x} y={y} width={w} height={h} className="bar-rect" />
                        <text x={x + w / 2} y="156" textAnchor="middle" fontSize="9" fill="var(--text-muted)">{d.substring(5)}</text>
                        <text x={x + w / 2} y={y - 6} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--text-primary)">₹{amt}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Recent Payments logs list */}
          <div className="ui-card">
            <div className="card-header">
              <h2 className="card-title">Recent Transactions</h2>
            </div>
            
            {payments.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No recent payment transactions recorded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {payments.map(p => (
                  <div 
                    key={p._id}
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
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{getWorkerName(p.workerId)}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {p.date} • <span style={{ color: p.type === 'Salary Paid' ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>{p.type === 'Salary Paid' ? 'Salary' : 'Advance'}</span>
                      </div>
                    </div>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '15px' }}>
                      ₹{p.amount.toLocaleString('en-IN')}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Active Project Sites list */}
        <div className="ui-card" style={{ height: 'fit-content' }}>
          <div className="card-header">
            <h2 className="card-title">Construction Sites Overview</h2>
          </div>

          {sites.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
              No sites defined. Setup your active construction sites in Settings.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sites.map(site => {
                // Count workers working default at this site
                const workersOnSite = workers.filter(w => w.site === site.name).length;
                return (
                  <div 
                    key={site._id}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-app)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '16px' }}>{site.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Building2 size={12} />
                        <span>{site.location || 'No location address'}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-info">{workersOnSite} Workers</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
