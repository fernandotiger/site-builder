import {Request, Response} from 'express'
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';
import { getAiModelNameForUser, getAiModelNameRevisionForUser } from '../configs/aiConfigResolver.js';
import { getPlanData } from './userController.js';

// Controller Function to Make Revision 
export const makeRevision = async (req: Request, res: Response) => {
    const userId = req.userId;
    const modelName = await getAiModelNameForUser(userId as string);
    const modelNameRevision = await getAiModelNameRevisionForUser(userId as string);
    try {
        
        const {projectId} = req.params;
        const {message} = req.body;

        const user = await prisma.user.findUnique({
            where: {id: userId}
        })

        if(!userId || !user){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if(user.credits < 5){
            return res.status(403).json({ message: 'add more credits to make changes' });
        }

        if(!message || message.trim() === ''){
            return res.status(400).json({ message: 'Please enter a valid prompt' });
        }

        const currentProject = await prisma.websiteProject.findUnique({
            where: {id: projectId as string, userId},
            include: {versions: true}
        })

        if(!currentProject){
            return res.status(404).json({ message: 'Project not found' });
        }

        // user prompt checker
        const promptCheckerResponse = await openai.chat.completions.create({
            model: process.env.OPENROUTER_MODEL_NAME_QESTIONS as string,
            messages: [
                {
                    role: 'system',
                     content: CheckerPrompt
                },
                {
                    role: 'user',
                    content: `User's request: "${message}"`
                }
            ]
        }); 
        // prompt checker response validation
        const rawContent = promptCheckerResponse.choices[0].message.content ?? '';
        let parsed: { type: 'question' | 'change'; answer: string };
        try {
            parsed = JSON.parse(rawContent.replace(/```json|```/g, '').trim());
        } catch (error : any) {
            console.log(error.code || error.message);
            return res.status(500).json({ message: 'Failed to parse AI response' });
        }

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: message,
                projectId: projectId as string
            }
        });

        if (parsed.type === 'question') {
            await prisma.conversation.create({
                data: {
                    role: 'assistant',
                    content: parsed.answer,
                    projectId: projectId as string
                }
            });
            return res.json({ message: parsed.answer, isQuestion: true });
        }

        await prisma.user.update({
            where: {id: userId},
            data: {credits: {decrement: 5}}
        });

        const enhancedPrompt = message; //promptEnhanceResponse.choices[0].message.content;

    /*    await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
                projectId: projectId as string
            }
        })*/
        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: 'Now making changes to your website... Please wait, this can take up to 5 minutes.',
                projectId: projectId as string
            }
        });
        const userPlan = await getPlanData(userId as string);
        const providerArray = userPlan.isPaid ?  ["alibaba"] : ["parasail", "together", "novita"];
        // Generate website code
        const codeGenerationResponse = await openai.chat.completions.create({
            model: modelNameRevision, 
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
                    content: `
                    You are an expert web developer. 

                    CRITICAL REQUIREMENTS:
                    - Return ONLY the complete updated HTML code with the requested changes.
                    - If necessary by the new changes include all the newJavaScript in <script> tags before closing </body>
                    - If the problem is involving images not appearing, then replace it using placeholder https://www.cibaky.com/wp-content/uploads/2015/12/placeholder-3.jpg.
                    - Return the HTML Code Only, nothing else

                    Apply the requested changes while maintaining all the styling and structure of the original code.`
                },
                {
                    role: 'user',
                    content: `
                    Here is the current website code: "${currentProject.current_code}" The user wants this change: "${enhancedPrompt}"`
                }
            ]
        })

        if(codeGenerationResponse.choices == undefined || codeGenerationResponse.choices.length === 0){
            console.log('Revision Provider error: ', codeGenerationResponse);
            throw new Error('No response from AI model for code generation');
        }
        const code = codeGenerationResponse.choices[0].message.content || '';

        if(!code){
             await prisma.conversation.create({
                data: {
                    role: 'assistant',
                    content: "Unable to generate the code, please try again",
                    projectId: projectId as string
                }
            })
            await prisma.user.update({
                where: {id: userId},
                data: {credits: {increment: 5}}
            })
            return;
        }

        const version = await prisma.version.create({
            data: {
                code: code.replace(/```[a-z]*\n?/gi, '')
                .replace(/```$/g, '')
                .trim(),
                description: 'changes made',
                projectId: projectId as string
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've made the changes to your website! You can now preview it",
                projectId: projectId as string
            }
        })

        await prisma.websiteProject.update({
            where: {id: projectId as string},
            data: {
                current_code: code.replace(/```[a-z]*\n?/gi, '')
                .replace(/```$/g, '')
                .trim(),
                current_version_index: version.id
            }
        })
        console.log('Changes made successfully');

        res.json({message: 'Changes made successfully', isQuestion: false})
    } catch (error : any) {
        await prisma.user.update({
            where: {id: userId},
            data: {credits: {increment: 5}}
        })
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to rollback to a specific version
export const rollbackToVersion = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { projectId, versionId } = req.params;

        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId as string, userId},
            include: {versions: true}
        })

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const version = project.versions.find((version)=>version.id === versionId);

        if(!version){
            return res.status(404).json({ message: 'Version not found' });
        }

        await prisma.websiteProject.update({
            where: {id: projectId as string, userId},
            data: {
                current_code: version.code,
                current_version_index: version.id
            }
        })

        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've rolled back your website to selected version. You can now preview it",
                projectId: projectId as string 
            }
        })

        res.json({ message: 'Version rolled back' });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller Function to Delete a Project
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;

        await prisma.websiteProject.delete({
            where: {id: projectId as string, userId},
        })

        res.json({ message: 'Project deleted successfully' });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller for getting project code for preview
