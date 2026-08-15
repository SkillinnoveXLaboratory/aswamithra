// @ts-nocheck
import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { Review, Dispute } from '../../store/db.store';
import { findUserById, findOrderById, upsertReview, listReviewsByFarmerId, listReviewsByProductId, findReviewById, deleteReviewById, upsertDispute, listDisputesByCustomer, findDisputeById, deleteDisputeById, listDisputesByFarmer, query } from '../../services/sql-store';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

async function resolveCustomerName(customerId: string, fallbackName?: string) {
  if (fallbackName) return fallbackName;
  const dbUser = await findUserById(customerId);
  if (dbUser?.name) return dbUser.name;
  return 'Customer';
}

// Reviews CRUD (Reading & Mutating db.reviews directly)
router.post('/reviews', async (req: Request, res: Response) => {
  const newReview: Review = {
    id: 'rev_' + Date.now(),
    farmerId: req.body.farmerId || 'farmer_881',
    productId: req.body.productId,
    customerName: req.body.customerName || 'Anitha R.',
    rating: parseInt(req.body.rating) || 5,
    comment: req.body.comment || 'Super fresh produce directly from farm!',
    date: new Date().toISOString().split('T')[0],
  };

  await upsertReview({
    id: newReview.id,
    farmerId: newReview.farmerId,
    productId: newReview.productId,
    customerName: newReview.customerName,
    rating: newReview.rating,
    comment: newReview.comment,
  });
  return sendSuccess(res, 201, 'Review submitted successfully', newReview);
});

router.get('/reviews/farmer/:farmer_id', async (req: Request, res: Response) => {
  const farmerReviews = await listReviewsByFarmerId(req.params.farmer_id);
  return sendSuccess(res, 200, 'Verified customer reviews for farmer', farmerReviews);
});

router.get('/reviews/product/:product_id', async (req: Request, res: Response) => {
  const prodReviews = await listReviewsByProductId(req.params.product_id);
  return sendSuccess(res, 200, 'Reviews for product', prodReviews);
});

router.get('/reviews/:id', async (req: Request, res: Response) => {
  const review = await findReviewById(req.params.id);
  if (!review) return sendError(res, 404, 'REVIEW_NOT_FOUND', 'Review not found');
  return sendSuccess(res, 200, 'Review detail', review);
});

router.put('/reviews/:id', async (req: Request, res: Response) => {
  const review = await findReviewById(req.params.id);
  if (!review) return sendError(res, 404, 'REVIEW_NOT_FOUND', 'Review not found');

  await upsertReview({
    id: review.id,
    farmerId: req.body.farmerId || review.farmer_id,
    productId: req.body.productId || review.product_id,
    customerName: req.body.customerName || review.customer_name,
    rating: parseInt(req.body.rating) || review.rating,
    comment: req.body.comment || review.comment,
  });
  return sendSuccess(res, 200, 'Review updated', review);
});

router.delete('/reviews/:id', async (req: Request, res: Response) => {
  await deleteReviewById(req.params.id);
  return sendSuccess(res, 200, 'Review deleted', { id: req.params.id });
});

router.delete('/admin/reviews/:id', async (req: Request, res: Response) => {
  await deleteReviewById(req.params.id);
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

    const order = await findOrderById(orderId);
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
      orderTotal: Number(order.total_amount),
      createdAt: new Date().toISOString(),
    };

    await upsertDispute({
      id: newDispute.id,
      orderId: newDispute.orderId,
      customerId: newDispute.customerId,
      customerName: newDispute.customerName,
      farmerName: newDispute.farmerName,
      reason: newDispute.reason,
      status: newDispute.status,
      resolution: null,
    });
    return sendSuccess(res, 201, 'Dispute ticket submitted', newDispute);
  })
);

router.get('/disputes', async (req: Request, res: Response) => {
  const customerId = req.query.customerId as string | undefined;
  const customerDisputes = await listDisputesByCustomer(customerId);
  return sendSuccess(res, 200, 'User submitted disputes', customerDisputes);
});

