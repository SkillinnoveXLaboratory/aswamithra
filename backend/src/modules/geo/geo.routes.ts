import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, ServiceLocation } from '../../store/db.store';

const router = Router();

// Geo Service Locations Public & Admin
router.get('/geo/service-locations', (req: Request, res: Response) => {
  const activeLocations = db.serviceLocations.filter((l) => l.status === 'active');
  sendSuccess(res, 200, 'Operational service districts & cities', activeLocations);
});

router.get('/geo/pincode-check', (req: Request, res: Response) => {
  const pincode = req.query.pincode as string;
  const isAvailable = pincode ? pincode.startsWith('52') || pincode.startsWith('53') : true;

  sendSuccess(res, 200, 'Serviceability checked', {
    pincode: pincode || '520001',
    isServiceable: isAvailable,
    district: isAvailable ? 'Krishna' : 'Unserviceable Region',
    state: 'Andhra Pradesh',
    estimatedDeliveryHours: isAvailable ? 4 : undefined,
  });
});

// Admin Geo Service Locations (Supporting both /admin/geo/service-locations and /admin/service-locations)
const getAdminLocations = (req: Request, res: Response) => {
  sendSuccess(res, 200, 'All service locations (Admin)', db.serviceLocations);
};

const postAdminLocation = (req: Request, res: Response) => {
  const newLoc: ServiceLocation = {
    id: 'loc_' + Date.now(),
    state: req.body.state || 'Andhra Pradesh',
    district: req.body.district || 'Guntur',
    city: req.body.city || 'Guntur',
    status: 'active',
  };
  db.serviceLocations.push(newLoc);
  sendSuccess(res, 201, 'Service location created', newLoc);
};

router.get('/admin/geo/service-locations', getAdminLocations);
router.get('/admin/service-locations', getAdminLocations);

router.post('/admin/geo/service-locations', postAdminLocation);
router.post('/admin/service-locations', postAdminLocation);

router.put('/admin/geo/service-locations/:id', (req: Request, res: Response) => {
  const loc = db.serviceLocations.find((l) => l.id === req.params.id);
  if (!loc) return sendError(res, 404, 'LOCATION_NOT_FOUND', 'Service location not found');
  Object.assign(loc, req.body);
  sendSuccess(res, 200, 'Service location updated', loc);
});
router.put('/admin/service-locations/:id', (req: Request, res: Response) => {
  const loc = db.serviceLocations.find((l) => l.id === req.params.id);
  if (!loc) return sendError(res, 404, 'LOCATION_NOT_FOUND', 'Service location not found');
  Object.assign(loc, req.body);
  sendSuccess(res, 200, 'Service location updated', loc);
});

router.delete('/admin/geo/service-locations/:id', (req: Request, res: Response) => {
  const index = db.serviceLocations.findIndex((l) => l.id === req.params.id);
  if (index !== -1) db.serviceLocations.splice(index, 1);
  sendSuccess(res, 200, 'Service location deleted', { id: req.params.id });
});

export default router;
