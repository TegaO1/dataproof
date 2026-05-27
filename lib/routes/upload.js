import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { prisma } from '../utils/db.js';
import { requireAnyAuth } from '../middleware/auth.js';
import { uploadToShelby } from '../services/shelby.js';
import { recordDatasetUpload } from '../services/aptos.js';

const router = Router();
// Vercel serverless limit is 4.5MB body — for larger files use Shelby's multipart upload directly
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

const MetaSchema = z.object({
  name:          z.string().min(3).max(200),
  description:   z.string().min(10),
  category:      z.string(),
  chain:         z.string(),
  format:        z.enum(['CSV','JSON','Parquet','JSONL','Arrow','Avro']),
  pricePerRead:  z.coerce.number().min(0.001).max(100),
  license:       z.string().optional().default('CC BY 4.0'),
  updateFreq:    z.string().optional().default('static'),
  tags:          z.preprocess(v => typeof v === 'string' ? JSON.parse(v) : v, z.array(z.string())).optional().default([]),
  aiUseCaseTags: z.preprocess(v => typeof v === 'string' ? JSON.parse(v) : v, z.array(z.string())).optional().default([]),
  schemaJson:    z.preprocess(v => typeof v === 'string' ? JSON.parse(v) : v, z.any()).optional(),
});

router.post('/', requireAnyAuth, upload.single('file'), async (req, res) => {
  try {
    const meta = MetaSchema.parse(req.body);
    if (!req.file) return res.status(400).json({ error: 'file required' });

    const datasetId = uuid();
    const ext       = req.file.originalname.split('.').pop() || 'bin';
    const shelbyKey = `datasets/${req.user.id}/${datasetId}.${ext}`;

    const { etag }    = await uploadToShelby({ key: shelbyKey, buffer: req.file.buffer, contentType: req.file.mimetype, metadata: { 'dataset-id': datasetId, uploader: req.user.walletAddress } });
    const { txHash }  = await recordDatasetUpload({ uploaderId: req.user.walletAddress, shelbyKey, datasetId, pricePerRead: meta.pricePerRead });

    const dataset = await prisma.dataset.create({
      data: { id: datasetId, ...meta, sizeBytes: BigInt(req.file.size), sizeLabel: fmtBytes(req.file.size), shelbyKey, shelbyEtag: etag, aptosUploadTx: txHash, uploaderId: req.user.id },
    });

    res.status(201).json({ dataset, aptosUploadTx: txHash });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(1)} GB`;
}

export default router;
