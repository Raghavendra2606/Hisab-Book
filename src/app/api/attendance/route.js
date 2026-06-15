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
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: "Missing required query parameter: date" }, { status: 400 });
    }

    const attendance = await db.getAttendance(date);
    return NextResponse.json(attendance);
  } catch (error) {
    console.error("GET attendance error:", error);
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
    const { date, records } = body;

    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Missing required fields: date, records" }, { status: 400 });
    }

    const saved = await db.saveAttendance(date, records);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("POST attendance error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
