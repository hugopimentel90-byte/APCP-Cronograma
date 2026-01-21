
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Task, DependencyType } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface GanttChartProps {
  tasks: (Task & { level?: number; hasChildren?: boolean })[];
  onTaskChange: (updatedTask: Task) => void;
  onToggleCollapse: (taskId: string) => void;
  collapsedTasks: Set<string>;
}

type DragType = 'move' | 'resize-left' | 'resize-right' | null;
type ViewMode = 'day' | 'week' | 'month' | 'year';

interface DragPreview {
  id: string;
  startDate: string;
  endDate: string;
  duration: number;
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, onTaskChange, onToggleCollapse, collapsedTasks }) => {
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [dragType, setDragType] = useState<DragType>(null);
  const [initialMouseX, setInitialMouseX] = useState(0);
  const [initialTaskDates, setInitialTaskDates] = useState<{ start: Date; end: Date } | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [dayWidth, setDayWidth] = useState(40);
  const [isExporting, setIsExporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return new Date();
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date();
    const [year, month, day] = parts.map(Number);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const daysDiff = (d1: Date, d2: Date) => {
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    const t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
    const t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
    return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
  };

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    if (isNaN(result.getTime())) return result;
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDate = (date: Date) => {
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isOverdue = (dateStr: string, progress: number) => {
    if (progress >= 100) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseLocalDate(dateStr);
    return end < today;
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    const presets: Record<ViewMode, number> = {
      day: 40,
      week: 15,
      month: 5,
      year: 1.5,
    };
    setDayWidth(presets[mode]);
  };

  const zoomIn = () => setDayWidth(prev => Math.min(prev * 1.2, 200));
  const zoomOut = () => setDayWidth(prev => Math.max(prev / 1.2, 0.5));

  const parentIds = useMemo(() => {
    return new Set((tasks || []).map(t => t.parentId).filter(id => id !== undefined) as string[]);
  }, [tasks]);

  const { minDate, maxDate } = useMemo(() => {
    if (!tasks || tasks.length === 0) return { minDate: new Date(), maxDate: new Date() };
    const dates = tasks
      .flatMap(t => [parseLocalDate(t.startDate), parseLocalDate(t.endDate)])
      .filter(d => !isNaN(d.getTime()));

    if (dates.length === 0) return { minDate: new Date(), maxDate: new Date() };

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));

    const marginDays = Math.max(15, Math.ceil(400 / Math.max(dayWidth, 0.1)));
    min.setDate(min.getDate() - 5);
    max.setDate(max.getDate() + marginDays);
    return { minDate: min, maxDate: max };
  }, [tasks, dayWidth]);

  const rowHeight = 50;
  const totalDays = useMemo(() => {
    const diff = daysDiff(minDate, maxDate);
    return isNaN(diff) ? 0 : diff;
  }, [minDate, maxDate]);

  const timelineDays = useMemo(() => {
    const days = [];
    const safeTotalDays = Math.min(totalDays, 40000);
    for (let i = 0; i <= safeTotalDays; i++) {
      days.push(addDays(minDate, i));
    }
    return days;
  }, [minDate, totalDays]);

  /**
   * Lógica Avançada de Caminho Crítico (CPM)
   * Identifica tarefas com folga zero (Float = 0)
   */
  const criticalTaskIds = useMemo(() => {
    if (!tasks || tasks.length === 0) return new Set<string>();

    const taskMap = new Map<string, Task>(tasks.map(t => [t.id, t]));
    const criticalIds = new Set<string>();

    // 1. Identificar tarefas sucessoras (para o backward pass)
    const successors = new Map<string, string[]>();
    tasks.forEach(t => {
      (t.dependencies || []).forEach(dep => {
        if (!successors.has(dep.taskId)) successors.set(dep.taskId, []);
        successors.get(dep.taskId)!.push(t.id);
      });
    });

    // 2. Determinar a data final do projeto (Early Finish máximo)
    const taskEnds = tasks.map(t => parseLocalDate(t.endDate).getTime()).filter(t => !isNaN(t));
    if (taskEnds.length === 0) return criticalIds;
    const projectEndMs = Math.max(...taskEnds);

    // 3. Backward Pass: Começar do fim e encontrar tarefas sem folga
    // Uma tarefa é crítica se:
    // a) Ela termina no final do projeto E não tem sucessores críticos OU
    // b) Ela é predecessora imediata de uma tarefa crítica com folga zero
    const queue: string[] = tasks
      .filter(t => parseLocalDate(t.endDate).getTime() === projectEndMs)
      .map(t => t.id);

    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentTask = taskMap.get(currentId);
      if (!currentTask) continue;

      criticalIds.add(currentId);

      // Retroceder para as predecessoras
      (currentTask.dependencies || []).forEach(dep => {
        const pred = taskMap.get(dep.taskId);
        if (!pred) return;

        const predEnd = parseLocalDate(pred.endDate);
        const currentStart = parseLocalDate(currentTask.startDate);

        // Critério de folga zero (FS: predEnd e currentStart são adjacentes)
        // Usamos uma margem de 1 dia para considerar calendários e feriados flexíveis
        const slack = daysDiff(predEnd, currentStart);
        if (dep.type === DependencyType.FS && slack <= 1) {
          queue.push(pred.id);
        } else if (dep.type === DependencyType.SS && daysDiff(parseLocalDate(pred.startDate), currentStart) <= 1) {
          queue.push(pred.id);
        } else if (dep.type === DependencyType.FF && daysDiff(predEnd, parseLocalDate(currentTask.endDate)) <= 1) {
          queue.push(pred.id);
        }
      });
    }

    // Se uma tarefa sumário (EAP) tem um filho crítico, ela também é considerada no caminho crítico
    // para fins de destaque visual de estrutura
    tasks.forEach(t => {
      if (t.hasChildren || parentIds.has(t.id)) {
        const hasCriticalChild = tasks.some(child => child.parentId === t.id && criticalIds.has(child.id));
        if (hasCriticalChild) criticalIds.add(t.id);
      }
    });

    return criticalIds;
  }, [tasks, parentIds]);

  const handleMouseDown = (e: React.MouseEvent, taskId: string, type: DragType) => {
    if (parentIds.has(taskId) || (tasks || []).find(t => t.id === taskId)?.hasChildren) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const s = parseLocalDate(task.startDate);
    const end = parseLocalDate(task.endDate);
    if (isNaN(s.getTime()) || isNaN(end.getTime())) return;

    setDraggingTask(taskId);
    setDragType(type);
    setInitialMouseX(e.clientX);
    setInitialTaskDates({ start: s, end: end });
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingTask || !initialTaskDates || !dragType) return;

      const deltaX = e.clientX - initialMouseX;
      const daysDelta = Math.round(deltaX / dayWidth);
      if (daysDelta === 0 && !dragPreview) return;

      let newStart = new Date(initialTaskDates.start);
      let newEnd = new Date(initialTaskDates.end);

      if (dragType === 'move') {
        newStart = addDays(initialTaskDates.start, daysDelta);
        newEnd = addDays(initialTaskDates.end, daysDelta);
      }
      else if (dragType === 'resize-left') {
        newStart = addDays(initialTaskDates.start, daysDelta);
        if (newStart > newEnd) newStart = new Date(newEnd);
      }
      else if (dragType === 'resize-right') {
        newEnd = addDays(initialTaskDates.end, daysDelta);
        if (newEnd < newStart) newEnd = new Date(newStart);
      }

      setDragPreview({
        id: draggingTask,
        startDate: formatDate(newStart),
        endDate: formatDate(newEnd),
        duration: daysDiff(newStart, newEnd)
      });
    };

    const handleMouseUp = () => {
      if (draggingTask && dragPreview) {
        const task = tasks.find(t => t.id === draggingTask);
        if (task) {
          onTaskChange({
            ...task,
            startDate: dragPreview.startDate,
            endDate: dragPreview.endDate,
            duration: dragPreview.duration
          });
        }
      }
      setDraggingTask(null);
      setDragType(null);
      setInitialTaskDates(null);
      setDragPreview(null);
    };

    if (draggingTask) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTask, initialMouseX, initialTaskDates, dragType, tasks, onTaskChange, dayWidth, dragPreview]);

  const dependencyPaths = useMemo(() => {
    const paths: React.ReactElement[] = [];
    if (!tasks) return paths;
    tasks.forEach((task, idx) => {
      (task.dependencies || []).forEach(dep => {
        const predIndex = tasks.findIndex(t => t.id === dep.taskId);
        if (predIndex === -1) return;
        const pred = tasks[predIndex];
        const predEnd = parseLocalDate(pred.endDate);
        const taskStart = parseLocalDate(task.startDate);
        if (isNaN(predEnd.getTime()) || isNaN(taskStart.getTime())) return;

        const predXEnd = daysDiff(minDate, predEnd) * dayWidth + (dayWidth / 2);
        const predY = predIndex * rowHeight + rowHeight / 2;
        const succXStart = daysDiff(minDate, taskStart) * dayWidth;
        const succY = idx * rowHeight + rowHeight / 2;

        // Uma dependência é crítica se AMBAS as tarefas forem críticas e a folga entre elas for zero/mínima
        const isCriticalLine = criticalTaskIds.has(task.id) && criticalTaskIds.has(pred.id) && daysDiff(predEnd, taskStart) <= 1;

        let d = `M ${predXEnd} ${predY} L ${predXEnd + 10} ${predY} L ${predXEnd + 10} ${succY} L ${succXStart} ${succY}`;
        paths.push(<path key={`${pred.id}-${task.id}`} d={d} fill="none" stroke={isCriticalLine ? "#f43f5e" : "#94a3b8"} strokeWidth={isCriticalLine ? "2.5" : "1.5"} markerEnd={`url(#arrowhead-${isCriticalLine ? 'critical' : 'normal'})`} />);
      });
    });
    return paths;
  }, [tasks, minDate, dayWidth, rowHeight, criticalTaskIds]);

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: exportRef.current.scrollWidth + 300,
        height: exportRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          const sidebar = clonedDoc.querySelector('.gantt-sidebar') as HTMLElement;
          const container = clonedDoc.querySelector('.gantt-export-container') as HTMLElement;
          const headers = clonedDoc.querySelectorAll('.sticky') as NodeListOf<HTMLElement>;

          if (sidebar) {
            sidebar.style.position = 'relative';
            sidebar.style.width = '700px';
            sidebar.style.minWidth = '700px';
            sidebar.style.flexShrink = '0';
            sidebar.style.boxShadow = 'none';
          }

          if (container) {
            container.style.width = `${exportRef.current!.scrollWidth + 400}px`;
            container.style.overflow = 'visible';
          }

          headers.forEach(h => {
            h.style.position = 'relative';
            h.style.left = '0';
            h.style.top = '0';
          });

          const taskLabels = clonedDoc.querySelectorAll('.task-label-text') as NodeListOf<HTMLElement>;
          taskLabels.forEach(label => {
            label.style.display = 'block';
            label.style.webkitLineClamp = 'unset';
            label.style.overflow = 'visible';
            label.style.whiteSpace = 'nowrap';
            label.style.wordBreak = 'keep-all';
          });
        }
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Cronograma_Gantt_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Houve um erro ao gerar o PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const renderTimelineHeader = () => {
    return timelineDays.map((day, i) => {
      if (isNaN(day.getTime())) return null;
      let label = null;
      let isMajor = false;

      if (dayWidth >= 25) {
        label = (
          <>
            <span className="font-bold text-gray-700">{day.getDate()}</span>
            <span className="uppercase opacity-60 text-[8px] font-medium">{day.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 1)}</span>
          </>
        );
        isMajor = day.getDay() === 0 || day.getDay() === 6;
      } else if (dayWidth >= 8) {
        if (day.getDay() === 1) {
          label = <span className="text-[9px] font-bold text-gray-600 whitespace-nowrap">{day.getDate()}/{day.getMonth() + 1}</span>;
          isMajor = true;
        }
      } else if (dayWidth >= 2) {
        if (day.getDate() === 1) {
          label = <span className="text-[9px] font-bold text-gray-600 whitespace-nowrap">{day.toLocaleDateString('pt-BR', { month: 'short' })}</span>;
          isMajor = true;
        }
      } else {
        if (day.getDate() === 1 && day.getMonth() === 0) {
          label = <span className="text-[10px] font-bold text-gray-800">{day.getFullYear()}</span>;
          isMajor = true;
        }
      }

      return (
        <div
          key={i}
          className={`flex-shrink-0 border-r flex flex-col items-center justify-center transition-all duration-200 ${isMajor ? 'bg-gray-100/50' : ''}`}
          style={{ width: dayWidth }}
        >
          {label}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm overflow-hidden select-none printable-gantt">
      <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between text-xs no-print">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <span className="font-medium text-gray-700">Fluxo Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-rose-500 rounded-sm shadow-[0_0_8px_rgba(244,63,94,0.4)]"></div>
            <span className="text-rose-600 font-bold uppercase tracking-tight">Caminho Crítico</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-100 border border-red-500 rounded-sm"></div>
            <span className="text-red-600 font-bold uppercase tracking-tight">Atrasada</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
            {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${viewMode === mode ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Ano'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <span className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Zoom</span>
            <button onClick={zoomOut} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Encolher">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
            </button>
            <button onClick={zoomIn} className="p-1.5 hover:bg-gray-100 rounded text-gray-600" title="Ampliar">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className={`flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-lg transition-all font-bold active:transform active:scale-95 no-print ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            )}
            {isExporting ? 'GERANDO...' : 'SALVAR PDF'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto gantt-scroll-container" ref={containerRef}>
        <div ref={exportRef} className="flex min-w-full bg-white gantt-export-container">
          <div className="sticky left-0 z-30 bg-white border-r w-72 lg:w-80 flex-shrink-0 gantt-sidebar shadow-sm">
            <div
              className="border-b flex items-center px-4 font-bold text-gray-500 bg-gray-50 uppercase text-[10px] tracking-wider sticky top-0 z-40"
              style={{ height: rowHeight }}
            >
              Estrutura EAP / Tarefa
            </div>
            {(tasks || []).map((task) => {
              const level = task.level || 0;
              const isSummary = task.hasChildren || parentIds.has(task.id);
              const isCritical = criticalTaskIds.has(task.id);

              return (
                <div
                  key={task.id}
                  className={`border-b flex items-center pr-4 leading-tight transition-colors ${isCritical ? 'bg-rose-50/30' : ''} ${isSummary ? 'font-bold text-gray-900 bg-slate-50 text-sm' : 'text-gray-600 text-[11px]'}`}
                  style={{
                    height: rowHeight,
                    paddingLeft: `${16 + level * 20}px`
                  }}
                >
                  <div className="flex items-center gap-2 overflow-hidden w-full h-full">
                    {task.hasChildren && (
                      <button onClick={() => onToggleCollapse(task.id)} className="p-1 hover:bg-gray-200 rounded flex-shrink-0">
                        <svg className={`w-3.5 h-3.5 transition-transform ${collapsedTasks.has(task.id) ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    )}
                    {level > 0 && !task.hasChildren && !parentIds.has(task.id) && (
                      <div className="w-2 h-2 border-l border-b border-gray-300 -mt-2 flex-shrink-0 ml-1"></div>
                    )}
                    <span className={`task-label-text block overflow-hidden ${isCritical && !isSummary ? 'text-rose-700 font-semibold' : ''}`} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }} title={task.name}>
                      {task.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative gantt-timeline-container flex-1">
            <div className="flex border-b sticky top-0 bg-gray-50 z-10" style={{ height: rowHeight }}>
              {renderTimelineHeader()}
            </div>

            <div className="relative" style={{ height: (tasks?.length || 0) * rowHeight, width: Math.max(0, (totalDays + 1) * dayWidth) }}>
              <div className="absolute inset-0 flex pointer-events-none">
                {timelineDays.map((_, i) => (
                  <div
                    key={i}
                    className={`border-r h-full ${dayWidth > 15 ? 'opacity-30' : 'opacity-10'}`}
                    style={{ width: dayWidth }}
                  />
                ))}
              </div>

              <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
                <defs>
                  <marker id="arrowhead-normal" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orientation="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" /></marker>
                  <marker id="arrowhead-critical" markerWidth="12" markerHeight="9" refX="12" refY="4.5" orientation="auto"><polygon points="0 0, 12 4.5, 0 9" fill="#f43f5e" /></marker>
                </defs>
                {dependencyPaths}
              </svg>

              {(tasks || []).map((task, idx) => {
                const isBeingDragged = draggingTask === task.id;
                const currentStartDate = isBeingDragged && dragPreview ? dragPreview.startDate : task.startDate;
                const currentEndDate = isBeingDragged && dragPreview ? dragPreview.endDate : task.endDate;
                const currentDuration = isBeingDragged && dragPreview ? dragPreview.duration : task.duration;

                const s = parseLocalDate(currentStartDate);
                if (isNaN(s.getTime())) return null;
                const startOffset = daysDiff(minDate, s) * dayWidth;
                const barWidth = Math.max(dayWidth, (currentDuration + 1) * dayWidth);
                const isSummary = task.hasChildren || parentIds.has(task.id);
                const isCritical = criticalTaskIds.has(task.id);
                const isTaskOverdue = !isSummary && isOverdue(currentEndDate, task.progress);

                return (
                  <div key={task.id} className={`absolute z-10 ${isBeingDragged ? 'z-50' : ''} transition-all duration-200`} style={{ top: idx * rowHeight + 10, left: startOffset, width: barWidth, height: rowHeight - 20 }}>
                    {isSummary ? (
                      <div className={`relative h-full flex items-center transition-all ${isCritical ? 'drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]' : ''}`}>
                        <div className={`absolute inset-x-0 top-0 h-2 rounded-t-sm ${isCritical ? 'bg-rose-700' : 'bg-slate-800'}`} />
                        <div className={`absolute left-0 top-0 w-2 h-4 rounded-bl-sm ${isCritical ? 'bg-rose-700' : 'bg-slate-800'}`} />
                        <div className={`absolute right-0 top-0 w-2 h-4 rounded-br-sm ${isCritical ? 'bg-rose-700' : 'bg-slate-800'}`} />
                      </div>
                    ) : (
                      <div
                        className={`h-full rounded-md relative shadow-sm cursor-move ${isBeingDragged ? 'scale-105 shadow-xl opacity-90' : 'hover:scale-[1.02]'} transition-transform ${task.isMilestone ? 'bg-orange-500 w-5 h-5 rotate-45 -ml-2.5 mt-0.5 border-2 border-white' : isCritical ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]' : 'bg-blue-500'} ${isTaskOverdue ? 'ring-2 ring-red-500 ring-offset-1 animate-pulse' : ''}`}
                        onMouseDown={(e) => handleMouseDown(e, task.id, 'move')}
                      >
                        <div className="absolute inset-y-0 -left-1 w-2 cursor-ew-resize hover:bg-black/10 rounded-l" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, task.id, 'resize-left'); }} />
                        <div className="absolute inset-y-0 -right-1 w-2 cursor-ew-resize hover:bg-black/10 rounded-r" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, task.id, 'resize-right'); }} />

                        {isCritical && !task.isMilestone && (
                          <div className="absolute inset-0 rounded-md border-2 border-rose-400/50 pointer-events-none" />
                        )}

                        {isTaskOverdue && (
                          <div className="absolute -top-1 -right-1 z-20">
                            <span className="flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                            </span>
                          </div>
                        )}

                        {!task.isMilestone && task.progress > 0 && (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-slate-900 rounded-full left-1 opacity-90 transition-all pointer-events-none flex items-center"
                            style={{ width: `calc(${Math.min(100, task.progress)}% - 8px)`, minWidth: '4px' }}
                          >
                            <div className="h-full w-full bg-slate-900 rounded-full" />
                          </div>
                        )}

                        {!task.isMilestone && (
                          <div className="h-full rounded-l-md pointer-events-none opacity-20 bg-black/10" style={{ width: `${Math.min(100, task.progress)}%` }} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
        .printable-gantt * {
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </div>
  );
};

export default GanttChart;
