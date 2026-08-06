import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, DeliveryPartner } from '../../store/db.store';

const router = Router();

// Delivery Agent Registration
router.post('/delivery/register', (req: Request, res: Response) => {
  const newPartner: DeliveryPartner = {
    id: 'agent_' + Date.now(),
    name: req.body.name || 'Delivery Partner',
    mobile: req.body.mobile || '+919900000000',
    vehicle: req.body.vehicle || 'Motorcycle',
    status: 'online',
    location: { lat: 16.501, lng: 80.645 },
  };
  db.deliveryPartners.push(newPartner);
  sendSuccess(res, 201, 'Delivery agent registered successfully', newPartner);
});

router.get('/delivery/active-orders', (req: Request, res: Response) => {
  const readyOrders = db.orders.filter((o) => o.status === 'PACKED' || o.status === 'ACCEPTED');
  sendSuccess(res, 200, 'Orders ready for doorstep delivery claim', readyOrders);
});

router.post('/delivery/orders/:id/claim', (req: Request, res: Response) => {
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 404, 'ORDER_NOT_FOUND', 'Order not found');

  order.status = 'OUT_FOR_DELIVERY';
  sendSuccess(res, 200, 'Order claimed for doorstep delivery', { orderId: order.id, status: 'OUT_FOR_DELIVERY' });
});

router.post('/delivery/location-update', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Agent live GPS location streamed', { lat: req.body.lat, lng: req.body.lng });
});

// Admin Delivery Partners CRUD (Supporting both /admin/delivery/partners and /admin/delivery-partners)
const getPartners = (req: Request, res: Response) => {
  sendSuccess(res, 200, 'All delivery partners (Admin)', db.deliveryPartners);
};

const postPartner = (req: Request, res: Response) => {
  const newPartner: DeliveryPartner = {
    id: 'agent_' + Date.now(),
    name: req.body.name || 'New Delivery Agent',
    mobile: req.body.mobile || '+919900000000',
    vehicle: req.body.vehicle || 'Motorcycle',
    status: 'online',
    location: { lat: 16.501, lng: 80.645 },
  };
  db.deliveryPartners.push(newPartner);
  sendSuccess(res, 201, 'Delivery partner created', newPartner);
};

router.get('/admin/delivery-partners', getPartners);
router.get('/admin/delivery/partners', getPartners);

router.post('/admin/delivery-partners', postPartner);
router.post('/admin/delivery/partners', postPartner);

router.get('/admin/delivery-partners/:id', (req: Request, res: Response) => {
  const agent = db.deliveryPartners.find((d) => d.id === req.params.id);
  if (!agent) return sendError(res, 404, 'AGENT_NOT_FOUND', 'Delivery partner not found');
  sendSuccess(res, 200, 'Delivery partner detail', agent);
});
router.get('/admin/delivery/partners/:id', (req: Request, res: Response) => {
  const agent = db.deliveryPartners.find((d) => d.id === req.params.id);
  if (!agent) return sendError(res, 404, 'AGENT_NOT_FOUND', 'Delivery partner not found');
  sendSuccess(res, 200, 'Delivery partner detail', agent);
});

router.put('/admin/delivery-partners/:id', (req: Request, res: Response) => {
  const agent = db.deliveryPartners.find((d) => d.id === req.params.id);
  if (!agent) return sendError(res, 404, 'AGENT_NOT_FOUND', 'Delivery partner not found');
  Object.assign(agent, req.body);
  sendSuccess(res, 200, 'Delivery partner updated', agent);
});
router.put('/admin/delivery/partners/:id', (req: Request, res: Response) => {
  const agent = db.deliveryPartners.find((d) => d.id === req.params.id);
  if (!agent) return sendError(res, 404, 'AGENT_NOT_FOUND', 'Delivery partner not found');
  Object.assign(agent, req.body);
  sendSuccess(res, 200, 'Delivery partner updated', agent);
});

router.put('/admin/delivery-partners/:id/status', (req: Request, res: Response) => {
  const agent = db.deliveryPartners.find((d) => d.id === req.params.id);
  if (!agent) return sendError(res, 404, 'AGENT_NOT_FOUND', 'Delivery partner not found');
  if (req.body.status) agent.status = req.body.status;
  sendSuccess(res, 200, 'Delivery partner status updated', agent);
});
router.put('/admin/delivery/partners/:id/status', (req: Request, res: Response) => {
  const agent = db.deliveryPartners.find((d) => d.id === req.params.id);
  if (!agent) return sendError(res, 404, 'AGENT_NOT_FOUND', 'Delivery partner not found');
  if (req.body.status) agent.status = req.body.status;
  sendSuccess(res, 200, 'Delivery partner status updated', agent);
});

router.delete('/admin/delivery-partners/:id', (req: Request, res: Response) => {
  const index = db.deliveryPartners.findIndex((d) => d.id === req.params.id);
  if (index !== -1) db.deliveryPartners.splice(index, 1);
  sendSuccess(res, 200, 'Delivery partner deleted', { id: req.params.id });
});

export default router;
