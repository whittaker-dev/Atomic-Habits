import { Router } from 'express';
import * as authHandler from '../handlers/auth.handler.js';

const authRouter: Router = Router();

authRouter.post('/register', authHandler.register);
authRouter.post('/register/verify', authHandler.verifyRegistration);
authRouter.post('/register/resend', authHandler.resendRegistrationCode);
authRouter.post('/logout', authHandler.logout);
authRouter.get('/me', authHandler.me);

export default authRouter;
