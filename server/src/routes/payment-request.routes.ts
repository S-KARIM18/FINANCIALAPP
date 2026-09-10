import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as prController from '../controllers/payment-request.controller';

const router = Router();

router.use(authenticate);

router.post('/',              prController.createPaymentRequest);
router.get('/',               prController.listPaymentRequests);
router.post('/:id/pay',       prController.payPaymentRequest);
router.post('/:id/decline',   prController.declinePaymentRequest);

export default router;
