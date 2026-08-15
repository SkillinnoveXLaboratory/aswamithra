// @ts-nocheck
import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { Product } from '../../store/db.store';
import {
  deactivateProductById,
  getDefaultAddressForUser,
  findProductById,
  findUserById,
  insertProduct,
  listAddressesForUser,
  listActiveProducts,
  listAllProducts,
  listCategories,
  listUnits,
  toStoreProduct,
} from '../../services/sql-store';

const router = Router();

function productToInsertInput(product: Product, status?: string) {
  return {
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
    stock: product.stock,
    minQty: product.minQty,
    b2bTierPrice: product.b2bTierPrice ?? null,
    shopId: product.shopId ?? null,
    lat: product.location.lat,
    lng: product.location.lng,
    status: status ?? product.status,
    isFeatured: product.isFeatured ?? false,
  };
}

function mergeProductFromBody(existing: Product, body: Record<string, unknown>): Product {
  return {
    ...existing,
    name: (body.name as string | undefined) ?? existing.name,
    category: (body.category as string | undefined) ?? existing.category,
    description: (body.description as string | undefined) ?? existing.description,
    images: (body.images as string[] | undefined) ?? existing.images,
    sellerId: (body.sellerId as string | undefined) ?? existing.sellerId,
    sellerName: (body.sellerName as string | undefined) ?? existing.sellerName,
    village: (body.village as string | undefined) ?? existing.village,
    shopId: (body.shopId as string | undefined) ?? existing.shopId,
    unit: (body.unit as string | undefined) ?? existing.unit,
    status: (body.status as Product['status'] | undefined) ?? existing.status,
    isFeatured: (body.isFeatured as boolean | undefined) ?? existing.isFeatured,
    price: body.price !== undefined ? Number(body.price) : existing.price,
    stock: body.stock !== undefined ? Number(body.stock) : existing.stock,
    minQty: body.minQty !== undefined ? Number(body.minQty) : existing.minQty,
    marketReferencePrice:
      body.marketReferencePrice !== undefined ? Number(body.marketReferencePrice) : existing.marketReferencePrice,
    b2bTierPrice: body.b2bTierPrice !== undefined ? Number(body.b2bTierPrice) : existing.b2bTierPrice,
    location:
      body.lat !== undefined || body.lng !== undefined
        ? {
            lat: body.lat !== undefined ? Number(body.lat) : existing.location.lat,
            lng: body.lng !== undefined ? Number(body.lng) : existing.location.lng,
          }
        : existing.location,
  };
}

async function syncProductMemory(product: Product) {
}

async function resolveProductById(id: string): Promise<Product | null> {
  const row = await findProductById(id);
  return row ? (toStoreProduct(row) as Product) : null;
}

async function removeProductFromCatalog(id: string): Promise<Product | null> {
  const product = await resolveProductById(id);
  if (!product) return null;
  await deactivateProductById(id);
  return product;
}

async function persistProduct(product: Product, status?: string) {
  await insertProduct(productToInsertInput(product, status));
}

