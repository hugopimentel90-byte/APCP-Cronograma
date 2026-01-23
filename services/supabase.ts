
import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente em produção, com fallback para desenvolvimento
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dczjsumagxjswctjjmhf.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_DVpKI-tMYS5q7y30WLN2ig_6lmBP6GS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Funções de Mapeamento (Helper para traduzir camelCase do código <-> snake_case do banco)
const mapProject = {
  toDB: (p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    start_date: p.startDate,
    end_date: p.endDate,
    budget: p.budget,
    status: p.status,
    baseline_tasks: p.baselineTasks
  }),
  fromDB: (p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    startDate: p.start_date,
    // Corrected variable from 't' to 'p' to match function parameter
    endDate: p.end_date,
    budget: p.budget,
    status: p.status,
    baselineTasks: p.baseline_tasks
  })
};

const mapTask = {
  toDB: (t: any) => ({
    id: t.id,
    project_id: t.projectId,
    name: t.name,
    start_date: t.startDate,
    end_date: t.endDate,
    duration: t.duration,
    progress: t.progress,
    priority: t.priority,
    dependencies: t.dependencies,
    resource_ids: t.resourceIds,
    is_milestone: t.isMilestone,
    parent_id: t.parentId,
    cost: t.cost,
    man_hours: t.manHours,
    realized_man_hours: t.realizedManHours,
    realized_resource_ids: t.realizedResourceIds,
    realized_cost: t.realizedCost,
    images: t.images || [], // JSONB column handles array of objects
    order_index: t.orderIndex || 0
  }),
  fromDB: (t: any) => ({
    id: t.id,
    projectId: t.project_id,
    name: t.name,
    startDate: t.start_date,
    endDate: t.end_date,
    duration: t.duration,
    progress: t.progress,
    priority: t.priority,
    dependencies: t.dependencies,
    resourceIds: t.resource_ids,
    isMilestone: t.is_milestone,
    parentId: t.parent_id,
    cost: t.cost,
    manHours: t.man_hours,
    realizedManHours: t.realized_man_hours,
    realizedResourceIds: t.realized_resource_ids,
    realizedCost: t.realized_cost,
    images: t.images || [],
    orderIndex: t.order_index || 0
  })
};

const mapResource = {
  toDB: (r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    cost_rate: r.costRate,
    availability: r.availability
  }),
  fromDB: (r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    costRate: r.cost_rate,
    availability: r.availability
  })
};

export const db = {
  getProjects: async () => {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) throw error;
    return (data || []).map(mapProject.fromDB);
  },
  upsertProject: async (project: any) => {
    const { error } = await supabase.from('projects').upsert(mapProject.toDB(project));
    if (error) throw error;
  },
  deleteProject: async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  },
  getTasks: async () => {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;
    return (data || []).map(mapTask.fromDB);
  },
  upsertTask: async (task: any) => {
    const payload = mapTask.toDB(task);
    const { error } = await supabase.from('tasks').upsert(payload);
    if (error) throw error;
  },
  deleteTask: async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },
  getResources: async () => {
    const { data, error } = await supabase.from('resources').select('*');
    if (error) throw error;
    return (data || []).map(mapResource.fromDB);
  },
  upsertResource: async (resource: any) => {
    const { error } = await supabase.from('resources').upsert(mapResource.toDB(resource));
    if (error) throw error;
  },
  deleteResource: async (id: string) => {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) throw error;
  },
  getHistory: async () => {
    const { data, error } = await supabase.from('history').select('*');
    if (error) throw error;
    return (data || []).map(h => ({
      id: h.id,
      taskId: h.task_id,
      projectId: h.project_id,
      taskName: h.task_name,
      field: h.field,
      oldValue: h.old_value,
      newValue: h.new_value,
      reason: h.reason,
      timestamp: h.timestamp
    }));
  },
  insertHistory: async (h: any) => {
    const { error } = await supabase.from('history').insert({
      id: h.id,
      task_id: h.taskId,
      project_id: h.projectId,
      task_name: h.taskName,
      field: h.field,
      old_value: h.oldValue,
      new_value: h.newValue,
      reason: h.reason,
      timestamp: h.timestamp
    });
    if (error) throw error;
  },
  deleteHistory: async (id: string) => {
    const { error } = await supabase.from('history').delete().eq('id', id);
    if (error) throw error;
  },
  getNotes: async () => {
    const { data, error } = await supabase.from('notes').select('*');
    if (error) throw error;
    return (data || []).map(n => ({
      id: n.id,
      taskId: n.task_id,
      projectId: n.project_id,
      taskName: n.task_name,
      text: n.text,
      timestamp: n.timestamp
    }));
  },
  insertNote: async (n: any) => {
    const { error } = await supabase.from('notes').insert({
      id: n.id,
      task_id: n.taskId,
      project_id: n.projectId,
      task_name: n.taskName,
      text: n.text,
      timestamp: n.timestamp
    });
    if (error) throw error;
  },
  deleteNote: async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
  }
};
