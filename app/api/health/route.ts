import { NextResponse } from 'next/server';
import { listScenarios } from '@/lib/make';
import { getWorkspaces } from '@/lib/clickup';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, string> = {};
  let overall = 'healthy';

  // Check Make.com
  try {
    const result = await listScenarios();
    checks.make = `✅ ${result.summary}`;
  } catch (e) {
    checks.make = `❌ Make.com error: ${e instanceof Error ? e.message : 'unknown'}`;
    overall = 'degraded';
  }

  // Check ClickUp
  try {
    const workspaces = await getWorkspaces();
    checks.clickup = `✅ ClickUp connected — ${workspaces.length} workspace(s)`;
  } catch (e) {
    checks.clickup = `❌ ClickUp error: ${e instanceof Error ? e.message : 'unknown'}`;
    overall = 'degraded';
  }

  // Check Anthropic key
  checks.anthropic = process.env.ANTHROPIC_API_KEY ? '✅ API key present' : '❌ Missing ANTHROPIC_API_KEY';

  return NextResponse.json({
    agent: 'Casanova',
    status: overall,
    checks,
    timestamp: new Date().toISOString(),
  });
}
