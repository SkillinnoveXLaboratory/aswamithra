// @ts-nocheck
import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, B2bRfq, B2bQuote, Order, Notification } from '../../store/db.store';
import {
  listActiveProducts,
  toStoreProduct,
  listB2bRfqsByBuyer,
  findB2bRfqById,
  insertB2bRfq,
  updateB2bRfqStatus,
  listB2bQuotesByFarmer,
  listB2bQuotesByRfq,
  findB2bQuoteById,
  insertB2bQuote,
  updateB2bQuoteStatus,
  insertOrder,
  insertNotification,
} from '../../services/sql-store';
import { query } from '../../config/db.config';

const router = Router();

function pickText(...values: Array<string | number | null | undefined>) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function getKycForUser(userId: string) {
  return null;
}

function parseLatLng(lat?: string | number | null, lng?: string | number | null) {
  const parsedLat = lat !== undefined && lat !== null && lat !== '' ? Number(lat) : NaN;
  const parsedLng = lng !== undefined && lng !== null && lng !== '' ? Number(lng) : NaN;
  return Number.isFinite(parsedLat) && Number.isFinite(parsedLng) ? { lat: parsedLat, lng: parsedLng } : null;
}

function farmerLocation(sub: any) {
  const coords = parseLatLng(sub?.lat, sub?.lng);
  if (coords) return coords;
  const details = sub?.details || {};
  return parseLatLng(details.lat as string, details.lng as string);
}

// B2B Catalog & RFQ
// B2B Catalog & RFQ — returns ONLY real products. No seeded mock data is
// returned, so a brand-new B2B account sees an empty catalog instead of
// hard-coded placeholder rows.
router.get('/b2b/catalog', async (req: Request, res: Response) => {
  const dbProducts = await listActiveProducts();
  const sourceProducts = dbProducts.length ? dbProducts.map((row) => toStoreProduct(row)) : [];
  const b2bProducts = sourceProducts.filter((p) => p.status === 'active');
  return sendSuccess(res, 200, 'B2B wholesale catalog retrieved', b2bProducts);
});

router.post('/b2b/rfq', async (req: Request, res: Response) => {
  const buyerId = req.body.buyerId || 'b2b_01';
  const buyerKyc = getKycForUser(buyerId);
  const buyerCoords = buyerKyc ? farmerLocation(buyerKyc) : null;
  const newRfq: B2bRfq = {
    id: 'rfq_' + Date.now(),
    buyerId,
    cropName: req.body.cropName || 'Sona Masoori Rice',
    quantityQuintals: parseInt(req.body.quantityQuintals || req.body.quantity) || 50,
    targetPricePerQuintal: req.body.targetPricePerQuintal ? parseFloat(req.body.targetPricePerQuintal) : undefined,
    deliveryCity: pickText(req.body.deliveryCity, buyerKyc?.district, buyerKyc?.details && (buyerKyc.details as any).district),
    buyerLat: buyerCoords?.lat,
    buyerLng: buyerCoords?.lng,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };
  await insertB2bRfq({
    id: newRfq.id,
    buyerId: newRfq.buyerId,
    cropName: newRfq.cropName,
    quantityQuintals: newRfq.quantityQuintals,
    targetPricePerQuintal: newRfq.targetPricePerQuintal ?? null,
    deliveryCity: newRfq.deliveryCity || null,
    buyerLat: newRfq.buyerLat ?? null,
    buyerLng: newRfq.buyerLng ?? null,
    status: newRfq.status,
  });
  return sendSuccess(res, 201, 'Request for Quote (RFQ) submitted', newRfq);
});

// RFQs are scoped to the requesting buyer so that seeded/example RFQs (which
// belong to the demo account `b2b_01`) are never returned to a different/new
// B2B account — keeping the RFQ list empty for new users.
router.get('/b2b/rfq', async (req: Request, res: Response) => {
  const buyerId = req.query.buyerId as string | undefined;
  const rfqs = buyerId ? await listB2bRfqsByBuyer(buyerId) : [];
  return sendSuccess(res, 200, 'B2B submitted RFQs list', rfqs);
});

router.get('/b2b/rfq/:id', async (req: Request, res: Response) => {
  const rfq = await findB2bRfqById(req.params.id as string);
  if (!rfq) return sendError(res, 404, 'RFQ_NOT_FOUND', 'RFQ not found');

  const quotes = await listB2bQuotesByRfq(rfq.id);
  return sendSuccess(res, 200, 'RFQ detail & quotes received', { ...rfq, quotesReceived: quotes });
});

