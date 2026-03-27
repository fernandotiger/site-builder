import { Request, Response } from 'express';
import { getStripe } from '../middlewares/stripe.helper.js';
import { SUBSCRIPTION_PLANS, BillingInterval, PlanId } from '../types/plans.config.js';
import prisma from '../lib/prisma.js';

export const createSubscriptionCheckout = async (req: Request, res: Response) => {
  try {
    const { planId, interval } = req.body as {
      planId: PlanId;
      interval: BillingInterval;
    };
    const userId = req.userId!;
    const origin = req.headers.origin as string;

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan || plan.isFree) {
      return res.status(400).json({ message: 'Invalid plan for checkout' });
    }

    const priceId = plan.priceIds[interval];
    if (!priceId) {
      return res.status(400).json({ message: `No price found for ${planId}/${interval}` });
    }

    // Get or create Stripe customer tied to this user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const stripe = getStripe();

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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url:  `${origin}/pricing`,
      metadata: {
        userId,
        planId,
        interval,
        appId: process.env.STRIPE_APP_ID!,
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      subscription_data: {
        metadata: { userId, planId },
      },
    });

    res.json({ payment_link: session.url });
  } catch (error: any) {
    console.error('[createSubscriptionCheckout]', error.message);
    res.status(500).json({ message: error.message });
  }
};