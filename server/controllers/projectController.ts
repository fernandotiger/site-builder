import {Request, Response} from 'express'
import prisma from '../lib/prisma.js';
import openai from '../configs/openai.js';
import { getAiModelNameForUser, getAiModelNameRevisionForUser } from '../configs/aiConfigResolver.js';

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

        await prisma.conversation.create({
            data: {
                role: 'user',
                content: message,
                projectId: projectId as string
            }
        })

        await prisma.user.update({
            where: {id: userId},
            data: {credits: {decrement: 3}}
        })
console.log('modelName:', modelName);
 /*       // Enhance user prompt
        const promptEnhanceResponse = await openai.chat.completions.create({
            model: modelName,
            messages: [
                {
                    role: 'system',
                     content: `
                     You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

                    Enhance this by:
                    1. Being specific about what elements to change
                    2. Mentioning design details (colors, spacing, sizes)
                    3. Clarifying the desired outcome
                    4. Using clear technical terms
                    5. If the problem is involving images not appearing, then replace it creating a minimalist SVG image according to the context of the section.

                    Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).`
                },
                {
                    role: 'user',
                    content: `User's request: "${message}"`
                }
            ]
        })
*/
        const enhancedPrompt = message; //promptEnhanceResponse.choices[0].message.content;
console.log('XXXXXXXXXXXXXXXXXXX');
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
                content: 'Now making changes to your website...',
                projectId: projectId as string
            }
        })
console.log('sending to openai');
        // Generate website code
        const codeGenerationResponse = await openai.chat.completions.create({
            model: modelNameRevision, 
            // @ts-ignore or cast as any
            ...({
                provider: {
                order: ["parasail", "together", "novita"],
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
                    - If the problem is involving images not appearing, then replace it creating a minimalist SVG banner image with some different shapes and colors.
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
console.log('Fim openai: ', codeGenerationResponse);
console.log('Fim 2 openai: ', codeGenerationResponse.choices);
        if(codeGenerationResponse.choices == undefined || codeGenerationResponse.choices.length === 0){
            console.log('Revision Provider error: ', codeGenerationResponse);
            throw new Error('No response from AI model for code generation');
        }
        const code = codeGenerationResponse.choices[0].message.content || '';
console.log('111111');
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
                data: {credits: {increment: 3}}
            })
            return;
        }
console.log('222222');
        const version = await prisma.version.create({
            data: {
                code: code.replace(/```[a-z]*\n?/gi, '')
                .replace(/```$/g, '')
                .trim(),
                description: 'changes made',
                projectId: projectId as string
            }
        })
console.log('33333333');
        await prisma.conversation.create({
            data: {
                role: 'assistant',
                content: "I've made the changes to your website! You can now preview it",
                projectId: projectId as string
            }
        })
console.log('4444444');
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

        res.json({message: 'Changes made successfully'})
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
       
        const projects = await prisma.websiteProject.findMany({
            where: {isPublished: true},
            include: {user: true}
        })

        res.json({ projects });
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
        })

        if(!project){
            return res.status(404).json({ message: 'Project not found' });
        }

        await prisma.websiteProject.update({
            where: {id: projectId as string},
            data: {current_code: code, current_version_index: '', custom_domain: customDomain}
        })

        res.json({ message: 'Project saved successfully' });
    } catch (error : any) {
        console.log(error.code || error.message);
        res.status(500).json({ message: error.message });
    }
}
