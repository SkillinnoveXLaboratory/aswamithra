import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

// System Audit Logs Stream
router.get('/admin/audit-logs', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Platform audit logs stream', []);
});

router.get('/admin/audit-logs/:id', (req: Request, res: Response) => {
  sendError(res, 404, 'AUDIT_LOG_NOT_FOUND', 'Audit log not found');
});

// RBAC System Roles CRUD
router.get('/admin/roles', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'RBAC roles list', [
    { id: 'role_1', name: 'Operations Manager', permissions: ['manage_products', 'manage_orders', 'view_analytics'] },
  ]);
});

router.post('/admin/roles', (req: Request, res: Response) => {
  sendSuccess(res, 201, 'RBAC role created', { id: 'role_' + Date.now(), ...req.body });
});

router.get('/admin/roles/:id', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'RBAC role details', { id: req.params.id, name: 'Operations Manager' });
});

router.put('/admin/roles/:id', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'RBAC role permissions updated', { id: req.params.id, ...req.body });
});

router.delete('/admin/roles/:id', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'RBAC role deleted', { id: req.params.id });
});

// Admin Team Members CRUD
router.get('/admin/team', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Admin team members', [
    { id: 'team_1', name: 'Srinivas R.', email: 'srinivas@aswamithra.in', role: 'Operations Manager' },
  ]);
});

router.post('/admin/team', (req: Request, res: Response) => {
  sendSuccess(res, 201, 'Team member invited', { id: 'team_' + Date.now(), ...req.body });
});

router.put('/admin/team/:id', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Team member role updated', { id: req.params.id, ...req.body });
});

router.delete('/admin/team/:id', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Team member access revoked', { id: req.params.id });
});

// System Global Configuration (Supporting both /admin/system/config and /admin/config)
const getSystemConfig = (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Global platform configuration flags', {
    maintenanceMode: false,
    minOrderValueCod: 100.0,
    maxOrderValueCod: 5000.0,
    autoApproveKyc: false,
    defaultCommissionRatePercent: 4.5,
  });
};

const putSystemConfig = (req: Request, res: Response) => {
  sendSuccess(res, 200, 'Global platform configuration flags updated', { ...req.body });
};

router.get('/admin/system/config', getSystemConfig);
router.get('/admin/config', getSystemConfig);
router.put('/admin/system/config', putSystemConfig);
router.put('/admin/config', putSystemConfig);

export default router;
