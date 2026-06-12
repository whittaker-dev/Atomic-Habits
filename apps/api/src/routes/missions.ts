import { Router } from 'express';
import * as missionHandler from '../handlers/mission.handler.js';

const missionsRouter: Router = Router();

missionsRouter.post('/:id/complete', missionHandler.completeMission);

export default missionsRouter;