// PostGIS Radius Search Endpoint
router.get('/products/radius', async (req: Request, res: Response) => {
  const { lat, lng, radiusKm, category, search, userId } = req.query;

  let userLat: number | undefined;
  let userLng: number | undefined;

  if (lat && lng) {
    userLat = parseFloat(lat as string);
    userLng = parseFloat(lng as string);
  } else if (userId) {
    const userAddr = await getDefaultAddressForUser(userId as string);
    if (userAddr) {
      userLat = userAddr.lat;
      userLng = userAddr.lng;
    }
  } else {
    const [defaultAddr] = await listAddressesForUser((req.query.userId as string) || '');
    if (defaultAddr) {
      userLat = (defaultAddr as any).location?.lat ?? (defaultAddr as any).lat ?? 0;
      userLng = (defaultAddr as any).location?.lng ?? (defaultAddr as any).lng ?? 0;
    }
  }

  if (userLat === undefined || userLng === undefined || isNaN(userLat) || isNaN(userLng)) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Latitude (lat) and Longitude (lng) query parameters are required for spatial radius search');
  }

  const maxRadius = radiusKm ? parseFloat(radiusKm as string) : 10;

  const dbProducts = await listActiveProducts();
  const sourceProducts = dbProducts.map((row) => toStoreProduct(row));

  const filteredProducts = sourceProducts
    .filter((p) => p.status === 'active')
    .filter((p) => (!category || category === 'all' ? true : p.category === category))
    .filter((p) => (!search ? true : p.name.toLowerCase().includes((search as string).toLowerCase())))
    .map((p) => {
      const distanceKm = Math.hypot(userLat! - p.location.lat, userLng! - p.location.lng);
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        images: p.images || [],
        price: p.price,
        unit: p.unit,
        marketReferencePrice: p.marketReferencePrice,
        estimatedSavingsPerUnit: Math.max(0, p.marketReferencePrice - p.price),
        stock: p.stock,
        minQty: p.minQty,
        sellerId: p.sellerId,
        sellerName: p.sellerName,
        village: p.village,
        farmer: {
          id: p.sellerId,
          name: p.sellerName,
          village: p.village,
          rating: 4.8,
          distanceKm,
        },
      };
    })
    .filter((p) => p.farmer.distanceKm <= maxRadius)
    .sort((a, b) => a.farmer.distanceKm - b.farmer.distanceKm);

  return sendSuccess(res, 200, 'Products within radius retrieved successfully', {
    total: filteredProducts.length,
    page: 1,
    radiusKm: maxRadius,
    userLocation: { lat: userLat, lng: userLng },
    products: filteredProducts,
  });
});

// Static Product Routes (Placed BEFORE parametric :id)
router.get('/products/categories', (req: Request, res: Response) => {
  listCategories().then((rows) => sendSuccess(res, 200, 'Product categories retrieved', rows));
});

router.get('/products/units', (req: Request, res: Response) => {
  listUnits().then((rows) => sendSuccess(res, 200, 'Measurement units retrieved', rows));
});

router.get('/products/search-suggestions', (req: Request, res: Response) => {
  const q = ((req.query.q as string) || '').toLowerCase();
  listAllProducts().then((rows) => sendSuccess(res, 200, 'Search suggestions', rows.filter((p) => p.name.toLowerCase().includes(q)).map((p) => p.name)));
});

router.get('/products/low-stock', (req: Request, res: Response) => {
  listAllProducts().then((rows) => sendSuccess(res, 200, 'Low stock products retrieved', rows.filter((p) => p.stock <= 10)));
});

router.get('/farmer/products', async (req: Request, res: Response) => {
  const farmerId = req.query.farmerId as string;
  const dbProducts = await listActiveProducts();
  const sourceProducts = dbProducts.map((row) => toStoreProduct(row));
  const farmerProducts = farmerId ? sourceProducts.filter((p) => p.sellerId === farmerId) : sourceProducts;
  sendSuccess(res, 200, 'Farmer product listings retrieved', farmerProducts);
});

router.get('/products/farmer/:farmer_id', async (req: Request, res: Response) => {
  const products = (await listAllProducts()).map((row) => toStoreProduct(row) as Product);
  const farmerProducts = products.filter((p) => p.sellerId === req.params.farmer_id && p.status === 'active');
  sendSuccess(res, 200, 'Farmer public products retrieved', farmerProducts);
});

// Parametric Product Route :id (Placed AFTER static routes)
router.get('/products/:id', async (req: Request, res: Response) => {
  const dbProducts = await listActiveProducts();
  const sourceProducts = dbProducts.map((row) => toStoreProduct(row));
  const product = sourceProducts.find((p) => p.id === req.params.id);
  if (!product) {
    return sendError(res, 404, 'PRODUCT_NOT_FOUND', `Product with ID ${req.params.id} not found`);
  }

  const { lat, lng } = req.query;
  let userLat = lat ? parseFloat(lat as string) : undefined;
  let userLng = lng ? parseFloat(lng as string) : undefined;

  if (userLat === undefined || userLng === undefined) {
    const defaultAddr = await getDefaultAddressForUser('');
    if (defaultAddr) {
      userLat = defaultAddr.location.lat;
      userLng = defaultAddr.location.lng;
    } else {
      userLat = product.location.lat;
      userLng = product.location.lng;
    }
  }

  const distanceKm = Math.hypot((userLat ?? 0) - product.location.lat, (userLng ?? 0) - product.location.lng);

  return sendSuccess(res, 200, 'Product detail retrieved', {
    ...product,
    estimatedSavingsPerUnit: Math.max(0, product.marketReferencePrice - product.price),
    farmer: {
      id: product.sellerId,
      name: product.sellerName,
      village: product.village,
      rating: 4.8,
      distanceKm,
    },
  });
});

