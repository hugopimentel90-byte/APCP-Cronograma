
import { ProjectStatus, ResourceType, DependencyType, Project, Task, Resource } from './types';

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_RESOURCES: Resource[] = [];

export const INITIAL_TASKS: Task[] = [];

export const STATUS_COLORS = {
  [ProjectStatus.PLANNED]: 'bg-blue-100 text-blue-800',
  [ProjectStatus.IN_PROGRESS]: 'bg-green-100 text-green-800',
  [ProjectStatus.PAUSED]: 'bg-yellow-100 text-yellow-800',
  [ProjectStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
};

// Configuração de Segurança (Em produção, isso seria validado no Backend/Supabase Auth)
export const BASELINE_ADMIN_PASSWORD = 'marinha123';
