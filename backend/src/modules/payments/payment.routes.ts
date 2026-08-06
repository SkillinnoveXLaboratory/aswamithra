import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, Payment, Payout } from '../../store/db.store';

const router = Router();

// Create Razorpay Gateway Order
router.post('/payments/create-razorpay-order', (req: Request, res: Response) => {
  const { amount } = req.body;
  const numAmount = parseFloat(amount) || 540.0;
  const razorpayOrderId = 'order_' + Math.random().toString(36).substring(7);

  sendSuccess(res, 200, 'Razorpay order created', {
    razorpayOrderId,
    amount: numAmount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  });
});

// Verify Payment & Instant Razorpay Route Split Engine
router.post('/payments/verify', (req: Request, res: Response) => {
  const { razorpayPaymentId, orderId } = req.body;
  const payId = razorpayPaymentId || 'pay_' + Math.random().toString(36).substring(7);

  const targetOrder = db.orders.find((o) => o.id === orderId) || db.orders[0];
  const orderAmount = targetOrder ? targetOrder.totalAmount : 540.0;

  const commissionRate = db.getCommissionRate(orderAmount);
  const platformCommission = Math.round(((orderAmount * commissionRate) / 100) * 100) / 100;
  const farmerShare = Math.round((orderAmount - platformCommission) * 100) / 100;

  const paymentRecord: Payment = {
    id: payId,
    orderId: targetOrder ? targetOrder.id : 'ord_889210',
    amount: orderAmount,
    razorpayPaymentId: payId,
    farmerShare,
    platformCommission,
    status: 'PAID',
    createdAt: new Date().toISOString(),
  };

  db.payments.push(paymentRecord);

  if (targetOrder) {
    targetOrder.paymentStatus = 'PAID';
  }

  sendSuccess(res, 200, 'Razorpay payment verified. Route split calculated.', {
    paymentId: payId,
    orderId: targetOrder ? targetOrder.id : 'ord_889210',
    splitDetails: {
      totalPaid: orderAmount,
      farmerAmount: farmerShare,
      platformCommissionAmount: platformCommission,
      commissionRatePercent: commissionRate,
    },
  });
});

router.get('/payments/history', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Customer payment history', db.payments);
});

// Farmer Payouts
router.get('/farmer/payouts', (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string;
  const farmerPayouts = farmerId ? db.payouts.filter((p) => p.farmerId === farmerId) : [];
  sendSuccess(res, 200, 'Farmer weekly payout settlements', farmerPayouts);
});

router.get('/farmer/payouts/:id', (req: Request, res: Response) => {
  const payout = db.payouts.find((p) => p.id === req.params.id);
  if (!payout) return sendError(res, 404, 'PAYOUT_NOT_FOUND', 'Payout detail not found');
  sendSuccess(res, 200, 'Payout transaction receipt', payout);
});

// Admin Payments & Payouts Routes
router.get('/admin/payments/transactions', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'All payment transactions (Admin)', db.payments);
});

router.get('/admin/payouts/pending', (req: Request, res: Response) => {
  const pendingPayouts = db.payouts.filter((p) => p.status === 'PENDING');
  sendSuccess(res, 200, 'Pending seller payout settlements', pendingPayouts);
});

router.post('/admin/payouts/process', (req: Request, res: Response) => {
  db.payouts.forEach((p) => (p.status = 'SETTLED'));
  sendSuccess(res, 200, 'Bulk Razorpay Route bank payouts initiated successfully', { processedCount: db.payouts.length });
});

router.post('/admin/payments/refund', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Customer refund initiated successfully', {
    refundId: 'rfnd_' + Date.now(),
    orderId: req.body.orderId || 'ord_889210',
    refundAmount: parseFloat(req.body.amount) || 100.0,
    status: 'PROCESSED',
  });
});

export default router;
