import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, B2bRfq, B2bQuote } from '../../store/db.store';

const router = Router();

// B2B Catalog & RFQ
// B2B Catalog & RFQ — returns ONLY real products. No seeded mock data is
// returned, so a brand-new B2B account sees an empty catalog instead of
// hard-coded placeholder rows.
router.get('/b2b/catalog', (req: Request, res: Response) => {
  const b2bProducts = db.products.filter((p) => p.b2bTierPrice !== undefined || p.unit === 'quintal' || p.unit === 'ton');
  return sendSuccess(res, 200, 'B2B wholesale catalog retrieved', b2bProducts);
});

router.post('/b2b/rfq', (req: Request, res: Response) => {
  const newRfq: B2bRfq = {
    id: 'rfq_' + Date.now(),
    buyerId: req.body.buyerId || 'b2b_01',
    cropName: req.body.cropName || 'Sona Masoori Rice',
    quantityQuintals: parseInt(req.body.quantityQuintals || req.body.quantity) || 50,
    targetPricePerQuintal: req.body.targetPricePerQuintal ? parseFloat(req.body.targetPricePerQuintal) : undefined,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };

  db.b2bRfqs.push(newRfq);
  return sendSuccess(res, 201, 'Request for Quote (RFQ) submitted', newRfq);
});

// RFQs are scoped to the requesting buyer so that seeded/example RFQs (which
// belong to the demo account `b2b_01`) are never returned to a different/new
// B2B account — keeping the RFQ list empty for new users.
router.get('/b2b/rfq', (req: Request, res: Response) => {
  const buyerId = req.query.buyerId as string | undefined;
  const rfqs = buyerId ? db.b2bRfqs.filter((r) => r.buyerId === buyerId) : [];
  return sendSuccess(res, 200, 'B2B submitted RFQs list', rfqs);
});

router.get('/b2b/rfq/:id', (req: Request, res: Response) => {
  const rfqId = req.params.id as string;
  const rfq = db.b2bRfqs.find((r) => r.id === rfqId);
  if (!rfq) return sendError(res, 404, 'RFQ_NOT_FOUND', 'RFQ not found');

  const quotes = db.b2bQuotes.filter((q) => q.rfqId === rfq.id);
  return sendSuccess(res, 200, 'RFQ detail & quotes received', { ...rfq, quotesReceived: quotes });
});

router.put('/b2b/rfq/:id', (req: Request, res: Response) => {
  const rfqId = req.params.id as string;
  const rfq = db.b2bRfqs.find((r) => r.id === rfqId);
  if (!rfq) return sendError(res, 404, 'RFQ_NOT_FOUND', 'RFQ not found');

  Object.assign(rfq, req.body);
  return sendSuccess(res, 200, 'RFQ details updated', rfq);
});

router.delete('/b2b/rfq/:id', (req: Request, res: Response) => {
  const rfqId = req.params.id as string;
  const index = db.b2bRfqs.findIndex((r) => r.id === rfqId);
  if (index !== -1) {
    db.b2bRfqs[index].status = 'CANCELLED';
  }
  return sendSuccess(res, 200, 'RFQ cancelled', { id: rfqId });
});

// Farmer Quote Responses
router.get('/farmer/rfq', (req: Request, res: Response) => {
  const openRfqs = db.b2bRfqs.filter((r) => r.status === 'OPEN');
  sendSuccess(res, 200, 'Nearby bulk RFQs matching farmer crops', openRfqs);
});

router.post('/farmer/rfq/:id/quote', (req: Request, res: Response) => {
  const rfqId = req.params.id as string;
  const newQuote: B2bQuote = {
    id: 'quote_' + Date.now(),
    rfqId,
    farmerId: req.body.farmerId || 'farmer_881',
    farmerName: req.body.farmerName || 'Ramesh Kumar',
    pricePerQuintal: parseFloat(req.body.pricePerQuintal) || 4650.0,
    deliveryDate: req.body.deliveryDate || '2026-08-05',
    status: 'PENDING',
  };

  db.b2bQuotes.push(newQuote);
  return sendSuccess(res, 201, 'Price quote submitted to RFQ', newQuote);
});

router.post('/b2b/quotes/:quote_id/accept', (req: Request, res: Response) => {
  const quoteId = req.params.quote_id as string;
  const quote = db.b2bQuotes.find((q) => q.id === quoteId);
  if (quote) {
    quote.status = 'ACCEPTED';
    const rfq = db.b2bRfqs.find((r) => r.id === quote.rfqId);
    if (rfq) rfq.status = 'CLOSED';
  }
  return sendSuccess(res, 200, 'Quote accepted. Bulk order generated.', { orderId: 'b2b_ord_' + Date.now() });
});

// Invoices & Credit Ledger
// Invoices are only served for orders that actually exist. Previously a
// hard-coded invoice (INV-2026-00481) was returned for any id, which made
// every new account look like it already had invoice data.
router.get('/b2b/invoices/:order_id', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.order_id);
  if (!order) {
    return sendError(res, 404, 'INVOICE_NOT_FOUND', 'No invoice found for this order');
  }
  return sendSuccess(res, 200, 'GST tax invoice details retrieved', {
    orderId: order.id,
    buyerId: order.buyerId,
    invoiceNumber: `INV-${order.id}`,
    gstinBuyer: (order as any).buyerGstin || '',
    totalAmount: order.totalAmount,
    downloadUrl: `https://storage.aswamithra.in/invoices/${order.id}.pdf`,
  });
});

// Credit ledger is computed from the buyer's own orders. No seeded credit is
// returned, so a new B2B account starts with a zero balance.
router.get('/b2b/credit-ledger', (req: Request, res: Response) => {
  const buyerId = req.query.buyerId as string | undefined;
  const buyerOrders = buyerId ? db.orders.filter((o) => o.buyerId === buyerId) : [];
  const utilized = buyerOrders
    .filter((o) => o.paymentStatus !== 'PAID')
    .reduce((sum, o) => sum + (o.farmerPayoutAmount || o.totalAmount || 0), 0);
  const rounded = Math.round(utilized * 100) / 100;
  return sendSuccess(res, 200, 'B2B 15-day trade credit ledger balance', {
    totalApprovedCreditLimit: 0,
    utilizedCreditAmount: rounded,
    availableCreditAmount: 0,
    nextPaymentDueDate: null,
  });
});

// Admin B2B Routes (Supporting both /admin/b2b/rfq and /b2b/admin/rfq)
const getAdminRfqs = (req: Request, res: Response) => {
  sendSuccess(res, 200, 'All B2B RFQs (Admin)', db.b2bRfqs);
};

router.get('/admin/b2b/rfq', getAdminRfqs);
router.get('/b2b/admin/rfq', getAdminRfqs);

router.get('/admin/b2b/rfq/:id', (req: Request, res: Response) => {
  const rfq = db.b2bRfqs.find((r) => r.id === req.params.id);
  if (!rfq) return sendError(res, 404, 'RFQ_NOT_FOUND', 'RFQ not found');
  sendSuccess(res, 200, 'Admin RFQ details', rfq);
});

router.put('/admin/b2b/rfq/:id/status', (req: Request, res: Response) => {
  const rfq = db.b2bRfqs.find((r) => r.id === req.params.id);
  if (!rfq) return sendError(res, 404, 'RFQ_NOT_FOUND', 'RFQ not found');
  if (req.body.status) rfq.status = req.body.status;
  sendSuccess(res, 200, 'RFQ status updated by Admin', rfq);
});

export default router;
