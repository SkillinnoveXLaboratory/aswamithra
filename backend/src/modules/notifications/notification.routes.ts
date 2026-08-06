import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { db, Notification } from '../../store/db.store';

const router = Router();

// FCM Token Register/Unregister
router.post('/notifications/fcm-token', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'FCM device token registered', { token: req.body.token });
});

router.delete('/notifications/fcm-token', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'FCM device token unregistered');
});

// Preferences Routes (Placed BEFORE parametric :id)
router.get('/notifications/preferences', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Notification channel preferences', { pushEnabled: true, whatsappEnabled: true, smsEnabled: true });
});

router.put('/notifications/preferences', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Notification preferences updated', { ...req.body });
});

// In-App Notifications CRUD
router.get('/notifications', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_998124';
  const userNotifs = db.notifications.filter((n) => n.userId === userId);
  return sendSuccess(res, 200, 'User notifications list', userNotifs);
});

router.patch('/notifications/read-all', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_998124';
  db.notifications.filter((n) => n.userId === userId).forEach((n) => (n.read = true));
  return sendSuccess(res, 200, 'All notifications marked as read');
});

router.get('/notifications/:id', (req: Request, res: Response) => {
  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (!notif) return sendError(res, 404, 'NOTIF_NOT_FOUND', 'Notification not found');
  return sendSuccess(res, 200, 'Notification detail', notif);
});

router.patch('/notifications/:id/read', (req: Request, res: Response) => {
  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (notif) notif.read = true;
  return sendSuccess(res, 200, 'Notification marked as read', notif || { id: req.params.id, read: true });
});

router.delete('/notifications/:id', (req: Request, res: Response) => {
  const index = db.notifications.findIndex((n) => n.id === req.params.id);
  if (index !== -1) db.notifications.splice(index, 1);
  return sendSuccess(res, 200, 'Notification deleted', { id: req.params.id });
});

// Admin Notification Management
router.get('/admin/notifications/templates', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Notification message templates', [
    { id: 'tmpl_1', name: 'ORDER_PLACED', body: 'New order #{{orderId}} received from {{customerName}}!' },
  ]);
});

router.post('/admin/notifications/templates', (req: Request, res: Response) => {
  return sendSuccess(res, 201, 'Notification template created', { id: 'tmpl_' + Date.now(), ...req.body });
});

router.get('/admin/notifications/templates/:id', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Notification template detail', { id: req.params.id, name: 'ORDER_PLACED' });
});

router.put('/admin/notifications/templates/:id', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Notification template updated', { id: req.params.id, ...req.body });
});

router.delete('/admin/notifications/templates/:id', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Notification template deleted', { id: req.params.id });
});

router.get('/admin/notifications/logs', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Notification dispatch logs', [
    { id: 'log_n1', channel: 'whatsapp', recipient: '+919876543210', status: 'DELIVERED', sentAt: '2026-07-25T16:50:05.000Z' },
  ]);
});

router.post('/admin/notifications/broadcast', (req: Request, res: Response) => {
  const newNotif: Notification = {
    id: 'notif_' + Date.now(),
    userId: 'usr_998124',
    title: req.body.title || 'Platform Announcement',
    message: req.body.message || 'Check out new organic produce!',
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.push(newNotif);
  return sendSuccess(res, 200, 'Broadcast push notification sent to target segment', { targetSegment: req.body.targetSegment || 'all_customers', dispatchedCount: db.users.length });
});

export default router;
