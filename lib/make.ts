const MAKE_BASE = 'https://us2.make.com/api/v2';
const MAKE_TEAM_ID = 1457065;

function makeHeaders() {
  return {
    'Authorization': `Token ${process.env.MAKE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

export async function listScenarios(search?: string): Promise<{ scenarios: any[]; summary: string }> {
  const params = new URLSearchParams({ teamId: MAKE_TEAM_ID.toString() });
  if (search) params.append('q', search);

  const res = await fetch(`${MAKE_BASE}/scenarios?${params}`, { headers: makeHeaders() });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Make.com list scenarios failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const scenarios = data.scenarios || [];
  const active = scenarios.filter((s: any) => s.isActive).length;
  const summary = `Found ${scenarios.length} scenarios (${active} active, ${scenarios.length - active} inactive)`;
  return { scenarios, summary };
}

export async function getScenario(scenarioId: number): Promise<any> {
  const res = await fetch(`${MAKE_BASE}/scenarios/${scenarioId}`, { headers: makeHeaders() });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Make.com get scenario failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.scenario;
}

export async function runScenario(scenarioId: number): Promise<{ executionId: string; status: string }> {
  const res = await fetch(`${MAKE_BASE}/scenarios/${scenarioId}/run`, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Make.com run scenario failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return {
    executionId: data.executionId || data.execution?.id || 'triggered',
    status: 'running',
  };
}

export async function getExecutions(scenarioId: number, limit = 5): Promise<any[]> {
  const params = new URLSearchParams({
    scenarioId: scenarioId.toString(),
    pg: JSON.stringify({ limit }),
  });
  const res = await fetch(`${MAKE_BASE}/scenarios/${scenarioId}/logs?${params}`, { headers: makeHeaders() });
  if (!res.ok) {
    // Try executions endpoint
    const res2 = await fetch(`${MAKE_BASE}/executions?scenarioId=${scenarioId}&pg[limit]=${limit}`, { headers: makeHeaders() });
    if (!res2.ok) return [];
    const data2 = await res2.json();
    return data2.executions || [];
  }
  const data = await res.json();
  return data.logs || data.executions || [];
}

export async function toggleScenario(scenarioId: number, activate: boolean): Promise<string> {
  const endpoint = activate ? 'activate' : 'deactivate';
  const res = await fetch(`${MAKE_BASE}/scenarios/${scenarioId}/${endpoint}`, {
    method: 'POST',
    headers: makeHeaders(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Make.com toggle scenario failed: ${res.status} ${err}`);
  }
  return `Scenario ${scenarioId} ${activate ? 'activated' : 'deactivated'} successfully`;
}