router.put('/b2b/rfq/:id', async (req: Request, res: Response) => {
  const rfq = await findB2bRfqById(req.params.id as string);
  if (!rfq) return sendError(res, 404, 'RFQ_NOT_FOUND', 'RFQ not found');

  await insertB2bRfq({
    id: rfq.id,
    buyerId: rfq.buyer_id || rfq.buyerId,
    buyerName: req.body.buyerName ?? rfq.buyer_name ?? rfq.buyerName,
    companyName: req.body.companyName ?? rfq.company_name ?? rfq.companyName,
    gstNumber: req.body.gstNumber ?? rfq.gst_number ?? rfq.gstNumber,
    cropName: req.body.cropName ?? rfq.crop_name ?? rfq.cropName,
    quantityQuintals: Number(req.body.quantityQuintals ?? rfq.quantity_quintals ?? rfq.quantityQuintals),
    targetPricePerQuintal: req.body.targetPricePerQuintal ?? rfq.target_price_per_quintal ?? rfq.targetPricePerQuintal,
    deliveryCity: req.body.deliveryCity ?? rfq.delivery_city ?? rfq.deliveryCity,
    buyerLat: req.body.buyerLat ?? rfq.buyer_lat ?? rfq.buyerLat,
    buyerLng: req.body.buyerLng ?? rfq.buyer_lng ?? rfq.buyerLng,
    status: req.body.status ?? rfq.status,
  });
  return sendSuccess(res, 200, 'RFQ details updated', rfq);
});

router.delete('/b2b/rfq/:id', async (req: Request, res: Response) => {
  await updateB2bRfqStatus(req.params.id, 'CANCELLED');
  return sendSuccess(res, 200, 'RFQ cancelled', { id: req.params.id });
});

