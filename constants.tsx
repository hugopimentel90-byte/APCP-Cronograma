
import { ProjectStatus, ResourceType, DependencyType, Project, Task, Resource } from './types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Implantação ERP 2024',
    description: 'Projeto de substituição do sistema legado pela nova versão do SAP.',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    budget: 500000,
    status: ProjectStatus.IN_PROGRESS
  }
];

export const INITIAL_RESOURCES: Resource[] = [
  { id: 'r1', name: 'João Silva', type: ResourceType.HUMAN, costRate: 150, availability: 8 },
  { id: 'r2', name: 'Maria Souza', type: ResourceType.HUMAN, costRate: 120, availability: 8 },
  { id: 'r3', name: 'Servidor Cloud', type: ResourceType.MATERIAL, costRate: 1000, availability: 24 }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    name: 'Análise de Requisitos',
    startDate: '2024-01-01',
    endDate: '2024-01-15',
    duration: 15,
    progress: 100,
    priority: 'High',
    dependencies: [],
    resourceIds: ['r1'],
    isMilestone: false,
    cost: 5000,
    manHours: 120,
    realizedManHours: 120,
    realizedResourceIds: ['r1']
  },
  {
    id: 't2',
    projectId: 'p1',
    name: 'Desenvolvimento Módulo Financeiro',
    startDate: '2024-01-16',
    endDate: '2024-02-28',
    duration: 44,
    progress: 45,
    priority: 'High',
    dependencies: [{ taskId: 't1', type: DependencyType.FS }],
    resourceIds: ['r2'],
    isMilestone: false,
    cost: 25000,
    manHours: 350,
    realizedManHours: 0,
    realizedResourceIds: []
  },
  {
    id: 't3',
    projectId: 'p1',
    name: 'Go-Live Fase 1',
    startDate: '2024-03-01',
    endDate: '2024-03-01',
    duration: 0,
    progress: 0,
    priority: 'High',
    dependencies: [{ taskId: 't2', type: DependencyType.FS }],
    resourceIds: [],
    isMilestone: true,
    cost: 0,
    manHours: 0,
    realizedManHours: 0,
    realizedResourceIds: []
  }
];

export const STATUS_COLORS = {
  [ProjectStatus.PLANNED]: 'bg-blue-100 text-blue-800',
  [ProjectStatus.IN_PROGRESS]: 'bg-green-100 text-green-800',
  [ProjectStatus.PAUSED]: 'bg-yellow-100 text-yellow-800',
  [ProjectStatus.COMPLETED]: 'bg-gray-100 text-gray-800',
};

// Configuração de Segurança (Em produção, isso seria validado no Backend/Supabase Auth)
export const BASELINE_ADMIN_PASSWORD = 'marinha123';
