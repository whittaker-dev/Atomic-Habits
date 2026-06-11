import { Router } from 'express';
import { getPlanTrip, upsertPlanTrip } from '../handlers/plan-trip.handler.js';

const planTripRouter: Router = Router();

planTripRouter.get('/:slug', getPlanTrip);
planTripRouter.put('/:slug', upsertPlanTrip);

export default planTripRouter;
