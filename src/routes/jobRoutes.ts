import { Router } from 'express';
import { JobController } from '../controllers/JobController';

const router = Router();
const jobController = new JobController();

router.post('/jobs', jobController.createJob);
router.post('/jobs/:id/confirm-payment', jobController.confirmPayment);
router.get('/jobs/:id', jobController.getJob);

export default router;


