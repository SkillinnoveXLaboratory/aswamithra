import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { query } from '../../config/db.config';
import { db } from '../../store/db.store';

const router = Router();

// Delivery Agent Registration
router.post('/delivery/register', async (req: Request, res: Response) => {
  const newPartner = {
    id: 'agent_' + Date.now(),
    name: req.body.name || 'Delivery Partner',
    mobile: req.body.mobile || '+919900000000',
    vehicle: req.body.vehicle || 'Motorcycle',
    status: 'online',
    lat: 16.501,
    lng: 80.645,
  };
  await query('INSERT INTO delivery_partners (id, name, mobile, vehicle, status, lat, lng) VALUES ($1,$2,$3,$4,$5,$6,$7)', [newPartner.id, newPartner.name, newPartner.mobile, newPartner.vehicle, newPartner.status, newPartner.lat, newPartner.lng]);
  sendSuccess(res, 201, 'Delivery agent registered successfully', newPartner);
});

router.get('/delivery/active-orders', async (_req: Request, res: Response) => {
  const readyOrders = (await query("SELECT * FROM orders WHERE status IN ('PACKED','ACCEPTED') ORDER BY created_at DESC")).rows;
  sendSuccess(res, 200, 'Orders ready for doorstep delivery claim', readyOrders);
});

router.post('/delivery/orders/:id/claim', async (req: Request, res: Response) => {
  const result = await query("UPDATE orders SET status = 'OUT_FOR_DELIVERY' WHERE id = $1 RETURNING *", [req.params.id]);
  const order = result.rows[0];
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
  sendSuccess(res, 200, 'Order claimed for doorstep delivery', { orderId: order.id, status: 'OUT_FOR_DELIVERY' });
});

router.post('/delivery/location-update', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Agent live GPS location streamed', { lat: req.body.lat, lng: req.body.lng });
});

// Admin Delivery Partners CRUD (Supporting both /admin/delivery/partners and /admin/delivery-partners)
const getPartners = (req: Request, res: Response) => {
  query('SELECT * FROM delivery_partners ORDER BY created_at DESC').then((result) => sendSuccess(res, 200, 'All delivery partners (Admin)', result.rows));
};

const postPartner = (req: Request, res: Response) => {
  const newPartner = {
    id: 'agent_' + Date.now(),
    name: req.body.name || 'New Delivery Agent',
    mobile: req.body.mobile || '+919900000000',
    vehicle: req.body.vehicle || 'Motorcycle',
    status: 'online',
    lat: 16.501,
    lng: 80.645,
  };
  query('INSERT INTO delivery_partners (id, name, mobile, vehicle, status, lat, lng) VALUES ($1,$2,$3,$4,$5,$6,$7)', [newPartner.id, newPartner.name, newPartner.mobile, newPartner.vehicle, newPartner.status, newPartner.lat, newPartner.lng]);
  sendSuccess(res, 201, 'Delivery partner created', newPartner);
};

router.get('/admin/delivery-partners', getPartners);
router.get('/admin/delivery/partners', getPartners);

router.post('/admin/delivery-partners', postPartner);
router.post('/admin/delivery/partners', postPartner);

router.get('/admin/delivery-partners/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM delivery_partners WHERE id = $1 LIMIT 1', [req.params.id]);
  if (!result.rows[0]) return sendError(res, 404, 'AGENT_NOT_FOUND', 'Delivery partner not found');
  sendSuccess(res, 200, 'Delivery partner detail', result.rows[0]);
});
router.get('/admin/delivery/partners/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM delivery_partners WHERE id = $1 LIMIT 1', [req.params.id]);
  if (!result.rows[0]) return sendError(res, 404, 'AGENT_NOT_FOUND', 'Delivery partner not found');
  sendSuccess(res, 200, 'Delivery partner detail', result.rows[0]);
});

router.put('/admin/delivery-partners/:id', async (req: Request, res: Response) => {
  await query('UPDATE delivery_partners SET name = COALESCE($1,name), mobile = COALESCE($2,mobile), vehicle = COALESCE($3,vehicle), status = COALESCE($4,status), lat = COALESCE($5,lat), lng = COALESCE($6,lng) WHERE id = $7', [req.body.name ?? null, req.body.mobile ?? null, req.body.vehicle ?? null, req.body.status ?? null, req.body.lat ?? null, req.body.lng ?? null, req.params.id]);
  const result = await query('SELECT * FROM delivery_partners WHERE id = $1 LIMIT 1', [req.params.id]);
  sendSuccess(res, 200, 'Delivery partner updated', result.rows[0]);
});
router.put('/admin/delivery/partners/:id', async (req: Request, res: Response) => {
  await query('UPDATE delivery_partners SET name = COALESCE($1,name), mobile = COALESCE($2,mobile), vehicle = COALESCE($3,vehicle), status = COALESCE($4,status), lat = COALESCE($5,lat), lng = COALESCE($6,lng) WHERE id = $7', [req.body.name ?? null, req.body.mobile ?? null, req.body.vehicle ?? null, req.body.status ?? null, req.body.lat ?? null, req.body.lng ?? null, req.params.id]);
  const result = await query('SELECT * FROM delivery_partners WHERE id = $1 LIMIT 1', [req.params.id]);
  sendSuccess(res, 200, 'Delivery partner updated', result.rows[0]);
});

router.put('/admin/delivery-partners/:id/status', async (req: Request, res: Response) => {
  await query('UPDATE delivery_partners SET status = COALESCE($1,status) WHERE id = $2', [req.body.status ?? null, req.params.id]);
  const result = await query('SELECT * FROM delivery_partners WHERE id = $1 LIMIT 1', [req.params.id]);
  sendSuccess(res, 200, 'Delivery partner status updated', result.rows[0]);
});
router.put('/admin/delivery/partners/:id/status', async (req: Request, res: Response) => {
  await query('UPDATE delivery_partners SET status = COALESCE($1,status) WHERE id = $2', [req.body.status ?? null, req.params.id]);
  const result = await query('SELECT * FROM delivery_partners WHERE id = $1 LIMIT 1', [req.params.id]);
  sendSuccess(res, 200, 'Delivery partner status updated', result.rows[0]);
});

router.delete('/admin/delivery-partners/:id', async (req: Request, res: Response) => {
  await query('DELETE FROM delivery_partners WHERE id = $1', [req.params.id]);
  sendSuccess(res, 200, 'Delivery partner deleted', { id: req.params.id });
});

export default router;
