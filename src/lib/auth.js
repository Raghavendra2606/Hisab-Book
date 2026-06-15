import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'purnima_construction_hisab_book_secret_key_123!';

export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function getAdminFromRequest(req) {
  try {
    const cookies = req.headers.get('cookie') || '';
    const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('admin_token='));
    if (!tokenCookie) return null;

    const token = tokenCookie.split('=')[1];
    return verifyToken(token);
  } catch (e) {
    return null;
  }
}
