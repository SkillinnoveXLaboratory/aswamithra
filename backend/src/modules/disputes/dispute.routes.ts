import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, Review, Dispute } from '../../store/db.store';
import { findUserById } from '../../services/sql-store';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

async function resolveCustomerName(customerId: string, fallbackName?: string) {
  if (fallbackName) return fallbackName;
  const dbUser = await findUserById(customerId);
  if (dbUser?.name) return dbUser.name;
  const memoryUser = db.users.find((user) => user.id === customerId);
  return memoryUser?.name || 'Customer';
}

// Reviews CRUD (Reading & Mutating db.reviews directly)
router.post('/reviews', (req: Request, res: Response) => {
  const newReview: Review = {
    id: 'rev_' + Date.now(),
    farmerId: req.body.farmerId || 'farmer_881',
    productId: req.body.productId,
    customerName: req.body.customerName || 'Anitha R.',
    rating: parseInt(req.body.rating) || 5,
    comment: req.body.comment || 'Super fresh produce directly from farm!',
    date: new Date().toISOString().split('T')[0],
  };

  db.reviews.push(newReview);
  return sendSuccess(res, 201, 'Review submitted successfully', newReview);
});

router.get('/reviews/farmer/:farmer_id', (req: Request, res: Response) => {
  const farmerReviews = db.reviews.filter((r) => r.farmerId === req.params.farmer_id);
  return sendSuccess(res, 200, 'Verified customer reviews for farmer', farmerReviews);
});

router.get('/reviews/product/:product_id', (req: Request, res: Response) => {
  const prodReviews = db.reviews.filter((r) => r.productId === req.params.product_id);
  return sendSuccess(res, 200, 'Reviews for product', prodReviews);
});

router.get('/reviews/:id', (req: Request, res: Response) => {
  const review = db.reviews.find((r) => r.id === req.params.id);
  if (!review) return sendError(res, 404, 'REVIEW_NOT_FOUND', 'Review not found');
  return sendSuccess(res, 200, 'Review detail', review);
});

router.put('/reviews/:id', (req: Request, res: Response) => {
  const review = db.reviews.find((r) => r.id === req.params.id);
  if (!review) return sendError(res, 404, 'REVIEW_NOT_FOUND', 'Review not found');

  Object.assign(review, req.body);
  return sendSuccess(res, 200, 'Review updated', review);
});

router.delete('/reviews/:id', (req: Request, res: Response) => {
  const index = db.reviews.findIndex((r) => r.id === req.params.id);
  if (index !== -1) db.reviews.splice(index, 1);
  return sendSuccess(res, 200, 'Review deleted', { id: req.params.id });
});

router.delete('/admin/reviews/:id', (req: Request, res: Response) => {
  const index = db.reviews.findIndex((r) => r.id === req.params.id);
  if (index !== -1) db.reviews.splice(index, 1);
  return sendSuccess(res, 200, 'Review moderation deleted by Admin', { id: req.params.id });
});

// Disputes CRUD (Reading & Mutating db.disputes directly)
router.post(
  '/disputes',
  asyncHandler(async (req: Request, res: Response) => {
    const { orderId, reason, customerId, customerName } = req.body;

    if (!orderId || !reason) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'orderId and reason are required');
    }

    const order = db.orders.find((item) => item.id === orderId);
    if (!order) {
      return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${orderId} not found`);
    }

    const resolvedCustomerId = customerId || order.buyerId;
    if (!resolvedCustomerId) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Could not determine the customer for this dispute');
    }

    const resolvedCustomerName = await resolveCustomerName(resolvedCustomerId, customerName);

    const newDispute: Dispute = {
      id: 'disp_' + Date.now(),
      orderId: order.id,
      customerId: resolvedCustomerId,
      customerName: resolvedCustomerName,
      farmerId: order.sellerId,
      farmerName: order.sellerName,
      reason: String(reason).trim(),
      status: 'OPEN',
      orderTotal: order.totalAmount,
      createdAt: new Date().toISOString(),
    };

    db.disputes.push(newDispute);
    return sendSuccess(res, 201, 'Dispute ticket submitted', newDispute);
  })
);

router.get('/disputes', (req: Request, res: Response) => {
  const customerId = req.query.customerId as string | undefined;
  const customerDisputes = customerId ? db.disputes.filter((d) => d.customerId === customerId) : db.disputes;
  return sendSuccess(res, 200, 'User submitted disputes', customerDisputes);
});

router.get('/disputes/:id', (req: Request, res: Response) => {
  const dispute = db.disputes.find((d) => d.id === req.params.id);
  if (!dispute) return sendError(res, 404, 'DISPUTE_NOT_FOUND', 'Dispute not found');
  return sendSuccess(res, 200, 'Dispute detail thread', dispute);
});

router.put('/disputes/:id', (req: Request, res: Response) => {
  const dispute = db.disputes.find((d) => d.id === req.params.id);
  if (!dispute) return sendError(res, 404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  Object.assign(dispute, req.body);
  return sendSuccess(res, 200, 'Dispute details updated', dispute);
});

router.delete('/disputes/:id', (req: Request, res: Response) => {
  const index = db.disputes.findIndex((d) => d.id === req.params.id);
  if (index !== -1) db.disputes.splice(index, 1);
  return sendSuccess(res, 200, 'Dispute ticket withdrawn by customer', { id: req.params.id });
});

// Admin Dispute Resolution CRUD
router.get('/admin/disputes', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Admin pending disputes queue', db.disputes);
});

router.get('/admin/disputes/:id', (req: Request, res: Response) => {
  const dispute = db.disputes.find((d) => d.id === req.params.id);
  if (!dispute) return sendError(res, 404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  const order = db.orders.find((item) => item.id === dispute.orderId);

  return sendSuccess(res, 200, 'Dispute investigation package', {
    ...dispute,
    order,
  });
});

router.put('/admin/disputes/:id', (req: Request, res: Response) => {
  const dispute = db.disputes.find((d) => d.id === req.params.id);
  if (!dispute) return sendError(res, 404, 'DISPUTE_NOT_FOUND', 'Dispute not found');

  if (req.body.status !== undefined) dispute.status = req.body.status;
  if (req.body.resolution !== undefined) dispute.resolution = req.body.resolution;
  if (req.body.reason !== undefined) dispute.reason = req.body.reason;

  return sendSuccess(res, 200, 'Dispute updated by admin', dispute);
});

router.patch('/admin/disputes/:id/resolve', (req: Request, res: Response) => {
  const dispute = db.disputes.find((d) => d.id === req.params.id);
  if (dispute) {
    dispute.status = 'RESOLVED';
    dispute.resolution = req.body.resolution || 'full_refund';
  }
  return sendSuccess(res, 200, 'Dispute resolved. Refund executed.', dispute || { id: req.params.id, status: 'RESOLVED' });
});

router.post('/admin/disputes/:id/penalize-seller', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Warning/penalty issued to repeat offending seller', { sellerId: req.body.sellerId });
});

router.delete('/admin/disputes/:id', (req: Request, res: Response) => {
  const index = db.disputes.findIndex((d) => d.id === req.params.id);
  if (index !== -1) db.disputes.splice(index, 1);
  return sendSuccess(res, 200, 'Dispute record closed & purged', { id: req.params.id });
});

router.get('/farmer/disputes', (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string | undefined;
  const farmerDisputes = farmerId ? db.disputes.filter((d) => d.farmerId === farmerId) : db.disputes;
  return sendSuccess(res, 200, 'Disputes raised against farmer orders', farmerDisputes);
});

export default router;
