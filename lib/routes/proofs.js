import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { getProofsForDataset, verifyProofTx } from '../services/aptos.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const logs = await prisma.accessLog.findMany({
      orderBy: { createdAt: 'desc' }, take: Number(limit),
      include: { dataset: { select: { id: true, name: true, chain: true } } },
    });
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/dataset/:datasetId', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const proofs = await getProofsForDataset({ datasetId: req.params.datasetId, limit: Number(limit) });
    res.json(proofs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/verify/:txHash', async (req, res) => {
  try {
    const result = await verifyProofTx({ txHash: req.params.txHash });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
