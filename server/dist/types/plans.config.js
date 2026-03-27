export const SUBSCRIPTION_PLANS = {
    basic: {
        id: 'basic',
        name: 'Basic',
        isFree: true,
        priceIds: {},
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        isFree: false,
        priceIds: {
            monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
            yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
        },
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        isFree: false,
        priceIds: {
            monthly: process.env.STRIPE_PRICE_ENT_MONTHLY,
            yearly: process.env.STRIPE_PRICE_ENT_YEARLY,
        },
    },
};
export const CREDIT_PACKS = {
    credits_50: { id: 'credits_50', credits: 50, priceId: process.env.STRIPE_PRICE_CREDITS_50 },
    credits_250: { id: 'credits_250', credits: 250, priceId: process.env.STRIPE_PRICE_CREDITS_250 },
};
