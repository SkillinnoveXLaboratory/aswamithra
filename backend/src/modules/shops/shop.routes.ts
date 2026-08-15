import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { Shop } from '../../store/db.store';
import {
  clearShopIdFromProducts,
  deleteShopById,
  findShopByFarmerId,
  findShopById,
  countProductsByShopIds,
  listShops,
  toStoreShop,
  upsertShop,
} from '../../services/sql-store';

const router = Router();

function toMemoryShop(shop: Shop) {
  return {
    id: shop.id,
    name: shop.name,
    farmerId: shop.farmerId ?? null,
    farmerName: shop.farmerName ?? null,
    address: shop.address,
    radiusKm: shop.radiusKm,
    operatingHours: shop.operatingHours ?? null,
    lat: shop.location?.lat ?? null,
    lng: shop.location?.lng ?? null,
    status: shop.status,
  };
}

async function persistShop(shop: Shop) {
  await upsertShop(toMemoryShop(shop));
}

async function resolveShops() {
  const rows = await listShops();
  return rows.map((row) => toStoreShop(row));
}

async function resolveShopById(id: string) {
  const row = await findShopById(id);
  return row ? toStoreShop(row) : null;
}

async function attachProductCounts<T extends { id: string }>(shops: T[]) {
  const pgCounts = await countProductsByShopIds();
  return shops.map((shop) => {
    const pgCount = pgCounts.get(shop.id) ?? 0;
    return { ...shop, productCount: pgCount };
  });
}

async function removeShop(shopId: string) {
  await clearShopIdFromProducts(shopId);
  await deleteShopById(shopId);
}

router.get('/admin/shops', async (req: Request, res: Response) => {
  const shops = await attachProductCounts(await resolveShops());
  sendSuccess(res, 200, 'Farmer-created shops list', shops);
});

router.post('/admin/shops', (req: Request, res: Response) => {
  sendError(res, 403, 'FORBIDDEN', 'Shops can only be created by farmers from their dashboard');
});

router.get('/admin/shops/:id', async (req: Request, res: Response) => {
  const shop = await resolveShopById(String(req.params.id));
  if (!shop) return sendError(res, 404, 'SHOP_NOT_FOUND', 'Shop not found');
  const [withCount] = await attachProductCounts([shop]);
  sendSuccess(res, 200, 'Shop location details', withCount);
});

router.put('/admin/shops/:id', (req: Request, res: Response) => {
  sendError(res, 403, 'FORBIDDEN', 'Shops can only be edited by the farmer who owns them');
});

router.delete('/admin/shops/:id', async (req: Request, res: Response) => {
  const shopId = String(req.params.id);
  const existing = await resolveShopById(shopId);
  if (!existing) return sendError(res, 404, 'SHOP_NOT_FOUND', 'Shop not found');
  await removeShop(shopId);
  sendSuccess(res, 200, 'Shop deleted by admin', { id: shopId });
});

router.get('/farmer/my-shop', async (req: Request, res: Response) => {
  const farmerId = String(req.query.farmerId || '');
  if (!farmerId) return sendError(res, 400, 'VALIDATION_ERROR', 'farmerId is required');
  const row = await findShopByFarmerId(farmerId);
  const shop = row ? toStoreShop(row) : null;
  if (!shop?.id) return sendSuccess(res, 200, 'Farmer shop retrieved', null);
  const [withCount] = await attachProductCounts([shop]);
  return sendSuccess(res, 200, 'Farmer shop retrieved', withCount);
});

router.post('/farmer/shops', async (req: Request, res: Response) => {
  const farmerId = String(req.body.farmerId || '');
  if (!farmerId) return sendError(res, 400, 'VALIDATION_ERROR', 'farmerId is required');
  const existing = await findShopByFarmerId(farmerId);
  if (existing) return sendError(res, 400, 'SHOP_EXISTS', 'You already have a shop. Edit or delete it first.');
  const shop: Shop = {
    id: 'shop_' + Date.now(),
    name: req.body.name,
    farmerId,
    farmerName: req.body.farmerName,
    address: req.body.address,
    radiusKm: req.body.radiusKm ? Number(req.body.radiusKm) : 10,
    operatingHours: req.body.operatingHours || '07:00 AM - 09:00 PM',
    status: 'active',
    location: {
      lat: req.body.lat ? Number(req.body.lat) : 16.5062,
      lng: req.body.lng ? Number(req.body.lng) : 80.648,
    },
  };
  await persistShop(shop);
  return sendSuccess(res, 201, 'Farmer shop created', { ...shop, productCount: 0 });
});

router.put('/farmer/shops/:id', async (req: Request, res: Response) => {
  const shopId = String(req.params.id);
  const farmerId = String(req.body.farmerId || '');
  const existing = await resolveShopById(shopId);
  if (!existing) return sendError(res, 404, 'SHOP_NOT_FOUND', 'Shop not found');
  if (existing.farmerId && farmerId && existing.farmerId !== farmerId) {
    return sendError(res, 403, 'FORBIDDEN', 'You can only edit your own shop');
  }
  const updated: Shop = {
    ...existing,
    name: req.body.name ?? existing.name,
    address: req.body.address ?? existing.address,
    farmerName: req.body.farmerName ?? existing.farmerName,
    operatingHours: req.body.operatingHours ?? existing.operatingHours,
    status: req.body.status ?? existing.status,
    farmerId: existing.farmerId || farmerId,
    radiusKm: req.body.radiusKm !== undefined ? Number(req.body.radiusKm) : existing.radiusKm,
    location: {
      lat: req.body.lat !== undefined ? Number(req.body.lat) : existing.location.lat,
      lng: req.body.lng !== undefined ? Number(req.body.lng) : existing.location.lng,
    },
  };
  await persistShop(updated);
  const [withCount] = await attachProductCounts([updated]);
  return sendSuccess(res, 200, 'Farmer shop updated', withCount);
});

router.delete('/farmer/shops/:id', async (req: Request, res: Response) => {
  const shopId = String(req.params.id);
  const farmerId = String(req.query.farmerId || '');
  const existing = await resolveShopById(shopId);
  if (!existing) return sendError(res, 404, 'SHOP_NOT_FOUND', 'Shop not found');
  if (existing.farmerId && farmerId && existing.farmerId !== farmerId) {
    return sendError(res, 403, 'FORBIDDEN', 'You can only delete your own shop');
  }
  await removeShop(shopId);
  return sendSuccess(res, 200, 'Farmer shop deleted', { id: shopId });
});

router.get('/shops/public-list', async (req: Request, res: Response) => {
  const shops = (await resolveShops()).filter((shop) => shop.status === 'active');
  const withCounts = await attachProductCounts(shops);
  sendSuccess(
    res,
    200,
    'Public active shops list',
    withCounts.map((shop) => ({
      id: shop.id,
      name: shop.name,
      address: shop.address,
      farmerName: shop.farmerName,
      productCount: shop.productCount,
    })),
  );
});

export default router;
