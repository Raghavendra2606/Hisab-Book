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

    // Fetch all required data
    const workers = await db.getWorkers();
    
    // Fetch payments
    const paymentsFilter = {};
    if (startDate && endDate) {
      paymentsFilter.startDate = startDate;
      paymentsFilter.endDate = endDate;
    }
    const allPayments = await db.getPayments(paymentsFilter);

    // Fetch attendance
    let allAttendance = [];
    if (startDate && endDate) {
      allAttendance = await db.getAttendanceRange(startDate, endDate);
    } else {
      // If no date range is specified, retrieve ALL attendance logs (lifetime)
      // so that worker calculations (netPayable) evaluate current running balances accurately.
      allAttendance = await db.getAttendanceRange('1970-01-01', '2099-12-31');
    }

    // Organize attendance by workerId
    const attendanceMap = {};
    allAttendance.forEach(att => {
      if (!attendanceMap[att.workerId]) {
        attendanceMap[att.workerId] = [];
      }
      attendanceMap[att.workerId].push(att);
    });

    // Organize payments by workerId
    const paymentsMap = {};
    allPayments.forEach(pay => {
      if (!paymentsMap[pay.workerId]) {
        paymentsMap[pay.workerId] = [];
      }
      paymentsMap[pay.workerId].push(pay);
    });

    // Compute stats for each worker
    const reportData = workers.map(worker => {
      const workerAtt = attendanceMap[worker._id] || [];
      const workerPay = paymentsMap[worker._id] || [];

      let presentCount = 0;
      let halfDayCount = 0;
      let absentCount = 0;

      workerAtt.forEach(att => {
        if (att.status === 'Present') presentCount++;
        else if (att.status === 'Half Day') halfDayCount++;
        else if (att.status === 'Absent') absentCount++;
      });

      const dailyWage = worker.dailyWage || 0;
      const totalEarned = (presentCount * dailyWage) + (halfDayCount * dailyWage * 0.5);

      let totalPaid = 0;
      let totalAdvance = 0;

      workerPay.forEach(pay => {
        if (pay.type === 'Salary Paid') {
          totalPaid += pay.amount;
        } else if (pay.type === 'Advance Paid') {
          totalAdvance += pay.amount;
        }
      });

      const netPayable = totalEarned - totalPaid - totalAdvance;

      return {
        workerId: worker._id,
        name: worker.name,
        role: worker.role,
        phone: worker.phone,
        dailyWage,
        status: worker.status,
        site: worker.site,
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
      totalPaid: allPayments.reduce((acc, pay) => pay.type === 'Salary Paid' ? acc + pay.amount : acc, 0),
      totalAdvance: allPayments.reduce((acc, pay) => pay.type === 'Advance Paid' ? acc + pay.amount : acc, 0),
      netOutstanding: reportData.reduce((acc, row) => acc + row.netPayable, 0)
    };

    return NextResponse.json({
      summary,
      reportData,
      rawAttendance: allAttendance,
      rawPayments: allPayments
    });
  } catch (error) {
    console.error("GET reports error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
