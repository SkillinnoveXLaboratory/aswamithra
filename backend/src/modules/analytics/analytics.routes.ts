import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { db } from '../../store/db.store';

const router = Router();

router.get('/admin/analytics/dashboard', (req: Request, res: Response) => {
  const totalGmvAmount = db.orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const platformCommissionRevenue = db.orders.reduce((acc, o) => acc + o.commissionAmount, 0);

  return sendSuccess(res, 200, 'Primary executive dashboard metrics', {
    totalGmvAmount: Math.round(totalGmvAmount * 100) / 100,
    totalOrdersCount: db.orders.length,
    activeFarmersCount: db.users.filter((u) => u.role === 'farmer' && u.status === 'active').length,
    activeCustomersCount: db.users.filter((u) => u.role === 'customer' && u.status === 'active').length,
    activeB2bCount: db.users.filter((u) => u.role === 'b2b' && u.status === 'active').length,
    platformCommissionRevenue: Math.round(platformCommissionRevenue * 100) / 100,
  });
});

router.get('/admin/analytics/sales-trend', (req: Request, res: Response) => {
  const totalGmv = db.orders.reduce((acc, o) => acc + o.totalAmount, 0);
  const totalComm = db.orders.reduce((acc, o) => acc + o.commissionAmount, 0);

  return sendSuccess(res, 200, 'Sales revenue & commission trend graphs', [
    { month: '2026-06', gmv: 3200000.0, commission: 134000.0 },
    { month: '2026-07', gmv: totalGmv, commission: totalComm },
  ]);
});

router.get('/admin/analytics/regional-performance', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Regional sales performance by district', [
    { district: 'Krishna', gmv: 8400000.0, ordersCount: db.orders.length },
    { district: 'Guntur', gmv: 6450000.0, ordersCount: 8020 },
  ]);
});

router.get('/admin/analytics/top-products', (req: Request, res: Response) => {
  const topProds = db.products.slice(0, 5).map((p) => ({
    productId: p.id,
    name: p.name,
    stock: p.stock,
    price: p.price,
    unit: p.unit,
  }));
  return sendSuccess(res, 200, 'Top best-selling products platform-wide', topProds);
});

router.get('/admin/analytics/farmer-retention', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Farmer retention & active listing statistics', { activeListingRatePercent: 94.2, monthlyRetentionPercent: 98.1 });
});

router.get('/admin/analytics/customer-acquisition', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Customer signup growth & repeat buyer rate', { monthlyGrowthPercent: 24.5, repeatBuyerRatePercent: 68.4 });
});

// Custom Reports CRUD
router.get('/admin/reports', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Saved custom report configurations', [
    { id: 'rpt_01', name: 'Monthly GST Breakdown', schedule: 'monthly', lastRun: '2026-07-01' },
  ]);
});

router.post('/admin/reports', (req: Request, res: Response) => {
  return sendSuccess(res, 201, 'Custom report configuration created', { id: 'rpt_' + Date.now(), ...req.body });
});

router.get('/admin/reports/:id', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Report configuration detail', { id: req.params.id, name: 'Monthly GST Breakdown' });
});

router.put('/admin/reports/:id', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Report configuration updated', { id: req.params.id, ...req.body });
});

router.delete('/admin/reports/:id', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Report configuration deleted', { id: req.params.id });
});

router.get('/admin/reports/sales/export', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Sales report export generated', { downloadUrl: 'https://storage.aswamithra.in/exports/sales_report_2026_07.xlsx' });
});

router.get('/admin/reports/tax/export', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Tax & GST report export generated', { downloadUrl: 'https://storage.aswamithra.in/exports/tax_report_2026_07.xlsx' });
});

router.get('/admin/reports/commission/export', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Commission revenue report export generated', { downloadUrl: 'https://storage.aswamithra.in/exports/commission_report_2026_07.xlsx' });
});

router.get('/admin/analytics/india-map-summary', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'India map high-level summary stats', { activeStates: 1, activeDistricts: 2, totalFarmerDensityPoints: db.users.filter((u) => u.role === 'farmer').length });
});

export default router;
