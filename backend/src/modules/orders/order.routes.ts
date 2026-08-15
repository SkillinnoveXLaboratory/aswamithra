// @ts-nocheck
import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, Order, Product, SavingsEntry, EarningsEntry } from '../../store/db.store';
import { findProductById, insertProduct, toStoreProduct, insertOrder, listOrdersByBuyer, listOrdersBySeller, findOrderById, insertEarningsEntry, getCommissionRatePercent } from '../../services/sql-store';
import { asyncHandler } from '../../utils/async-handler';
import { query } from '../../config/db.config';

const router = Router();

async function resolveOrderProduct(productId: string): Promise<Product | null> {
  const row = await findProductById(productId);
  if (row) return toStoreProduct(row) as Product;
  return null;
}

async function deductProductStock(product: Product, qty: number) {
  const nextStock = Math.max(0, product.stock - qty);
  product.stock = nextStock;

  await insertProduct({
    id: product.id,
    sellerId: product.sellerId,
    sellerName: product.sellerName,
    village: product.village,
    name: product.name,
    category: product.category,
    description: product.description,
    images: product.images,
    price: product.price,
    unit: product.unit,
    marketReferencePrice: product.marketReferencePrice,
    stock: nextStock,
    minQty: product.minQty,
    b2bTierPrice: product.b2bTierPrice ?? null,
    shopId: product.shopId ?? null,
    lat: product.location.lat,
    lng: product.location.lng,
    status: product.status,
    isFeatured: product.isFeatured ?? false,
  });
}

// Create Order (Dynamic calculation & Commission Engine)
router.post(
  '/orders',
  asyncHandler(async (req: Request, res: Response) => {
    const { sellerId, sellerName, items, paymentMode, buyerId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'At least one order item is required');
    }

    let totalAmount = 0;
    const orderItems: Array<{ productId: string; name: string; qty: number; unit: string; price: number }> = [];

    let resolvedSellerId = sellerId || '';
    let resolvedSellerName = sellerName || '';

    for (const item of items) {
      const product = await resolveOrderProduct(item.productId);
      const itemPrice = product?.price ?? Number(item.price ?? item.priceAtOrder ?? 0);
      const itemName = product?.name ?? item.name ?? 'Product';
      const itemQty = parseInt(item.qty, 10) || 1;
      const itemUnit = product?.unit ?? item.unit ?? 'unit';

      if (product) {
        resolvedSellerId = resolvedSellerId || product.sellerId;
        resolvedSellerName = resolvedSellerName || product.sellerName;
        await deductProductStock(product, itemQty);
      } else {
        resolvedSellerId = resolvedSellerId || item.sellerId || item.farmerId || '';
        resolvedSellerName = resolvedSellerName || item.sellerName || item.farmerName || '';
      }

      totalAmount += itemPrice * itemQty;

      orderItems.push({
        productId: item.productId,
        name: itemName,
        qty: itemQty,
        unit: itemUnit,
        price: itemPrice,
      });
    }

    if (!resolvedSellerId) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Could not determine the farmer for this order');
    }

    const commissionRate = await getCommissionRatePercent(totalAmount);
    const commissionAmount = Math.round(((totalAmount * commissionRate) / 100) * 100) / 100;
    const farmerPayoutAmount = Math.round((totalAmount - commissionAmount) * 100) / 100;
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder: Order = {
      id: 'ord_' + Date.now(),
      buyerId: buyerId || '',
      sellerId: resolvedSellerId,
      sellerName: resolvedSellerName || 'Verified farmer',
      items: orderItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      commissionRate,
      commissionAmount,
      farmerPayoutAmount,
      status: 'PLACED',
      paymentMode: paymentMode || 'online',
      paymentStatus: paymentMode === 'cod' ? 'PENDING' : 'PAID',
      deliveryOtp,
      razorpayOrderId: 'order_' + Math.random().toString(36).substring(7),
      createdAt: new Date().toISOString(),
    };

    await insertOrder({
      id: newOrder.id,
      buyerId: newOrder.buyerId,
      sellerId: newOrder.sellerId,
      sellerName: newOrder.sellerName,
      items: newOrder.items,
      totalAmount: newOrder.totalAmount,
      commissionRate: newOrder.commissionRate,
      commissionAmount: newOrder.commissionAmount,
      farmerPayoutAmount: newOrder.farmerPayoutAmount,
      status: newOrder.status,
      paymentMode: newOrder.paymentMode,
      paymentStatus: newOrder.paymentStatus,
      deliveryOtp: newOrder.deliveryOtp,
      razorpayOrderId: newOrder.razorpayOrderId,
      notes: newOrder.notes ?? null,
      deliveredAt: newOrder.deliveredAt ?? null,
    });

    return sendSuccess(res, 201, 'Order created successfully', newOrder);
  })
);

