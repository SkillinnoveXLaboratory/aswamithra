import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { query } from '../../config/db.config';

const router = Router();

router.get('/geo/service-locations', async (_req: Request, res: Response) => {
  const result = await query("SELECT * FROM service_locations WHERE status = 'active' ORDER BY state ASC, district ASC, city ASC");
  sendSuccess(res, 200, 'Operational service districts & cities', result.rows);
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

const getAdminLocations = async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM service_locations ORDER BY state ASC, district ASC, city ASC');
  sendSuccess(res, 200, 'All service locations (Admin)', result.rows);
};

const postAdminLocation = async (req: Request, res: Response) => {
  const newLoc = {
    id: 'loc_' + Date.now(),
    state: req.body.state || 'Andhra Pradesh',
    district: req.body.district || 'Guntur',
    city: req.body.city || 'Guntur',
    status: req.body.status || 'active',
    lat: req.body.lat ?? null,
    lng: req.body.lng ?? null,
    activeFarmers: req.body.activeFarmers ?? null,
    activeHubs: req.body.activeHubs ?? null,
  };
  await query(
    'INSERT INTO service_locations (id, state, district, city, status, lat, lng, active_farmers, active_hubs) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [newLoc.id, newLoc.state, newLoc.district, newLoc.city, newLoc.status, newLoc.lat, newLoc.lng, newLoc.activeFarmers, newLoc.activeHubs],
  );
  sendSuccess(res, 201, 'Service location created', newLoc);
};

router.get('/admin/geo/service-locations', getAdminLocations);
router.get('/admin/service-locations', getAdminLocations);
router.post('/admin/geo/service-locations', postAdminLocation);
router.post('/admin/service-locations', postAdminLocation);

router.put('/admin/geo/service-locations/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM service_locations WHERE id = $1 LIMIT 1', [req.params.id]);
  if (!result.rows[0]) return sendError(res, 404, 'LOCATION_NOT_FOUND', 'Service location not found');
  await query(
    'UPDATE service_locations SET state = $1, district = $2, city = $3, status = $4, lat = $5, lng = $6, active_farmers = $7, active_hubs = $8 WHERE id = $9',
    [
      req.body.state ?? result.rows[0].state,
      req.body.district ?? result.rows[0].district,
      req.body.city ?? result.rows[0].city,
      req.body.status ?? result.rows[0].status,
      req.body.lat ?? result.rows[0].lat,
      req.body.lng ?? result.rows[0].lng,
      req.body.activeFarmers ?? result.rows[0].active_farmers,
      req.body.activeHubs ?? result.rows[0].active_hubs,
      req.params.id,
    ],
  );
  sendSuccess(res, 200, 'Service location updated', { id: req.params.id });
});

router.put('/admin/service-locations/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM service_locations WHERE id = $1 LIMIT 1', [req.params.id]);
  if (!result.rows[0]) return sendError(res, 404, 'LOCATION_NOT_FOUND', 'Service location not found');
  await query(
    'UPDATE service_locations SET state = $1, district = $2, city = $3, status = $4, lat = $5, lng = $6, active_farmers = $7, active_hubs = $8 WHERE id = $9',
    [
      req.body.state ?? result.rows[0].state,
      req.body.district ?? result.rows[0].district,
      req.body.city ?? result.rows[0].city,
      req.body.status ?? result.rows[0].status,
      req.body.lat ?? result.rows[0].lat,
      req.body.lng ?? result.rows[0].lng,
      req.body.activeFarmers ?? result.rows[0].active_farmers,
      req.body.activeHubs ?? result.rows[0].active_hubs,
      req.params.id,
    ],
  );
  sendSuccess(res, 200, 'Service location updated', { id: req.params.id });
});

router.delete('/admin/geo/service-locations/:id', async (req: Request, res: Response) => {
  await query('DELETE FROM service_locations WHERE id = $1', [req.params.id]);
  sendSuccess(res, 200, 'Service location deleted', { id: req.params.id });
});

export default router;
