import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(req) {
  try {
    const session = getAdminFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const workers = await db.getWorkers();
    return NextResponse.json(workers);
  } catch (error) {
    console.error("GET workers error:", error);
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
    const { name, phone, role, dailyWage, joiningDate, status, site } = body;

    if (!name || !role || dailyWage === undefined) {
      return NextResponse.json({ error: "Missing required fields: name, role, dailyWage" }, { status: 400 });
    }

    const worker = await db.createWorker({
      name,
      phone: phone || "",
      role,
      dailyWage: Number(dailyWage),
      joiningDate: joiningDate || new Date().toISOString().split('T')[0],
      status: status || "Active",
      site: site || "Main Site"
    });

    return NextResponse.json(worker, { status: 201 });
  } catch (error) {
    console.error("POST worker error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
