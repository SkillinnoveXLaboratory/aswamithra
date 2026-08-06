import { Router, Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { db } from '../../store/db.store';

const router = Router();

router.get('/customer/savings', (req: Request, res: Response) => {
  const customerId = (req.query.customerId as string) || 'usr_998124';
  const userSavings = db.savingsLedger.filter((s) => s.customerId === customerId);

  const totalSavingsLifetime = userSavings.reduce((acc, s) => acc + s.savedAmount, 0);
  const totalOrdersCount = userSavings.length;
  const averageSavingsPerOrder = totalOrdersCount > 0 ? totalSavingsLifetime / totalOrdersCount : 0;

  sendSuccess(res, 200, 'Customer savings summary', {
    totalSavingsLifetime: Math.round(totalSavingsLifetime * 100) / 100,
    savingsThisMonth: Math.round(totalSavingsLifetime * 100) / 100,
    totalOrdersCount,
    averageSavingsPerOrder: Math.round(averageSavingsPerOrder * 100) / 100,
  });
});

router.get('/customer/savings/history', (req: Request, res: Response) => {
  const customerId = (req.query.customerId as string) || 'usr_998124';
  const userSavings = db.savingsLedger.filter((s) => s.customerId === customerId);
  sendSuccess(res, 200, 'Per-order savings history breakdown', userSavings);
});

router.get('/customer/savings/history/:id', (req: Request, res: Response) => {
  const entry = db.savingsLedger.find((s) => s.id === req.params.id);
  sendSuccess(res, 200, 'Savings ledger entry detail', entry || db.savingsLedger[0]);
});

router.get('/admin/savings/ledger', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'All customer savings ledger entries', db.savingsLedger);
});

router.post('/admin/savings/ledger', (req: Request, res: Response) => {
  const newEntry = {
    id: 'svg_' + Date.now(),
    customerId: req.body.customerId || 'usr_998124',
    orderId: req.body.orderId || 'ord_000',
    marketValue: parseFloat(req.body.marketValue) || 100,
    paidValue: parseFloat(req.body.paidValue) || 80,
    savedAmount: parseFloat(req.body.savedAmount) || 20,
    date: new Date().toISOString().split('T')[0],
  };
  db.savingsLedger.push(newEntry);
  sendSuccess(res, 201, 'Savings entry added manually by Admin', newEntry);
});

router.delete('/admin/savings/ledger/:id', (req: Request, res: Response) => {
  const index = db.savingsLedger.findIndex((s) => s.id === req.params.id);
  if (index !== -1) db.savingsLedger.splice(index, 1);
  sendSuccess(res, 200, 'Savings entry deleted', { id: req.params.id });
});

export default router;
