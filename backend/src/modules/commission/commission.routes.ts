import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, CommissionSlab } from '../../store/db.store';

const router = Router();

// Commission Slabs CRUD
router.get('/admin/commission/slabs', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Dynamic commission slabs list', db.commissionSlabs);
});

router.post('/admin/commission/slabs', (req: Request, res: Response) => {
  const { minAmount, maxAmount, ratePercent } = req.body;
  const newSlab: CommissionSlab = {
    id: 'slab_' + Date.now(),
    minAmount: parseFloat(minAmount) || 0,
    maxAmount: parseFloat(maxAmount) || 999999,
    ratePercent: parseFloat(ratePercent) || 4.5,
    applicableCategory: req.body.applicableCategory || 'all',
    applicableRegion: req.body.applicableRegion || 'all',
  };
  db.commissionSlabs.push(newSlab);
  sendSuccess(res, 201, 'Commission slab created successfully', newSlab);
});

router.get('/admin/commission/slabs/:id', (req: Request, res: Response) => {
  const slab = db.commissionSlabs.find((s) => s.id === req.params.id);
  if (!slab) return sendError(res, 404, 'SLAB_NOT_FOUND', 'Commission slab not found');
  sendSuccess(res, 200, 'Commission slab details', slab);
});

router.put('/admin/commission/slabs/:id', (req: Request, res: Response) => {
  const index = db.commissionSlabs.findIndex((s) => s.id === req.params.id);
  if (index === -1) return sendError(res, 404, 'SLAB_NOT_FOUND', 'Commission slab not found');

  db.commissionSlabs[index] = { ...db.commissionSlabs[index], ...req.body };
  sendSuccess(res, 200, 'Commission slab updated', db.commissionSlabs[index]);
});

router.delete('/admin/commission/slabs/:id', (req: Request, res: Response) => {
  const index = db.commissionSlabs.findIndex((s) => s.id === req.params.id);
  if (index === -1) return sendError(res, 404, 'SLAB_NOT_FOUND', 'Commission slab not found');

  const deleted = db.commissionSlabs.splice(index, 1)[0];
  sendSuccess(res, 200, 'Commission slab deleted', deleted);
});

// Calculate Dynamic Commission
router.post('/commission/calculate', (req: Request, res: Response) => {
  const { amount } = req.body;
  const numAmount = parseFloat(amount) || 12000.0;
  const ratePercent = db.getCommissionRate(numAmount);
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
