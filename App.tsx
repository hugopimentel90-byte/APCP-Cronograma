
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Project, Task, Resource, ProjectStatus, AppState, DependencyType, TaskHistoryEntry, TaskNote } from './types';
import { INITIAL_PROJECTS, INITIAL_TASKS, INITIAL_RESOURCES, STATUS_COLORS } from './constants';
import { IconDashboard, IconGantt, IconTasks, IconResources, IconCost, IconHistory, IconBaseline, IconNotes, IconCamera } from './components/Icons';
import GanttChart from './components/GanttChart';
import Dashboard from './components/Dashboard';
import NewProjectModal from './components/NewProjectModal';
import ProjectEditModal from './components/ProjectEditModal';
import TaskModal from './components/TaskModal';
import HistoryTab from './components/HistoryTab';
import NotesTab from './components/NotesTab';
import RegistrosTab from './components/RegistrosTab';
import ChangeReasonModal from './components/ChangeReasonModal';
import ResourceModal from './components/ResourceModal';
import TaskCompletionModal from './components/TaskCompletionModal';
import BaselineTab from './components/BaselineTab';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import { db } from './services/supabase';
import Login from './components/Login';

type TabType = 'dashboard' | 'tasks' | 'gantt' | 'baseline' | 'history' | 'resources' | 'notes' | 'registros';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [activeProjectId, setActiveProjectId] = useState<string>(INITIAL_PROJECTS[0]?.id || '');
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [notes, setNotes] = useState<TaskNote[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isProjectEditModalOpen, setIsProjectEditModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isTaskDeleteModalOpen, setIsTaskDeleteModalOpen] = useState(false);
  const [isResourceDeleteModalOpen, setIsResourceDeleteModalOpen] = useState(false);
  const [isProjectDeleteModalOpen, setIsProjectDeleteModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [initialParentId, setInitialParentId] = useState<string>('');
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ updatedTask: Task; oldTask: Task } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout ao conectar com o servidor")), 15000)
      );
      try {
        const results: any = await Promise.race([
          Promise.allSettled([
            db.getProjects(),
            db.getTasks(),
            db.getResources(),
            db.getHistory(),
            db.getNotes()
          ]),
          timeoutPromise
        ]);
        if (!mounted) return;
        const [pRes, tRes, rRes, hRes, nRes] = results;
        if (pRes.status === 'fulfilled') {
          setCloudEnabled(true);

          if (pRes.value?.length > 0) {
            setProjects(pRes.value);
            setActiveProjectId(prev => {
              const potiProject = pRes.value.find((p: Project) => p.name.includes("Poti"));
              if (potiProject) return potiProject.id;

              const exists = pRes.value.find((p: Project) => p.id === prev);
              return exists ? prev : pRes.value[0].id;
            });
          }
        }
        if (tRes.status === 'fulfilled' && tRes.value?.length > 0) setTasks(tRes.value);
        if (rRes.status === 'fulfilled' && rRes.value?.length > 0) setResources(rRes.value);
        if (hRes.status === 'fulfilled' && hRes.value) setHistory(hRes.value);
        if (nRes.status === 'fulfilled' && nRes.value) setNotes(nRes.value);
      } catch (err: any) {
        const msg = err?.message || "Erro desconhecido ao carregar dados.";
        console.warn("Usando dados locais. Motivo:", msg);
        setCloudEnabled(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [isAuthenticated]);

  const filteredProjects = useMemo(() => projects, [projects]);

  const activeProject = useMemo(() =>
    projects.find(p => p.id === activeProjectId) || projects[0],
    [activeProjectId, projects]
  );

  const activeTasks = useMemo(() =>
    tasks.filter(t => t.projectId === activeProjectId),
    [tasks, activeProjectId]
  );

  const filteredHistory = useMemo(() =>
    history.filter(h => h.projectId === activeProjectId),
    [history, activeProjectId]
  );

  const filteredNotes = useMemo(() =>
    notes.filter(n => n.projectId === activeProjectId),
    [notes, activeProjectId]
  );

  const isTaskOverdue = (dateStr: string, progress: number) => {
    if (progress >= 100) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = dateStr.split('-');
    const end = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return end < today;
  };

  const hierarchicalTasks = useMemo(() => {
    const taskMap = new Map<string, Task & { children: string[] }>();
    activeTasks.forEach(t => taskMap.set(t.id, { ...t, children: [] }));
    const roots: Task[] = [];
    activeTasks.forEach(t => {
      if (t.parentId && taskMap.has(t.parentId)) {
        taskMap.get(t.parentId)!.children.push(t.id);
      } else {
        roots.push(t);
      }
    });

    // Sort children for each parent
    taskMap.forEach(task => {
      task.children.sort((aId, bId) => {
        const taskA = taskMap.get(aId);
        const taskB = taskMap.get(bId);
        return (taskA?.orderIndex || 0) - (taskB?.orderIndex || 0);
      });
    });

    // Sort root tasks by orderIndex
    roots.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const flattened: any[] = [];
    const buildFlat = (id: string, level: number) => {
      const task = taskMap.get(id);
      if (!task) return;
      flattened.push({ ...task, level, hasChildren: (task.children?.length || 0) > 0 });
      if (!collapsedTasks.has(id)) {
        task.children?.forEach(childId => buildFlat(childId, level + 1));
      }
    };
    roots.forEach(task => buildFlat(task.id, 0));
    return flattened;
  }, [activeTasks, collapsedTasks]);

  const toggleCollapse = (taskId: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const syncToCloud = useCallback(async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (e: any) {
      console.error("Erro na sincronização:", e);

      let errorMsg = "Erro inesperado";
      if (e && typeof e === 'object') {
        // PostgrestError do Supabase costuma ter message, details, hint e code
        // Priorizamos extrair a string literal em vez de deixar cair no toString() genérico
        errorMsg = e.message || e.details || e.hint || JSON.stringify(e);
      } else if (typeof e === 'string') {
        errorMsg = e;
      }

      setSyncError(`Falha na sincronização: ${errorMsg}`);
      // Manter o erro visível por mais tempo para leitura se for crítico
      setTimeout(() => setSyncError(null), 10000);
    }
  }, []);

  const createHistoryEntry = (taskId: string, taskName: string, field: any, oldValue: string, newValue: string, reason: string): TaskHistoryEntry => ({
    id: `h-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taskId,
    projectId: activeProjectId,
    taskName,
    field,
    oldValue,
    newValue,
    reason,
    timestamp: new Date().toISOString()
  });

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    if (cloudEnabled) syncToCloud(() => db.upsertProject(updatedProject));
  };

  const handleTaskSubmit = useCallback((taskData: Task, note?: string) => {
    const existingTask = tasks.find(t => t.id === taskData.id);

    if (existingTask) {
      const dateChanged = existingTask.startDate !== taskData.startDate || existingTask.endDate !== taskData.endDate;
      if (dateChanged) {
        setPendingChange({ updatedTask: taskData, oldTask: existingTask });
        setIsReasonModalOpen(true);
        return;
      }
    }

    // Mesclar imagens existentes com novas imagens vindas do modal
    const mergedTask = existingTask
      ? { ...taskData, images: [...(existingTask.images || []), ...(taskData.images || [])] }
      : taskData;

    // Primeiro atualiza o estado local
    setTasks(prev => {
      const exists = prev.find(t => t.id === mergedTask.id);
      if (exists) {
        return prev.map(t => t.id === mergedTask.id ? mergedTask : t);
      }
      return [...prev, mergedTask];
    });

    // Registra histórico se necessário
    if (existingTask) {
      const historyEntries: TaskHistoryEntry[] = [];
      if (existingTask.name !== mergedTask.name)
        historyEntries.push(createHistoryEntry(mergedTask.id, mergedTask.name, 'combined' as any, existingTask.name, mergedTask.name, "Alteração de nome"));
      if (existingTask.manHours !== mergedTask.manHours)
        historyEntries.push(createHistoryEntry(mergedTask.id, mergedTask.name, 'manHours', String(existingTask.manHours), String(mergedTask.manHours), "Alteração de esforço"));

      if (historyEntries.length > 0) {
        setHistory(h => [...historyEntries, ...h]);
        if (cloudEnabled) historyEntries.forEach(entry => syncToCloud(() => db.insertHistory(entry)));
      }
    }

    // Sincroniza com a nuvem
    if (cloudEnabled) syncToCloud(() => db.upsertTask(mergedTask));

    if (note) {
      const newNote: TaskNote = {
        id: `note-${Date.now()}`,
        taskId: mergedTask.id,
        projectId: activeProjectId,
        taskName: mergedTask.name,
        text: note,
        timestamp: new Date().toISOString()
      };
      setNotes(prev => [newNote, ...prev]);
      if (cloudEnabled) syncToCloud(() => db.insertNote(newNote));
    }
  }, [cloudEnabled, activeProjectId, tasks, syncToCloud]);

  const handleDeleteProject = useCallback(async () => {
    if (projects.length <= 1) {
      setSyncError("Não é possível excluir o único projeto restante.");
      setIsProjectDeleteModalOpen(false);
      return;
    }

    const projectIdToDelete = activeProjectId;
    const projectToDelete = projects.find(p => p.id === projectIdToDelete);

    if (!projectToDelete) return;

    // Remove localmente
    const remainingProjects = projects.filter(p => p.id !== projectIdToDelete);
    setProjects(remainingProjects);
    setTasks(prev => prev.filter(t => t.projectId !== projectIdToDelete));
    setHistory(prev => prev.filter(h => h.projectId !== projectIdToDelete));
    setNotes(prev => prev.filter(n => n.projectId !== projectIdToDelete));

    // Seleciona o novo projeto ativo
    setActiveProjectId(remainingProjects[0].id);

    // Sincroniza com a nuvem
    if (cloudEnabled) {
      syncToCloud(() => db.deleteProject(projectIdToDelete));
    }

    setIsProjectDeleteModalOpen(false);
  }, [activeProjectId, projects, cloudEnabled, syncToCloud]);

  const handleConfirmChange = (reason: string) => {
    if (!pendingChange) return;
    const { updatedTask, oldTask } = pendingChange;

    // Mesclar imagens para a mudança pendente também
    const mergedTask = { ...updatedTask, images: [...(oldTask.images || []), ...(updatedTask.images || [])] };

    const historyEntry = createHistoryEntry(
      mergedTask.id,
      mergedTask.name,
      'combined',
      `${oldTask.startDate} até ${oldTask.endDate}`,
      `${mergedTask.startDate} até ${mergedTask.endDate}`,
      reason
    );

    setHistory(prev => [historyEntry, ...prev]);
    if (cloudEnabled) syncToCloud(() => db.insertHistory(historyEntry));

    setTasks(prev => prev.map(t => t.id === mergedTask.id ? mergedTask : t));
    if (cloudEnabled) syncToCloud(() => db.upsertTask(mergedTask));

    setIsReasonModalOpen(false);
    setPendingChange(null);
  };

  const handleTaskChange = useCallback((updatedTask: Task) => {
    handleTaskSubmit(updatedTask);
  }, [handleTaskSubmit]);

  const handleToggleTaskStatus = (task: Task) => {
    if (task.progress < 100) {
      setTaskToComplete(task);
      setIsCompletionModalOpen(true);
    } else {
      const updatedTask = { ...task, progress: 0, realizedManHours: 0, realizedResourceIds: [], realizedCost: undefined };
      setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
      if (cloudEnabled) syncToCloud(() => db.upsertTask(updatedTask));
    }
  };

  const confirmTaskCompletion = (taskId: string, realizedHH: number, realizedResources: string[], realizedCost: number) => {
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;

    const updated = { ...originalTask, progress: 100, realizedManHours: realizedHH, realizedResourceIds: realizedResources, realizedCost: realizedCost };

    setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    if (cloudEnabled) syncToCloud(() => db.upsertTask(updated));

    setIsCompletionModalOpen(false);
    setTaskToComplete(null);
  };

  const handleDeleteTask = useCallback(async () => {
    if (!taskToDelete) return;
    const idToDelete = taskToDelete.id;
    setTasks(prev => prev.filter(t => t.id !== idToDelete));
    if (cloudEnabled) syncToCloud(() => db.deleteTask(idToDelete));
    setIsTaskDeleteModalOpen(false);
    setTaskToDelete(null);
  }, [taskToDelete, cloudEnabled, syncToCloud]);

  const handleDeleteResource = useCallback(async () => {
    if (!resourceToDelete) return;
    const idToDelete = resourceToDelete.id;
    setResources(prev => prev.filter(r => r.id !== idToDelete));
    if (cloudEnabled) syncToCloud(() => db.deleteResource(idToDelete));
    setIsResourceDeleteModalOpen(false);
    setResourceToDelete(null);
  }, [resourceToDelete, cloudEnabled, syncToCloud]);

  const handleResourceSubmit = useCallback((resourceData: Resource) => {
    setResources(prev => [...prev, resourceData]);
    if (cloudEnabled) syncToCloud(() => db.upsertResource(resourceData));
  }, [cloudEnabled, syncToCloud]);

  const getResourceInitials = (resourceIds: string[]): string[] => {
    return resources
      .filter(r => resourceIds.includes(r.id))
      .map(r => r.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2));
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleDeleteImage = (taskId: string, imageId: string) => {
    setTasks(prev => {
      const updatedTasks = prev.map(t =>
        t.id === taskId
          ? { ...t, images: (t.images || []).filter(img => img.id !== imageId) }
          : t
      );
      const updatedTask = updatedTasks.find(t => t.id === taskId);
      if (cloudEnabled && updatedTask) syncToCloud(() => db.upsertTask(updatedTask));
      return updatedTasks;
    });
  };

  const handleTaskReorder = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    setTasks(prev => {
      const draggedTask = prev.find(t => t.id === draggedId);
      const targetTask = prev.find(t => t.id === targetId);

      if (!draggedTask || !targetTask || draggedTask.parentId !== targetTask.parentId) {
        return prev;
      }

      const parentId = draggedTask.parentId;
      const projectTasks = prev.filter(t => t.projectId === activeProjectId);
      const otherTasks = prev.filter(t => t.projectId !== activeProjectId);

      const siblingTasks = projectTasks
        .filter(t => (t.parentId || '') === (parentId || ''))
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      const draggedIndex = siblingTasks.findIndex(t => t.id === draggedId);
      const targetIndex = siblingTasks.findIndex(t => t.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newSiblingTasks = [...siblingTasks];
      const [removed] = newSiblingTasks.splice(draggedIndex, 1);
      newSiblingTasks.splice(targetIndex, 0, removed);

      const updatedSiblingTasks = newSiblingTasks.map((t, index) => ({
        ...t,
        orderIndex: index
      }));

      // Find which tasks actually changed to avoid unnecessary cloud updates
      const changedTasks = updatedSiblingTasks.filter(task => {
        const original = siblingTasks.find(t => t.id === task.id);
        return original?.orderIndex !== task.orderIndex;
      });

      if (cloudEnabled && changedTasks.length > 0) {
        syncToCloud(() => db.upsertTasks(changedTasks));
      }

      const updatedProjectTasks = projectTasks.map(t => {
        const updated = updatedSiblingTasks.find(rt => rt.id === t.id);
        return updated || t;
      });

      return [...otherTasks, ...updatedProjectTasks];
    });
  }, [activeProjectId, cloudEnabled, syncToCloud]);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-slate-400">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <p className="font-medium animate-pulse">Carregando Project Master...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[100] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop and Mobile (Slide-over) */}
      <aside className={`fixed inset-y-0 left-0 z-[101] bg-white border-r flex flex-col transition-all duration-300 lg:static lg:translate-x-0 ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}`}>
        <div className="p-6 border-b flex items-center justify-between">
          {!isSidebarCollapsed && <h1 className="text-xl font-bold text-blue-600">Projetos MB</h1>}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded hover:bg-gray-100">
            <svg className={`w-5 h-5 ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" /></svg>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
            { id: 'tasks', label: 'EAP', icon: IconTasks },
            { id: 'gantt', label: 'Gantt', icon: IconGantt },
            { id: 'baseline', label: 'Baseline', icon: IconBaseline },
            { id: 'history', label: 'Histórico', icon: IconHistory },
            { id: 'notes', label: 'Notas', icon: IconNotes },
            { id: 'registros', label: 'Registros', icon: IconCamera },
            { id: 'resources', label: 'Recursos', icon: IconResources },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as TabType);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center rounded-lg px-4 py-3 text-sm font-medium ${activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <item.icon className="w-5 h-5 mr-3 shrink-0" /> {(!isSidebarCollapsed || isMobileMenuOpen) && item.label}
            </button>
          ))}
          <button
            onClick={() => {
              localStorage.removeItem('isAuthenticated');
              setIsAuthenticated(false);
            }}
            className="w-full flex items-center rounded-lg px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors mt-auto border-t"
          >
            <svg className="w-5 h-5 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {(!isSidebarCollapsed || isMobileMenuOpen) && "Sair do Sistema"}
          </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {syncError && (
          <div className="absolute top-4 right-4 z-[300] bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right duration-300 flex items-start gap-3 max-w-sm">
            <svg className="w-6 h-6 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div className="flex-1">
              <span className="text-sm font-bold block mb-1">Erro de Sincronização</span>
              <p className="text-xs opacity-90 leading-relaxed">{syncError}</p>
            </div>
            <button onClick={() => setSyncError(null)} className="shrink-0 p-1 hover:bg-white/20 rounded transition-colors">&times;</button>
          </div>
        )}

        <header className="h-16 bg-white border-b px-4 lg:px-8 flex items-center justify-between shadow-sm z-[100] w-full">
          <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
            {/* Mobile Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
              <select
                className="font-bold text-gray-700 border-none bg-transparent cursor-pointer outline-none text-sm lg:text-base max-w-[200px] lg:max-w-md truncate flex-shrink"
                value={activeProjectId}
                onChange={(e) => setActiveProjectId(e.target.value)}
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {activeProject && (
                <span className={`hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${STATUS_COLORS[activeProject.status]}`}>
                  {activeProject.status}
                </span>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsProjectEditModalOpen(true)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar Projeto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                onClick={() => setIsProjectDeleteModalOpen(true)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir Projeto"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          {activeProject && (
            <button onClick={() => setIsNewProjectModalOpen(true)} className="bg-blue-600 text-white px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-bold hover:bg-blue-700 transition-colors shrink-0">
              <span className="hidden lg:inline">Novo Projeto</span>
              <span className="lg:hidden">+ Novo</span>
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {activeTab === 'dashboard' && activeProject && (
            <Dashboard
              project={activeProject}
              tasks={activeTasks}
              resources={resources}
              onEditProject={() => setIsProjectEditModalOpen(true)}
            />
          )}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Estrutura Analítica (EAP)</h2>
                <button
                  onClick={() => { setTaskToEdit(null); setInitialParentId(''); setIsTaskModalOpen(true); }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Adicionar Tarefa
                </button>
              </div>
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                  <table className="w-full text-left min-w-[700px] lg:min-w-[1000px]">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-[10px] uppercase text-gray-400 font-bold border-b bg-gray-50/50">
                        <th className="px-4 lg:px-6 py-4 sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-40 sm:w-72 lg:w-80">Tarefa</th>
                        <th className="px-2 lg:px-4 py-4 text-center">Início</th>
                        <th className="px-2 lg:px-4 py-4 text-center">Término</th>
                        <th className="px-2 lg:px-4 py-4 text-center hidden sm:table-cell">Duração</th>
                        <th className="px-2 lg:px-4 py-4 text-center hidden md:table-cell">HH Plan.</th>
                        <th className="px-2 lg:px-4 py-4 text-center hidden md:table-cell">HH Real.</th>
                        <th className="px-2 lg:px-4 py-4 hidden lg:table-cell">Recursos</th>
                        <th className="px-4 lg:px-6 py-4">Progresso</th>
                        <th className="px-2 lg:px-4 py-4 text-center sticky right-0 bg-gray-50 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hierarchicalTasks.map((task, index) => {
                        const overdue = !task.hasChildren && isTaskOverdue(task.endDate, task.progress);
                        const isRoot = task.level === 0;

                        return (
                          <tr
                            key={task.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('taskId', task.id);
                              e.dataTransfer.setData('parentId', task.parentId || '');
                              e.currentTarget.classList.add('opacity-50');
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.classList.remove('opacity-50');
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              // We check parentId compatibility on Drop to keep it simple and performant
                              e.currentTarget.classList.add('bg-blue-50/50');
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('bg-blue-50/50');
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('bg-blue-50/50');
                              const draggedId = e.dataTransfer.getData('taskId');
                              const draggedParentId = e.dataTransfer.getData('parentId');

                              if (draggedId && draggedId !== task.id && draggedParentId === (task.parentId || '')) {
                                handleTaskReorder(draggedId, task.id);
                              }
                            }}
                            className={`border-b hover:bg-slate-50 group transition-colors duration-200 ${overdue ? 'bg-red-50/30' : ''} cursor-move`}
                          >
                            <td className="px-4 lg:px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors w-40 sm:w-72 lg:w-80" style={{ paddingLeft: `${16 + task.level * 16}px` }}>
                              <div className="flex items-center gap-2 lg:max-w-none min-w-0">
                                {task.hasChildren && (
                                  <button onClick={() => toggleCollapse(task.id)} className="p-1 hover:bg-gray-200 rounded flex-shrink-0">
                                    <svg className={`w-3 h-3 lg:w-3.5 lg:h-3.5 ${collapsedTasks.has(task.id) ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                )}
                                <span className={`${task.level === 0
                                  ? 'text-sm lg:text-lg font-extrabold text-slate-900 leading-tight block'
                                  : task.hasChildren
                                    ? 'text-xs lg:text-sm font-bold text-slate-800'
                                    : 'text-xs lg:text-sm text-slate-600'
                                  } flex items-center gap-1.5 lg:gap-2 whitespace-normal break-words overflow-visible`}>
                                  {task.name}
                                  {overdue && (
                                    <span className="shrink-0 text-[8px] bg-red-100 text-red-600 px-1 py-0.5 rounded-full font-bold uppercase animate-pulse">
                                      !
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 lg:px-4 py-4 text-center text-[10px] lg:text-xs text-gray-400">{formatDateBR(task.startDate)}</td>
                            <td className={`px-2 lg:px-4 py-4 text-center text-[10px] lg:text-xs font-medium ${overdue ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{formatDateBR(task.endDate)}</td>
                            <td className="px-2 lg:px-4 py-4 text-center text-xs text-gray-500 hidden sm:table-cell">{task.duration}d</td>
                            <td className="px-2 lg:px-4 py-4 text-center text-xs text-blue-600 font-bold hidden md:table-cell">{task.manHours || 0}h</td>
                            <td className="px-2 lg:px-4 py-4 text-center text-xs text-green-600 font-bold hidden md:table-cell">{task.realizedManHours || 0}h</td>
                            <td className="px-2 lg:px-4 py-4 hidden lg:table-cell">
                              <div className="flex -space-x-1.5">
                                {getResourceInitials(task.resourceIds).map((init, i) => (
                                  <div key={i} className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold border-2 border-white">{init}</div>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4">
                              <div className="flex items-center gap-2 min-w-[80px]">
                                <div className="flex-1 bg-gray-100 h-1 rounded-full overflow-hidden">
                                  <div className={`${overdue ? 'bg-red-500' : 'bg-blue-600'} h-full transition-all duration-300`} style={{ width: `${task.progress}%` }}></div>
                                </div>
                                <span className={`text-[9px] font-bold ${overdue ? 'text-red-500' : 'text-gray-400'}`}>{task.progress}%</span>
                              </div>
                            </td>
                            <td className="px-2 lg:px-4 py-4 text-center sticky right-0 bg-white group-hover:bg-slate-50 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors">
                              <div className="flex items-center justify-center gap-0.5 lg:gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setTaskToEdit(null); setInitialParentId(task.id); setIsTaskModalOpen(true); }}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                  title="Adicionar Subtarefa"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                </button>
                                <button onClick={() => { setTaskToEdit(task); setInitialParentId(''); setIsTaskModalOpen(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Editar Tarefa">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button onClick={() => { setTaskToDelete(task); setIsTaskDeleteModalOpen(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Excluir Tarefa">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                                <button onClick={() => handleToggleTaskStatus(task)} className={`p-1.5 rounded ${task.progress === 100 ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`} title="Concluir/Resetar">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'gantt' && (
            <GanttChart
              tasks={hierarchicalTasks}
              onTaskChange={handleTaskChange}
              onToggleCollapse={toggleCollapse}
              collapsedTasks={collapsedTasks}
            />
          )}
          {activeTab === 'baseline' && activeProject && (
            <BaselineTab
              project={activeProject}
              resources={resources}
              onUpdateBaselineTasks={(t) => {
                const updated = { ...activeProject, baselineTasks: t };
                setProjects(prev => prev.map(p => p.id === activeProject.id ? updated : p));
                if (cloudEnabled) syncToCloud(() => db.upsertProject(updated));
              }}
              onSetBaseline={() => {
                const updated = { ...activeProject, baselineTasks: [...activeTasks] };
                setProjects(prev => prev.map(p => p.id === activeProject.id ? updated : p));
                if (cloudEnabled) syncToCloud(() => db.upsertProject(updated));
              }}
              onApplyBaselineToPlan={() => {
                if (activeProject.baselineTasks) {
                  const baselineTasks = activeProject.baselineTasks;
                  setTasks(prev => {
                    const others = prev.filter(t => t.projectId !== activeProject.id);
                    return [...others, ...baselineTasks];
                  });
                }
              }}
            />
          )}
          {activeTab === 'history' && <HistoryTab history={filteredHistory} onDeleteHistory={async (id) => {
            setHistory(prev => prev.filter(h => h.id !== id));
            if (cloudEnabled) syncToCloud(() => db.deleteHistory(id));
          }} />}
          {activeTab === 'notes' && <NotesTab notes={filteredNotes} onDeleteNote={async (id) => {
            setNotes(prev => prev.filter(n => n.id !== id));
            if (cloudEnabled) syncToCloud(() => db.deleteNote(id));
          }} />}
          {activeTab === 'registros' && (
            <RegistrosTab
              tasks={activeTasks}
              onDeleteImage={handleDeleteImage}
            />
          )}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Recursos do Projeto</h2>
                <button
                  onClick={() => setIsResourceModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Adicionar Recurso
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {resources.map(res => (
                  <div key={res.id} className="bg-white p-3 sm:p-6 rounded-xl border shadow-sm flex flex-col sm:flex-row items-center gap-2 sm:gap-4 hover:shadow-md transition-shadow relative group/card">
                    <button
                      onClick={() => { setResourceToDelete(res); setIsResourceDeleteModalOpen(true); }}
                      className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1 sm:p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover/card:opacity-100 transition-all"
                      title="Excluir Recurso"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg sm:text-xl shrink-0">{res.name[0]}</div>
                    <div className="text-center sm:text-left min-w-0 w-full">
                      <h3 className="font-bold text-gray-900 text-xs sm:text-base truncate">{res.name}</h3>
                      <p className="text-[8px] sm:text-xs text-gray-400 uppercase font-bold truncate">{res.type}</p>
                      <p className="text-[7px] sm:text-[10px] text-gray-500 mt-0.5 sm:mt-1">Disp: {res.availability}h/dia</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <NewProjectModal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} onCreate={(p) => {
        setProjects(prev => [...prev, p]);
        if (cloudEnabled) syncToCloud(() => db.upsertProject(p));
      }} />

      <ProjectEditModal
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        project={activeProject}
        onUpdate={handleUpdateProject}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setTaskToEdit(null); setInitialParentId(''); }}
        onSubmit={handleTaskSubmit}
        projectId={activeProjectId}
        resources={resources}
        existingTasks={activeTasks}
        taskToEdit={taskToEdit}
        initialParentId={initialParentId}
      />

      <ResourceModal
        isOpen={isResourceModalOpen}
        onClose={() => setIsResourceModalOpen(false)}
        onSubmit={handleResourceSubmit}
      />

      {taskToComplete && <TaskCompletionModal isOpen={isCompletionModalOpen} task={taskToComplete} resources={resources} onConfirm={confirmTaskCompletion} onCancel={() => setIsCompletionModalOpen(false)} />}

      <DeleteConfirmationModal
        isOpen={isTaskDeleteModalOpen}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja excluir a tarefa "${taskToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDeleteTask}
        onCancel={() => { setIsTaskDeleteModalOpen(false); setTaskToDelete(null); }}
      />

      <DeleteConfirmationModal
        isOpen={isResourceDeleteModalOpen}
        title="Excluir Recurso"
        message={`Tem certeza que deseja excluir o recurso "${resourceToDelete?.name}"? Esta ação removerá o recurso da lista, mas não alterará registros históricos.`}
        onConfirm={handleDeleteResource}
        onCancel={() => { setIsResourceDeleteModalOpen(false); setResourceToDelete(null); }}
      />

      <DeleteConfirmationModal
        isOpen={isProjectDeleteModalOpen}
        title="Excluir Projeto Inteiro"
        message={`ATENÇÃO: Você está prestes a excluir o projeto "${activeProject?.name}" e TODAS as suas tarefas, histórico e notas. Esta ação é IRREVERSÍVEL. Deseja continuar?`}
        onConfirm={handleDeleteProject}
        onCancel={() => setIsProjectDeleteModalOpen(false)}
      />

      <ChangeReasonModal isOpen={isReasonModalOpen} taskName={pendingChange?.updatedTask.name || ''} onConfirm={handleConfirmChange} onCancel={() => { setIsReasonModalOpen(false); setPendingChange(null); }} />
    </div >
  );
};

export default App;