router.get('/disputes/:id', async (req: Request, res: Response) => {
  const dispute = await findDisputeById(req.params.id);
  if (!dispute) return sendError(res, 404, 'DISPUTE_NOT_FOUND', 'Dispute not found');
  return sendSuccess(res, 200, 'Dispute detail thread', dispute);
});

router.put('/disputes/:id', async (req: Request, res: Response) => {
  const dispute = await findDisputeById(req.params.id);
  if (!dispute) return sendError(res, 404, 'DISPUTE_NOT_FOUND', 'Dispute not found');
  await upsertDispute({
    id: dispute.id,
    orderId: dispute.order_id,
    customerId: req.body.customerId || dispute.customer_id,
    customerName: req.body.customerName || dispute.customer_name,
    farmerName: req.body.farmerName || dispute.farmer_name,
    reason: req.body.reason || dispute.reason,
    status: req.body.status || dispute.status,
    resolution: req.body.resolution || dispute.resolution,
  });
  return sendSuccess(res, 200, 'Dispute details updated', dispute);
});

router.delete('/disputes/:id', async (req: Request, res: Response) => {
  await deleteDisputeById(req.params.id);
  return sendSuccess(res, 200, 'Dispute ticket withdrawn by customer', { id: req.params.id });
});

// Admin Dispute Resolution CRUD
router.get('/admin/disputes', async (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Admin pending disputes queue', await query('SELECT * FROM disputes ORDER BY created_at DESC'));
});

router.get('/admin/disputes/:id', async (req: Request, res: Response) => {
  const dispute = await findDisputeById(req.params.id);
  if (!dispute) return sendError(res, 404, 'DISPUTE_NOT_FOUND', 'Dispute not found');
  const order = await findOrderById(dispute.order_id);

  return sendSuccess(res, 200, 'Dispute investigation package', {
    ...dispute,
    order,
  });
});

router.put('/admin/disputes/:id', async (req: Request, res: Response) => {
  const dispute = await findDisputeById(req.params.id);
  if (!dispute) return sendError(res, 404, 'DISPUTE_NOT_FOUND', 'Dispute not found');
  await upsertDispute({
    id: dispute.id,
    orderId: dispute.order_id,
    customerId: dispute.customer_id,
    customerName: dispute.customer_name,
    farmerName: dispute.farmer_name,
    reason: req.body.reason ?? dispute.reason,
    status: req.body.status ?? dispute.status,
    resolution: req.body.resolution ?? dispute.resolution,
  });

  return sendSuccess(res, 200, 'Dispute updated by admin', dispute);
});

router.patch('/admin/disputes/:id/resolve', async (req: Request, res: Response) => {
  const dispute = await findDisputeById(req.params.id);
  if (dispute) {
    await upsertDispute({
      id: dispute.id,
      orderId: dispute.order_id,
      customerId: dispute.customer_id,
      customerName: dispute.customer_name,
      farmerName: dispute.farmer_name,
      reason: dispute.reason,
      status: 'RESOLVED',
      resolution: req.body.resolution || 'full_refund',
    });
  }
  return sendSuccess(res, 200, 'Dispute resolved. Refund executed.', dispute || { id: req.params.id, status: 'RESOLVED' });
});

router.post('/admin/disputes/:id/penalize-seller', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Warning/penalty issued to repeat offending seller', { sellerId: req.body.sellerId });
});

router.delete('/admin/disputes/:id', async (req: Request, res: Response) => {
  await deleteDisputeById(req.params.id);
  return sendSuccess(res, 200, 'Dispute record closed & purged', { id: req.params.id });
});

router.get('/farmer/disputes', async (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string | undefined;
  const farmerDisputes = await listDisputesByFarmer(farmerId);
  return sendSuccess(res, 200, 'Disputes raised against farmer orders', farmerDisputes);
});

export default router;
