import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, B2bRfq, B2bQuote } from '../../store/db.store';

const router = Router();

// B2B Catalog & RFQ
router.get('/b2b/catalog', (req: Request, res: Response) => {
  const b2bProducts = db.products.filter((p) => p.b2bTierPrice !== undefined || p.unit === 'quintal' || p.unit === 'ton');
  if (b2bProducts.length === 0) {
    return sendSuccess(res, 200, 'B2B wholesale catalog retrieved', [
      {
        id: 'b2b_prod_01',
        cropName: 'Sona Masoori Rice Raw (Grade A)',
        tierPricePerQuintal: 4800.0,
        tierPricePerTon: 46000.0,
        minOrderQty: 10,
        unit: 'quintal',
        availableStockQuintals: 500,
      },
    ]);
  }
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

router.get('/b2b/rfq', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'B2B submitted RFQs list', db.b2bRfqs);
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
router.get('/b2b/invoices/:order_id', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'GST tax invoice details retrieved', {
    orderId: req.params.order_id,
    invoiceNumber: 'INV-2026-00481',
    gstinBuyer: '37AAAAA0000A1Z5',
    downloadUrl: `https://storage.aswamithra.in/invoices/${req.params.order_id}.pdf`,
  });
});

router.get('/b2b/credit-ledger', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'B2B 15-day trade credit ledger balance', {
    totalApprovedCreditLimit: 500000.0,
    utilizedCreditAmount: 145000.0,
    availableCreditAmount: 355000.0,
    nextPaymentDueDate: '2026-08-10',
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
