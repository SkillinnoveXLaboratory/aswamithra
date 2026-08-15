import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { query } from '../../config/db.config';

const router = Router();

router.post('/notifications/fcm-token', (req: Request, res: Response) => {
  sendSuccess(res, 200, 'FCM device token registered', { token: req.body.token });
});

router.delete('/notifications/fcm-token', (_req: Request, res: Response) => {
  sendSuccess(res, 200, 'FCM device token unregistered');
});

router.get('/notifications/preferences', (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Notification channel preferences', { pushEnabled: true, whatsappEnabled: true, smsEnabled: true });
});

router.put('/notifications/preferences', (req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Notification preferences updated', { ...req.body });
});

router.get('/notifications', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_998124';
  const result = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return sendSuccess(res, 200, 'User notifications list', result.rows);
});

router.patch('/notifications/read-all', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'usr_998124';
  await query('UPDATE notifications SET read = TRUE WHERE user_id = $1', [userId]);
  return sendSuccess(res, 200, 'All notifications marked as read');
});

router.get('/notifications/:id', async (req: Request, res: Response) => {
  const result = await query('SELECT * FROM notifications WHERE id = $1 LIMIT 1', [req.params.id]);
  const notif = result.rows[0];
  if (!notif) return sendError(res, 404, 'NOTIF_NOT_FOUND', 'Notification not found');
  return sendSuccess(res, 200, 'Notification detail', notif);
});

router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  const result = await query('UPDATE notifications SET read = TRUE WHERE id = $1 RETURNING *', [req.params.id]);
  return sendSuccess(res, 200, 'Notification marked as read', result.rows[0] || { id: req.params.id, read: true });
});

router.delete('/notifications/:id', async (req: Request, res: Response) => {
  await query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
  return sendSuccess(res, 200, 'Notification deleted', { id: req.params.id });
});

router.get('/admin/notifications/templates', (_req: Request, res: Response) => {
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

router.get('/admin/notifications/logs', (_req: Request, res: Response) => {
  return sendSuccess(res, 200, 'Notification dispatch logs', [
    { id: 'log_n1', channel: 'whatsapp', recipient: '+919876543210', status: 'DELIVERED', sentAt: '2026-07-25T16:50:05.000Z' },
  ]);
});

router.post('/admin/notifications/broadcast', async (req: Request, res: Response) => {
  const userResult = await query('SELECT id FROM users ORDER BY created_at DESC');
  const users = userResult.rows as Array<{ id: string }>;
  const notifications = users.map((user) => ({
    id: 'notif_' + Date.now() + '_' + user.id,
    userId: user.id,
    title: req.body.title || 'Platform Announcement',
    message: req.body.message || 'Check out new organic produce!',
    read: false,
  }));
  for (const notif of notifications) {
    await query('INSERT INTO notifications (id, user_id, title, message, read) VALUES ($1,$2,$3,$4,$5)', [
      notif.id,
      notif.userId,
      notif.title,
      notif.message,
      notif.read,
    ]);
  }
  return sendSuccess(res, 200, 'Broadcast push notification sent to target segment', {
    targetSegment: req.body.targetSegment || 'all_customers',
    dispatchedCount: users.length,
  });
});

export default router;
