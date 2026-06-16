export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(req) {
  try {
    const session = getAdminFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    // Fetch workers
    const workers = await db.getWorkers();
    
    // Fetch period payments
    const periodPaymentsFilter = {};
    if (startDate && endDate) {
      periodPaymentsFilter.startDate = startDate;
      periodPaymentsFilter.endDate = endDate;
    }
    const periodPayments = await db.getPayments(periodPaymentsFilter);

    // Fetch period attendance
    let periodAttendance = [];
    if (startDate && endDate) {
      periodAttendance = await db.getAttendanceRange(startDate, endDate);
    } else {
      periodAttendance = await db.getAttendanceRange('1970-01-01', '2099-12-31');
    }

    // Fetch cumulative (lifetime up to endDate) payments and attendance for net dues calculation
    const cumulativePaymentsFilter = {};
    if (endDate) {
      cumulativePaymentsFilter.startDate = '1970-01-01';
      cumulativePaymentsFilter.endDate = endDate;
    }
    const cumulativePayments = await db.getPayments(cumulativePaymentsFilter);
    const cumulativeAttendance = await db.getAttendanceRange('1970-01-01', endDate || '2099-12-31');

    // Organize period attendance by workerId
    const periodAttendanceMap = {};
    periodAttendance.forEach(att => {
      if (!periodAttendanceMap[att.workerId]) {
        periodAttendanceMap[att.workerId] = [];
      }
      periodAttendanceMap[att.workerId].push(att);
    });

    // Organize cumulative attendance by workerId
    const cumulativeAttendanceMap = {};
    cumulativeAttendance.forEach(att => {
      if (!cumulativeAttendanceMap[att.workerId]) {
        cumulativeAttendanceMap[att.workerId] = [];
      }
      cumulativeAttendanceMap[att.workerId].push(att);
    });

    // Organize period payments by workerId
    const periodPaymentsMap = {};
    periodPayments.forEach(pay => {
      if (!periodPaymentsMap[pay.workerId]) {
        periodPaymentsMap[pay.workerId] = [];
      }
      periodPaymentsMap[pay.workerId].push(pay);
    });

    // Organize cumulative payments by workerId
    const cumulativePaymentsMap = {};
    cumulativePayments.forEach(pay => {
      if (!cumulativePaymentsMap[pay.workerId]) {
        cumulativePaymentsMap[pay.workerId] = [];
      }
      cumulativePaymentsMap[pay.workerId].push(pay);
    });

    // Compute stats for each worker
    const reportData = workers.map(worker => {
      const pAtt = periodAttendanceMap[worker._id] || [];
      const pPay = periodPaymentsMap[worker._id] || [];
      const cAtt = cumulativeAttendanceMap[worker._id] || [];
      const cPay = cumulativePaymentsMap[worker._id] || [];

      // Period stats
      let presentCount = 0;
      let halfDayCount = 0;
      let absentCount = 0;

      pAtt.forEach(att => {
        if (att.status === 'Present') presentCount++;
        else if (att.status === 'Half Day') halfDayCount++;
        else if (att.status === 'Absent') absentCount++;
      });

      const dailyWage = worker.dailyWage || 0;
      const totalEarned = (presentCount * dailyWage) + (halfDayCount * dailyWage * 0.5);

      let totalPaid = 0;
      let totalAdvance = 0;

      pPay.forEach(pay => {
        if (pay.type === 'Salary Paid') {
          totalPaid += pay.amount;
        } else if (pay.type === 'Advance Paid') {
          totalAdvance += pay.amount;
        }
      });

      // Cumulative stats for actual outstanding dues (lifetime up to endDate)
      let cPresentCount = 0;
      let cHalfDayCount = 0;
      cAtt.forEach(att => {
        if (att.status === 'Present') cPresentCount++;
        else if (att.status === 'Half Day') cHalfDayCount++;
      });
      const lifetimeEarned = (cPresentCount * dailyWage) + (cHalfDayCount * dailyWage * 0.5);

      let lifetimePaid = 0;
      let lifetimeAdvance = 0;
      cPay.forEach(pay => {
        if (pay.type === 'Salary Paid') {
          lifetimePaid += pay.amount;
        } else if (pay.type === 'Advance Paid') {
          lifetimeAdvance += pay.amount;
        }
      });

      const openingBalance = worker.openingBalance || 0;
      const netPayable = openingBalance + lifetimeEarned - lifetimePaid - lifetimeAdvance;

      return {
        workerId: worker._id,
        name: worker.name,
        role: worker.role,
        phone: worker.phone,
        dailyWage,
        status: worker.status,
        site: worker.site,
        openingBalance,
        presentCount,
        halfDayCount,
        absentCount,
        totalEarned,
        totalPaid,
        totalAdvance,
        netPayable
      };
    });

    // Aggregate values for dashboard charts
    const summary = {
      totalWorkers: workers.length,
      activeWorkers: workers.filter(w => w.status === 'Active').length,
      totalPaid: periodPayments.reduce((acc, pay) => pay.type === 'Salary Paid' ? acc + pay.amount : acc, 0),
      totalAdvance: periodPayments.reduce((acc, pay) => pay.type === 'Advance Paid' ? acc + pay.amount : acc, 0),
      netOutstanding: reportData.reduce((acc, row) => acc + row.netPayable, 0)
    };

    return NextResponse.json({
      summary,
      reportData,
      rawAttendance: periodAttendance,
      rawPayments: periodPayments
    });
  } catch (error) {
    console.error("GET reports error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
