import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, CartItem, DeliverySlot, Product } from '../../store/db.store';
import { findProductById, toStoreProduct } from '../../services/sql-store';

const router = Router();

async function resolveCartProduct(productId: string): Promise<Product | null> {
  const row = await findProductById(productId);
  if (row) return toStoreProduct(row) as Product;
  return db.products.find((p) => p.id === productId) ?? null;
}

function snapshotFromProduct(product: Product | null, body: Partial<CartItem> | Record<string, unknown> = {}) {
  return {
    name: (body.name as string | undefined) || product?.name || 'Farm produce',
    image: (body.image as string | undefined) || product?.images?.[0] || '',
    category: (body.category as string | undefined) || product?.category || '',
    unit: (body.unit as string | undefined) || product?.unit || 'unit',
    price: body.price !== undefined ? Number(body.price) : (product?.price ?? 0),
    marketReferencePrice:
      body.marketReferencePrice !== undefined
        ? Number(body.marketReferencePrice)
        : (product?.marketReferencePrice ?? (product?.price ?? Number(body.price ?? 0))),
    sellerId: (body.sellerId as string | undefined) || product?.sellerId || '',
    sellerName: (body.sellerName as string | undefined) || product?.sellerName || '',
  };
}

function buildCartLine(cItem: CartItem, product: Product | null, userLat?: number, userLng?: number) {
  const snapshot = snapshotFromProduct(product, cItem);
  const name = cItem.name || snapshot.name;
  const image = cItem.image || snapshot.image;
  const category = cItem.category || snapshot.category;
  const unit = cItem.unit || snapshot.unit;
  const price = cItem.price ?? snapshot.price;
  const marketReferencePrice = cItem.marketReferencePrice ?? snapshot.marketReferencePrice;
  const itemTotal = price * cItem.qty;
  const savings = Math.max(0, marketReferencePrice - price) * cItem.qty;
  const farmerId = cItem.sellerId || snapshot.sellerId;
  const farmerName = cItem.sellerName || snapshot.sellerName;
  const distanceKm =
    product && userLat !== undefined && userLng !== undefined
      ? db.calculateDistanceKm(userLat, userLng, product.location.lat, product.location.lng)
      : 0;

  return {
    id: cItem.id,
    productId: cItem.productId,
    name,
    image,
    category,
    qty: cItem.qty,
    unit,
    price,
    marketReferencePrice,
    total: itemTotal,
    savings,
    farmerId,
    farmerName,
    distanceKm,
  };
}

