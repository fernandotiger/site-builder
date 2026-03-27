import { getStripe } from '../middlewares/stripe.helper.js';
import prisma from '../lib/prisma.js';
export const stripeWebhook = async (request, response) => {
    const stripe = getStripe();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = request.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(request.body, signature, endpointSecret);
    }
    catch (err) {
        console.error('⚠️ Webhook verification failed:', err.message);
        return response.sendStatus(400);
    }
    const appId = process.env.STRIPE_APP_ID;
    try {
        switch (event.type) {
            // ── One-time credit purchase ──────────────────────────────────────
            case 'checkout.session.completed': {
                const session = event.data.object;
                const meta = session.metadata ?? {};
                if (meta.appId !== appId)
                    break;
                if (meta.type === 'credits' && meta.transactionId) {
                    const tx = await prisma.transaction.update({
                        where: { id: meta.transactionId },
                        data: { isPaid: true },
                    });
                    await prisma.user.update({
                        where: { id: tx.userId },
                        data: { credits: { increment: tx.credits } },
                    });
                    console.log(`✅ Credits added for user ${tx.userId}`);
                }
                // For subscriptions: session.subscription is set — handled by invoice.paid
                break;
            }
            // ── Subscription activated / renewed ─────────────────────────────
            case 'invoice.paid': {
                const invoice = event.data.object;
                const subId = invoice.subscription;
                if (!subId)
                    break;
                const subscription = await stripe.subscriptions.retrieve(subId);
                const meta = subscription.metadata ?? {};
                if (meta.appId !== appId && meta.userId == null)
                    break;
                const userId = meta.userId;
                const planId = meta.planId;
                if (userId && planId) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            planId,
                            subscriptionId: subId,
                            subscriptionStatus: 'active',
                        },
                    });
                    addPurchasedCredits(userId, planId, invoice.billing_reason ? invoice.billing_reason : '');
                    console.log(`✅ Subscription activated: user=${userId} plan=${planId}`);
                }
                break;
            }
            // ── Subscription changed (upgrade/downgrade) ──────────────────────
            case 'customer.subscription.updated': {
                const sub = event.data.object;
                const meta = sub.metadata ?? {};
                const userId = meta.userId;
                if (!userId)
                    break;
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        subscriptionStatus: sub.status,
                        planId: meta.planId ?? undefined,
                    },
                });
                addPurchasedCredits(userId, meta.planId, 'subscription_cycle');
                console.log(`🔄 Subscription updated: user=${userId} status=${sub.status}`);
                break;
            }
            // ── Subscription cancelled / expired ─────────────────────────────
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const meta = sub.metadata ?? {};
                const userId = meta.userId;
                if (!userId)
                    break;
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        planId: 'basic',
                        subscriptionId: null,
                        subscriptionStatus: 'canceled',
                    },
                });
                console.log(`❌ Subscription cancelled: user=${userId}`);
                break;
            }
            // ── Payment failed on renewal ─────────────────────────────────────
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const subId = invoice.subscription;
                if (!subId)
                    break;
                const subscription = await stripe.subscriptions.retrieve(subId);
                const userId = subscription.metadata?.userId;
                if (!userId)
                    break;
                await prisma.user.update({
                    where: { id: userId },
                    data: { subscriptionStatus: 'past_due' },
                });
                console.warn(`⚠️ Payment failed for user=${userId}`);
                break;
            }
            default:
                console.log(`Unhandled event: ${event.type}`);
        }
    }
    catch (err) {
        console.error(`[webhook] Error handling ${event.type}:`, err.message);
        return response.status(500).json({ error: 'Webhook handler failed' });
    }
    response.json({ received: true });
};
export const addPurchasedCredits = async (userId, planId, billing_reason) => {
    const PLAN_CREDITS = {
        pro: 50,
        enterprise: 250,
    };
    const creditsToAdd = PLAN_CREDITS[planId];
    if (creditsToAdd) {
        // billing_reason: 'subscription_create' = first time
        // billing_reason: 'subscription_cycle' = monthly/yearly renewal
        const isRenewal = billing_reason === 'subscription_cycle';
        const isFirstPayment = billing_reason === 'subscription_create';
        if (isFirstPayment || isRenewal) {
            await prisma.user.update({
                where: { id: userId },
                data: { credits: { increment: creditsToAdd } },
            });
            console.log(`✅ +${creditsToAdd} credits → user=${userId} reason=${billing_reason}`);
        }
    }
};
