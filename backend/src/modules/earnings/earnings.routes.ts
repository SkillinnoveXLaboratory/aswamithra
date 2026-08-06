import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { db } from '../../store/db.store';

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
  const farmerId = req.query.farmerId as string;
  if (!farmerId) {
    return sendSuccess(res, 200, 'Farmer dashboard summary', emptyDashboard());
  }

  const farmerOrders = db.orders.filter((o) => o.sellerId === farmerId);
  const farmerEarnings = db.earningsLedger.filter((e) => e.farmerId === farmerId);
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);

  const todayOrders = farmerOrders.filter((o) => o.createdAt.startsWith(todayKey)).length;
  const pendingOrders = farmerOrders.filter((o) => PENDING_ORDER_STATUSES.includes(o.status)).length;
  const monthlyEarnings = farmerOrders
    .filter((o) => o.createdAt.startsWith(monthKey) && o.status === 'DELIVERED')
    .reduce((acc, o) => acc + (o.farmerPayoutAmount || o.totalAmount), 0);
  const todaySales = farmerOrders
    .filter((o) => o.createdAt.startsWith(todayKey))
    .reduce((acc, o) => acc + o.totalAmount, 0);
  const extraEarnedLifetime = farmerEarnings.reduce((acc, e) => acc + e.extraEarnedAmount, 0);
  const extraEarnedThisMonth = farmerEarnings
    .filter((e) => e.date.startsWith(monthKey))
    .reduce((acc, e) => acc + e.extraEarnedAmount, 0);
  const lowStockAlerts = db.products.filter((p) => p.sellerId === farmerId && p.stock <= 10);

  sendSuccess(res, 200, 'Farmer dashboard summary', {
    todayOrders,
    pendingOrders,
    monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
    todaySales: Math.round(todaySales * 100) / 100,
    newOrdersCount: farmerOrders.filter((o) => o.status === 'PLACED').length,
    extraEarnedLifetime: Math.round(extraEarnedLifetime * 100) / 100,
    extraEarnedThisMonth: Math.round(extraEarnedThisMonth * 100) / 100,
    completedOrdersCount: farmerOrders.filter((o) => o.status === 'DELIVERED').length,
    lowStockAlerts,
  });
});

router.get('/farmer/earnings', (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string;
  if (!farmerId) {
    return sendSuccess(res, 200, 'Extra earnings ledger summary', {
      totalExtraIncomeEarned: 0,
      extraEarnedLifetime: 0,
      mandiPriceBaselineComparison: 'No earnings recorded yet',
    });
  }

  const farmerEarnings = db.earningsLedger.filter((e) => e.farmerId === farmerId);
  const totalExtraIncomeEarned = farmerEarnings.reduce((acc, e) => acc + e.extraEarnedAmount, 0);

  sendSuccess(res, 200, 'Extra earnings ledger summary', {
    totalExtraIncomeEarned: Math.round(totalExtraIncomeEarned * 100) / 100,
    extraEarnedLifetime: Math.round(totalExtraIncomeEarned * 100) / 100,
    mandiPriceBaselineComparison:
      totalExtraIncomeEarned > 0 ? 'Earned +18% average higher than local mandi rate' : 'No earnings recorded yet',
  });
});

router.get('/farmer/earnings/history', (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string;
  const farmerEarnings = farmerId ? db.earningsLedger.filter((e) => e.farmerId === farmerId) : [];
  sendSuccess(res, 200, 'Line-item extra earnings breakdown', farmerEarnings);
});

router.get('/admin/farmers/earnings-ledger', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'All farmer earnings ledger entries', db.earningsLedger);
});

router.post('/admin/farmers/earnings-ledger', (req: Request, res: Response) => {
  const newEntry = {
    id: 'ern_' + Date.now(),
    farmerId: req.body.farmerId || 'farmer_881',
    orderId: req.body.orderId || 'ord_000',
    aswamithraSaleValue: parseFloat(req.body.aswamithraSaleValue) || 500,
    localMandiValue: parseFloat(req.body.localMandiValue) || 400,
    extraEarnedAmount: parseFloat(req.body.extraEarnedAmount) || 100,
    date: new Date().toISOString().split('T')[0],
  };
  db.earningsLedger.push(newEntry);
  sendSuccess(res, 201, 'Earnings entry created manually by Admin', newEntry);
});

router.delete('/admin/farmers/earnings-ledger/:id', (req: Request, res: Response) => {
  const index = db.earningsLedger.findIndex((e) => e.id === req.params.id);
  if (index !== -1) db.earningsLedger.splice(index, 1);
  sendSuccess(res, 200, 'Earnings entry deleted', { id: req.params.id });
});

export default router;