async function buildCartResponse(userLat?: number, userLng?: number) {
  const groupsMap = new Map<string, any>();
  let subtotal = 0;
  let totalSavings = 0;

  for (const cItem of db.cartItems) {
    const product = await resolveCartProduct(cItem.productId);
    const line = buildCartLine(cItem, product, userLat, userLng);
    subtotal += line.total;
    totalSavings += line.savings;

    if (!groupsMap.has(line.farmerId)) {
      groupsMap.set(line.farmerId, {
        farmerId: line.farmerId,
        farmerName: line.farmerName,
        distanceKm: line.distanceKm,
        items: [],
        deliveryFee: 25.0,
      });
    }

    groupsMap.get(line.farmerId).items.push(line);
  }

  const deliveryFeeTotal = db.cartItems.length > 0 ? groupsMap.size * 25.0 : 0;

  return {
    itemsCount: db.cartItems.length,
    subtotal: Math.round(subtotal * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    deliveryFeeTotal,
    grandTotal: Math.round((subtotal + deliveryFeeTotal) * 100) / 100,
    groups: Array.from(groupsMap.values()),
  };
}

function resolveUserLocation(req: Request) {
  const { lat, lng, userId } = req.query;
  let userLat = lat ? parseFloat(lat as string) : undefined;
  let userLng = lng ? parseFloat(lng as string) : undefined;

  if (userLat === undefined || userLng === undefined) {
    const userAddr = userId
      ? db.addresses.find((a) => a.userId === (userId as string) && a.isDefault) ||
        db.addresses.find((a) => a.userId === (userId as string))
      : db.addresses[0];

    if (userAddr) {
      userLat = userAddr.location.lat;
      userLng = userAddr.location.lng;
    }
  }

  return { userLat, userLng };
}

// Cart Operations (Dynamic Distance Computation from Query or Saved Address)
router.get('/cart', async (req: Request, res: Response) => {
  const { userLat, userLng } = resolveUserLocation(req);
  const cart = await buildCartResponse(userLat, userLng);
  return sendSuccess(res, 200, 'Active cart retrieved', cart);
});

router.post('/cart/items', async (req: Request, res: Response) => {
  const { productId, qty } = req.body;
  if (!productId) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'productId is required');
  }

  const product = await resolveCartProduct(productId);
  const snapshot = snapshotFromProduct(product, req.body);
  const newQty = parseInt(qty, 10) || 1;

  const existing = db.cartItems.find((item) => item.productId === productId);
  if (existing) {
    existing.qty += newQty;
    Object.assign(existing, snapshot);
    return sendSuccess(res, 200, 'Cart item quantity updated', existing);
  }

  const newItem: CartItem = {
    id: 'c_item_' + Date.now(),
    productId,
    qty: newQty,
    ...snapshot,
  };

  db.cartItems.push(newItem);
  return sendSuccess(res, 201, 'Item added to cart', newItem);
});

router.get('/cart/items/:item_id', (req: Request, res: Response) => {
  const item = db.cartItems.find((c) => c.id === req.params.item_id);
  if (!item) return sendError(res, 404, 'ITEM_NOT_FOUND', 'Cart item not found');
  return sendSuccess(res, 200, 'Cart item detail', item);
});

router.put('/cart/items/:item_id', (req: Request, res: Response) => {
  const item = db.cartItems.find((c) => c.id === req.params.item_id);
  if (!item) return sendError(res, 404, 'ITEM_NOT_FOUND', 'Cart item not found');

  if (req.body.qty) item.qty = parseInt(req.body.qty, 10);
  return sendSuccess(res, 200, 'Cart item quantity updated', item);
});

router.delete('/cart/items/:item_id', (req: Request, res: Response) => {
  const index = db.cartItems.findIndex((c) => c.id === req.params.item_id);
  if (index !== -1) db.cartItems.splice(index, 1);
  return sendSuccess(res, 200, 'Item removed from cart', { id: req.params.item_id });
});

router.delete('/cart', (req: Request, res: Response) => {
  db.cartItems.length = 0;
  return sendSuccess(res, 200, 'Cart cleared');
});

router.post('/cart/validate', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Cart inventory validated', { isAvailable: true, unavailableItems: [] });
});

router.post('/cart/delivery-fee', async (req: Request, res: Response) => {
  const cart = await buildCartResponse();
  return sendSuccess(res, 200, 'Delivery fee calculated', { totalDeliveryFee: cart.deliveryFeeTotal });
});

// Checkout Preview & Stock Lock
router.post('/checkout/preview', async (req: Request, res: Response) => {
  const cart = await buildCartResponse();
  return sendSuccess(res, 200, 'Checkout breakdown preview', {
    itemsSubtotal: cart.subtotal,
    deliveryFeeTotal: cart.deliveryFeeTotal,
    discountAmount: 0.0,
    grandTotal: cart.grandTotal,
    projectedCustomerSavings: cart.totalSavings,
  });
});

router.post('/checkout/coupons/apply', (req: Request, res: Response) => {
  const coupon = db.coupons.find((c) => c.code === req.body.code && c.status === 'active');
  if (!coupon) return sendError(res, 404, 'COUPON_NOT_FOUND', 'Invalid or expired coupon code');

  return sendSuccess(res, 200, 'Coupon applied', { couponCode: coupon.code, discountAmount: coupon.discountValue });
});

