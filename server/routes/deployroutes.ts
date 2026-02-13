import express from 'express';
import { deployProject, undeployProject } from '../controllers/deployController.js';
import { protect } from '../middlewares/auth.js';
import {Request, Response} from 'express'

const deployRouter = express.Router();

//userRouter.get('/credits',protect, getUserCredits)

deployRouter.post("/add", protect, async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.body as { projectId?: string };

  if (!projectId?.trim()) {
    res.status(400).json({ success: false, error: "projectId is required" });
    return;
  }

  const result = await deployProject(projectId.trim()).catch((err: unknown) => ({
    success: false,
    message: err instanceof Error ? err.message : String(err),
  }));

  res.status(result.success ? 200 : 500).json(result);
});

/**
 * DELETE /api/deploy
 *
 * Removes a project's landing page from Caddy on VPS B.
 *
 * Request body:
 * {
 *   "projectId":  "cuid_or_uuid",
 *   "deleteFiles": true   // optional — also wipes static files from disk
 * }
 */
deployRouter.delete("/delete", protect, async (req: Request, res: Response): Promise<void> => {
  const { projectId, deleteFiles = false } =
    req.body as { projectId?: string; deleteFiles?: boolean };

  if (!projectId?.trim()) {
    res.status(400).json({ success: false, error: "projectId is required" });
    return;
  }

  const result = await undeployProject(projectId.trim(), deleteFiles).catch(
    (err: unknown) => ({
      success: false,
      message: err instanceof Error ? err.message : String(err),
    })
  );

  res.status(result.success ? 200 : 500).json(result);
});

export default deployRouter