// Create Product
router.post('/products', async (req: Request, res: Response) => {
  const { name, category, description, price, unit, marketReferencePrice, stock, minQty, sellerId, sellerName, village, lat, lng } = req.body;

  if (!name || price === undefined || !unit) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Name, price, and unit are required fields');
  }

  const seller = sellerId ? await findUserById(sellerId) : undefined;
  const sellerAddr = sellerId ? await getDefaultAddressForUser(sellerId) : null;

  const productLat = lat !== undefined ? parseFloat(lat) : (sellerAddr ? sellerAddr.lat : 0);
  const productLng = lng !== undefined ? parseFloat(lng) : (sellerAddr ? sellerAddr.lng : 0);

  const newProduct: Product = {
    id: 'prod_' + Date.now(),
    sellerId: sellerId || (seller ? seller.id : ''),
    sellerName: sellerName || (seller ? seller.name : ''),
    village: village || '',
    name,
    category: category || '',
    description: description || '',
    images: req.body.images || [],
    price: parseFloat(price),
    unit,
    marketReferencePrice: marketReferencePrice ? parseFloat(marketReferencePrice) : parseFloat(price) * 1.15,
    stock: stock !== undefined ? parseInt(stock) : 0,
    minQty: minQty !== undefined ? parseInt(minQty) : 1,
    b2bTierPrice: req.body.b2bTierPrice ? parseFloat(req.body.b2bTierPrice) : undefined,
    shopId: req.body.shopId,
    location: { lat: productLat, lng: productLng },
    status: 'active',
  };

  await insertProduct({
    id: newProduct.id,
    sellerId: newProduct.sellerId,
    sellerName: newProduct.sellerName,
    village: newProduct.village,
    name: newProduct.name,
    category: newProduct.category,
    description: newProduct.description,
    images: newProduct.images,
    price: newProduct.price,
    unit: newProduct.unit,
    marketReferencePrice: newProduct.marketReferencePrice,
    stock: newProduct.stock,
    minQty: newProduct.minQty,
    b2bTierPrice: newProduct.b2bTierPrice ?? null,
    shopId: newProduct.shopId ?? null,
    lat: newProduct.location.lat,
    lng: newProduct.location.lng,
    status: newProduct.status,
    isFeatured: newProduct.isFeatured ?? false,
  });
  return sendSuccess(res, 201, 'Product listing created successfully', newProduct);
});

// Update Product
router.put('/products/:id', async (req: Request, res: Response) => {
  const productId = String(req.params.id);
  const existing = await resolveProductById(productId);
  if (!existing) {
    return sendError(res, 404, 'PRODUCT_NOT_FOUND', `Product with ID ${productId} not found`);
  }

  const updated = mergeProductFromBody(existing, req.body);
  await syncProductMemory(updated);
  await persistProduct(updated);
  return sendSuccess(res, 200, 'Product details updated', updated);
});

router.patch('/products/:id/price', async (req: Request, res: Response) => {
  const productId = String(req.params.id);
  const existing = await resolveProductById(productId);
  if (!existing) {
    return sendError(res, 404, 'PRODUCT_NOT_FOUND', `Product with ID ${productId} not found`);
  }

  const updated = mergeProductFromBody(existing, { price: req.body.price });
  await syncProductMemory(updated);
  await persistProduct(updated);
  return sendSuccess(res, 200, 'Product price updated', updated);
});

