import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, Order, Product, SavingsEntry, EarningsEntry } from '../../store/db.store';
import { findProductById, insertProduct, toStoreProduct } from '../../services/sql-store';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();

async function resolveOrderProduct(productId: string): Promise<Product | null> {
  const row = await findProductById(productId);
  if (row) return toStoreProduct(row) as Product;
  return db.products.find((p) => p.id === productId) ?? null;
}

async function deductProductStock(product: Product, qty: number) {
  const nextStock = Math.max(0, product.stock - qty);
  product.stock = nextStock;

  const memoryIndex = db.products.findIndex((p) => p.id === product.id);
  if (memoryIndex !== -1) db.products[memoryIndex] = product;

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

    const commissionRate = db.getCommissionRate(totalAmount);
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

    db.orders.push(newOrder);

    return sendSuccess(res, 201, 'Order created successfully', newOrder);
  })
);

// Customer Orders List
router.get('/orders', (req: Request, res: Response) => {
  const buyerId = req.query.buyerId as string;
  const customerOrders = buyerId ? db.orders.filter((o) => o.buyerId === buyerId) : db.orders;
  return sendSuccess(res, 200, 'Customer order history retrieved', customerOrders);
});

// Get Order Detail
router.get('/orders/:id', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  const deliveryAgent = db.deliveryPartners[0];

  return sendSuccess(res, 200, 'Order tracking details retrieved', {
    ...order,
    tracking: deliveryAgent
      ? { agentName: deliveryAgent.name, agentMobile: deliveryAgent.mobile, lat: deliveryAgent.location.lat, lng: deliveryAgent.location.lng }
      : undefined,
  });
});

router.put('/orders/:id', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  Object.assign(order, req.body);
  return sendSuccess(res, 200, 'Order delivery details updated', order);
});

router.delete('/orders/:id', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  order.status = 'CANCELLED';
  return sendSuccess(res, 200, 'Order cancelled', order);
});

// Farmer Order Operations
router.get('/farmer/orders', (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string;
  const farmerOrders = farmerId ? db.orders.filter((o) => o.sellerId === farmerId) : [];
  return sendSuccess(res, 200, 'Farmer assigned orders retrieved', farmerOrders);
});

router.patch('/orders/:id/accept', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  order.status = 'ACCEPTED';
  return sendSuccess(res, 200, 'Order accepted by farmer', order);
});

router.patch('/orders/:id/reject', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  order.status = 'REJECTED';
  return sendSuccess(res, 200, 'Order rejected by farmer', order);
});

router.patch('/orders/:id/pack', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  order.status = 'PACKED';
  return sendSuccess(res, 200, 'Order marked packed', order);
});

router.patch('/orders/:id/out-for-delivery', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  order.status = 'OUT_FOR_DELIVERY';
  return sendSuccess(res, 200, 'Order marked out for delivery', order);
});

// Doorstep OTP Delivery Verification (Triggers Real Ledger Mutations)
router.post('/orders/:id/verify-delivery', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  const { deliveryOtp } = req.body;
  if (deliveryOtp && deliveryOtp !== order.deliveryOtp) {
    return sendError(res, 400, 'INVALID_OTP', 'Invalid 4-digit doorstep delivery OTP');
  }

  order.status = 'DELIVERED';
  order.deliveredAt = new Date().toISOString();
  order.paymentStatus = 'PAID';

  // Calculate real customer savings & farmer earnings dynamically
  let savedAmount = 0;
  let mandiExtraAmount = 0;

  order.items.forEach((item) => {
    const product = db.products.find((p) => p.id === item.productId);
    const mktPrice = product ? product.marketReferencePrice : item.price * 1.15;
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
  db.savingsLedger.push(savingsEntry);

  const earningsEntry: EarningsEntry = {
    id: 'ern_' + Date.now(),
    farmerId: order.sellerId,
    orderId: order.id,
    aswamithraSaleValue: order.totalAmount,
    localMandiValue: order.totalAmount - mandiExtraAmount,
    extraEarnedAmount: mandiExtraAmount,
    date: new Date().toISOString().split('T')[0],
  };
  db.earningsLedger.push(earningsEntry);

  return sendSuccess(res, 200, 'Doorstep OTP verified. Order delivered & payouts settled.', {
    order,
    savingsEntry,
    earningsEntry,
  });
});

router.get('/orders/:id/delivery-otp', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', `Order ${req.params.id} not found`);

  return sendSuccess(res, 200, 'Delivery OTP retrieved', { orderId: order.id, otp: order.deliveryOtp });
});

// Admin Orders
router.get('/admin/orders', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'All platform orders retrieved', db.orders);
});

router.post('/admin/orders', (req: Request, res: Response) => {
  const newOrder: Order = {
    id: 'ord_' + Date.now(),
    buyerId: req.body.buyerId,
    sellerId: req.body.sellerId,
    sellerName: req.body.sellerName,
    items: req.body.items || [],
    totalAmount: parseFloat(req.body.totalAmount),
    commissionRate: db.getCommissionRate(parseFloat(req.body.totalAmount)),
    commissionAmount: Math.round(((parseFloat(req.body.totalAmount) * 4.5) / 100) * 100) / 100,
    farmerPayoutAmount: parseFloat(req.body.totalAmount) * 0.955,
    status: 'PLACED',
    paymentMode: req.body.paymentMode || 'cod',
    paymentStatus: 'PENDING',
    deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    createdAt: new Date().toISOString(),
  };
  db.orders.push(newOrder);
  return sendSuccess(res, 201, 'Order created by Admin', newOrder);
});

router.get('/admin/orders/:id', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
  return sendSuccess(res, 200, 'Admin order details', order);
});

router.put('/admin/orders/:id', (req: Request, res: Response) => {
  const index = db.orders.findIndex((o) => o.id === req.params.id);
  if (index === -1) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
  db.orders[index] = { ...db.orders[index], ...req.body };
  return sendSuccess(res, 200, 'Order updated by Admin', db.orders[index]);
});

router.delete('/admin/orders/:id', (req: Request, res: Response) => {
  const index = db.orders.findIndex((o) => o.id === req.params.id);
  if (index === -1) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
  const deleted = db.orders.splice(index, 1)[0];
  return sendSuccess(res, 200, 'Order deleted by Admin', deleted);
});

export default router;