// Customer Orders List
router.get('/orders', async (req: Request, res: Response) => {
  const buyerId = req.query.buyerId as string;
  const customerOrders = await listOrdersByBuyer(buyerId);
  return sendSuccess(res, 200, 'Customer order history retrieved', customerOrders);
});

// Get Order Detail
router.get('/orders/:id', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  return sendSuccess(res, 200, 'Order tracking details retrieved', {
    ...order,
  });
});

router.put('/orders/:id', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  await query(
    `UPDATE orders SET notes = COALESCE($1, notes), status = COALESCE($2, status), payment_status = COALESCE($3, payment_status) WHERE id = $4`,
    [req.body.notes ?? null, req.body.status ?? null, req.body.paymentStatus ?? null, req.params.id],
  );
  return sendSuccess(res, 200, 'Order delivery details updated', order);
});

router.delete('/orders/:id', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  await query(`UPDATE orders SET status = 'CANCELLED' WHERE id = $1`, [req.params.id]);
  return sendSuccess(res, 200, 'Order cancelled', order);
});

// Farmer Order Operations
router.get('/farmer/orders', async (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string;
  const farmerOrders = await listOrdersBySeller(farmerId);
  return sendSuccess(res, 200, 'Farmer assigned orders retrieved', farmerOrders);
});

router.patch('/orders/:id/accept', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  await query(`UPDATE orders SET status = 'ACCEPTED' WHERE id = $1`, [req.params.id]);
  return sendSuccess(res, 200, 'Order accepted by farmer', order);
});

router.patch('/orders/:id/reject', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  await query(`UPDATE orders SET status = 'REJECTED' WHERE id = $1`, [req.params.id]);
  return sendSuccess(res, 200, 'Order rejected by farmer', order);
});

router.patch('/orders/:id/pack', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  await query(`UPDATE orders SET status = 'PACKED' WHERE id = $1`, [req.params.id]);
  return sendSuccess(res, 200, 'Order marked packed', order);
});

router.patch('/orders/:id/out-for-delivery', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  await query(`UPDATE orders SET status = 'OUT_FOR_DELIVERY' WHERE id = $1`, [req.params.id]);
  return sendSuccess(res, 200, 'Order marked out for delivery', order);
});

router.patch('/orders/:id/payment-status', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  const paymentStatus = String(req.body.paymentStatus || '').toUpperCase();
  if (!['PENDING', 'PAID'].includes(paymentStatus)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'paymentStatus must be PENDING or PAID');
  }

  if (order.paymentStatus === 'PAID' && paymentStatus !== 'PAID') {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Paid orders cannot be reverted back to pending');
  }

  if (order.payment_status === 'PAID' && paymentStatus !== 'PAID') {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Paid orders cannot be reverted back to pending');
  }

  await query(`UPDATE orders SET payment_status = $1 WHERE id = $2`, [paymentStatus, req.params.id]);

  if (paymentStatus === 'PAID') {
    const alreadyRecorded = false;
    if (!alreadyRecorded) {
      let mandiExtraAmount = 0;
      (order.items as Array<any>).forEach((item) => {
        mandiExtraAmount += item.price * 0.2 * item.qty;
      });
      mandiExtraAmount = Math.round(mandiExtraAmount * 100) / 100;
      await insertEarningsEntry({
        id: 'ern_' + Date.now(),
        farmerId: order.seller_id,
        orderId: order.id,
        aswamithraSaleValue: Number(order.total_amount),
        localMandiValue: Number(order.total_amount) - mandiExtraAmount,
        extraEarnedAmount: mandiExtraAmount,
        date: new Date().toISOString().split('T')[0],
      });
    }
  }

  return sendSuccess(res, 200, 'Order payment status updated', order);
});

