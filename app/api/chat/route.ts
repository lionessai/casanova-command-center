import Anthropic from '@anthropic-ai/sdk';
import { CASANOVA_SYSTEM_PROMPT } from '@/lib/casanova-prompt';
import { listScenarios, getScenario, runScenario, getExecutions, toggleScenario } from '@/lib/make';
import { getWorkspaces, getSpaces, getLists, getTasks, createTask, updateTask, searchTasks } from '@/lib/clickup';
import { loadMemory, saveMemory } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CASANOVA_TOOLS: Anthropic.Tool[] = [
  {
    name: 'make_list_scenarios',
    description: 'List all Make.com scenarios in the workspace. Optionally filter by search term.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search: { type: 'string', description: 'Optional search term to filter scenarios by name' },
      },
      required: [],
    },
  },
  {
    name: 'make_get_scenario',
    description: 'Get detailed information about a specific Make.com scenario including its modules and scheduling.',
    input_schema: {
      type: 'object' as const,
      properties: {
        scenario_id: { type: 'number', description: 'The scenario ID' },
      },
      required: ['scenario_id'],
    },
  },
  {
    name: 'make_run_scenario',
    description: 'Manually trigger a Make.com scenario to run immediately.',
    input_schema: {
      type: 'object' as const,
      properties: {
        scenario_id: { type: 'number', description: 'The scenario ID to run' },
      },
      required: ['scenario_id'],
    },
  },
  {
    name: 'make_get_executions',
    description: 'Get recent execution history for a Make.com scenario to check for errors.',
    input_schema: {
      type: 'object' as const,
      properties: {
        scenario_id: { type: 'number', description: 'The scenario ID' },
        limit: { type: 'number', description: 'Number of recent executions to fetch (default 5)' },
      },
      required: ['scenario_id'],
    },
  },
  {
    name: 'make_toggle_scenario',
    description: 'Activate or deactivate a Make.com scenario.',
    input_schema: {
      type: 'object' as const,
      properties: {
        scenario_id: { type: 'number', description: 'The scenario ID' },
        activate: { type: 'boolean', description: 'true to activate, false to deactivate' },
      },
      required: ['scenario_id', 'activate'],
    },
  },
  {
    name: 'clickup_get_workspaces',
    description: 'Get all ClickUp workspaces (teams) to find workspace and team IDs.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'clickup_get_lists',
    description: 'Get task lists from a ClickUp space. First call clickup_get_workspaces to get team IDs, then get spaces.',
    input_schema: {
      type: 'object' as const,
      properties: {
        space_id: { type: 'string', description: 'The ClickUp space ID' },
      },
      required: ['space_id'],
    },
  },
  {
    name: 'clickup_get_tasks',
    description: 'Get tasks from a ClickUp list.',
    input_schema: {
      type: 'object' as const,
      properties: {
        list_id: { type: 'string', description: 'The ClickUp list ID' },
        status: { type: 'string', description: 'Optional status filter (e.g. "open", "in progress", "complete")' },
      },
      required: ['list_id'],
    },
  },
  {
    name: 'clickup_create_task',
    description: 'Create a new task in a ClickUp list.',
    input_schema: {
      type: 'object' as const,
      properties: {
        list_id: { type: 'string', description: 'The ClickUp list ID' },
        name: { type: 'string', description: 'Task name' },
        description: { type: 'string', description: 'Task description' },
        priority: { type: 'number', description: '1=urgent, 2=high, 3=normal, 4=low' },
        status: { type: 'string', description: 'Initial task status' },
      },
      required: ['list_id', 'name'],
    },
  },
  {
    name: 'clickup_update_task',
    description: 'Update an existing ClickUp task status, name, or description.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_id: { type: 'string', description: 'The ClickUp task ID' },
        name: { type: 'string', description: 'New task name' },
        description: { type: 'string', description: 'New description' },
        status: { type: 'string', description: 'New status' },
        priority: { type: 'number', description: '1=urgent, 2=high, 3=normal, 4=low' },
      },
      required: ['task_id'],
    },
  },
];

type ToolInput = {
  search?: string;
  scenario_id?: number;
  activate?: boolean;
  limit?: number;
  space_id?: string;
  list_id?: string;
  task_id?: string;
  name?: string;
  description?: string;
  priority?: number;
  status?: string;
  team_id?: string;
  query?: string;
};