router.patch('/products/:id/stock', async (req: Request, res: Response) => {
  const productId = String(req.params.id);
  const existing = await resolveProductById(productId);
  if (!existing) {
    return sendError(res, 404, 'PRODUCT_NOT_FOUND', `Product with ID ${productId} not found`);
  }

  const updated = mergeProductFromBody(existing, { stock: req.body.stock });
  await syncProductMemory(updated);
  await persistProduct(updated);
  return sendSuccess(res, 200, 'Product stock updated', updated);
});

router.patch('/products/:id/status', async (req: Request, res: Response) => {
  const productId = String(req.params.id);
  const existing = await resolveProductById(productId);
  if (!existing) {
    return sendError(res, 404, 'PRODUCT_NOT_FOUND', `Product with ID ${productId} not found`);
  }

  const updated = mergeProductFromBody(existing, { status: req.body.status });
  await syncProductMemory(updated);
  await persistProduct(updated);
  return sendSuccess(res, 200, 'Product status updated', updated);
});

router.delete('/products/:id', async (req: Request, res: Response) => {
  const productId = String(req.params.id);
  const deleted = await removeProductFromCatalog(productId);
  if (!deleted) {
    return sendError(res, 404, 'PRODUCT_NOT_FOUND', `Product with ID ${productId} not found`);
  }

  return sendSuccess(res, 200, 'Product deleted from catalog', deleted);
});

// Admin Product Management
router.get('/admin/products', async (req: Request, res: Response) => {
  const dbProducts = await listAllProducts();
  const products = dbProducts.map((row) => toStoreProduct(row));
  sendSuccess(res, 200, 'All platform products retrieved', products);
});

router.post('/admin/products', async (req: Request, res: Response) => {
  const productLat = req.body.lat ? parseFloat(req.body.lat) : 0;
  const productLng = req.body.lng ? parseFloat(req.body.lng) : 0;

  const newProduct: Product = {
    id: 'prod_' + Date.now(),
    sellerId: req.body.sellerId,
    sellerName: req.body.sellerName,
    village: req.body.village,
    name: req.body.name,
    category: req.body.category,
    description: req.body.description,
    images: req.body.images || [],
    price: parseFloat(req.body.price),
    unit: req.body.unit,
    marketReferencePrice: req.body.marketReferencePrice ? parseFloat(req.body.marketReferencePrice) : parseFloat(req.body.price) * 1.15,
    stock: req.body.stock !== undefined ? parseInt(req.body.stock) : 0,
    minQty: req.body.minQty !== undefined ? parseInt(req.body.minQty) : 1,
    location: { lat: productLat, lng: productLng },
    status: 'active',
  };

  await persistProduct(newProduct);
  sendSuccess(res, 201, 'Product created by Admin', newProduct);
});

router.get('/admin/products/:id', async (req: Request, res: Response) => {
  const productId = String(req.params.id);
  const product = await resolveProductById(productId);
  if (!product) return sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found');
  return sendSuccess(res, 200, 'Admin product detail', product);
});

router.put('/admin/products/:id', async (req: Request, res: Response) => {
  const productId = String(req.params.id);
  const existing = await resolveProductById(productId);
  if (!existing) return sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found');

  const updated: Product = {
    ...existing,
    ...req.body,
    location: req.body.lat !== undefined || req.body.lng !== undefined
      ? {
          lat: req.body.lat !== undefined ? parseFloat(req.body.lat) : existing.location.lat,
          lng: req.body.lng !== undefined ? parseFloat(req.body.lng) : existing.location.lng,
        }
      : existing.location,
  };

  await persistProduct(updated);
  return sendSuccess(res, 200, 'Product updated by Admin', updated);
});

router.delete('/admin/products/:id', async (req: Request, res: Response) => {
  const productId = String(req.params.id);
  const deleted = await removeProductFromCatalog(productId);
  if (!deleted) return sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found');
  return sendSuccess(res, 200, 'Product deleted by Admin', deleted);
});

router.put('/admin/products/:id/feature', async (req: Request, res: Response) => {
  const productId = String(req.params.id);
  const product = await resolveProductById(productId);
  if (!product) return sendError(res, 404, 'PRODUCT_NOT_FOUND', 'Product not found');

  product.isFeatured = req.body.isFeatured !== false;

  await persistProduct(product);
  return sendSuccess(res, 200, 'Product feature status updated', product);
});

export default router;
