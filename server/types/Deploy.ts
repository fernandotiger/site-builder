/**
 * types.ts — VPS A
 *
 * Shared types for the deploy pipeline.
 * Mirror the DeployResult shape returned by VPS B's deploy agent.
 */

export interface DeployResult {
  success:         boolean;
  projectId:       string;
  domain:          string;
  webRoot:         string;
  dnsInstructions: DnsInstructions;
  error?:          string;
}

export interface DnsInstructions {
  serverIp: string;
  records:  DnsRecord[];
  propagationNote: string;
  checkUrl: string;
}

export interface DnsRecord {
  type:  string;   // "A" | "CNAME"
  name:  string;   // "@" | "www"
  value: string;   // IP address or domain
  ttl:   number;   // seconds
}