'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar, 
  Share2, 
  Building2, 
  Smartphone,
  Search,
  AlertCircle,
  Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuth } from '@/lib/AuthContext';

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


export default function PaymentsPage() {
  const { companyName } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [sites, setSites] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payrollReport, setPayrollReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form Fields
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Salary Paid');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [selectedSite, setSelectedSite] = useState('');
  const [notes, setNotes] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  // Download states & handlers
  const [downloadFormat, setDownloadFormat] = useState('pdf');
  const [downloadScope, setDownloadScope] = useState('all');

  const handleDownloadLedger = () => {
    let recordsToExport = [...payments];
    let title = "Full Payment Transactions Ledger";
    let filename = "payment_ledger";
    
    if (downloadScope === 'worker' && selectedWorkerId) {
      recordsToExport = payments.filter(p => p.workerId === selectedWorkerId);
      const worker = workers.find(w => w._id === selectedWorkerId);
      title = `${worker ? worker.name : 'Worker'} - Payment Ledger`;
      filename = `ledger_${worker ? worker.name.toLowerCase().replace(/\s+/g, '_') : 'worker'}`;
    }

    if (recordsToExport.length === 0) {
      alert("No transaction records found to download!");
      return;
    }

    if (downloadFormat === 'excel') {
      exportToExcel(recordsToExport, title, filename);
    } else {
      exportToPDF(recordsToExport, title, filename);
    }
  };

  const exportToExcel = (records, title, filename) => {
    try {
      const headers = [
        [companyName.toUpperCase() + " - PAYMENT VOUCHER LEDGER"],
        [title],
        [`Date Generated: ${new Date().toISOString().split('T')[0]}`],
        [],
        ['Date', 'Worker Name', 'Role', 'Payment Type', 'Amount (₹)', 'Payment Mode', 'Site', 'Notes']
      ];

      const rows = records.map(p => {
        const workerName = getWorkerName(p.workerId);
        const workerRole = getWorkerRole(p.workerId);
        return [
          p.date,
          workerName,
          workerRole,
          p.type,
          p.amount,
          p.paymentMode,
          p.site || 'Main Site',
          p.notes || ''
        ];
      });

      const totalAmount = records.reduce((acc, curr) => acc + curr.amount, 0);
      const footer = [
        'TOTALS', '', '', '', totalAmount, '', '', ''
      ];

      const sheetData = [...headers, ...rows, [], footer];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      ws['!cols'] = [
        { wch: 14 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, 
        { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 30 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Ledger Transactions');
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      triggerDownload(blob, `${filename}.xlsx`);
    } catch (e) {
      console.error("Excel download error:", e);
      alert("Failed to export Excel ledger");
    }
  };

  const exportToPDF = (records, title, filename) => {
    try {
      const doc = new jsPDF();
      
      // Page styling / Brand Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(217, 119, 6); // Amber brand color
      doc.text(companyName, 14, 20);
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 110, 120);
      doc.text("Civil Construction Contractor Ledger", 14, 26);
      
      // Document Metadata
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // slate
      doc.text(title, 14, 38);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 130, 140);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 44);
      
      // Horizontal Line
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 48, 196, 48);

      // Map rows for PDF table
      const tableRows = records.map(p => [
        p.date,
        getWorkerName(p.workerId),
        getWorkerRole(p.workerId),
        p.type === 'Salary Paid' ? 'Salary' : 'Advance',
        `Rs. ${p.amount.toLocaleString('en-IN')}`,
        p.paymentMode,
        p.site || 'Main Site',
        p.notes || '-'
      ]);

      const totalAmount = records.reduce((acc, curr) => acc + curr.amount, 0);

      // Create PDF table using jspdf-autotable
      autoTable(doc, {
        startY: 52,
        head: [['Date', 'Worker Name', 'Role', 'Type', 'Amount', 'Mode', 'Site', 'Notes']],
        body: tableRows,
        foot: [['', '', '', 'TOTAL', `Rs. ${totalAmount.toLocaleString('en-IN')}`, '', '', '']],
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0] }, // Amber background for table headers
        footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          4: { fontStyle: 'bold' } // bold amount column
        }
      });

      // Output as blob and download using DOM attachment helper
      const pdfBlob = doc.output('blob');
      triggerDownload(pdfBlob, `${filename}.pdf`);
    } catch (e) {
      console.error("PDF download error:", e);
      alert("Failed to export PDF ledger");
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch active workers
      const workersRes = await fetch('/api/workers');
      const workersData = await workersRes.json();
      if (!workersData.error) {
        const activeWorkers = workersData.filter(w => w.status === 'Active');
        setWorkers(activeWorkers);
        if (activeWorkers.length > 0) setSelectedWorkerId(activeWorkers[0]._id);
      }

      // Fetch sites
      const sitesRes = await fetch('/api/sites');
      const sitesData = await sitesRes.json();
      if (!sitesData.error) {
        setSites(sitesData);
        if (sitesData.length > 0) setSelectedSite(sitesData[0].name);
        else setSelectedSite('Main Site');
      }

      // Fetch payments
      const paymentsRes = await fetch('/api/payments');
      const paymentsData = await paymentsRes.json();
      if (!paymentsData.error) {
        setPayments(paymentsData);
      }

      // Fetch consolidated report data
      const reportsRes = await fetch('/api/reports');
      const reportsData = await reportsRes.json();
      if (!reportsData.error) {
        setPayrollReport(reportsData.reportData);
      }

    } catch (e) {
      console.error("Failed to load payments ledger data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (!selectedWorkerId || !amount || Number(amount) <= 0) {
      setMessage({ text: 'Please select a worker and enter a valid payment amount.', type: 'error' });
      return;
    }

    setSubmitLoading(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: selectedWorkerId,
          date: paymentDate,
          amount: Number(amount),
          type: paymentType,
          paymentMode,
          site: selectedSite,
          notes
        })
      });
      const data = await res.json();

      if (data.error) {
        setMessage({ text: data.error, type: 'error' });
      } else {
        setMessage({ text: 'Payment transaction logged successfully!', type: 'success' });
        setAmount('');
        setNotes('');
        
        // Refresh tables
        const paymentsRes = await fetch('/api/payments');
        const paymentsData = await paymentsRes.json();
        if (!paymentsData.error) setPayments(paymentsData);

        const reportsRes = await fetch('/api/reports');
        const reportsData = await reportsRes.json();
        if (!reportsData.error) setPayrollReport(reportsData.reportData);
      }
    } catch (e) {
      setMessage({ text: 'Failed to record payment.', type: 'error' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment record? This will alter the worker's outstanding ledger balances. This cannot be undone!")) {
      return;
    }

    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!data.error) {
        // Refresh
        setPayments(payments.filter(p => p._id !== id));
        const reportsRes = await fetch('/api/reports');
        const reportsData = await reportsRes.json();
        if (!reportsData.error) setPayrollReport(reportsData.reportData);
      }
    } catch (e) {
      console.error("Delete payment failed:", e);
    }
  };

  // Generate WhatsApp Invoice link
  const getWhatsAppLink = (paymentItem) => {
    const worker = workers.find(w => w._id === paymentItem.workerId) || { name: 'Worker' };
    const reportItem = payrollReport.find(r => r.workerId === paymentItem.workerId) || { netPayable: 0 };
    
    const heading = `*PURNIMA CONSTRUCTION - PAYMENT VOUCHER*`;
    const details = `\n--------------------------------------\n` +
                    `*Worker:* ${worker.name}\n` +
                    `*Date:* ${paymentItem.date}\n` +
                    `*Payment Type:* ${paymentItem.type === 'Salary Paid' ? 'Salary Payment' : 'Advance (Loan)'}\n` +
                    `*Amount:* Rs. ${paymentItem.amount.toLocaleString('en-IN')}\n` +
                    `*Payment Mode:* ${paymentItem.paymentMode}\n` +
                    (paymentItem.notes ? `*Notes:* "${paymentItem.notes}"\n` : '') +
                    `--------------------------------------\n` +
                    `*Current Net Dues:* Rs. ${reportItem.netPayable.toLocaleString('en-IN')}\n` +
                    `\n_Generated via Purnima Construction Hisab-Book._`;

    const encodedText = encodeURIComponent(heading + details);
    const phoneNo = worker.phone ? worker.phone.replace(/[^0-9]/g, '') : '';
    
    // Add country code if necessary (default 91 for India if 10 digits)
    const formattedPhone = phoneNo.length === 10 ? `91${phoneNo}` : phoneNo;

    return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
  };

  const getWorkerName = (workerId) => {
    const w = workers.find(item => item._id === workerId);
    return w ? w.name : 'Unknown Worker';
  };

  const getWorkerRole = (workerId) => {
    const w = workers.find(item => item._id === workerId);
    return w ? w.role : 'Worker';
  };

  const filteredPayroll = payrollReport.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Save Notification status */}
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

      {/* Main ledger grid */}
      <div className="dashboard-sections">
        
        {/* Left Side: Create payment record */}
        <div className="ui-card">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} color="var(--primary)" />
              <span>Log New Payment</span>
            </h2>
          </div>

          {workers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
              Please add workers to the Workers Directory first before logging payments.
            </div>
          ) : (
            <form onSubmit={handleCreatePayment}>
              
              <div className="form-group">
                <label>Select Worker</label>
                <select 
                  className="form-input" 
                  value={selectedWorkerId} 
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  required
                >
                  {workers.map(w => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({w.role} - ₹{w.dailyWage}/day)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Payment Date</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="date" 
                      className="form-input" 
                      style={{ paddingLeft: '36px' }}
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                    />
                    <Calendar size={15} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Amount Paid (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Payment Type</label>
                  <select 
                    className="form-input" 
                    value={paymentType} 
                    onChange={(e) => setPaymentType(e.target.value)}
                  >
                    <option value="Salary Paid">Salary Payment</option>
                    <option value="Advance Paid">Advance (Extra Money/Loan)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Mode</label>
                  <select 
                    className="form-input" 
                    value={paymentMode} 
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / PhonePe / GPay</option>
                    <option value="Bank Transfer">Bank NetBanking</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Project Site</label>
                  <select 
                    className="form-input" 
                    value={selectedSite} 
                    onChange={(e) => setSelectedSite(e.target.value)}
                  >
                    {sites.length === 0 ? <option value="Main Site">Main Site</option> : (
                      sites.map(s => <option key={s._id} value={s.name}>{s.name}</option>)
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Brief Notes (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. advance for travel"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={submitLoading}>
                {submitLoading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <Plus size={18} />
                    <span>Log Transaction</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Outstanding Balances */}
        <div className="ui-card">
          <div className="card-header">
            <h2 className="card-title">Outstanding balances due</h2>
          </div>
          
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '38px' }}
              placeholder="Search worker by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 className="animate-spin" size={24} color="var(--primary)" />
            </div>
          ) : filteredPayroll.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
              No payroll accounts found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredPayroll.map(record => {
                const isDebit = record.netPayable < 0; // Negative dues means they owe advance
                return (
                  <div 
                    key={record.workerId}
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
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>{record.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {record.role} • Rate: ₹{record.dailyWage}/day
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div 
                        style={{ 
                          fontWeight: 700, 
                          fontFamily: 'var(--font-mono)', 
                          fontSize: '16px', 
                          color: isDebit ? 'var(--danger)' : 'var(--success)'
                        }}
                      >
                        ₹{record.netPayable.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {isDebit ? 'Advance Owed' : 'Net Dues Payable'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Ledger History List */}
      <div className="ui-card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="card-title">Recent Transactions Ledger</h2>
          
          {/* Download Options */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select 
              className="form-input" 
              style={{ width: 'auto', minHeight: '36px', padding: '6px 10px', fontSize: '14px', margin: 0 }}
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value)}
            >
              <option value="pdf">PDF Format</option>
              <option value="excel">Excel Format</option>
            </select>

            <select 
              className="form-input" 
              style={{ width: 'auto', minHeight: '36px', padding: '6px 10px', fontSize: '14px', margin: 0 }}
              value={downloadScope}
              onChange={(e) => setDownloadScope(e.target.value)}
            >
              <option value="all">Full Ledger</option>
              {workers.length > 0 && <option value="worker">Selected Worker Only</option>}
            </select>

            <button 
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownloadLedger}
              disabled={payments.length === 0}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '36px' }}
            >
              <Download size={14} />
              <span>Download Ledger</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin" size={28} color="var(--primary)" />
          </div>
        ) : payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            No payment transaction entries registered in the database. Log a transaction above.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Site</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td data-label="Date">
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}>{p.date}</div>
                    </td>
                    <td data-label="Worker">
                      <div>
                        <div style={{ fontWeight: 600 }}>{getWorkerName(p.workerId)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{getWorkerRole(p.workerId)}</div>
                      </div>
                    </td>
                    <td data-label="Type">
                      <span className={`badge ${p.type === 'Salary Paid' ? 'badge-success' : 'badge-warning'}`}>
                        {p.type === 'Salary Paid' ? 'Salary Payment' : 'Advance Disbursed'}
                      </span>
                    </td>
                    <td data-label="Amount">
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{p.amount.toLocaleString('en-IN')}</strong>
                    </td>
                    <td data-label="Method">
                      <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{p.paymentMode}</span>
                    </td>
                    <td data-label="Site">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                        <Building2 size={12} color="var(--text-muted)" />
                        <span>{p.site || 'Main Site'}</span>
                      </div>
                    </td>
                    <td data-label="Notes">
                      <span style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {p.notes ? `"${p.notes}"` : '-'}
                      </span>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {/* WhatsApp Voucher Share */}
                        <a 
                          href={getWhatsAppLink(p)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#25D366', borderColor: '#25D366' }}
                          title="Share Slip on WhatsApp"
                        >
                          <Share2 size={13} style={{ marginRight: '4px' }} />
                          <span style={{ fontSize: '12px' }}>WhatsApp</span>
                        </a>

                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeletePayment(p._id)}
                          title="Delete Record"
                        >
                          <Trash2 size={13} />
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

    </div>
  );
}
