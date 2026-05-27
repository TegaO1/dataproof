import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { requireAnyAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const [datasetCount, readCount, earningsAgg] = await Promise.all([
      prisma.dataset.count({ where: { isActive: true } }),
      prisma.accessLog.count(),
      prisma.accessLog.aggregate({ _sum: { priceCharged: true } }),
    ]);
    res.json({
      totalDatasets:    datasetCount,
      totalReads:       readCount,
      totalEarningsApt: earningsAgg._sum.priceCharged || 0,
      proofRate:        '100%',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/earnings', requireAnyAuth, async (req, res) => {
  try {
    const datasets = await prisma.dataset.findMany({
      where:   { uploaderId: req.user.id },
      select:  { id: true, name: true, totalReads: true, totalEarnings: true },
      orderBy: { totalEarnings: 'desc' },
    });
    res.json({ datasets, totalEarningsApt: datasets.reduce((s, d) => s + d.totalEarnings, 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
