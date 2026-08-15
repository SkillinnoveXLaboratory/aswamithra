import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { query } from '../../config/db.config';
import { getSiteConfig, updateSiteConfig, getCommissionRatePercent } from '../../services/sql-store';

const router = Router();

router.get('/admin/commission/slabs', async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM commission_slabs ORDER BY min_amount ASC');
  sendSuccess(res, 200, 'Dynamic commission slabs list', result.rows);
});

router.get('/admin/commission/settings', async (_req: Request, res: Response) => {
  const cfg = await getSiteConfig();
  sendSuccess(res, 200, 'Commission settings', { commissionRatePercent: cfg.commissionRatePercent });
});

router.put('/admin/commission/settings', async (req: Request, res: Response) => {
  const commissionRatePercent = Number(req.body?.commissionRatePercent);
  await updateSiteConfig({ commissionRatePercent: Number.isFinite(commissionRatePercent) ? commissionRatePercent : 4.5 });
  const cfg = await getSiteConfig();
  sendSuccess(res, 200, 'Commission settings updated', { commissionRatePercent: cfg.commissionRatePercent });
});

router.post('/admin/commission/slabs', async (req: Request, res: Response) => {
  const { minAmount, maxAmount, ratePercent } = req.body;
  const newSlab = {
    id: 'slab_' + Date.now(),
    minAmount: parseFloat(minAmount) || 0,
    maxAmount: parseFloat(maxAmount) || 999999,
    ratePercent: parseFloat(ratePercent) || 4.5,
    applicableCategory: req.body.applicableCategory || 'all',
    applicableRegion: req.body.applicableRegion || 'all',
  };
  await query(
    'INSERT INTO commission_slabs (id, min_amount, max_amount, rate_percent, applicable_category, applicable_region) VALUES ($1,$2,$3,$4,$5,$6)',
    [newSlab.id, newSlab.minAmount, newSlab.maxAmount, newSlab.ratePercent, newSlab.applicableCategory, newSlab.applicableRegion],
  );
  sendSuccess(res, 201, 'Commission slab created successfully', newSlab);
});

router.get('/admin/commission/slabs/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM commission_slabs WHERE id = $1 LIMIT 1', [req.params.id]);
  const slab = result.rows[0];
  if (!slab) return sendError(res, 404, 'SLAB_NOT_FOUND', 'Commission slab not found');
  sendSuccess(res, 200, 'Commission slab details', slab);
});

router.put('/admin/commission/slabs/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM commission_slabs WHERE id = $1 LIMIT 1', [req.params.id]);
  const row = result.rows[0];
  if (!row) return sendError(res, 404, 'SLAB_NOT_FOUND', 'Commission slab not found');
  const updated = {
    minAmount: req.body.minAmount !== undefined ? parseFloat(req.body.minAmount) : Number(row.min_amount),
    maxAmount: req.body.maxAmount !== undefined ? parseFloat(req.body.maxAmount) : Number(row.max_amount),
    ratePercent: req.body.ratePercent !== undefined ? parseFloat(req.body.ratePercent) : Number(row.rate_percent),
    applicableCategory: req.body.applicableCategory !== undefined ? req.body.applicableCategory : row.applicable_category,
    applicableRegion: req.body.applicableRegion !== undefined ? req.body.applicableRegion : row.applicable_region,
  };
  await query(
    'UPDATE commission_slabs SET min_amount = $1, max_amount = $2, rate_percent = $3, applicable_category = $4, applicable_region = $5 WHERE id = $6',
    [updated.minAmount, updated.maxAmount, updated.ratePercent, updated.applicableCategory, updated.applicableRegion, req.params.id],
  );
  sendSuccess(res, 200, 'Commission slab updated', { id: req.params.id, ...updated });
});

router.delete('/admin/commission/slabs/:id', async (req: Request, res: Response) => {
  await query('DELETE FROM commission_slabs WHERE id = $1', [req.params.id]);
  sendSuccess(res, 200, 'Commission slab deleted', { id: req.params.id });
});

router.post('/commission/calculate', async (req: Request, res: Response) => {
  const numAmount = parseFloat(req.body.amount) || 12000.0;
  const ratePercent = await getCommissionRatePercent(numAmount);
  const commissionAmount = Math.round(((numAmount * ratePercent) / 100) * 100) / 100;
  const farmerShare = Math.round((numAmount - commissionAmount) * 100) / 100;

  sendSuccess(res, 200, 'Commission calculated dynamically', {
    orderAmount: numAmount,
    applicableRatePercent: ratePercent,
    commissionAmount,
    farmerShare,
  });
});

export default router;
