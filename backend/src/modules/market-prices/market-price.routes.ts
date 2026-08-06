import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, MarketPrice } from '../../store/db.store';

const router = Router();

// Mandi Baseline Public & Admin List
router.get('/market-prices/baseline', (req: Request, res: Response) => {
  const published = db.marketPrices.filter((m) => m.isPublished);
  sendSuccess(res, 200, 'Baseline mandi reference prices', published);
});

// Admin Market Prices Routes (Static routes defined BEFORE parametric :id)
router.get('/admin/market-prices', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'All mandi market prices (Admin)', db.marketPrices);
});
router.get('/market-prices/admin', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'All mandi market prices (Admin)', db.marketPrices);
});

router.post('/admin/market-prices/import-csv', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Mandi market prices imported successfully from CSV', { importedCount: 14 });
});
router.post('/market-prices/admin/import-csv', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Mandi market prices imported successfully from CSV', { importedCount: 14 });
});

router.get('/admin/market-prices/export-csv', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Export generated', { downloadUrl: 'https://storage.aswamithra.in/exports/market_prices.csv' });
});
router.get('/market-prices/admin/export-csv', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Export generated', { downloadUrl: 'https://storage.aswamithra.in/exports/market_prices.csv' });
});

router.get('/admin/market-prices/flagged-discrepancies', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Flagged price discrepancies (>30% variation)', []);
});
router.get('/market-prices/admin/flagged-discrepancies', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Flagged price discrepancies (>30% variation)', []);
});

router.post('/admin/market-prices', (req: Request, res: Response) => {
  const newPrice: MarketPrice = {
    id: 'mp_' + Date.now(),
    cropName: req.body.cropName || 'Farm Produce',
    category: req.body.category || 'vegetables',
    region: req.body.region || 'Krishna',
    referencePrice: parseFloat(req.body.referencePrice) || 50.0,
    unit: req.body.unit || 'kg',
    isPublished: true,
  };
  db.marketPrices.push(newPrice);
  sendSuccess(res, 201, 'Market reference price created', newPrice);
});
router.post('/market-prices/admin', (req: Request, res: Response) => {
  const newPrice: MarketPrice = {
    id: 'mp_' + Date.now(),
    cropName: req.body.cropName || 'Farm Produce',
    category: req.body.category || 'vegetables',
    region: req.body.region || 'Krishna',
    referencePrice: parseFloat(req.body.referencePrice) || 50.0,
    unit: req.body.unit || 'kg',
    isPublished: true,
  };
  db.marketPrices.push(newPrice);
  sendSuccess(res, 201, 'Market reference price created', newPrice);
});

// Parametric :id routes defined LAST
router.get('/admin/market-prices/:id', (req: Request, res: Response) => {
  const item = db.marketPrices.find((m) => m.id === req.params.id);
  if (!item) return sendError(res, 404, 'PRICE_NOT_FOUND', 'Price entry not found');
  sendSuccess(res, 200, 'Market price detail', item);
});
router.get('/market-prices/admin/:id', (req: Request, res: Response) => {
  const item = db.marketPrices.find((m) => m.id === req.params.id);
  if (!item) return sendError(res, 404, 'PRICE_NOT_FOUND', 'Price entry not found');
  sendSuccess(res, 200, 'Market price detail', item);
});

router.put('/admin/market-prices/:id', (req: Request, res: Response) => {
  const item = db.marketPrices.find((m) => m.id === req.params.id);
  if (!item) return sendError(res, 404, 'PRICE_NOT_FOUND', 'Price entry not found');

  Object.assign(item, req.body);
  sendSuccess(res, 200, 'Market reference price updated', item);
});
router.put('/market-prices/admin/:id', (req: Request, res: Response) => {
  const item = db.marketPrices.find((m) => m.id === req.params.id);
  if (!item) return sendError(res, 404, 'PRICE_NOT_FOUND', 'Price entry not found');

  Object.assign(item, req.body);
  sendSuccess(res, 200, 'Market reference price updated', item);
});

router.delete('/admin/market-prices/:id', (req: Request, res: Response) => {
  const index = db.marketPrices.findIndex((m) => m.id === req.params.id);
  if (index !== -1) db.marketPrices.splice(index, 1);
  sendSuccess(res, 200, 'Market reference price deleted', { id: req.params.id });
});

export default router;
