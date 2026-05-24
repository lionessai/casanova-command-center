export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Scenario {
  id: number;
  name: string;
  isActive: boolean;
  teamId: number;
  folderId?: number;
  scheduling?: {
    type: string;
    interval?: number;
  };
  lastExecution?: {
    status: string;
    startedAt: string;
    finishedAt?: string;
  };
}

export interface ClickUpTask {
  id: string;
  name: string;
  status: {
    status: string;
    color: string;
    type: string;
  };
  priority?: {
    priority: string;
    color: string;
  };
  due_date?: string;
  creator?: {
    username: string;
  };
  list?: {
    name: string;
  };
  url: string;
}

export interface ClickUpList {
  id: string;
  name: string;
  task_count: number;
  space: {
    id: string;
    name: string;
  };
}