router.delete('/checkout/coupons/remove', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Coupon removed');
});

// Dynamic Editable Delivery Timing Slots (Querying db.deliverySlots directly)
router.get('/checkout/delivery-slots', (req: Request, res: Response) => {
  const formattedSlots = db.deliverySlots
    .filter((slot) => slot.available)
    .map((slot) => {
      const dayPrefix = slot.dateOffsetDays === 0 ? 'Today' : slot.dateOffsetDays === 1 ? 'Tomorrow' : `In ${slot.dateOffsetDays} Days`;
      return {
        id: slot.id,
        label: slot.label,
        time: `${dayPrefix}, ${slot.startTime} - ${slot.endTime}`,
        startTime: slot.startTime,
        endTime: slot.endTime,
        dateOffsetDays: slot.dateOffsetDays,
        maxOrdersCapacity: slot.maxOrdersCapacity,
        activeOrdersCount: slot.activeOrdersCount,
        available: slot.activeOrdersCount < slot.maxOrdersCapacity,
      };
    });

  return sendSuccess(res, 200, 'Available delivery slots', formattedSlots);
});

// Admin Delivery Slot CRUD (Dynamic Database Management)
router.get('/admin/delivery-slots', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'All delivery slots (Admin)', db.deliverySlots);
});

router.post('/admin/delivery-slots', (req: Request, res: Response) => {
  const newSlot: DeliverySlot = {
    id: 'slot_' + Date.now(),
    label: req.body.label || 'Standard Batch',
    startTime: req.body.startTime || '09:00 AM',
    endTime: req.body.endTime || '11:00 AM',
    dateOffsetDays: req.body.dateOffsetDays !== undefined ? parseInt(req.body.dateOffsetDays) : 0,
    maxOrdersCapacity: req.body.maxOrdersCapacity !== undefined ? parseInt(req.body.maxOrdersCapacity) : 50,
    activeOrdersCount: 0,
    available: req.body.available !== false,
  };

  db.deliverySlots.push(newSlot);
  return sendSuccess(res, 201, 'Delivery timing slot created successfully', newSlot);
});

router.get('/admin/delivery-slots/:id', (req: Request, res: Response) => {
  const slot = db.deliverySlots.find((s) => s.id === req.params.id);
  if (!slot) return sendError(res, 404, 'SLOT_NOT_FOUND', 'Delivery slot not found');
  return sendSuccess(res, 200, 'Delivery slot detail', slot);
});

router.put('/admin/delivery-slots/:id', (req: Request, res: Response) => {
  const slot = db.deliverySlots.find((s) => s.id === req.params.id);
  if (!slot) return sendError(res, 404, 'SLOT_NOT_FOUND', 'Delivery slot not found');

  Object.assign(slot, req.body);
  return sendSuccess(res, 200, 'Delivery slot timings updated successfully', slot);
});

router.delete('/admin/delivery-slots/:id', (req: Request, res: Response) => {
  const index = db.deliverySlots.findIndex((s) => s.id === req.params.id);
  if (index === -1) return sendError(res, 404, 'SLOT_NOT_FOUND', 'Delivery slot not found');

  const deleted = db.deliverySlots.splice(index, 1)[0];
  return sendSuccess(res, 200, 'Delivery slot deleted from database', deleted);
});

router.post('/checkout/verify-cod-eligibility', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'COD eligibility checked', { codAllowed: true });
});

router.get('/checkout/savings-preview', async (req: Request, res: Response) => {
  const cart = await buildCartResponse();
  return sendSuccess(res, 200, 'Projected savings preview', { totalSavingsAmount: cart.totalSavings });
});

router.post('/checkout/lock-stock', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Stock locked for 5 minutes', { lockId: 'lock_' + Date.now(), expiresAt: new Date(Date.now() + 300000).toISOString() });
});

router.delete('/checkout/unlock-stock', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Stock reservation unlocked');
});

export default router;
