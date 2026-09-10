import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as activityController from '../controllers/activity.controller';

const router = Router();

router.use(authenticate);
router.get('/', activityController.getActivity);

export default router;
