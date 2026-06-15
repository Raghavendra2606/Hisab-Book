'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Calendar, 
  Download, 
  Loader2, 
  TrendingUp, 
  PieChart, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Helper to force browser to honor the download filename by posting to a download reflector endpoint
const triggerDownload = (blob, filename) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const dataUrl = reader.result;
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/download';
    
    const fileDataInput = document.createElement('input');
    fileDataInput.type = 'hidden';
    fileDataInput.name = 'fileData';
    fileDataInput.value = dataUrl;
    form.appendChild(fileDataInput);
    
    const filenameInput = document.createElement('input');
    filenameInput.type = 'hidden';
    filenameInput.name = 'filename';
    filenameInput.value = filename;
    form.appendChild(filenameInput);
    
    const mimeTypeInput = document.createElement('input');
    mimeTypeInput.type = 'hidden';
    mimeTypeInput.name = 'mimeType';
    mimeTypeInput.value = blob.type || 'application/octet-stream';
    form.appendChild(mimeTypeInput);
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };
  reader.readAsDataURL(blob);
};

export default function ReportsPage() {
  const [reportData, setReportData] = useState([]);
  const [rawAttendance, setRawAttendance] = useState([]);
  const [rawPayments, setRawPayments] = useState([]);
  const [summary, setSummary] = useState({ totalWorkers: 0, activeWorkers: 0, totalPaid: 0, totalAdvance: 0, netOutstanding: 0 });
  
  const [loading, setLoading] = useState(true);

  // Date Filters (Default to current month range)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (!data.error) {
        setReportData(data.reportData);
        setRawAttendance(data.rawAttendance);
        setRawPayments(data.rawPayments);
        setSummary(data.summary);
      }
    } catch (e) {
      console.error("Failed to load reports:", e);
    } finally {
      setLoading(false);
    }
  };

  // EXCEL EXPORTER UTILITIES (SheetJS)
  const exportToExcel = () => {
    try {
      setMessage({ text: '', type: '' });
      const fileName = `payroll_report_${startDate}_to_${endDate}.xlsx`;

      // Create a new workbook
      const wb = XLSX.utils.book_new();

      /* SHEET 1: SALARY & payroll LEDGER OVERVIEW */
      const salaryDataHeaders = [
        ['PURNIMA CONSTRUCTION - PAYROLL LEDGER'],
        [`Date Range: ${startDate} to ${endDate}`],
        [],
        ['Worker Name', 'Role', 'Daily Wage', 'Present Days', 'Half Days', 'Absent Days', 'Total Wages Earned (A)', 'Salary Paid (B)', 'Advance Payments (C)', 'Net Payable Dues (A - B - C)']
      ];

      const salaryRows = reportData.map(r => [
        r.name,
        r.role,
        r.dailyWage,
        r.presentCount,
        r.halfDayCount,
        r.absentCount,
        r.totalEarned,
        r.totalPaid,
        r.totalAdvance,
        r.netPayable
      ]);

      // Calculate totals
      const totalsRow = [
        'TOTALS',
        '',
        '',
        reportData.reduce((acc, r) => acc + r.presentCount, 0),
        reportData.reduce((acc, r) => acc + r.halfDayCount, 0),
        reportData.reduce((acc, r) => acc + r.absentCount, 0),
        reportData.reduce((acc, r) => acc + r.totalEarned, 0),
        reportData.reduce((acc, r) => acc + r.totalPaid, 0),
        reportData.reduce((acc, r) => acc + r.totalAdvance, 0),
        reportData.reduce((acc, r) => acc + r.netPayable, 0)
      ];

      const salarySheetData = [...salaryDataHeaders, ...salaryRows, [], totalsRow];
      const wsSalary = XLSX.utils.aoa_to_sheet(salarySheetData);
      
      // Basic sizing
      wsSalary['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 24 }
      ];

      XLSX.utils.book_append_sheet(wb, wsSalary, 'Payroll Ledger');

      /* SHEET 2: ATTENDANCE GRID SHEET (DATES AS COLUMNS, WORKERS AS ROWS) */
      // 1. Compute list of distinct dates in chronological order
      const dates = Array.from(new Set(rawAttendance.map(a => a.date))).sort();
      
      const attendanceDataHeaders = [
        ['PURNIMA CONSTRUCTION - ATTENDANCE LOG GRID'],
        [`Date Range: ${startDate} to ${endDate}`],
        [],
        ['Worker Name', 'Role', ...dates, 'Total Present', 'Total Half', 'Total Absent']
      ];

      const attendanceRows = reportData.map(worker => {
        // For each date, see what the status is
        const dateStatuses = dates.map(d => {
          const match = rawAttendance.find(att => att.workerId === worker.workerId && att.date === d);
          if (!match) return '-';
          if (match.status === 'Present') return 'P';
          if (match.status === 'Half Day') return 'HD';
          if (match.status === 'Absent') return 'A';
          return '-';
        });

        return [
          worker.name,
          worker.role,
          ...dateStatuses,
          worker.presentCount,
          worker.halfDayCount,
          worker.absentCount
        ];
      });

      const attendanceSheetData = [...attendanceDataHeaders, ...attendanceRows];
      const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceSheetData);
      
      // Auto column widths
      const attCols = [{ wch: 20 }, { wch: 15 }];
      dates.forEach(() => attCols.push({ wch: 10 }));
      attCols.push({ wch: 15 }, { wch: 12 }, { wch: 12 });
      wsAttendance['!cols'] = attCols;

      XLSX.utils.book_append_sheet(wb, wsAttendance, 'Daily Attendance');

      /* SHEET 3: INDIVIDUAL TRANSACTIONS LEDGER */
      const transactionsHeaders = [
        ['PURNIMA CONSTRUCTION - RECENT PAYMENTS LEDGER'],
        [`Date Range: ${startDate} to ${endDate}`],
        [],
        ['Date', 'Worker Name', 'Role', 'Payment Type', 'Amount (₹)', 'Payment Mode', 'Site', 'Notes']
      ];

      const transactionRows = rawPayments.map(p => {
        const worker = reportData.find(w => w.workerId === p.workerId) || { name: 'Unknown', role: 'Worker' };
        return [
          p.date,
          worker.name,
          worker.role,
          p.type,
          p.amount,
          p.paymentMode,
          p.site || 'Main Site',
          p.notes || ''
        ];
      });

      const transactionSheetData = [...transactionsHeaders, ...transactionRows];
      const wsTransactions = XLSX.utils.aoa_to_sheet(transactionSheetData);
      
      wsTransactions['!cols'] = [
        { wch: 14 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, 
        { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transactions Log');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      triggerDownload(blob, fileName);

      setMessage({ text: `Excel report successfully compiled and downloaded as "${fileName}"`, type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);

    } catch (err) {
      console.error("Excel Export Error:", err);
      setMessage({ text: 'Failed to compile Excel spreadsheet.', type: 'error' });
    }
  };

  // Compile Chart stats: worker count by role
  const roleDistribution = {};
  reportData.forEach(r => {
    roleDistribution[r.role] = (roleDistribution[r.role] || 0) + 1;
  });

  const chartRoles = Object.keys(roleDistribution);
  const chartRoleCounts = Object.values(roleDistribution);
  const maxRoleCount = Math.max(...chartRoleCounts, 1);

  // Compute daily payouts sum over date range (grouping payments by date)
  const paymentsByDate = {};
  rawPayments.forEach(p => {
    paymentsByDate[p.date] = (paymentsByDate[p.date] || 0) + p.amount;
  });

  // Take the last 7 active payment dates for chart display
  const paymentDates = Object.keys(paymentsByDate).sort().slice(-7);
  const paymentAmounts = paymentDates.map(d => paymentsByDate[d]);
  const maxPaymentAmount = Math.max(...paymentAmounts, 1000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Date Filter & Export Panel */}
      <div className="ui-card">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexGrow: 1, maxWidth: '600px' }}>
            <div className="form-group" style={{ marginBottom: 0, width: 'auto', minWidth: '160px' }}>
              <label>Start Date</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Calendar size={15} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0, width: 'auto', minWidth: '160px' }}>
              <label>End Date</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date" 
                  className="form-input" 
                  style={{ paddingLeft: '36px' }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <Calendar size={15} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
            <button className="btn btn-primary" onClick={exportToExcel} disabled={loading || reportData.length === 0}>
              <FileSpreadsheet size={18} />
              <span>Download Excel Ledger</span>
            </button>
          </div>

        </div>
      </div>

      {/* Tally banners */}
      <div className="metric-grid">
        <div className="metric-card" style={{ '--accent': 'var(--success)' }}>
          <div className="metric-header">
            <span>Net Salaries Paid</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value">₹{summary.totalPaid.toLocaleString('en-IN')}</div>
          <div className="metric-footer">Total payments over selected range</div>
        </div>

        <div className="metric-card" style={{ '--accent': 'var(--warning)' }}>
          <div className="metric-header">
            <span>Advances Disbursed</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value">₹{summary.totalAdvance.toLocaleString('en-IN')}</div>
          <div className="metric-footer">Outstanding extra money disbursed</div>
        </div>

        <div className="metric-card" style={{ '--accent': 'var(--info)' }}>
          <div className="metric-header">
            <span>Net Dues Outstanding</span>
            <div className="metric-icon-box" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value">₹{summary.netOutstanding.toLocaleString('en-IN')}</div>
          <div className="metric-footer">Total contractor liability outstanding</div>
        </div>
      </div>

      {/* Export notification */}
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
            backgroundColor: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${message.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
          }}
        >
          <AlertCircle size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Premium Visual Charts Grid (Vanilla SVG Charts) */}
      {!loading && reportData.length > 0 && (
        <div className="dashboard-sections" style={{ marginTop: '4px' }}>
          
          {/* Chart 1: Cash flow paid by date (Bar Chart) */}
          <div className="ui-card">
            <div className="card-header">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={18} color="var(--primary)" />
                <span>Daily Payout Trends (₹)</span>
              </h2>
            </div>
            
            {paymentDates.length === 0 ? (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No cash flow transactions recorded in this date range.
              </div>
            ) : (
              <div className="chart-container" style={{ padding: '10px 0' }}>
                <svg className="svg-chart" viewBox="0 0 400 220" style={{ overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="380" y2="20" stroke="var(--border)" strokeDasharray="4" />
                  <line x1="40" y1="90" x2="380" y2="90" stroke="var(--border)" strokeDasharray="4" />
                  <line x1="40" y1="160" x2="380" y2="160" stroke="var(--border)" strokeDasharray="4" />
                  <line x1="40" y1="180" x2="380" y2="180" stroke="var(--border)" />

                  {/* Y Axis text */}
                  <text x="35" y="24" textAnchor="end" fontSize="10" fill="var(--text-muted)">₹{Math.floor(maxPaymentAmount).toLocaleString()}</text>
                  <text x="35" y="94" textAnchor="end" fontSize="10" fill="var(--text-muted)">₹{Math.floor(maxPaymentAmount / 2).toLocaleString()}</text>
                  <text x="35" y="164" textAnchor="end" fontSize="10" fill="var(--text-muted)">₹0</text>

                  {/* Draw columns */}
                  {paymentDates.map((d, index) => {
                    const amount = paymentAmounts[index];
                    const colWidth = 30;
                    const colGap = (340 - colWidth * paymentDates.length) / (paymentDates.length + 1);
                    const x = 40 + colGap + index * (colWidth + colGap);
                    
                    const height = (amount / maxPaymentAmount) * 160; // scale to fit 160px height
                    const y = 180 - height;
                    
                    return (
                      <g key={d}>
                        <rect 
                          x={x} 
                          y={y} 
                          width={colWidth} 
                          height={height} 
                          className="bar-rect"
                        />
                        {/* Date Label */}
                        <text 
                          x={x + colWidth / 2} 
                          y="198" 
                          textAnchor="middle" 
                          fontSize="9" 
                          fill="var(--text-muted)"
                          transform={`rotate(-15, ${x + colWidth / 2}, 198)`}
                        >
                          {d.substring(5)} {/* Month-Date */}
                        </text>
                        {/* Hover Amount display */}
                        <text x={x + colWidth / 2} y={y - 6} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--text-primary)">
                          ₹{amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Chart 2: Staff Trade distribution (Bar Chart) */}
          <div className="ui-card">
            <div className="card-header">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={18} color="var(--primary)" />
                <span>Active Trades Breakdown</span>
              </h2>
            </div>

            {chartRoles.length === 0 ? (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No active workers registered to categorize.
              </div>
            ) : (
              <div className="chart-container" style={{ padding: '10px 0' }}>
                <svg className="svg-chart" viewBox="0 0 400 220" style={{ overflow: 'visible' }}>
                  {/* Grid Lines */}
                  <line x1="80" y1="20" x2="380" y2="20" stroke="var(--border)" strokeDasharray="4" />
                  <line x1="80" y1="90" x2="380" y2="90" stroke="var(--border)" strokeDasharray="4" />
                  <line x1="80" y1="160" x2="380" y2="160" stroke="var(--border)" strokeDasharray="4" />
                  <line x1="80" y1="180" x2="380" y2="180" stroke="var(--border)" />

                  {/* Y Axis counts */}
                  <text x="75" y="24" textAnchor="end" fontSize="10" fill="var(--text-muted)">{maxRoleCount} staff</text>
                  <text x="75" y="94" textAnchor="end" fontSize="10" fill="var(--text-muted)">{Math.floor(maxRoleCount / 2)}</text>
                  <text x="75" y="164" textAnchor="end" fontSize="10" fill="var(--text-muted)">0</text>

                  {/* Draw columns */}
                  {chartRoles.map((role, index) => {
                    const count = chartRoleCounts[index];
                    const colWidth = 24;
                    const colGap = (300 - colWidth * chartRoles.length) / (chartRoles.length + 1);
                    const x = 80 + colGap + index * (colWidth + colGap);
                    
                    const height = (count / maxRoleCount) * 160;
                    const y = 180 - height;
                    
                    return (
                      <g key={role}>
                        <rect 
                          x={x} 
                          y={y} 
                          width={colWidth} 
                          height={height} 
                          className="bar-rect"
                          style={{ fill: 'var(--info)' }}
                        />
                        {/* Trade Label */}
                        <text 
                          x={x + colWidth / 2} 
                          y="196" 
                          textAnchor="middle" 
                          fontSize="9" 
                          fill="var(--text-muted)"
                          transform={`rotate(-20, ${x + colWidth / 2}, 196)`}
                        >
                          {role}
                        </text>
                        {/* Hover Count display */}
                        <text x={x + colWidth / 2} y={y - 6} textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--text-primary)">
                          {count}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Complete Financial Payroll Ledger Table */}
      <div className="ui-card">
        <div className="card-header">
          <h2 className="card-title">Salary & Payroll Statement Sheet</h2>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <Loader2 className="animate-spin" size={36} color="var(--primary)" />
          </div>
        ) : reportData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            No staff records tracked. Mark attendance or record payments to build reports.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Role</th>
                  <th>Present/Half/Absent</th>
                  <th>Total Earned (A)</th>
                  <th>Salary Paid (B)</th>
                  <th>Advance Disbursed (C)</th>
                  <th style={{ textAlign: 'right' }}>Net Payable Dues (A-B-C)</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row) => {
                  const isDebit = row.netPayable < 0;
                  return (
                    <tr key={row.workerId}>
                      <td data-label="Worker Name">
                        <strong style={{ color: 'var(--text-primary)' }}>{row.name}</strong>
                      </td>
                      <td data-label="Role">
                        <span className="badge badge-info">{row.role}</span>
                      </td>
                      <td data-label="Present/Half/Absent">
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          <span style={{ color: 'var(--success)' }}>P:{row.presentCount}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
                          <span style={{ color: 'var(--warning)' }}>H:{row.halfDayCount}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
                          <span style={{ color: 'var(--danger)' }}>A:{row.absentCount}</span>
                        </div>
                      </td>
                      <td data-label="Total Earned (A)">
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{row.totalEarned.toLocaleString('en-IN')}</strong>
                      </td>
                      <td data-label="Salary Paid (B)">
                        <span style={{ fontFamily: 'var(--font-mono)' }}>₹{row.totalPaid.toLocaleString('en-IN')}</span>
                      </td>
                      <td data-label="Advance Paid (C)">
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>₹{row.totalAdvance.toLocaleString('en-IN')}</span>
                      </td>
                      <td data-label="Net Payable" style={{ textAlign: 'right' }}>
                        <strong 
                          style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontSize: '16px',
                            color: isDebit ? 'var(--danger)' : 'var(--success)' 
                          }}
                        >
                          ₹{row.netPayable.toLocaleString('en-IN')}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
