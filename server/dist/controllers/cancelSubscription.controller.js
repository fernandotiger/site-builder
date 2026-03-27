import { getStripe } from '../middlewares/stripe.helper.js';
import prisma from '../lib/prisma.js';
export const cancelSubscription = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Guard 1: already on free plan
        if (user.planId === 'basic' || !user.subscriptionId) {
            return res.status(400).json({ message: 'No active subscription to cancel' });
        }
        // Guard 2: already in the process of canceling
        if (user.subscriptionStatus === 'canceling') {
            return res.status(400).json({ message: 'Subscription is already set to cancel' });
        }
        const stripe = getStripe();
        // Retrieve the subscription first to get the period end date
        const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
        if (subscription.status === 'canceled') {
            // Stripe already canceled it (e.g. payment failure), sync our DB
            await prisma.user.update({
                where: { id: userId },
                data: {
                    planId: 'basic',
                    subscriptionId: null,
                    subscriptionStatus: 'canceled',
                    credits: 0,
                },
            });
            return res.status(400).json({ message: 'Subscription was already canceled' });
        }
        // Cancel at period end — user keeps access until the billing cycle ends
        const updatedSubscription = await stripe.subscriptions.update(user.subscriptionId, { cancel_at_period_end: true });
        const cancelAt = new Date(updatedSubscription.cancel_at ? (updatedSubscription.cancel_at * 1000) : 45292);
        // Update DB: mark as "canceling" — not yet "canceled"
        await prisma.user.update({
            where: { id: userId },
            data: {
                subscriptionStatus: 'canceling',
                cancelAt: cancelAt, // store so the frontend can show "access until X"
            },
        });
        return res.json({
            message: 'Subscription will be canceled at the end of the billing period',
            cancelAt: cancelAt.toISOString(),
            plan: user.planId, // still pro/enterprise until cancelAt
        });
    }
    catch (error) {
        console.error('[cancelSubscription]', error.message);
        res.status(500).json({ message: error.message });
    }
};
