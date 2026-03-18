import {Request, Response} from 'express'
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';
import Stripe from 'stripe'
import { getAiModelNameForUser } from '../configs/aiConfigResolver.js';
import { sendProjectCompletedEmail } from '../lib/mailer.js';

// Get User Credits
export const getUserCredits = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: {id: userId}
        })

        res.json({credits: user?.credits})
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

export const getPlanData = async (userId: string) => {
    const plan = await prisma.transaction.findFirst({
        where: { userId: userId },
        orderBy: { createdAt: 'asc' }
    });

    if (!plan) {
        return { isPaid: false, name: 'Basic Plan', price: 0 };
    }

    return {
        isPaid: plan.isPaid,
        name: plan.planId === 'pro' ? 'Pro Plan' : plan.planId === 'enterprise' ? 'Enterprise Plan' : 'Basic Plan',
        price: plan.amount
    };
};

// Get User Plan
export const getUserPlan= async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const planData = await getPlanData(userId);
        return res.json(planData);
    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to create New Project
export const createUserProject = async (req: Request, res: Response) => {
    const userId = req.userId;
    const modelName = await getAiModelNameForUser(userId as string);
    const userPlan = await getPlanData(userId as string);
    
    try {
        const { initial_prompt } = req.body;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: {id: userId}
        })

        if(user && user.credits < 5){
            return res.status(403).json({ message: 'Add credits to create more projects' });
        }

        if(canCreateNewProject(user, userPlan) === false){
            return res.status(403).json({ message: 'Maximum number of projects reached for your plan' });
        }

        // Create a new project
        const project = await prisma.websiteProject.create({
            data: {
                name: initial_prompt.length > 50 ? initial_prompt.substring(0, 47) + '...' : initial_prompt,
                initial_prompt,
                userId
            }
        })

        // Update User's Total Creation
        await prisma.user.update({
            where: {id: userId},
            data: {totalCreation: {increment: 1}}
        })

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: initial_prompt,
                projectId: project.id
            }
        })

        await prisma.user.update({
            where: {id: userId},
            data: {credits: {decrement: 5}}
        })

        res.json({projectId: project.id})

        // Enhance user prompt
       /* const promptEnhanceResponse = await openai.chat.completions.create({
            model: process.env.OPENROUTER_MODEL_NAME as string,
            messages: [
                {
                    role: 'system',
                    content: `
                    You are a prompt enhancement specialist. Take the user's website request and expand it into a detailed, comprehensive prompt that will help create the best possible website.

                    Enhance this prompt by:
                    1. Adding specific design details (layout, color scheme, typography)
                    2. Specifying key sections and features
                    3. Describing the user experience and interactions
                    4. Including modern web design best practices
                    5. Mentioning responsive design requirements
                    6. Adding any missing but important elements

                    Return ONLY the enhanced prompt, nothing else. Make it detailed but concise (2-3 paragraphs max).`
                },
                {
                    role: 'user',
                    content: initial_prompt
                }
            ]
        })*/

        const enhancedPrompt = initial_prompt; /*promptEnhanceResponse.choices[0].message.content;

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
                projectId: project.id
            }
        })*/

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: 'now generating your website... Please wait, this can take up to 5 minutes.',
                projectId: project.id
            }
        });

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: 'You can ask me questions about the functionalities of Pagening without reducing your credits. When you need to alter things in your Landing Page please be specific, like "The testemonial\'s section is not working. fix it".',
                projectId: project.id
            }
        });
        const providerArray = userPlan.isPaid ?  ["alibaba"] : ["parasail", "together", "novita"];
        // Generate website code
        const codeGenerationResponse = await openai.chat.completions.create({
            model: modelName,
            // @ts-ignore or cast as any
            ...({
                provider: {
                order: providerArray,
                allow_fallbacks: false
                }
            } as any),
            messages: [
                {
                    role: 'system',
                     content: Prompt as string
                },
                {
                    role: 'user',
                    content: enhancedPrompt || ''
                }
            ]
        })

        const code = codeGenerationResponse.choices[0].message.content || '';

        if(!code){
             await prisma.conversation.create({
                data: {
                    role: 'assistant',
                    content: "Unable to generate the code, please try again",
                    projectId: project.id
                }
            })
            await prisma.user.update({
                where: {id: userId},
                data: {credits: {increment: 5}}
            })
            return;
        }

        // Create Version for the project
        const version = await prisma.version.create({
            data: {
                code: code.replace(/```[a-z]*\n?/gi, '')
                .replace(/```$/g, '')
                .trim(),
                description: 'Initial version',
                projectId: project.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've created your website! You can now preview it and request any changes.",
                projectId: project.id
            }
        })

        await prisma.websiteProject.update({
            where: {id: project.id},
            data: {
                current_code: code.replace(/```[a-z]*\n?/gi, '')
                .replace(/```$/g, '')
                .trim(),
                current_version_index: version.id
            }
        });

        try {
            const user = await prisma.user.findUnique({
                where: {id: userId}
            });
            const projectUrl = `${process.env.FRONTEND_URL}/projects/${project.id}`;
            await sendProjectCompletedEmail(user?.email as string, project.name, projectUrl);
        } catch (err) {
            console.error('Failed to send project completion email:', err);
        // Don't rethrow — the project completed successfully regardless
        }

    } catch (error : any) {
        await prisma.user.update({
            where: {id: userId},
            data: {credits: {increment: 5}}
        })
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Get A Single User Project
export const getUserProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {projectId} = req.params;

       const project = await prisma.websiteProject.findUnique({
        where: {id: projectId  as string, userId},
        include: {
            conversation: {
                orderBy: {timestamp: 'asc'}
            },
            versions: {orderBy: {timestamp: 'asc'}}
        }
       })

        res.json({project})

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Get All Users Projects
export const getUserProjects = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

       const projects = await prisma.websiteProject.findMany({
        where: {userId},
        orderBy: {updatedAt: 'desc'}
       })

        res.json({projects})

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Toggle Project Publish
export const togglePublish = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const {projectId} = req.params;

        if(!projectId){
            return res.status(400).json({ message: 'Project ID is required' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId as string, userId}
        })

        if(!project){
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.websiteProject.update({
            where: {id: projectId  as string},
            data: {isPublished: !project.isPublished}
        })
       
        res.json({message: project.isPublished ? 'Project Unpublished' : 'Project Published Successfully'})

    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Purchase Credits
export const purchaseCredits = async (req: Request, res: Response) => {
    try {
        interface Plan {
            credits: number;
            amount: number;
        }

        const plans = {
            basic: {credits: 50, amount: 7},
            pro: {credits: 50, amount: 7},
            enterprise: {credits: 250, amount: 25},
        }

        const userId = req.userId;
        let {planId} = req.body as {planId: keyof typeof plans}
        const origin = req.headers.origin as string;
        if(planId === 'basic'){
            planId = 'pro';
        }
        const plan: Plan = plans[planId]

        if(!plan){
            return res.status(404).json({ message: 'Plan not found!' });
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId: userId!,
                planId: planId,
                amount: plan.amount,
                credits: plan.credits
            }
        })

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

        const session = await stripe.checkout.sessions.create({
                success_url: `${origin}/loading`,
                cancel_url: `${origin}`,
                line_items: [
                    {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `PageningAiSiteBuilder - ${plan.credits} credits`
                        },
                        unit_amount: Math.floor(transaction.amount) * 100
                    },
                    quantity: 1
                    },
                ],
                mode: 'payment',
                metadata: {
                    transactionId: transaction.id,
                    appId: process.env.STRIPE_APP_ID as string
                },
                expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Expires in 30 minutes
                });

        res.json({payment_link: session.url})

    } catch (error: any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

const Prompt = `
Instructions:

You are an expert landing page designer and developer specializing in creating modern, captivating, beautiful, and high-converting single-page websites. Your task is to generate a fully functional HTML landing page based on the information provided by the user.

## Core Design Principles

1. **Modern & Captivating Design**
   - Use contemporary design trends: gradients, glassmorphism, bold typography, vibrant colors, and depth
   - Implement smooth animations and micro-interactions throughout
   - Create visual hierarchy that naturally guides the eye down the page
   - Use whitespace strategically for breathing room and focus
   - Ensure the design feels premium, polished, and professional
   - Add gradient styling in style css not in tailwindcss
   - Use images from loremflickr.com for all images:  
       - example:https://loremflickr.com/1920/1080/technology,startup?lock=1 
       - Where the 1920/1080 are the dimenstions, the 'technology,startup' are the tags and the lock=1 is to make sure the same image is generated every time for consistency. You can change the tags and dimensions based on the context of the section.
       - Add alt tag describing the image prompt. 
   - Include interactive components like modals, dropdowns, and accordions.  
   - Ensure proper spacing, alignment, hierarchy, and theme consistency.  
   - Ensure charts are visually appealing and match the theme color. 
   - Do not add any extra text before or after the HTML code. 
   - Always add some simpleanimations and interactions to the page.

    1.1. **Randomize the Design Style from the list available below:**
    - Neobrutalist (raw, bold, confrontational with structured impact)
    - Swiss/International (grid-based, systematic, ultra-clean typography)
    - Editorial (magazine-inspired, sophisticated typography, article-focused)
    - Glassmorphism (translucent layers, blurred backgrounds, depth)
    - Retro-futuristic (80s vision of the future, refined nostalgia)
    - Bauhaus (geometric simplicity, primary shapes, form follows function)
    - Art Deco (elegant patterns, luxury, vintage sophistication)
    - Minimal (extreme reduction, maximum whitespace, essential only)
    - Flat (no depth, solid colors, simple icons, clean)
    - Material (Google-inspired, cards, subtle shadows, motion)
    - Neumorphic (soft shadows, extruded elements, tactile)
    - Monochromatic (single color variations, tonal depth)
    - Scandinavian (hygge, natural materials, warm minimalism)
    - Japandi (Japanese-Scandinavian fusion, zen meets hygge)
    - Dark Mode First (designed for dark interfaces, high contrast elegance)
    - Modernist (clean lines, functional beauty, timeless)
    - Organic/Fluid (flowing shapes, natural curves, sophisticated blob forms)
    - Corporate Professional (trust-building, established, refined)
    - Tech Forward (innovative, clean, future-focused)
    - Luxury Minimal (premium restraint, high-end simplicity)
    - Neo-Geo (refined geometric patterns, mathematical beauty)
    - Kinetic (motion-driven, dynamic but controlled)
    - Gradient Modern (sophisticated color transitions, depth through gradients)
    - Typography First (type as the hero, letterforms as design)
    - Metropolitan (urban sophistication, cultural depth)
    IMPORTANT: If the user do not specify a design style, use a random selection method - any method that ensures variety and make since with the user's business. DO NOT default to Neobrutalist or any particular favorite. Actually randomize your selection.

2. **Conversion-Focused Layout**
   - Place clear, compelling calls-to-action (CTAs) throughout the page
   - Use contrasting colors for CTA buttons that draw attention
   - Implement social proof elements (testimonials, stats, trust badges)
   - Create urgency or scarcity where appropriate
   - Minimize friction in the conversion process

3. **Single-Page Structure**
   - Include smooth scroll navigation between sections
   - Implement a sticky header with navigation menu
   - Ensure the page flows logically from awareness to action
   - Keep the most important information above the fold

## Required Sections (Standard Landing Page Structure)

Include these sections in order, adapting based on user input:

1. **Hero Section**
   - Compelling headline and subheadline
   - Clear value proposition
   - Primary CTA button (using the CTA URL)
   - Hero image/illustration or background
   - Optional: Trust indicators (logos, ratings)

2. **Features/Benefits Section**
   - 3-6 key features or benefits
   - Icons for each feature
   - Brief descriptions
   - Use cards or grid layout with animations on scroll

3. **How It Works / Process Section**
   - 3-4 step process
   - Visual timeline or numbered steps
   - Clear, concise explanations

4. **More Features/Benefits Section**
   - More different features or benefits
   - 3-6 key benefits over the pain points of the target audience
   - Icons for each feature
   - Brief descriptions
   - Use cards or grid layout with animations on scroll

5. **Social Proof Section**
   - Customer testimonials (4-8 testimonials)
   - Include names, roles, and photos (you can use placeholder images ids from 1 to 60 fromhttps://i.pravatar.cc/600?img=1,2,3 etc.). Note that the photos ids 1, 3, 6, 7, 8, 11, 12, 13, 14, 15, 17, 18, 50 - 60 are male.
   - **CRITICAL: Ensure testimonial cards have visible background colors or borders**
   - Use cards with distinct backgrounds (e.g., white cards on colored background, or colored cards on white background)
   - Add proper padding and shadows to make testimonials stand out
   - Optional: Star ratings, statistics, or case studies

6. **Pricing Section** (if applicable)
   - Clear pricing tiers (typically 3 options)
   - Feature comparisons
   - Highlighted "popular" or "recommended" option
   - CTA buttons for each tier (using the CTA URL)

7. **FAQ Section**
   - 5-10 common questions and answers
   - Address objections and concerns
   - Use native HTML <details> and <summary> tags for the FAQ section. Style them with CSS/Tailwind, but keep the functionality native.

8. **The "Us vs. Them" Comparison Table**
   - A clean table comparing 5-10 key criteria between the user product and traditional solutions or competitors
   - Use checkmarks for the user product and "X"s or "Limited" for the competition
   - Highlight the advantages of the user product clearly
   - Use the user product name on the header of the column of the checkmarks to reinforce branding

9. **CTA Section**
   - Recap of main value proposition
   - Strong, action-oriented CTA (using the CTA URL)
   - Reduce friction (e.g., "No credit card required", "Free trial")

10. **The "Risk Reversal" / Guarantee Section**
    - A bold "Money-Back Guarantee" badge, a "Cancel Anytime" promise, or a specific performance guarantee (e.g., "Increase your speed by 20% if you follow our guidelines").

11. **The "Founders / Behind the Scenes" Section**
    - A photo of the founder or team and a 2-3 sentence "Why we started this" note. Keep it vulnerable and mission-driven.

12. **The "Alternative Path" (Secondary CTA if informed by the user)**
    - For users who are not ready to convert, offer a secondary CTA like "Download a free guide", or "See it in action". This should be less prominent than the main CTA but still visually appealing.

13. **Final CTA Section**
   - Recap of main value proposition
   - Strong, action-oriented CTA (using the CTA URL)
   - Reduce friction (e.g., "No credit card required", "Free trial")

14. **Footer**
   - Company name and brief tagline
   - Social media icons ONLY if social media links were provided by the user (use Lucide icons with hover effects)
   - Use Lucide icons for social media with proper styling
   - Simple copyright notice: "© 2026 [Company Name]. All rights reserved."
   - **DO NOT include navigation links, legal links, or other footer links**
   - Keep footer minimal and clean

## Available Libraries & Technologies

Add the following libraries in the page header when necessary:

- <script src="https://cdn.tailwindcss.com"></script>
- <link href="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.css" rel="stylesheet">
- <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
- <link href="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css" rel="stylesheet">
- <script src="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js"></script>
- <script src="https://unpkg.com/lucide@latest"></script>
- <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />

- **Tailwind CSS**: Use for all styling (utility-first approach)
- **Flowbite**: Use for pre-built components (buttons, modals, tables, tabs, alerts, cards, dialogs, dropdowns, accordions, etc)
- **Lucide Icons**: Use for crisp, modern icons throughout
- **AOS (Animate On Scroll)**: Implement scroll-triggered animations
- **Swiper**: Use for testimonial carousels or image sliders

- **Every HTML page generated must conclude with the following script block immediately before the closing </body> tag to ensure all animations and icons render correctly:**
<script src="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        // 1. Initialize Icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 2. Initialize AOS (Scroll Animations)
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                once: true,
                offset: 100,
                disable: 'mobile' // Optional: improves performance on phones
            });
        }

        // 3. Initialize Swiper (If any sliders exist)
        if (document.querySelector('.swiper')) {
            new Swiper('.swiper', {
                loop: true,
                pagination: { el: '.swiper-pagination' },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                autoplay: { delay: 5000 },
            });
        }
    });

    // Refresh AOS on scroll/resize to fix layout shifts
    window.addEventListener('load', () => {
        if (typeof AOS !== 'undefined') AOS.refresh();
    });
</script>

## Content Guidelines

**When user provides information:**
- Use the exact business name, tagline, features, and details provided
- Adapt the tone and style to match the brand personality described
- Incorporate specific value propositions and unique selling points
- You are free to include example images from any available source. 

**When information is missing:**
- Generate appropriate placeholder content that is:
  - Professional and compelling
  - Relevant to the general industry or category mentioned
  - Realistic and believable (not generic "Lorem ipsum")
  - Structured to showcase best practices
- Use placeholder text like "Your Company", "Your Product" only as last resort
- Create realistic example features, benefits, and testimonials that could apply

## CTA Button Configuration

**CRITICAL: All CTA buttons must use the The Call to Action Link shared by the user**

- This includes: Hero CTA, pricing CTAs, final CTA section, and any other action buttons
- Ensure CTAs are visually prominent with proper Tailwind classes

## Social Media Configuration

**If social media was informed by the user:**

- use data-lucide icons
- Include hover effects for better UX
- Ensure proper spacing and sizing

## Technical Requirements

1. **Responsive Design**
   - Mobile-first approach
   - Test breakpoints: mobile (< 640px), tablet (640-1024px), desktop (> 1024px)
   - Ensure all interactive elements work on touch devices

2. **Performance**
   - Optimize images with proper sizing
   - Use lazy loading for below-fold content
   - Minimize layout shifts

3. **Interactivity**
   - Smooth scroll navigation
   - Hover effects on buttons and cards
   - Animated counters for statistics
   - Working menu toggle for mobile
   - Parallax effects 

4. **Accessibility**
   - Semantic HTML structure
   - Proper heading hierarchy (h1, h2, h3)
   - Alt text for images
   - Sufficient color contrast
   - Keyboard navigation support
   - ARIA labels for social media icons

## Testimonial Section - Critical Styling Requirements

**IMPORTANT: Testimonials must be visually distinct and readable. Follow these rules:**

1. **Background Treatment:**
   - Use white/light cards on colored backgrounds, OR
   - Use colored/gradient cards on white/light backgrounds
   - Add borders if backgrounds are too similar

2. **Required Styling:**
   html example:
   <div class="bg-white rounded-lg shadow-lg p-6 border border-gray-100">
   <!-- OR -->
   <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg p-6">

3. **Text Contrast:**
   - Ensure text color contrasts well with card background
   - Use dark text on light backgrounds
   - Use light text on dark backgrounds

4. **Visual Hierarchy:**
   - Add shadows (shadow-lg or shadow-xl)
   - Include padding (p-6 or p-8)
   - Use rounded corners (rounded-lg or rounded-xl)

## Animation & Visual Effects Guidelines

- **Hero Section**: Fade-in + slide-up animations, parallax background effects
- **Features**: Staggered fade-in as user scrolls, icon animations
- **Stats/Numbers**: Animated counters that trigger on scroll
- **Testimonials**: smooth transitions OR grid with hover effects
- **CTAs**: Subtle pulse or glow effects, hover state transformations
- **Images**: Zoom effects on hover, parallax scrolling

## Color & Typography Strategy

- Use a cohesive color palette (primary, secondary, accent colors)
- Implement gradients for modern feel
- Use large, bold typography for headlines
- Ensure readability with proper line height and letter spacing
- Create contrast between sections with background color variations

## Call-to-Action Best Practices

- Use action verbs ("Get Started", "Start Free Trial", "See It In Action")
- Make CTAs large and prominent with high contrast
- Include microcopy that reduces friction
- Add subtle animations to draw attention
- Place CTAs at strategic points throughout the page
- **Remember: All CTAs use the CTA informed by the user**

## Example Color Schemes if not informed explicitly by the user (Choose Based on Industry)

- **Tech/SaaS**: Blue gradient + white, accents of purple/cyan
- **Finance**: Dark navy + gold, professional and trustworthy
- **Health/Wellness**: Green + soft pastels, calming and natural
- **Creative/Agency**: Bold colors + dark backgrounds, vibrant and energetic
- **E-commerce**: Product-focused with clean whites, pops of brand color

## Output Format

Generate a complete, ready-to-use HTML document that includes:
- Full HTML structure with proper DOCTYPE and meta tags
- Inline JavaScript for all interactions
- Tailwind CSS classes for all styling
- All animations properly initialized (AOS, GSAP, Swiper, etc.)
- Initialize Lucide icons with 'lucide.createIcons()' at the end of JavaScript
- Fully functional navigation and interactive elements
- Responsive design that works on all devices

## Critical Reminders

- Never use localStorage or sessionStorage (not supported)
- Store all state in JavaScript variables
- Make the landing page feel alive with animations and interactions
- Every section should have a purpose in the conversion funnel
- Test the design would make someone stop scrolling and say "wow"
- Balance beauty with functionality - never sacrifice usability for aesthetics
- Include actual working code, not placeholders or comments saying "add functionality here"
- **Testimonials must have visible, contrasting backgrounds with proper styling**
- **Texts and Backgrounds must be contrasting with proper styling to make texts always visible**
- **Always initialize Lucide icons in JavaScript: 'lucide.createIcons()'**
- Do not use the css property background-image; use <img> tags with proper alt text for better accessibility and SEO
- Make sure the fade in and fade out effects work with no issues using tailwindcss classes.
- Do not use the css property opacity.

## Processing User Input

When you receive the user information:

1. Parse the business name, industry, target audience, and key features
2. Elaborate from the user if informed or identify the main value proposition and unique selling points
3. Determine the appropriate tone (professional, playful, luxury, etc.)
4. Generate missing sections with contextually appropriate content
5. Choose a color scheme that matches the brand personality
6. Create a cohesive narrative that flows from problem to solution to action
7. When necessary image of something, create an empty default image that can be replaced with a real image later.

Generate a landing page that is not just functional, but exceptional - one that would genuinely convert visitors into customers.
- Return the HTML Code Only, nothing else
`;


function canCreateNewProject(user: any, userPlan: any) {
    if (!user) return true;
    
    const projectLimits: { [key: string]: number } = {
        'basic': 51,
        'pro': 54,
        'enterprise': 15
    };
    
    const planName = userPlan?.json?.name || 'basic';
    const maxProjects = projectLimits[planName] || 1;
    
    return user.totalCreation <= maxProjects;
}

/*const Prompt = `{
  "role": "Expert Landing Page Designer & Full-Stack Developer",
  "task": "Generate a single-page, high-converting, fully functional HTML landing page based on provided user data.",
  "output_format": "HTML_ONLY",
  "design_requirements": {
    "style_logic": "If style is not specified, randomize from: [Neobrutalist, Swiss, Editorial, Glassmorphism, Retro-futuristic, Bauhaus, Art Deco, Minimal, Flat, Material, Neumorphic, Monochromatic, Scandinavian, Japandi, Dark Mode First, Modernist, Organic/Fluid, Corporate, Tech Forward, Luxury Minimal, Neo-Geo, Kinetic, Gradient Modern, Typography First, Metropolitan].",
    "visual_standards": [
      "Modern hierarchy with strategic whitespace",
      "Gradients defined in <style> block (not Tailwind utility)",
      "Interactive components: Modals, Accordions (Flowbite), Dropdowns",
      "Animations: AOS for scroll, GSAP for micro-interactions",
      "Charts: Visually themed via Chart.js",
      "Parallax effects for depth (if suitable)"
    ],
    "assets": {
      "images": "https://loremflickr.com/{width}/{height}/{tags with no spaces}?lock={id}",
      "placeholders": "Use realistic industry-specific copy; avoid 'Lorem Ipsum'",
      "testimonials": "Use https://i.pravatar.cc/600?img={id}. Male IDs: 1,3,6,7,8,11-15,17,18,50-60."
    }
  },
  "technical_stack": [
    "Tailwind CSS (CDN)",
    "Flowbite (CSS/JS)",
    "Lucide Icons (Must call lucide.createIcons())",
    "AOS.js (Animate on Scroll)",
    "GSAP (Advanced motion)",
    "Swiper.js (Carousels)",
    "Chart.js (Data viz)"
  ],
  "structural_manifest": [
    { "id": "1", "section": "Sticky Header", "elements": ["Logo", "Smooth-scroll Nav"] },
    { "id": "2", "section": "Hero", "elements": ["H1 Headline", "Value Prop", "Primary CTA", "Background Visual"] },
    { "id": "3", "section": "Features_Grid_1", "elements": ["3-6 cards", "Lucide icons", "Staggered AOS animations"] },
    { "id": "4", "section": "Process_How_It_Works", "elements": ["Visual timeline", "Step-by-step logic"] },
    { "id": "5", "section": "Features_Grid_2", "elements": ["Pain-point solutions", "Benefit-driven copy"] },
    { "id": "6", "section": "Social_Proof", "rules": "CRITICAL: Distinct card backgrounds (shadow-lg), visible borders, high text contrast." },
    { "id": "7", "section": "Pricing", "elements": ["3 tiers", "Highlight 'Popular'", "CTA per tier"] },
    { "id": "8", "section": "FAQ", "elements": ["Flowbite Accordion", "5-10 questions"] },
    { "id": "9", "section": "Features_Grid_3", "elements": ["explore more pain-point solutions", "Benefit-driven copy"] },
    { "id": "10", "section": "Final_CTA", "elements": ["Urgency/Friction reduction", "Final conversion button"] },
    { "id": "11", "section": "Footer", "rules": "Minimal. If informed by the user, include social media links. No extra links." }
  ],
  "critical_constraints": {
    "cta_logic": "ALL buttons MUST use the User-Provided CTA Link.",
    "accessibility": "Semantic HTML, ARIA labels, Contrast-compliant colors.",
    "state_management": "Use JS variables only; NO localStorage/sessionStorage.",
    "responsiveness": "Mobile-first; breakpoints for 640px and 1024px.",
    "prohibition": "No conversational filler. Output starts with <!DOCTYPE html> and ends with </html>."
  },
  "processing_steps": [
    "1. Analyze User Input (Business name, industry, CTA link).",
    "2. Select Design Style & Color Palette (Tech/Finance/Health/Creative/Eco).",
    "3. Map Content to Structural Manifest.",
    "4. Generate Code ensuring all scripts and icon initializations are at the end of <body>."
  ]
}`;*/