export const getProjectPreview = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const project = await prisma.websiteProject.findFirst({
            where: {id: projectId as string, userId},
            include: {versions: true}
        })

        if(!project){
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ project });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Get published projects
export const getPublishedProjects = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 15;
        const skip = (page - 1) * limit;
       
        const [projects, total] = await prisma.$transaction([
            prisma.websiteProject.findMany({
                where: { isPublished: true },
                include: { user: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.websiteProject.count({
                where: { isPublished: true },
            }),
        ]);
        res.json({
            projects,
            pagination: {
                total,
                page,
                limit,
                hasMore: skip + projects.length < total,
            },
        });
        /*const projects = await prisma.websiteProject.findMany({
            where: {isPublished: true},
            include: {user: true}
        })
        res.json({ projects });*/
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Get a single project by id
export const getProjectById = async (req: Request, res: Response) => {
    try {
       const { projectId } = req.params;

        const project = await prisma.websiteProject.findFirst({
            where: {id: projectId as string},
        })

        if(!project || project.isPublished === false || !project?.current_code){
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json({ code: project.current_code });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}

// Controller to save project code
export const saveProjectCode = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { projectId } = req.params;
        const code = req.body.code;
        const customDomain = req.body.custom_domain;

        if(!userId){
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if(!code){
            return res.status(400).json({ message: 'Code is required' });
        }

        const project = await prisma.websiteProject.findUnique({
            where: {id: projectId as string, userId}
        });

        if(!project){
            return res.status(404).json({ message: 'Project not found' });
        }

        // Check if domain is already taken by another project
        const existingDomain = await prisma.websiteProject.findFirst({
            where: {
                custom_domain: customDomain,
                NOT: { id: projectId as string } // exclude the current project
            }
        });

        if (existingDomain) {
            return res.status(409).json({ message: 'This domain is already in use by another project.' });
        }

        try {
            await prisma.websiteProject.update({
                where: {id: projectId as string},
                data: {current_code: code, current_version_index: '', custom_domain: customDomain}
            });
        } catch (error : any) {
            console.error('Error updating project:', error);
            return res.status(500).json({ message: 'Failed to save project code' });
        }

        res.json({ message: 'Project saved successfully' });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}


const CheckerPrompt = `
                     You are a prompt checker of my saas. The user wants to make changes to their website or question about the functionalities of my saas. 
                     Your task is to identify if the user wants to make changes or ask a question.
                     If it is a question, answer the question based on the functionalities of my saas that I will provide you below. 
                     Rewrite the answer in a more friendly and proffessional way.

                        If the user wants to make question about functionalities of my saas, return a JSON only with this format: { "type": "question", "answer": "the answer to the user's question" }
                        If the user wants to make changes to their website, return a JSON only with this format: { "type": "change", "answer": "empty" }

                    Here are the functionalities of my saas you can answer about:
                     - Create a Landing Page: go to Homepage and click on "Create Landing Page" button or in My Projects click on "Create New".
                     - In My Projects, you can see all your projects, click on Preview to visualize the Project in a new tab, click on Open to open your Landing Page for edition, click on the trash icon to delete a landing page.
                     - Any element you see in the preview can be edited, just click on it in the editor and will open a pop up with that element selected for edition.
                     - To edit an image, just click on it and you will have the option to upload a new image, on the opened pop up click on the tumbnail of the image and select a new one from your computer and finally click on Upload.
                     - After performing any change to the Landing Page, remember to click on Save button to save the changes.
                     - On the editor page there are buttons for save, preview, download and publish. Depending of your plan some of the buttons can be unavailable.
                     - To customize the domain of your landing page, just open a project or Landing Page and type your domain in the text field (eg. mydomain.com) without www or http and click on save. After saved once you click on publish, your landing page will be configured using the domain you set up. Remember that you need to configure the DNS of your domain adding a CNAME record pointing to your domain (eg. mydomain.com) and also an A record pointing to 46.202.154.171"
                     - If the Landing page is already as published but the domain was not set up, you can set up the domain and anfter the project is saved click on unpublish then click on publish again to make it work.
                     - On the editor page there are 3 icons where the user can visualize how the landing page will look like in mobile phone, tablet and desktop, just click on the icons to switch between the views.
                     - From the editor page, you can navigate to other pages by clicking on the logo (the white square on the top left corner).
                     - If for some reason your new changes in the landing page are not satisfactory, you can always rollback to a previous version by click on the roll back button in this chat.
                     - Questions about the system in this chat will not consume your credits, but changes to the Landing Page using this chat will consume credits.
                     - This web service is specialist in creating landing pages for products or services, if the user wants to make changes related to other types of websites like backends, forms, blogs and so on, answer that currently we only support landing pages and we are planning to support other types of websites in the future.
                     - The user can add relevant links for contact, social media, videos, checkout and payment pages and so on, just by answering the questions when the Landing Page is being created. Once the landing page is created, the user can add those links by asking here in the chat giving the relevant information (eg. add this link https://example.com/checkout to the red checkout button).
                     - If the user is not on the editor page, the user can check its own information like credits, plan and so on just by clickin on the top right icon with the first letters of their name and then click on settings.
                     - The credits are accumulative, so if the user has 10 credits and buys a plan with 20 credits, the user will have 30 credits in total. 
                     - A free user starts with 10 credits, a pro user starts with 50 credits, and an enterprise user starts with 250 credits. If the user runs out of credits, the user can buy/subscribe to a plan with more credits in the pricing page or wait until next month when the credits are renewed. The user can check how many credits they have in the settings page.
                     - A free user can create 1 landing page, a pro user can create up to 3 landing pages and an enterprise user can create up to 10 landing pages. If the user wants to create more landing pages, they should contact the support team.
                     - The community page shows published landing pages created by other users.
                     - The tutorial page can be found on the top menu and has step by step guides on how to use the system and create your first engaging landing page.
                     - When you visualize the landing page in preview mode, you are seeing exactly how the landing page will look like for the end users, but as it is inside a container some elements/buttons might behave differently.
                     - The best way to test the functionalities of the landing page is by publishing it and visualizing it in a new tab, or downloading it and opening it in a browser.

                    Return the json Code Only, nothing else
                    `
