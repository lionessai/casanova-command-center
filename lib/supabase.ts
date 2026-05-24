import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase env vars missing');
    supabase = createClient(url, key);
  }
  return supabase;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export async function loadMemory(sessionId: string, limit = 20): Promise<ChatMessage[]> {
  try {
    const { data, error } = await getSupabase()
      .from('casanova_memory')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function saveMemory(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  try {
    await getSupabase().from('casanova_memory').insert({ session_id: sessionId, role, content });
  } catch {
    // non-fatal
  }
}
