const CLICKUP_BASE = 'https://api.clickup.com/api/v2';

function clickupHeaders() {
  return {
    'Authorization': process.env.CLICKUP_API_KEY!,
    'Content-Type': 'application/json',
  };
}

export async function getWorkspaces(): Promise<any[]> {
  const res = await fetch(`${CLICKUP_BASE}/team`, { headers: clickupHeaders() });
  if (!res.ok) throw new Error(`ClickUp get workspaces failed: ${res.status}`);
  const data = await res.json();
  return data.teams || [];
}

export async function getSpaces(teamId: string): Promise<any[]> {
  const res = await fetch(`${CLICKUP_BASE}/team/${teamId}/space?archived=false`, { headers: clickupHeaders() });
  if (!res.ok) throw new Error(`ClickUp get spaces failed: ${res.status}`);
  const data = await res.json();
  return data.spaces || [];
}

export async function getLists(spaceId: string): Promise<any[]> {
  const res = await fetch(`${CLICKUP_BASE}/space/${spaceId}/list?archived=false`, { headers: clickupHeaders() });
  if (!res.ok) throw new Error(`ClickUp get lists failed: ${res.status}`);
  const data = await res.json();
  return data.lists || [];
}

export async function getTasks(listId: string, options?: { status?: string; limit?: number }): Promise<any[]> {
  const params = new URLSearchParams({ archived: 'false' });
  if (options?.status) params.append('statuses[]', options.status);
  if (options?.limit) params.append('page', '0');

  const res = await fetch(`${CLICKUP_BASE}/list/${listId}/task?${params}`, { headers: clickupHeaders() });
  if (!res.ok) throw new Error(`ClickUp get tasks failed: ${res.status}`);
  const data = await res.json();
  return data.tasks || [];
}

export async function createTask(listId: string, options: {
  name: string;
  description?: string;
  priority?: number; // 1=urgent, 2=high, 3=normal, 4=low
  dueDate?: number; // unix ms
  status?: string;
}): Promise<any> {
  const body: any = { name: options.name };
  if (options.description) body.description = options.description;
  if (options.priority) body.priority = options.priority;
  if (options.dueDate) body.due_date = options.dueDate;
  if (options.status) body.status = options.status;

  const res = await fetch(`${CLICKUP_BASE}/list/${listId}/task`, {
    method: 'POST',
    headers: clickupHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ClickUp create task failed: ${res.status} ${err}`);
  }
  return await res.json();
}

export async function updateTask(taskId: string, options: {
  name?: string;
  description?: string;
  status?: string;
  priority?: number;
}): Promise<any> {
  const res = await fetch(`${CLICKUP_BASE}/task/${taskId}`, {
    method: 'PUT',
    headers: clickupHeaders(),
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ClickUp update task failed: ${res.status} ${err}`);
  }
  return await res.json();
}

export async function searchTasks(teamId: string, query: string): Promise<any[]> {
  const params = new URLSearchParams({ query, team_id: teamId });
  const res = await fetch(`${CLICKUP_BASE}/team/${teamId}/task?${params}`, { headers: clickupHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data.tasks || [];
}
