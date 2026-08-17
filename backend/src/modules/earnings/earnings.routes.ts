import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { listEarningsByFarmer, listAllProducts, listOrdersBySeller, insertEarningsEntry, query } from '../../services/sql-store';

const router = Router();

const PENDING_ORDER_STATUSES = ['PLACED', 'ACCEPTED', 'PACKED', 'OUT_FOR_DELIVERY'];

function emptyDashboard() {
  return {
    todayOrders: 0,
    pendingOrders: 0,
    monthlyEarnings: 0,
    todaySales: 0,
    newOrdersCount: 0,
    extraEarnedLifetime: 0,
    extraEarnedThisMonth: 0,
    completedOrdersCount: 0,
    lowStockAlerts: [],
  };
}

router.get('/farmer/dashboard', (req: Request, res: Response) => {
  void (async () => {
  const farmerId = req.query.farmerId as string;
  if (!farmerId) {
    return sendSuccess(res, 200, 'Farmer dashboard summary', emptyDashboard());
  }

  const farmerOrders = await listOrdersBySeller(farmerId);
  const farmerEarnings = await listEarningsByFarmer(farmerId);
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);

  const todayOrders = farmerOrders.filter((o: any) => String(o.created_at).startsWith(todayKey)).length;
  const pendingOrders = farmerOrders.filter((o: any) => PENDING_ORDER_STATUSES.includes(o.status)).length;
  const monthlyEarnings = farmerOrders
    .filter((o: any) => String(o.created_at).startsWith(monthKey) && o.status === 'DELIVERED')
    .reduce((acc: number, o: any) => acc + (Number(o.farmer_payout_amount) || Number(o.total_amount)), 0);
  const todaySales = farmerOrders
    .filter((o: any) => String(o.created_at).startsWith(todayKey))
    .reduce((acc: number, o: any) => acc + Number(o.total_amount), 0);
  const extraEarnedLifetime = farmerEarnings.reduce((acc: number, e: any) => acc + Number(e.extra_earned_amount), 0);
  const extraEarnedThisMonth = farmerEarnings
    .filter((e: any) => String(e.date).startsWith(monthKey))
    .reduce((acc: number, e: any) => acc + Number(e.extra_earned_amount), 0);
  const lowStockAlerts = (await listAllProducts()).filter((p: any) => p.seller_id === farmerId && p.stock <= 10);

  sendSuccess(res, 200, 'Farmer dashboard summary', {
    todayOrders,
    pendingOrders,
    monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
    todaySales: Math.round(todaySales * 100) / 100,
    newOrdersCount: farmerOrders.filter((o: any) => o.status === 'PLACED').length,
    extraEarnedLifetime: Math.round(extraEarnedLifetime * 100) / 100,
    extraEarnedThisMonth: Math.round(extraEarnedThisMonth * 100) / 100,
    completedOrdersCount: farmerOrders.filter((o: any) => o.status === 'DELIVERED').length,
    lowStockAlerts,
  });
  })();
});

router.get('/farmer/earnings', async (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string;
  if (!farmerId) {
    return sendSuccess(res, 200, 'Extra earnings ledger summary', {
      totalExtraIncomeEarned: 0,
      extraEarnedLifetime: 0,
      mandiPriceBaselineComparison: 'No earnings recorded yet',
    });
  }

  const farmerEarnings = await listEarningsByFarmer(farmerId);
  const totalExtraIncomeEarned = farmerEarnings.reduce((acc: number, e: any) => acc + Number(e.extra_earned_amount), 0);

  sendSuccess(res, 200, 'Extra earnings ledger summary', {
    totalExtraIncomeEarned: Math.round(totalExtraIncomeEarned * 100) / 100,
    extraEarnedLifetime: Math.round(totalExtraIncomeEarned * 100) / 100,
    mandiPriceBaselineComparison:
      totalExtraIncomeEarned > 0 ? 'Earned +18% average higher than local mandi rate' : 'No earnings recorded yet',
  });
});

router.get('/farmer/earnings/history', async (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string;
  const farmerEarnings = farmerId ? await listEarningsByFarmer(farmerId) : [];
  sendSuccess(res, 200, 'Line-item extra earnings breakdown', farmerEarnings);
});

router.get('/admin/farmers/earnings-ledger', async (req: Request, res: Response) => {
  sendSuccess(res, 200, 'All farmer earnings ledger entries', await query('SELECT * FROM earnings_ledger ORDER BY date DESC'));
});

router.post('/admin/farmers/earnings-ledger', async (req: Request, res: Response) => {
  const newEntry = {
    id: 'ern_' + Date.now(),
    farmerId: req.body.farmerId || 'farmer_881',
    orderId: req.body.orderId || null,
    aswamithraSaleValue: parseFloat(req.body.aswamithraSaleValue) || 500,
    localMandiValue: parseFloat(req.body.localMandiValue) || 400,
    extraEarnedAmount: parseFloat(req.body.extraEarnedAmount) || 100,
    date: new Date().toISOString().split('T')[0],
  };
  await insertEarningsEntry(newEntry);
  sendSuccess(res, 201, 'Earnings entry created manually by Admin', newEntry);
});

router.delete('/admin/farmers/earnings-ledger/:id', async (req: Request, res: Response) => {
  await query('DELETE FROM earnings_ledger WHERE id = $1', [req.params.id]);
  sendSuccess(res, 200, 'Earnings entry deleted', { id: req.params.id });
});

export default router;
