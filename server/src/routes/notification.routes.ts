import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as notifController from '../controllers/notification.controller';

const router = Router();

router.use(authenticate);
router.get('/',              notifController.listNotifications);
router.patch('/read-all',    notifController.markAllRead);
router.post('/read-all',     notifController.markAllRead);
router.patch('/:id/read',    notifController.markRead);
router.post('/:id/read',     notifController.markRead);

export default router;
