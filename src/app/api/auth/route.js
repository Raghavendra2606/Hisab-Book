import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, signToken, getAdminFromRequest } from '@/lib/auth';

export async function GET(req) {
  try {
    const admin = await db.getAdmin();
    const session = getAdminFromRequest(req);

    return NextResponse.json({
      setup: !!admin,
      loggedIn: !!session,
      companyName: admin ? admin.companyName : "Purnima Construction"
    });
  } catch (error) {
    console.error("GET auth error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, username, password, companyName, newPassword } = body;

    const existingAdmin = await db.getAdmin();

    if (action === 'setup') {
      if (existingAdmin) {
        return NextResponse.json({ error: "Admin account is already set up." }, { status: 400 });
      }
      if (!username || !password) {
        return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password);
      const admin = await db.createAdmin({
        username,
        password: hashedPassword,
        companyName: companyName || "Purnima Construction"
      });

      const token = signToken({ id: admin._id, username: admin.username });
      
      const response = NextResponse.json({ success: true, message: "Initial setup completed successfully." });
      // Set JWT cookie
      response.headers.set(
        'Set-Cookie',
        `admin_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
      );
      return response;
    }

    if (action === 'login') {
      if (!existingAdmin) {
        return NextResponse.json({ error: "Admin not setup. Please run setup first." }, { status: 400 });
      }
      if (!username || !password) {
        return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
      }

      const isMatch = await verifyPassword(password, existingAdmin.password);
      if (!isMatch || existingAdmin.username.toLowerCase() !== username.toLowerCase()) {
        return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
      }

      const token = signToken({ id: existingAdmin._id, username: existingAdmin.username });
      
      const response = NextResponse.json({ success: true, companyName: existingAdmin.companyName });
      response.headers.set(
        'Set-Cookie',
        `admin_token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`
      );
      return response;
    }

    if (action === 'logout') {
      const response = NextResponse.json({ success: true });
      response.headers.set(
        'Set-Cookie',
        `admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
      );
      return response;
    }

    // Require Auth for updates
    const session = getAdminFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    if (action === 'update') {
      const updateData = {};
      if (username) updateData.username = username;
      if (companyName) updateData.companyName = companyName;
      if (newPassword) {
        // Validate old password first
        if (!password) {
          return NextResponse.json({ error: "Current password is required to change password." }, { status: 400 });
        }
        const isMatch = await verifyPassword(password, existingAdmin.password);
        if (!isMatch) {
          return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
        }
        updateData.password = await hashPassword(newPassword);
      }

      await db.updateAdmin(updateData);
      return NextResponse.json({ success: true, message: "Profile updated successfully." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST auth error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
