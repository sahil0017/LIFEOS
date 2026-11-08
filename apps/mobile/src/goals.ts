export interface Goal {
  id: string | number;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
  targetDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}
