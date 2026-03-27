import { getStripe } from '../middlewares/stripe.helper.js';
import { CREDIT_PACKS } from '../types/plans.config.js';
import prisma from '../lib/prisma.js';
export const purchaseCredits = async (req, res) => {
    try {
        const { packId } = req.body;
        const userId = req.userId;
        const origin = req.headers.origin;
        const pack = CREDIT_PACKS[packId];
        if (!pack) {
            return res.status(404).json({ message: 'Credit pack not found' });
        }
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const stripe = getStripe();
        // Reuse existing customer if available
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { userId },
            });
            customerId = customer.id;
            await prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customerId },
            });
        }
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                planId: packId,
                amount: pack.credits === 50 ? 7 : 25,
                credits: pack.credits,
            },
        });
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'payment',
            line_items: [{ price: pack.priceId, quantity: 1 }],
            success_url: `${origin}/loading`,
            cancel_url: `${origin}/pricing`,
            metadata: {
                transactionId: transaction.id,
                appId: process.env.STRIPE_APP_ID,
                type: 'credits',
            },
            expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        });
        res.json({ payment_link: session.url });
    }
    catch (error) {
        console.error('[purchaseCredits]', error.message);
        res.status(500).json({ message: error.message });
    }
};
