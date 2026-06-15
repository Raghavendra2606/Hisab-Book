import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminFromRequest } from '@/lib/auth';

export async function DELETE(req, { params }) {
  try {
    const session = getAdminFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    await db.deletePayment(id);
    return NextResponse.json({ success: true, message: "Payment transaction deleted successfully." });
  } catch (error) {
    console.error("DELETE payment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
