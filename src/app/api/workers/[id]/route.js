import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export async function PUT(req, { params }) {
  try {
    const session = getAdminFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Await params if needed in Next.js versions, destruct it safely
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();

    const updated = await db.updateWorker(id, body);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT worker error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = getAdminFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    await db.deleteWorker(id);
    return NextResponse.json({ success: true, message: "Worker deleted successfully." });
  } catch (error) {
    console.error("DELETE worker error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