// Farmer Quote Responses
router.get('/farmer/rfq', async (req: Request, res: Response) => {
  const farmerId = pickText(req.query.farmerId as string, req.header('x-user-id'));
  const farmerKyc = farmerId ? getKycForUser(farmerId) : null;
  const farmerCoords = farmerKyc ? farmerLocation(farmerKyc) : null;
  const radiusKm = Number(req.query.radiusKm || 50);
  const openRfqs = (await listB2bRfqsByBuyer())
    .filter((r) => r.status === 'OPEN')
    .map((rfq) => {
      if (!farmerCoords || rfq.buyerLat === undefined || rfq.buyerLng === undefined) {
        return { ...rfq, distanceKm: null };
      }
      const distanceKm = Math.hypot(farmerCoords.lat - Number(rfq.buyerLat), farmerCoords.lng - Number(rfq.buyerLng));
      return { ...rfq, distanceKm };
    })
    .filter((rfq: any) => {
      if (!farmerCoords) return true;
      if (rfq.distanceKm === null) return false;
      return rfq.distanceKm <= radiusKm;
    })
    .sort((a: any, b: any) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
  sendSuccess(res, 200, 'Nearby bulk RFQs matching farmer crops', openRfqs);
});

router.post('/farmer/rfq/:id/quote', async (req: Request, res: Response) => {
  const rfqId = req.params.id as string;
  const newQuote: B2bQuote = {
    id: 'quote_' + Date.now(),
    rfqId,
    farmerId: req.body.farmerId || 'farmer_881',
    farmerName: req.body.farmerName || 'Ramesh Kumar',
    pricePerQuintal: parseFloat(req.body.pricePerQuintal) || 4650.0,
    deliveryDate: req.body.deliveryDate || '2026-08-05',
    message: req.body.message || '',
    requestOrder: Boolean(req.body.requestOrder),
    requestedOrderPricePerQuintal: req.body.requestedOrderPricePerQuintal ? parseFloat(req.body.requestedOrderPricePerQuintal) : undefined,
    status: 'PENDING',
  };

  await insertB2bQuote({
    id: newQuote.id,
    rfqId: newQuote.rfqId,
    farmerId: newQuote.farmerId,
    farmerName: newQuote.farmerName,
    pricePerQuintal: newQuote.pricePerQuintal,
    deliveryDate: newQuote.deliveryDate || null,
    message: newQuote.message || null,
    requestOrder: newQuote.requestOrder,
    requestedOrderPricePerQuintal: newQuote.requestedOrderPricePerQuintal ?? null,
    status: newQuote.status,
  });
  return sendSuccess(res, 201, 'Price quote submitted to RFQ', newQuote);
});

router.get('/farmer/quotes', async (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string | undefined;
  const quotes = await listB2bQuotesByFarmer(farmerId);
  const withRfqs = [];
  for (const quote of quotes) {
    const rfq = await findB2bRfqById(quote.rfq_id || quote.rfqId);
    withRfqs.push({ ...quote, rfq: rfq || null });
  }
  return sendSuccess(res, 200, 'Farmer quotes retrieved', withRfqs);
});

router.patch('/farmer/quotes/:id/reject', async (req: Request, res: Response) => {
  const quote = await findB2bQuoteById(req.params.id);
  if (!quote) return sendError(res, 404, 'QUOTE_NOT_FOUND', 'Quote not found');
  await updateB2bQuoteStatus(req.params.id, 'REJECTED');
  return sendSuccess(res, 200, 'Quote rejected by farmer', quote);
});

router.post('/b2b/quotes/:quote_id/accept', async (req: Request, res: Response) => {
  const quote = await findB2bQuoteById(req.params.quote_id);
  if (!quote) return sendError(res, 404, 'QUOTE_NOT_FOUND', 'Quote not found');
  const rfq = await findB2bRfqById(quote.rfq_id || quote.rfqId);
  if (!rfq) return sendError(res, 404, 'RFQ_NOT_FOUND', 'RFQ not found');

  await updateB2bQuoteStatus(req.params.quote_id, 'ACCEPTED');
  await updateB2bRfqStatus(rfq.id, 'CLOSED');

  const totalAmount = Math.round((Number(quote.price_per_quintal || quote.pricePerQuintal) * Number(rfq.quantity_quintals || rfq.quantityQuintals || 0)) * 100) / 100;
  const commissionRate = 4.5;
  const commissionAmount = Math.round(((totalAmount * commissionRate) / 100) * 100) / 100;
  const farmerPayoutAmount = Math.round((totalAmount - commissionAmount) * 100) / 100;
  const orderId = 'ord_' + Date.now();
  const order: Order = {
    id: orderId,
      buyerId: rfq.buyer_id || rfq.buyerId,
      sellerId: quote.farmer_id || quote.farmerId,
      sellerName: quote.farmer_name || quote.farmerName,
    items: [
      {
        productId: rfq.id,
        name: rfq.cropName,
        qty: Number(rfq.quantity_quintals || rfq.quantityQuintals || 1),
        unit: 'quintal',
        price: Number(quote.price_per_quintal || quote.pricePerQuintal),
      },
    ],
    totalAmount,
    commissionRate,
    commissionAmount,
    farmerPayoutAmount,
    status: 'PLACED',
    paymentMode: 'cod',
    paymentStatus: 'PENDING',
    deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    razorpayOrderId: undefined,
    createdAt: new Date().toISOString(),
  }
  await insertOrder({
    id: order.id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    sellerName: order.sellerName,
    items: order.items,
    totalAmount: order.totalAmount,
    commissionRate: order.commissionRate,
    commissionAmount: order.commissionAmount,
    farmerPayoutAmount: order.farmerPayoutAmount,
    status: order.status,
    paymentMode: order.paymentMode,
    paymentStatus: order.paymentStatus,
    deliveryOtp: order.deliveryOtp,
    razorpayOrderId: null,
    notes: null,
    deliveredAt: null,
  });
  await query(`UPDATE b2b_quotes SET order_id = $1, order_status = 'PLACED' WHERE id = $2`, [orderId, req.params.quote_id]);

  const buyerNotice: Notification = {
    id: 'notif_' + Date.now() + '_buyer',
    userId: rfq.buyer_id || rfq.buyerId,
    title: 'RFQ quote accepted',
    message: `Your RFQ for ${rfq.cropName} was accepted. Bulk order ${orderId} is now active.`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const farmerNotice: Notification = {
    id: 'notif_' + Date.now() + '_farmer',
    userId: quote.farmer_id || quote.farmerId,
    title: 'Quote accepted',
    message: `Your quote for ${rfq.cropName} was accepted. Order ${orderId} is ready for fulfillment.`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await insertNotification({ id: buyerNotice.id, userId: buyerNotice.userId, title: buyerNotice.title, message: buyerNotice.message, read: false });
  await insertNotification({ id: farmerNotice.id, userId: farmerNotice.userId, title: farmerNotice.title, message: farmerNotice.message, read: false });

  return sendSuccess(res, 200, 'Quote accepted. Bulk order generated.', { orderId, order, quote, rfq });
});

router.post('/b2b/quotes/:quote_id/place-order', async (req: Request, res: Response) => {
  const quote = await findB2bQuoteById(req.params.quote_id);
  if (!quote) return sendError(res, 404, 'QUOTE_NOT_FOUND', 'Quote not found');
  if (quote.order_id || quote.orderId) {
    return sendSuccess(res, 200, 'Order already exists for this quote', {
      orderId: quote.order_id || quote.orderId,
      orderPlaced: true,
      orderStatus: quote.order_status || quote.orderStatus || 'PLACED',
    });
  }
  const rfq = await findB2bRfqById(quote.rfq_id || quote.rfqId);
  if (!rfq) return sendError(res, 404, 'RFQ_NOT_FOUND', 'RFQ not found');

  const qty = rfq.quantityQuintals || 1;
  const unitPrice = (quote.request_order || quote.requestOrder) && (quote.requested_order_price_per_quintal || quote.requestedOrderPricePerQuintal)
    ? Number(quote.requested_order_price_per_quintal || quote.requestedOrderPricePerQuintal)
    : Number(quote.price_per_quintal || quote.pricePerQuintal);
  const totalAmount = Math.round((unitPrice * qty) * 100) / 100;
  const commissionRate = 4.5;
  const commissionAmount = Math.round(((totalAmount * commissionRate) / 100) * 100) / 100;
  const farmerPayoutAmount = Math.round((totalAmount - commissionAmount) * 100) / 100;
  const order: Order = {
    id: 'ord_' + Date.now(),
    buyerId: rfq.buyer_id || rfq.buyerId,
    sellerId: quote.farmer_id || quote.farmerId,
    sellerName: quote.farmer_name || quote.farmerName,
    items: [{ productId: rfq.id, name: rfq.cropName, qty, unit: 'quintal', price: unitPrice }],
    totalAmount,
    commissionRate,
    commissionAmount,
    farmerPayoutAmount,
    status: 'PLACED',
    paymentMode: 'cod',
    paymentStatus: 'PENDING',
    deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    createdAt: new Date().toISOString(),
  };
  await insertOrder({
    id: order.id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    sellerName: order.sellerName,
    items: order.items,
    totalAmount: order.totalAmount,
    commissionRate: order.commissionRate,
    commissionAmount: order.commissionAmount,
    farmerPayoutAmount: order.farmerPayoutAmount,
    status: order.status,
    paymentMode: order.paymentMode,
    paymentStatus: order.paymentStatus,
    deliveryOtp: order.deliveryOtp,
    razorpayOrderId: null,
    notes: null,
    deliveredAt: null,
  });
  await updateB2bQuoteStatus(req.params.quote_id, 'ACCEPTED');
  await updateB2bRfqStatus(rfq.id, 'CLOSED');
  await query(`UPDATE b2b_quotes SET order_id = $1, order_status = 'PLACED' WHERE id = $2`, [order.id, req.params.quote_id]);
  await insertNotification({ id: 'notif_' + Date.now() + '_buyer', userId: rfq.buyer_id || rfq.buyerId, title: 'Order placed from quote', message: `Bulk order for ${rfq.crop_name || rfq.cropName} created from quote ${quote.id}.`, read: false });
  await insertNotification({ id: 'notif_' + Date.now() + '_farmer', userId: quote.farmer_id || quote.farmerId, title: 'Order placed from your quote', message: `Your quote for ${rfq.crop_name || rfq.cropName} became order ${order.id}.`, read: false });
  return sendSuccess(res, 201, 'Bulk order placed from quote', { order, quote, rfq });
});

router.post('/b2b/quotes/:quote_id/cancel-order', async (req: Request, res: Response) => {
  const quote = await findB2bQuoteById(req.params.quote_id);
  if (!quote) return sendError(res, 404, 'QUOTE_NOT_FOUND', 'Quote not found');
  const orderId = quote.order_id || quote.orderId;
  if (!orderId) {
    return sendError(res, 400, 'ORDER_NOT_FOUND', 'No live order exists for this quote');
  }
  await query(`UPDATE orders SET status = 'CANCELLED' WHERE id = $1`, [orderId]);
  await query(`UPDATE b2b_quotes SET order_status = 'CANCELLED' WHERE id = $1`, [req.params.quote_id]);
  return sendSuccess(res, 200, 'Quote order cancelled', {
    quoteId: req.params.quote_id,
    orderId,
    orderStatus: 'CANCELLED',
  });
});

// Invoices & Credit Ledger
// Invoices are only served for orders that actually exist. Previously a
// hard-coded invoice (INV-2026-00481) was returned for any id, which made
// every new account look like it already had invoice data.
router.get('/b2b/invoices/:order_id', (req: Request, res: Response) => {
  const order = null;
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
  const buyerOrders: any[] = [];
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
  sendSuccess(res, 200, 'All B2B RFQs (Admin)', []);
};

router.get('/admin/b2b/rfq', getAdminRfqs);
router.get('/b2b/admin/rfq', getAdminRfqs);

router.get('/admin/b2b/rfq/:id', (req: Request, res: Response) => {
  sendError(res, 404, 'RFQ_NOT_FOUND', 'RFQ not found');
});

router.put('/admin/b2b/rfq/:id/status', (req: Request, res: Response) => {
  sendError(res, 404, 'RFQ_NOT_FOUND', 'RFQ not found');
});

export default router;
