import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as txController from '../controllers/transaction.controller';

const router = Router();

// All transaction routes require authentication
router.use(authenticate);

router.post('/deposit',     txController.deposit);
router.post('/bill-pay',    txController.payBill);
router.post('/',            txController.createTransaction);   // Requires Idempotency-Key header
router.get('/',             txController.listTransactions);
router.get('/:id',          txController.getTransactionById);
router.get('/:id/status',   txController.getTransactionStatus);
router.post('/:id/reverse', txController.reverseTransaction);

export default router;
