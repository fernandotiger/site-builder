import {Request, Response} from 'express'
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';
import Stripe from 'stripe'
import { getAiModelNameForUser } from '../configs/aiConfigResolver.js';

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

// Controller Function to create New Project
export const createUserProject = async (req: Request, res: Response) => {
    const userId = req.userId;
    const modelName = await getAiModelNameForUser(userId as string);
    try {
        const { initial_prompt } = req.body;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: {id: userId}
        })

        if(user && user.credits < 5){
            return res.status(403).json({ message: 'add credits to create more projects' });
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
                content: 'now generating your website...',
                projectId: project.id
            }
        })

        // Generate website code
        const codeGenerationResponse = await openai.chat.completions.create({
            model: modelName,
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
        })

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
   - Use placeholders for all images:  
       - Light mode: https://community.softr.io/uploads/db9110/original/2X/7/74e6e7e382d0ff5d7773ca9a87e6f6f8817a68a6.jpeg  
       - Dark mode: https://www.cibaky.com/wp-content/uploads/2015/12/placeholder-3.jpg  
       - Add alt tag describing the image prompt. 
   - Include interactive components like modals, dropdowns, and accordions.  
   - Ensure proper spacing, alignment, hierarchy, and theme consistency.  
   - Ensure charts are visually appealing and match the theme color. 
   - Do not add any extra text before or after the HTML code. 

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
   - 3-6 key benefits over the possible pain points of the target audience
   - Icons for each feature
   - Brief descriptions
   - Use cards or grid layout with animations on scroll

5. **Social Proof Section**
   - Customer testimonials (3-6 testimonials)
   - Include names, roles, and photos (use placeholder images from https://ui-avatars.com/api/)
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
   - 5-8 common questions and answers
   - Accordion-style expandable items using Flowbite
   - Address objections and concerns

8. **Even more Features/Benefits Section**
   - 3-6 key benefits over the possible pain points of the target audience
   - Icons for each feature
   - Brief descriptions
   - Use cards or grid layout with animations on scroll

9. **Final CTA Section**
   - Recap of main value proposition
   - Strong, action-oriented CTA (using the CTA URL)
   - Reduce friction (e.g., "No credit card required", "Free trial")

10. **Footer**
   - Company name and brief tagline
   - Social media icons ONLY for: Facebook, Instagram, TikTok, YouTube
   - Use Lucide icons for social media with proper styling
   - Simple copyright notice: "© 2024 [Company Name]. All rights reserved."
   - **DO NOT include navigation links, legal links, or other footer links**
   - Keep footer minimal and clean

## Available Libraries & Technologies

Add the following libraries in the page header when necessary:

- <script src="https://cdn.tailwindcss.com"></script>
- <link href="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.css" rel="stylesheet">
- <script src="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.js"></script>
- <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
- <script src="https://unpkg.com/lucide@latest"></script>
- <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
- <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
- <link href="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css" rel="stylesheet">
- <script src="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js"></script>
- <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
- <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.11.2/lottie.min.js"></script>
- <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css" />
- <script src="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js"></script>
- <link rel="stylesheet" href="https://unpkg.com/tippy.js@6/dist/tippy.css" />
- <script src="https://unpkg.com/@popperjs/core@2"></script>
- <script src="https://unpkg.com/tippy.js@6"></script>

- **Tailwind CSS**: Use for all styling (utility-first approach)
- **Flowbite**: Use for pre-built components (buttons, modals, tables, tabs, alerts, cards, dialogs, dropdowns, accordions, etc)
- **Lucide Icons**: Use for crisp, modern icons throughout
- **AOS (Animate On Scroll)**: Implement scroll-triggered animations
- **GSAP**: Use for advanced animations and interactions
- **Swiper**: Use for testimonial carousels or image sliders
- **Chart.js**: Use if data visualization is needed
- **Tippy.js**: Use for elegant tooltips
- **Lottie**: Use for animated illustrations (if needed)

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

**Footer social media section if required use the icons bellow only if explicitly requested by the user:**

html example:
<i data-lucide="facebook" class="w-6 h-6"></i>
<i data-lucide="instagram" class="w-6 h-6"></i>
<i data-lucide="youtube" class="w-6 h-6"></i>
<i data-lucide="tiktok" class="w-6 h-6"></i>

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
   - Form validation (if forms are included)
   - Working menu toggle for mobile
   - Parallax effects (if make sense for the design)

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
- **Testimonials**: Carousel with smooth transitions OR grid with hover effects
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
- **Always initialize Lucide icons in JavaScript: 'lucide.createIcons()'**
- Avoid using background-image property; use <img> tags with proper alt text for better accessibility and SEO 

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