import { jwtVerify } from 'jose';
import { prisma } from '../utils/db.js';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-prod');

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Missing Authorization header' });
    const { payload } = await jwtVerify(header.slice(7), secret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'Missing X-Api-Key header' });
  const apiKey = await prisma.apiKey.findUnique({ where: { key }, include: { user: true } });
  if (!apiKey || !apiKey.isActive) return res.status(401).json({ error: 'Invalid API key' });
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsed: new Date() } });
  req.user = apiKey.user;
  next();
}

export function requireAnyAuth(req, res, next) {
  if (req.headers['x-api-key']) return requireApiKey(req, res, next);
  return requireAuth(req, res, next);
}
