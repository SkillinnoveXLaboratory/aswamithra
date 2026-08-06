import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { asyncHandler } from '../../utils/async-handler';
import { authenticateJwt } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/auth/send-otp', asyncHandler(AuthController.sendOtp));
router.post('/auth/verify-otp', asyncHandler(AuthController.verifyOtp));
router.post('/auth/login-pin', asyncHandler(AuthController.loginPin));
router.post('/auth/refresh-token', asyncHandler(AuthController.refreshToken));
router.post('/auth/google', asyncHandler(AuthController.googleSso));
router.post('/auth/set-pin', authenticateJwt(), asyncHandler(AuthController.setPin));
router.post('/auth/verify-pin', authenticateJwt(), asyncHandler(AuthController.verifyPin));
router.post('/auth/logout', asyncHandler(AuthController.logout));

export default router;
