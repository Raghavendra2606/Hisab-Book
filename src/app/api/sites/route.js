import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export async function GET(req) {
  try {
    const session = getAdminFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const sites = await db.getSites();
    return NextResponse.json(sites);
  } catch (error) {
    console.error("GET sites error:", error);
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
    const { name, location, status } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    const site = await db.createSite({
      name,
      location: location || "",
      status: status || "Active"
    });

    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    console.error("POST site error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
