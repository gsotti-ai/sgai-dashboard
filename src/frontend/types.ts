export type Task = {
  id: string;
  header?: string;
  title?: string;
  description?: string;
  imageUrls?: string[];
  comments?: { at: string; author: string; text: string }[];
  assignee?: 'agent' | 'user' | string;
  dueAt?: string | null;
  status: 'scheduled' | 'queue' | 'in_progress' | 'done' | string;
  createdAt?: string;
  updatedAt?: string;
  doneAt?: string | null;
  history?: any[];
};

export const COLUMNS = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'queue', label: 'Queue' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
] as const;
