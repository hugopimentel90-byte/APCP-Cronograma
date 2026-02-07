
export enum ProjectStatus {
  PLANNED = 'Planejado',
  IN_PROGRESS = 'Em execução',
  PAUSED = 'Pausado',
  COMPLETED = 'Concluído'
}

export enum ResourceType {
  HUMAN = 'Humano',
  MATERIAL = 'Material',
  FINANCIAL = 'Financeiro'
}

export enum DependencyType {
  FS = 'FS', // Finish-to-Start
  SS = 'SS', // Start-to-Start
  FF = 'FF', // Finish-to-Finish
  SF = 'SF'  // Start-to-Finish
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  costRate: number; // Cost per hour or unit
  availability: number; // Percentage or hours per day
}

export interface TaskNote {
  id: string;
  taskId: string;
  projectId: string;
  taskName: string;
  text: string;
  timestamp: string;
}

export interface TaskImage {
  id: string;
  data: string; // Base64 image data
  name: string;
  description: string;
  date: string; // Registration date
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  duration: number; // Days
  progress: number; // 0-100
  priority: 'Low' | 'Medium' | 'High';
  dependencies: { taskId: string; type: DependencyType }[];
  resourceIds: string[];
  isMilestone: boolean;
  parentId?: string; // For WBS hierarchy
  cost: number;
  manHours: number; // Estimated effort in hours
  realizedManHours?: number; // Actual effort recorded
  realizedResourceIds?: string[]; // Actual resources used
  realizedCost?: number; // Actual cost recorded
  images?: TaskImage[]; // Photographic evidence
  orderIndex?: number;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  projectId: string;
  taskName: string;
  field: 'startDate' | 'endDate' | 'duration' | 'combined' | 'manHours' | 'images';
  oldValue: string;
  newValue: string;
  reason: string;
  timestamp: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: ProjectStatus;
  baselineTasks?: Task[]; // Snapshotted tasks for baseline
}

export interface AppState {
  projects: Project[];
  tasks: Task[];
  resources: Resource[];
  activeProjectId: string | null;
  history: TaskHistoryEntry[];
  notes: TaskNote[];
}
