import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

router.use(authenticate);

router.get('/me',         userController.getMe);
router.patch('/me',       userController.updateMe);
router.get('/me/account', userController.getMyAccount);

export default router;
