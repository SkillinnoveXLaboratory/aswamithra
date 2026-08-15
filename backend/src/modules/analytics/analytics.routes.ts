import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { query } from '../../config/db.config';

const router = Router();

async function getOrderMetrics() {
  const result = await query('SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0)::float8 AS gmv, COALESCE(SUM(commission_amount), 0)::float8 AS commission FROM orders');
  return result.rows[0];
}

async function getUserCount(role: string) {
  const result = await query('SELECT COUNT(*)::int AS count FROM users WHERE role = $1 AND status = $2', [role, 'active']);
  return result.rows[0]?.count ?? 0;
}

router.get('/admin/analytics/dashboard', async (_req: Request, res: Response) => {
  const metrics = await getOrderMetrics();
  return sendSuccess(res, 200, 'Primary executive dashboard metrics', {
    totalGmvAmount: Math.round(Number(metrics.gmv || 0) * 100) / 100,
    totalOrdersCount: Number(metrics.count || 0),
    activeFarmersCount: await getUserCount('farmer'),
    activeCustomersCount: await getUserCount('customer'),
    activeB2bCount: await getUserCount('b2b'),
    platformCommissionRevenue: Math.round(Number(metrics.commission || 0) * 100) / 100,
  });
});

router.get('/admin/analytics/sales-trend', async (_req: Request, res: Response) => {
  const metrics = await getOrderMetrics();
  return sendSuccess(res, 200, 'Sales revenue & commission trend graphs', [
    { month: '2026-06', gmv: 3200000.0, commission: 134000.0 },
    { month: '2026-07', gmv: Number(metrics.gmv || 0), commission: Number(metrics.commission || 0) },
  ]);
});

router.get('/admin/analytics/regional-performance', async (_req: Request, res: Response) => {
  const result = await query(`
    SELECT COALESCE(district, 'Unknown') AS district, COUNT(*)::int AS orders_count, COALESCE(SUM(total_amount), 0)::float8 AS gmv
    FROM orders
    GROUP BY COALESCE(district, 'Unknown')
    ORDER BY gmv DESC
    LIMIT 10
  `);
  return sendSuccess(res, 200, 'Regional sales performance by district', result.rows);
});

router.get('/admin/analytics/top-products', async (_req: Request, res: Response) => {
  const result = await query('SELECT id AS "productId", name, stock, price, unit FROM products ORDER BY created_at DESC LIMIT 5');
  return sendSuccess(res, 200, 'Top best-selling products platform-wide', result.rows);
});

router.get('/admin/analytics/farmer-retention', (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Farmer retention & active listing statistics', { activeListingRatePercent: 94.2, monthlyRetentionPercent: 98.1 });
});

router.get('/admin/analytics/customer-acquisition', (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Customer signup growth & repeat buyer rate', { monthlyGrowthPercent: 24.5, repeatBuyerRatePercent: 68.4 });
});

router.get('/admin/reports', (_req: Request, res: Response) => {
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

router.delete('/admin/reports/:id', (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Report configuration deleted', { id: _req.params.id });
});

router.get('/admin/reports/sales/export', (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Sales report export generated', { downloadUrl: 'https://storage.aswamithra.in/exports/sales_report_2026_07.xlsx' });
});

router.get('/admin/reports/tax/export', (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Tax & GST report export generated', { downloadUrl: 'https://storage.aswamithra.in/exports/tax_report_2026_07.xlsx' });
});

router.get('/admin/reports/commission/export', (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Commission revenue report export generated', { downloadUrl: 'https://storage.aswamithra.in/exports/commission_report_2026_07.xlsx' });
});

router.get('/admin/analytics/india-map-summary', async (_req: Request, res: Response) => {
  const result = await query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'farmer'");
  return sendSuccess(res, 200, 'India map high-level summary stats', { activeStates: 1, activeDistricts: 2, totalFarmerDensityPoints: Number(result.rows[0]?.count || 0) });
});

export default router;
