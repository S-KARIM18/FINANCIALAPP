import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again in 15 minutes.' },
  },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many OTP requests. Please wait.' },
  },
});

router.post('/register',       authLimiter, validate(authController.registerSchema),        authController.register);
router.post('/verify-otp',     otpLimiter,  validate(authController.verifyOtpSchema),        authController.verifyOtp);
router.post('/set-pin',        authLimiter, authenticate, validate(authController.setPinSchema), authController.setPin);
router.post('/login',          authLimiter, validate(authController.loginSchema),            authController.login);
router.post('/refresh',        authLimiter, validate(authController.refreshSchema),          authController.refresh);
router.post('/forgot-password', otpLimiter, validate(authController.forgotPasswordSchema),   authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(authController.resetPasswordSchema),    authController.resetPassword);

export default router;
