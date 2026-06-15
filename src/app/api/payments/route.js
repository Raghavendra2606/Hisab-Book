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
    const workerId = searchParams.get('workerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filters = {};
    if (workerId) filters.workerId = workerId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const payments = await db.getPayments(filters);
    return NextResponse.json(payments);
  } catch (error) {
    console.error("GET payments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = getAdminFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const { workerId, date, amount, type, paymentMode, site, notes } = body;

    if (!workerId || !date || amount === undefined || !type) {
      return NextResponse.json({ error: "Missing required fields: workerId, date, amount, type" }, { status: 400 });
    }

    const payment = await db.createPayment({
      workerId,
      date,
      amount: Number(amount),
      type, // "Salary Paid" or "Advance Paid"
      paymentMode: paymentMode || "Cash",
      site: site || "",
      notes: notes || ""
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("POST payment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
