import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { requireAnyAuth } from '../middleware/auth.js';
import { getPresignedReadUrl } from '../services/shelby.js';
import { recordReadProof, verifyProofTx } from '../services/aptos.js';

const router = Router();

router.post('/:datasetId', requireAnyAuth, async (req, res) => {
  try {
    const dataset = await prisma.dataset.findUnique({ where: { id: req.params.datasetId } });
    if (!dataset || !dataset.isActive) return res.status(404).json({ error: 'Dataset not found' });

    const { paymentTxHash } = req.body;
    if (!paymentTxHash) return res.status(400).json({ error: 'paymentTxHash required' });

    const { verified } = await verifyProofTx({ txHash: paymentTxHash });
    if (!verified) return res.status(402).json({ error: 'Payment not verified on Aptos' });

    const { txHash: proofTx } = await recordReadProof({
      datasetId: dataset.id, readerWallet: req.user.walletAddress,
      shelbyKey: dataset.shelbyKey, priceCharged: dataset.pricePerRead,
    });

    const signedUrl = await getPresignedReadUrl({ shelbyKey: dataset.shelbyKey, expiresSeconds: 300 });

    await prisma.$transaction([
      prisma.accessLog.create({ data: { datasetId: dataset.id, accessorId: req.user.id, walletAddress: req.user.walletAddress, aptosProofTx: proofTx, priceCharged: dataset.pricePerRead, bytesServed: dataset.sizeBytes } }),
      prisma.dataset.update({ where: { id: dataset.id }, data: { totalReads: { increment: 1 }, totalEarnings: { increment: dataset.pricePerRead } } }),
    ]);

    res.json({ signedUrl, proofTx, expiresIn: 300, dataset: { id: dataset.id, name: dataset.name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history', requireAnyAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const logs = await prisma.accessLog.findMany({
      where: { accessorId: req.user.id },
      include: { dataset: { select: { id: true, name: true, chain: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
