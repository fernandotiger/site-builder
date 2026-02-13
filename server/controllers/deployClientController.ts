/**
 * deployClient.ts — VPS A
 *
 * HTTP client that sends deploy requests from VPS A to the
 * VPS B deploy agent.
 *
 * All knowledge of VPS B's address and the shared secret lives here
 * (pulled from environment variables), so nothing else in VPS A
 * needs to know how VPS B works.
 */

import type { DeployResult } from "../types/Deploy.js";

// ── Config (set in VPS A .env) ─────────────────────────────────────────────────
// VPS_B_AGENT_URL   = "https://deploy.pagening.cloud"   ← internal/private URL
// DEPLOY_SECRET     = "<same 64-char hex as VPS B>"

const AGENT_URL    = process.env.VPS_B_AGENT_URL ?? "";
const DEPLOY_SECRET = process.env.DEPLOY_SECRET ?? "";

function agentHeaders(): Record<string, string> {
  return {
    "Content-Type":    "application/json",
    "X-Deploy-Secret": DEPLOY_SECRET,
  };
}

// ── Deploy (create or overwrite) ───────────────────────────────────────────────

export async function callDeployAgent(params: {
  projectId:   string;
  customDomain: string;
  htmlContent:  string;
}): Promise<DeployResult> {
  if (!AGENT_URL)    throw new Error("VPS_B_AGENT_URL is not configured");
  if (!DEPLOY_SECRET) throw new Error("DEPLOY_SECRET is not configured");

  const res = await fetch(`${AGENT_URL}/deploy`, {
    method:  "POST",
    headers: agentHeaders(),
    body:    JSON.stringify(params),
  });

  const data = (await res.json()) as DeployResult;

  if (!res.ok || !data.success) {
    throw new Error(
      `Deploy agent returned ${res.status}: ${data.error ?? "unknown error"}`
    );
  }

  return data;
}

// ── Undeploy (remove site from Caddy) ─────────────────────────────────────────

export async function callUndeployAgent(params: {
  projectId:    string;
  customDomain: string;
  deleteFiles?: boolean;
}): Promise<void> {
  if (!AGENT_URL) throw new Error("VPS_B_AGENT_URL is not configured");

  const res = await fetch(`${AGENT_URL}/deploy`, {
    method:  "DELETE",
    headers: agentHeaders(),
    body:    JSON.stringify(params),
  });

  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(
      `Undeploy agent returned ${res.status}: ${data.error ?? "unknown error"}`
    );
  }
}