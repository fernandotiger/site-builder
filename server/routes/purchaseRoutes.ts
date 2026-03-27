import express from 'express';
import {createSubscriptionCheckout}  from '../controllers/subscribe.controller.js';
import { purchaseCredits } from '../controllers/userController.js';
import {cancelSubscription} from '../controllers/cancelSubscription.controller.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();


// Protected routes
router.post('/subscribe', protect, createSubscriptionCheckout);
router.post('/credits',   protect, purchaseCredits);
router.post('/unsubscribe',     protect, cancelSubscription);

export default router;