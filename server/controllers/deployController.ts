/**
 * deployService.ts — VPS A
 *
 * Orchestrates the full deploy flow:
 *   1. Look up the project in the external DB via Prisma
 *   2. Validate it has a custom_domain and current_code
 *   3. Call the VPS B deploy agent
 *   4. Persist the deploy result back to the project record
 *   5. Return structured result (including DNS instructions) to the API caller
 */

import prisma from '../lib/prisma.js';
import { callDeployAgent, callUndeployAgent } from "./deployClientController.js";
import type { DeployResult } from "../types/Deploy.js";


// ── Types ──────────────────────────────────────────────────────────────────────

export interface ServiceDeployResult {
  success:         boolean;
  message:         string;
  domain?:         string;
  dnsInstructions?: DeployResult["dnsInstructions"];
  error?:          string;
}

// ── Deploy ─────────────────────────────────────────────────────────────────────

/**
 * deployProject
 *
 * Main entry point called by the Express route handler.
 * Idempotent: calling it again on the same project overwrites the
 * existing deployment (updates HTML + Caddy route in-place).
 */
export async function deployProject(
  projectId: string, userId: string
): Promise<ServiceDeployResult> {

  // ── 1. Fetch project from DB ─────────────────────────────────────────────
  const project = await prisma.websiteProject.findFirst({
    where: { id: projectId, userId },
    select: {
      id:            true,
      custom_domain: true,
      current_code:  true,
    },
  });

  if (!project) {
    return { success: false, message: `Project not found: ${projectId}` };
  }

  const { custom_domain, current_code } = project;

  if (!custom_domain?.trim()) {
    return {
      success: false,
      message: "Project has no Custom Domain configured. To make it professional you need to set up one.",
    };
  }

  if (!current_code?.trim()) {
    return {
      success: false,
      message: "Project has no HTML content (current code is empty). Publish the page first.",
    };
  }

  // ── 2. Call VPS B deploy agent ───────────────────────────────────────────
  let deployResult: DeployResult;
  try {
    deployResult = await callDeployAgent({
      projectId,
      customDomain: custom_domain,
      htmlContent:  current_code,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[DeployService] Agent call failed for project ${projectId}:`, message);
    return { success: false, message: `Deployment failed: ${message}` };
  }

  // ── 3. Persist deploy metadata back to DB ────────────────────────────────
  // Store the resolved domain and server IP so the dashboard can display them.
  // Add / adjust these fields in your Prisma schema as needed.
  /*try {
    await prisma.websiteProject.update({
      where: { id: projectId },
      data: {
        deployed_domain:    deployResult.domain,
        deployed_server_ip: deployResult.dnsInstructions.serverIp,
        last_deployed_at:   new Date(),
      },
    });
  } catch (dbErr: unknown) {
    // Non-fatal: the site is live even if we can't write the metadata
    console.warn(
      `[DeployService] Could not update deploy metadata for ${projectId}:`,
      dbErr
    );
  }*/

  return {
    success:         true,
    message:         `Landing page deployed successfully for ${deployResult.domain}`,
    domain:          deployResult.domain,
    dnsInstructions: deployResult.dnsInstructions,
  };
}

// ── Undeploy ───────────────────────────────────────────────────────────────────

/**
 * undeployProject
 *
 * Removes the site from Caddy on VPS B.
 * Optionally deletes the static files too.
 * Called when a user deletes their project or changes their custom domain.
 */
export async function undeployProject(
  projectId:   string, userId: string, 
  deleteFiles = false
): Promise<ServiceDeployResult> {

  const project = await prisma.websiteProject.findFirst({
    where: { id: projectId, userId },
    select: { id: true, custom_domain: true },
  });

  if (!project?.custom_domain) {
    return { success: false, message: "Project or custom_domain not found." };
  }

  try {
    await callUndeployAgent({
      projectId,
      customDomain: project.custom_domain,
      deleteFiles,
    });
/*
    await prisma.websiteProject.update({
      where: { id: projectId },
      data: {
        deployed_domain:    null,
        deployed_server_ip: null,
        last_deployed_at:   null,
      },
    });
*/
    return {
      success: true,
      message: `Site for ${project.custom_domain} removed from the Web Configuration.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Undeploy failed: ${message}` };
  }
}