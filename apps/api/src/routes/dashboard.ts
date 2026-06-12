import { Router } from 'express';
import * as dashboardHandler from '../handlers/dashboard.handler.js';

const dashboardRouter: Router = Router();

dashboardRouter.get('/', dashboardHandler.getDashboard);

export default dashboardRouter;
