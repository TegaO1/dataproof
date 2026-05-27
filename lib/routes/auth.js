import { Router } from 'express';
import { SignJWT } from 'jose';
import { v4 as uuid } from 'uuid';
import { prisma } from '../utils/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-prod');

router.post('/wallet', async (req, res) => {
  try {
    const { walletAddress, publicKey } = req.body;
    if (!walletAddress) return res.status(400).json({ error: 'walletAddress required' });
    const user = await prisma.user.upsert({
      where:  { walletAddress },
      create: { walletAddress, aptosPublicKey: publicKey },
      update: { aptosPublicKey: publicKey },
    });
    const token = await new SignJWT({ sub: user.id, wallet: user.walletAddress })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);
    res.json({ token, user: { id: user.id, walletAddress: user.walletAddress } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/apikey', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const key    = `dp_${uuid().replace(/-/g, '')}`;
    const apiKey = await prisma.apiKey.create({ data: { key, name, userId: req.user.id } });
    res.json({ id: apiKey.id, name: apiKey.name, key, createdAt: apiKey.createdAt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/apikey', requireAuth, async (req, res) => {
  const keys = await prisma.apiKey.findMany({
    where:  { userId: req.user.id, isActive: true },
    select: { id: true, name: true, lastUsed: true, createdAt: true },
  });
  res.json(keys);
});

router.delete('/apikey/:id', requireAuth, async (req, res) => {
  await prisma.apiKey.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data:  { isActive: false },
  });
  res.json({ revoked: true });
});

export default router;
