import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { requireAnyAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { chain, category, search, sort = 'reads', order = 'desc', page = 1, limit = 20 } = req.query;
    const where = { isActive: true };
    if (chain)    where.chain    = chain;
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (search)   where.OR = [
      { name:        { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags:        { has: search.toLowerCase() } },
    ];
    const orderMap = {
      reads:       { totalReads: order },
      earnings:    { totalEarnings: order },
      price:       { pricePerRead: order },
      created:     { createdAt: order },
    };
    const [datasets, total] = await Promise.all([
      prisma.dataset.findMany({
        where, orderBy: orderMap[sort] || { totalReads: 'desc' },
        skip: (Number(page) - 1) * Number(limit), take: Number(limit),
        include: { uploader: { select: { walletAddress: true } } },
      }),
      prisma.dataset.count({ where }),
    ]);
    res.json({ datasets, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const dataset = await prisma.dataset.findUnique({
      where: { id: req.params.id },
      include: { uploader: { select: { walletAddress: true } } },
    });
    if (!dataset || !dataset.isActive) return res.status(404).json({ error: 'Not found' });
    res.json(dataset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireAnyAuth, async (req, res) => {
  try {
    const dataset = await prisma.dataset.findUnique({ where: { id: req.params.id } });
    if (!dataset) return res.status(404).json({ error: 'Not found' });
    if (dataset.uploaderId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    const { name, description, pricePerRead, tags, aiUseCaseTags } = req.body;
    const updated = await prisma.dataset.update({ where: { id: req.params.id }, data: { name, description, pricePerRead, tags, aiUseCaseTags } });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireAnyAuth, async (req, res) => {
  try {
    const dataset = await prisma.dataset.findUnique({ where: { id: req.params.id } });
    if (!dataset) return res.status(404).json({ error: 'Not found' });
    if (dataset.uploaderId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    await prisma.dataset.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
