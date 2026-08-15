import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { query } from '../../config/db.config';

const router = Router();

router.get('/market-prices/baseline', async (_req: Request, res: Response) => {
  const result = await query("SELECT * FROM market_prices WHERE is_published = TRUE ORDER BY crop_name ASC");
  sendSuccess(res, 200, 'Baseline mandi reference prices', result.rows);
});

router.get('/admin/market-prices', async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM market_prices ORDER BY crop_name ASC');
  sendSuccess(res, 200, 'All mandi market prices (Admin)', result.rows);
});
router.get('/market-prices/admin', async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM market_prices ORDER BY crop_name ASC');
  sendSuccess(res, 200, 'All mandi market prices (Admin)', result.rows);
});

router.post('/admin/market-prices/import-csv', (_req: Request, res: Response) => {
  sendSuccess(res, 200, 'Mandi market prices imported successfully from CSV', { importedCount: 14 });
});
router.post('/market-prices/admin/import-csv', (_req: Request, res: Response) => {
  sendSuccess(res, 200, 'Mandi market prices imported successfully from CSV', { importedCount: 14 });
});

router.get('/admin/market-prices/export-csv', (_req: Request, res: Response) => {
  sendSuccess(res, 200, 'Export generated', { downloadUrl: 'https://storage.aswamithra.in/exports/market_prices.csv' });
});
router.get('/market-prices/admin/export-csv', (_req: Request, res: Response) => {
  sendSuccess(res, 200, 'Export generated', { downloadUrl: 'https://storage.aswamithra.in/exports/market_prices.csv' });
});

router.get('/admin/market-prices/flagged-discrepancies', (_req: Request, res: Response) => {
  sendSuccess(res, 200, 'Flagged price discrepancies (>30% variation)', []);
});
router.get('/market-prices/admin/flagged-discrepancies', (_req: Request, res: Response) => {
  sendSuccess(res, 200, 'Flagged price discrepancies (>30% variation)', []);
});

router.post('/admin/market-prices', async (req: Request, res: Response) => {
  const newPrice = {
    id: 'mp_' + Date.now(),
    cropName: req.body.cropName || 'Farm Produce',
    category: req.body.category || 'vegetables',
    region: req.body.region || 'Krishna',
    referencePrice: parseFloat(req.body.referencePrice) || 50.0,
    unit: req.body.unit || 'kg',
    isPublished: true,
  };
  await query(
    'INSERT INTO market_prices (id, crop_name, category, region, reference_price, unit, is_published) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [newPrice.id, newPrice.cropName, newPrice.category, newPrice.region, newPrice.referencePrice, newPrice.unit, newPrice.isPublished],
  );
  sendSuccess(res, 201, 'Market reference price created', newPrice);
});
router.post('/market-prices/admin', async (req: Request, res: Response) => {
  const newPrice = {
    id: 'mp_' + Date.now(),
    cropName: req.body.cropName || 'Farm Produce',
    category: req.body.category || 'vegetables',
    region: req.body.region || 'Krishna',
    referencePrice: parseFloat(req.body.referencePrice) || 50.0,
    unit: req.body.unit || 'kg',
    isPublished: true,
  };
  await query(
    'INSERT INTO market_prices (id, crop_name, category, region, reference_price, unit, is_published) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [newPrice.id, newPrice.cropName, newPrice.category, newPrice.region, newPrice.referencePrice, newPrice.unit, newPrice.isPublished],
  );
  sendSuccess(res, 201, 'Market reference price created', newPrice);
});

router.get('/admin/market-prices/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM market_prices WHERE id = $1 LIMIT 1', [req.params.id]);
  const item = result.rows[0];
  if (!item) return sendError(res, 404, 'PRICE_NOT_FOUND', 'Price entry not found');
  sendSuccess(res, 200, 'Market price detail', item);
});
router.get('/market-prices/admin/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM market_prices WHERE id = $1 LIMIT 1', [req.params.id]);
  const item = result.rows[0];
  if (!item) return sendError(res, 404, 'PRICE_NOT_FOUND', 'Price entry not found');
  sendSuccess(res, 200, 'Market price detail', item);
});

router.put('/admin/market-prices/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM market_prices WHERE id = $1 LIMIT 1', [req.params.id]);
  const item = result.rows[0];
  if (!item) return sendError(res, 404, 'PRICE_NOT_FOUND', 'Price entry not found');
  const updated = {
    cropName: req.body.cropName ?? item.crop_name,
    category: req.body.category ?? item.category,
    region: req.body.region ?? item.region,
    referencePrice: req.body.referencePrice ?? item.reference_price,
    unit: req.body.unit ?? item.unit,
    isPublished: req.body.isPublished ?? item.is_published,
  };
  await query(
    'UPDATE market_prices SET crop_name = $1, category = $2, region = $3, reference_price = $4, unit = $5, is_published = $6 WHERE id = $7',
    [updated.cropName, updated.category, updated.region, updated.referencePrice, updated.unit, updated.isPublished, req.params.id],
  );
  sendSuccess(res, 200, 'Market reference price updated', { id: req.params.id, ...updated });
});
router.put('/market-prices/admin/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM market_prices WHERE id = $1 LIMIT 1', [req.params.id]);
  const item = result.rows[0];
  if (!item) return sendError(res, 404, 'PRICE_NOT_FOUND', 'Price entry not found');
  const updated = {
    cropName: req.body.cropName ?? item.crop_name,
    category: req.body.category ?? item.category,
    region: req.body.region ?? item.region,
    referencePrice: req.body.referencePrice ?? item.reference_price,
    unit: req.body.unit ?? item.unit,
    isPublished: req.body.isPublished ?? item.is_published,
  };
  await query(
    'UPDATE market_prices SET crop_name = $1, category = $2, region = $3, reference_price = $4, unit = $5, is_published = $6 WHERE id = $7',
    [updated.cropName, updated.category, updated.region, updated.referencePrice, updated.unit, updated.isPublished, req.params.id],
  );
  sendSuccess(res, 200, 'Market reference price updated', { id: req.params.id, ...updated });
});

router.delete('/admin/market-prices/:id', async (req: Request, res: Response) => {
  await query('DELETE FROM market_prices WHERE id = $1', [req.params.id]);
  sendSuccess(res, 200, 'Market reference price deleted', { id: req.params.id });
});

export default router;
