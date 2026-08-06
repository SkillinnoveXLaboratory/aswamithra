import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';

const router = Router();

router.get('/coupons', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Active public coupons list', [
    { code: 'FARMERFRESH50', discountType: 'flat', discountValue: 50.0, minOrderValue: 300.0, validTill: '2026-08-31' },
  ]);
});

router.get('/admin/coupons', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'All coupons list (Admin)', [
    { id: 'cpn_01', code: 'FARMERFRESH50', discountValue: 50.0, redemptionsCount: 142, status: 'active' },
  ]);
});

router.post('/admin/coupons', (req: Request, res: Response) => {
  sendSuccess(res, 201, 'Discount coupon created', { id: 'cpn_' + Date.now(), ...req.body });
});

router.get('/admin/coupons/:id', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Coupon detail', { id: req.params.id, code: 'FARMERFRESH50' });
});

router.put('/admin/coupons/:id', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Coupon updated', { id: req.params.id, ...req.body });
});

router.delete('/admin/coupons/:id', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Coupon deleted', { id: req.params.id });
});

router.post('/coupons/validate', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Coupon validated', { code: req.body.code, isValid: true, discountAmount: 50.0 });
});

router.get('/admin/coupons/:id/redemptions', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Coupon redemption records', [{ redemptionId: 'rdm_01', customerId: 'usr_998124', date: '2026-07-25' }]);
});

router.post('/admin/coupons/bulk-generate', (req: Request, res: Response) => {
  sendSuccess(res, 201, 'Single-use promo codes generated', { count: req.body.count || 100, prefix: 'ASWAM' });
});

router.get('/admin/coupons/stats', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Coupon ROI & usage statistics', { totalDiscountDelivered: 42500.0, totalRevenueDriven: 382000.0 });
});

router.put('/admin/coupons/:id/status', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Coupon status toggled', { id: req.params.id, status: req.body.status || 'paused' });
});

router.delete('/admin/coupons/expired', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Expired coupon codes purged', { purgedCount: 14 });
});

export default router;