async function executeTool(name: string, input: ToolInput): Promise<string> {
  try {
    switch (name) {
      case 'make_list_scenarios': {
        const result = await listScenarios(input.search);
        const scenarioList = result.scenarios.slice(0, 20).map((s: any) =>
          `ID ${s.id}: "${s.name}" — ${s.isActive ? '🟢 Active' : '⚫ Inactive'}`
        ).join('\n');
        return `${result.summary}\n\n${scenarioList}`;
      }
      case 'make_get_scenario': {
        const s = await getScenario(input.scenario_id!);
        return JSON.stringify(s, null, 2);
      }
      case 'make_run_scenario': {
        const result = await runScenario(input.scenario_id!);
        return `Scenario ${input.scenario_id} triggered. Execution ID: ${result.executionId}`;
      }
      case 'make_get_executions': {
        const executions = await getExecutions(input.scenario_id!, input.limit || 5);
        if (!executions.length) return 'No execution history found for this scenario.';
        return JSON.stringify(executions.slice(0, 5), null, 2);
      }
      case 'make_toggle_scenario': {
        return await toggleScenario(input.scenario_id!, input.activate!);
      }
      case 'clickup_get_workspaces': {
        const workspaces = await getWorkspaces();
        const result = await Promise.all(
          workspaces.map(async (w: any) => {
            const spaces = await getSpaces(w.id);
            return { workspace: w.name, id: w.id, spaces: spaces.map((s: any) => ({ id: s.id, name: s.name })) };
          })
        );
        return JSON.stringify(result, null, 2);
      }
      case 'clickup_get_lists': {
        const lists = await getLists(input.space_id!);
        return JSON.stringify(lists.map((l: any) => ({ id: l.id, name: l.name, task_count: l.task_count })), null, 2);
      }
      case 'clickup_get_tasks': {
        const tasks = await getTasks(input.list_id!, { status: input.status });
        if (!tasks.length) return 'No tasks found.';
        const formatted = tasks.slice(0, 15).map((t: any) =>
          `ID: ${t.id} | "${t.name}" | Status: ${t.status?.status || 'unknown'} | Priority: ${t.priority?.priority || 'none'}`
        ).join('\n');
        return `${tasks.length} tasks found:\n${formatted}`;
      }
      case 'clickup_create_task': {
        const task = await createTask(input.list_id!, {
          name: input.name!,
          description: input.description,
          priority: input.priority,
          status: input.status,
        });
        return `Task created: "${task.name}" (ID: ${task.id}) — ${task.url}`;
      }
      case 'clickup_update_task': {
        const task = await updateTask(input.task_id!, {
          name: input.name,
          description: input.description,
          status: input.status,
          priority: input.priority,
        });
        return `Task "${task.name}" updated successfully.`;
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `Tool error (${name}): ${msg}`;
  }
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const { messages, sessionId = 'default' } = await req.json();

  const userMessage = messages[messages.length - 1]?.content || '';
  const memory = await loadMemory(sessionId);

  const historyMessages: Anthropic.MessageParam[] = memory.map(m => ({
    role: m.role,
    content: m.content,
  }));
  historyMessages.push({ role: 'user', content: userMessage });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));

      try {
        let currentMessages = [...historyMessages];
        let fullAssistantResponse = '';
        let rounds = 0;
        const MAX_ROUNDS = 8;

        while (rounds < MAX_ROUNDS) {
          const apiStream = client.messages.stream({
            model: 'claude-sonnet-4-5',
            max_tokens: 4096,
            system: CASANOVA_SYSTEM_PROMPT,
            tools: CASANOVA_TOOLS,
            messages: currentMessages,
          });

          let roundText = '';
          for await (const event of apiStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              roundText += event.delta.text;
              fullAssistantResponse += event.delta.text;
              send(event.delta.text);
            }
          }

          const finalMsg = await apiStream.finalMessage();

          if (finalMsg.stop_reason !== 'tool_use') {
            break;
          }

          const toolUses = finalMsg.content.filter(
            (b: Anthropic.ContentBlock) => b.type === 'tool_use'
          ) as Anthropic.ToolUseBlock[];

          const toolResults = await Promise.all(
            toolUses.map(async (block) => ({
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: await executeTool(block.name, block.input as ToolInput),
            }))
          );

          currentMessages = [
            ...currentMessages,
            { role: 'assistant' as const, content: finalMsg.content },
            { role: 'user' as const, content: toolResults },
          ];
          rounds++;
        }

        await saveMemory(sessionId, 'user', userMessage);
        await saveMemory(sessionId, 'assistant', fullAssistantResponse);

      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        send(`\n\n⚠️ Error: ${msg}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}