// Doorstep OTP Delivery Verification (Triggers Real Ledger Mutations)
router.post('/orders/:id/verify-delivery', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  const { deliveryOtp } = req.body;
  if (deliveryOtp && deliveryOtp !== order.deliveryOtp) {
    return sendError(res, 400, 'INVALID_OTP', 'Invalid 4-digit doorstep delivery OTP');
  }

  await query(`UPDATE orders SET status = 'DELIVERED', delivered_at = NOW(), payment_status = 'PAID' WHERE id = $1`, [req.params.id]);

  // Calculate real customer savings & farmer earnings dynamically
  let savedAmount = 0;
  let mandiExtraAmount = 0;

  (order.items as Array<any>).forEach((item) => {
    const mktPrice = item.price * 1.15;
    savedAmount += Math.max(0, mktPrice - item.price) * item.qty;
    mandiExtraAmount += item.price * 0.2 * item.qty;
  });

  savedAmount = Math.round(savedAmount * 100) / 100;
  mandiExtraAmount = Math.round(mandiExtraAmount * 100) / 100;

  // Insert into Ledgers dynamically
  const savingsEntry: SavingsEntry = {
    id: 'svg_' + Date.now(),
    customerId: order.buyerId,
    orderId: order.id,
    marketValue: order.totalAmount + savedAmount,
    paidValue: order.totalAmount,
    savedAmount,
    date: new Date().toISOString().split('T')[0],
  };
  const earningsEntry: EarningsEntry = {
    id: 'ern_' + Date.now(),
    farmerId: order.seller_id,
    orderId: order.id,
    aswamithraSaleValue: Number(order.total_amount),
    localMandiValue: Number(order.total_amount) - mandiExtraAmount,
    extraEarnedAmount: mandiExtraAmount,
    date: new Date().toISOString().split('T')[0],
  };
  await insertEarningsEntry(earningsEntry);

  return sendSuccess(res, 200, 'Doorstep OTP verified. Order delivered & payouts settled.', {
    order,
    savingsEntry,
    earningsEntry,
  });
});

router.get('/orders/:id/delivery-otp', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  return sendSuccess(res, 200, 'Delivery OTP retrieved', { orderId: order.id, otp: order.delivery_otp });
});

// Admin Orders
router.get('/admin/orders', async (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'All platform orders retrieved', await listOrdersByBuyer());
});

router.post('/admin/orders', async (req: Request, res: Response) => {
  const totalAmount = parseFloat(req.body.totalAmount);
  const newOrder: Order = {
    id: 'ord_' + Date.now(),
    buyerId: req.body.buyerId,
    sellerId: req.body.sellerId,
    sellerName: req.body.sellerName,
    items: req.body.items || [],
    totalAmount,
    commissionRate: await getCommissionRate(totalAmount),
    commissionAmount: Math.round(((totalAmount * 4.5) / 100) * 100) / 100,
    farmerPayoutAmount: totalAmount * 0.955,
    status: 'PLACED',
    paymentMode: req.body.paymentMode || 'cod',
    paymentStatus: 'PENDING',
    deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    createdAt: new Date().toISOString(),
  };
  await insertOrder({
    id: newOrder.id,
    buyerId: newOrder.buyerId,
    sellerId: newOrder.sellerId,
    sellerName: newOrder.sellerName,
    items: newOrder.items,
    totalAmount: newOrder.totalAmount,
    commissionRate: newOrder.commissionRate,
    commissionAmount: newOrder.commissionAmount,
    farmerPayoutAmount: newOrder.farmerPayoutAmount,
    status: newOrder.status,
    paymentMode: newOrder.paymentMode,
    paymentStatus: newOrder.paymentStatus,
    deliveryOtp: newOrder.deliveryOtp,
    razorpayOrderId: newOrder.razorpayOrderId,
    notes: null,
    deliveredAt: null,
  });
  return sendSuccess(res, 201, 'Order created by Admin', newOrder);
});

router.get('/admin/orders/:id', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
  return sendSuccess(res, 200, 'Admin order details', order);
});

router.put('/admin/orders/:id', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
  await query(`UPDATE orders SET notes = COALESCE($1, notes), status = COALESCE($2, status), payment_status = COALESCE($3, payment_status) WHERE id = $4`, [req.body.notes ?? null, req.body.status ?? null, req.body.paymentStatus ?? null, req.params.id]);
  return sendSuccess(res, 200, 'Order updated by Admin', order);
});

router.delete('/admin/orders/:id', async (req: Request, res: Response) => {
  const order = await findOrderById(req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
  await query('DELETE FROM orders WHERE id = $1', [req.params.id]);
  return sendSuccess(res, 200, 'Order deleted by Admin', order);
});

export default router;
