import express from 'express';
import { createUserProject, getUserCredits, getUserPlan, getUserProject, getUserProjects, purchaseCredits, togglePublish } from '../controllers/userController.js';
import { protect } from '../middlewares/auth.js';

const userRouter = express.Router();

userRouter.get('/credits',protect, getUserCredits)
userRouter.get('/plan',protect, getUserPlan)
userRouter.post('/project',protect, createUserProject)
userRouter.get('/project/:projectId',protect, getUserProject)
userRouter.get('/projects',protect, getUserProjects)
userRouter.get('/publish-toggle/:projectId',protect, togglePublish)
userRouter.post('/purchase-credits',protect, purchaseCredits)

export default userRouter