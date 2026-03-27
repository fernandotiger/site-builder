// ─── 1. Prisma schema addition ────────────────────────────────────────────────
// Add this model to your schema.prisma file:

/*
model Tutorial {
  id          String   @id @default(cuid())
  title       String
  description String?
  youtubeUrl  String
  category    String   @default("General")
  order       Int      @default(0)
  published   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
*/

// After adding, run:
//   npx prisma migrate dev --name add_tutorials
//   npx prisma generate


// ─── 2. Express router  (routes/tutorials.ts) ────────────────────────────────
import { Router, Request, Response } from 'express'
import { protect } from '../middlewares/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// ── GET /api/tutorials ── Public: list all published tutorials
router.get('/', async (_req: Request, res: Response) => {
  try {
    const tutorials = await prisma.tutorial.findMany({
      where: { published: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
    })
    return res.json({ tutorials })
  } catch (error: any) {
    console.error('GET /api/tutorials error:', error)
    return res.status(500).json({ message: 'Failed to fetch tutorials' })
  }
})

// ── POST /api/admin/tutorials ── Create (protect with your auth middleware)
router.post('/admin/add', async (req: Request, res: Response) => {
  try {console.log(req.body)
    const { title, description, youtubeUrl, category, order } = req.body

    if (!title || !youtubeUrl) {
      return res.status(400).json({ message: 'title and youtubeUrl are required' })
    }

    const tutorial = await prisma.tutorial.create({
      data: {
        title,
        description: description ?? null,
        youtubeUrl,
        category: category ?? 'General',
        order: order ?? 0,
        published: true,
      },
    })

    return res.status(201).json({ message: 'Tutorial created', tutorial })
  } catch (error: any) {
    console.error('POST /api/admin/tutorials error:', error)
    return res.status(500).json({ message: 'Failed to create tutorial' })
  }
})

// ── PUT /api/admin/tutorials/:id ── Update
router.put('/admin/tutorials/:id', protect, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, description, youtubeUrl, category, order, published } = req.body

    const tutorial = await prisma.tutorial.update({
      where: { id: id as string },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(youtubeUrl !== undefined && { youtubeUrl }),
        ...(category !== undefined && { category }),
        ...(order !== undefined && { order }),
        ...(published !== undefined && { published }),
      },
    })

    return res.json({ message: 'Tutorial updated', tutorial })
  } catch (error: any) {
    console.error('PUT /api/admin/tutorials error:', error)
    return res.status(500).json({ message: 'Failed to update tutorial' })
  }
})

// ── DELETE /api/admin/tutorials/:id ── Delete
router.delete('/admin/tutorials/:id', protect, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await prisma.tutorial.delete({ where: { id: id as string } })
    return res.json({ message: 'Tutorial deleted' })
  } catch (error: any) {
    console.error('DELETE /api/admin/tutorials error:', error)
    return res.status(500).json({ message: 'Failed to delete tutorial' })
  }
})

export default router


// ─── 3. Register the router in your main app (app.ts / index.ts) ─────────────
/*
import tutorialRoutes from './routes/tutorials'

// Public route
app.use('/api/tutorials', tutorialRoutes)

// Admin CRUD routes (add your auth middleware before the router)
// app.use('/api', authMiddleware, tutorialRoutes)
*/


// ─── 4. Optional seed data (prisma/seed.ts) ───────────────────────────────────
/*
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const tutorials = [
    {
      title: 'Creating your first project',
      description: 'Learn how to set up and launch your very first project in minutes.',
      youtubeUrl: 'https://www.youtube.com/watch?v=shoVsQhou-8&list=RDshoVsQhou-8&start_radio=1',
      category: 'Getting Started',
      order: 1,
    },
    {
      title: 'Using the AI code editor',
      description: 'Discover how to use the built-in AI editor to build faster.',
      youtubeUrl: 'https://www.youtube.com/watch?v=YOUTUBE_ID_HERE',
      category: 'Getting Started',
      order: 2,
    },
    {
      title: 'Deploying your project',
      description: 'Go live with one click — deployment made simple.',
      youtubeUrl: 'https://www.youtube.com/watch?v=YOUTUBE_ID_HERE',
      category: 'Publishing',
      order: 1,
    },
    {
      title: 'Managing project versions',
      description: 'Roll back, compare, and manage multiple versions of your project.',
      youtubeUrl: 'https://www.youtube.com/watch?v=YOUTUBE_ID_HERE',
      category: 'Advanced',
      order: 1,
    },
  ]

  for (const t of tutorials) {
    await prisma.tutorial.upsert({
      where: { id: 'seed-' + t.order + '-' + t.category.toLowerCase().replace(/ /g,'-') },
      update: {},
      create: { ...t },
    })
  }

  console.log('Tutorials seeded.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
*/
// Run seed with: npx ts-node prisma/seed.ts  (or add "seed" to package.json scripts)
