
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

const GanttChart: React.FC<GanttChartProps> = ({ tasks, onToggleCollapse, collapsedTasks }) => {
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

  const isOverdue = (dateStr: string, progress: number) => {
    if (progress >= 100) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseLocalDate(dateStr);
    return end < today;
  };

  const parentIds = useMemo(() => {
    return new Set((tasks || []).map(t => t.parentId).filter(id => id !== undefined) as string[]);
  }, [tasks]);

  const rowHeight = 50;

  /**
   * Lógica Avançada de Caminho Crítico (CPM)
   * Identifica tarefas com folga zero (Float = 0)
   */
  const criticalTaskIds = useMemo(() => {
    if (!tasks || tasks.length === 0) return new Set<string>();

    const taskMap = new Map<string, Task>(tasks.map(t => [t.id, t]));
    const criticalIds = new Set<string>();

    // backward pass logic remains here...
    const successors = new Map<string, string[]>();
    tasks.forEach(t => {
      (t.dependencies || []).forEach(dep => {
        if (!successors.has(dep.taskId)) successors.set(dep.taskId, []);
        successors.get(dep.taskId)!.push(t.id);
      });
    });

    const taskEnds = tasks.map(t => parseLocalDate(t.endDate).getTime()).filter(t => !isNaN(t));
    if (taskEnds.length === 0) return criticalIds;
    const projectEndMs = Math.max(...taskEnds);

    const queue: string[] = tasks
      .filter(t => parseLocalDate(t.endDate).getTime() === projectEndMs)
      .map(t => t.id);

    const visited = new Set<string>();

    const daysDiffLocal = (d1: Date, d2: Date) => {
      const t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
      const t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
      return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
    };

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentTask = taskMap.get(currentId);
      if (!currentTask) continue;

      criticalIds.add(currentId);

      (currentTask.dependencies || []).forEach(dep => {
        const pred = taskMap.get(dep.taskId);
        if (!pred) return;

        const predEnd = parseLocalDate(pred.endDate);
        const currentStart = parseLocalDate(currentTask.startDate);

        const slack = daysDiffLocal(predEnd, currentStart);
        if (dep.type === DependencyType.FS && slack <= 1) {
          queue.push(pred.id);
        } else if (dep.type === DependencyType.SS && daysDiffLocal(parseLocalDate(pred.startDate), currentStart) <= 1) {
          queue.push(pred.id);
        } else if (dep.type === DependencyType.FF && daysDiffLocal(predEnd, parseLocalDate(currentTask.endDate)) <= 1) {
          queue.push(pred.id);
        }
      });
    }

    tasks.forEach(t => {
      if (t.hasChildren || parentIds.has(t.id)) {
        const hasCriticalChild = tasks.some(child => child.parentId === t.id && criticalIds.has(child.id));
        if (hasCriticalChild) criticalIds.add(t.id);
      }
    });

    return criticalIds;
  }, [tasks, parentIds]);

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: exportRef.current.scrollWidth + 100,
        height: exportRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Status_Tarefas_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm overflow-hidden select-none printable-gantt">
      <div className="bg-gray-50 border-b px-2 lg:px-4 py-3 flex items-center justify-between text-[10px] lg:text-xs no-print gap-4">
        <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-6">
          <div className="flex items-center gap-1.5 lg:gap-2">
            <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-blue-500 rounded-sm"></div>
            <span className="font-medium text-gray-700">Normal</span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-rose-500 rounded-sm shadow-[0_0_8px_rgba(244,63,94,0.4)]"></div>
            <span className="text-rose-600 font-bold uppercase tracking-tight">Crítico</span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-orange-100 border border-red-500 rounded-sm"></div>
            <span className="text-red-600 font-bold uppercase tracking-tight">Atrasada</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className={`flex items-center gap-1.5 px-3 lg:px-5 py-2 lg:py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-lg transition-all font-bold active:transform active:scale-95 no-print ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isExporting ? (
              <div className="animate-spin rounded-full h-3 w-3 lg:h-4 lg:w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            )}
            <span className="text-[10px] lg:text-xs">EXPORTAR PDF</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto gantt-scroll-container" ref={containerRef}>
        <div ref={exportRef} className="flex min-w-full bg-white gantt-export-container">
          <div className="sticky left-0 z-30 bg-white border-r w-40 sm:w-72 lg:w-80 flex-shrink-0 gantt-sidebar shadow-sm">
            <div
              className="border-b flex items-center px-2 lg:px-4 font-bold text-gray-500 bg-gray-50 uppercase text-[9px] lg:text-[10px] tracking-wider sticky top-0 z-40"
              style={{ height: rowHeight }}
            >
              Tarefa
            </div>
            {(tasks || []).map((task) => {
              const level = task.level || 0;
              const isSummary = task.hasChildren || parentIds.has(task.id);
              const isCritical = criticalTaskIds.has(task.id);

              return (
                <div
                  key={task.id}
                  className={`border-b flex items-center pr-2 lg:pr-4 leading-tight transition-colors ${isCritical ? 'bg-rose-50/30' : ''} ${isSummary ? 'font-bold text-gray-900 bg-slate-50 text-[10px] lg:text-sm' : 'text-gray-600 text-[9px] lg:text-[11px]'}`}
                  style={{
                    height: rowHeight,
                    paddingLeft: `${4 + level * 6}px`
                  }}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden w-full h-full py-1">
                    {task.hasChildren && (
                      <button onClick={() => onToggleCollapse(task.id)} className="p-1 hover:bg-gray-200 rounded flex-shrink-0">
                        <svg className={`w-3 h-3 lg:w-3.5 lg:h-3.5 transition-transform ${collapsedTasks.has(task.id) ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className={`task-label-text block whitespace-normal break-words leading-[1.1] ${isCritical && !isSummary ? 'text-rose-700 font-semibold' : ''}`} title={task.name}>
                        {task.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative gantt-timeline-container flex-1 bg-slate-50">
            <div className="border-b sticky top-0 bg-gray-50 z-10 flex items-center px-4 font-bold text-gray-500 uppercase text-[9px] lg:text-[10px] tracking-wider" style={{ height: rowHeight }}>
              Status e Prazos
            </div>

            <div className="relative">
              {(tasks || []).map((task, idx) => {
                const isSummary = task.hasChildren || parentIds.has(task.id);
                const isCritical = criticalTaskIds.has(task.id);
                const isTaskOverdue = !isSummary && isOverdue(task.endDate, task.progress);

                if (isSummary) {
                  return (
                    <div key={task.id} className="border-b bg-slate-50/50" style={{ height: rowHeight }} />
                  );
                }

                return (
                  <div key={task.id} className="border-b flex items-center px-4 gap-4" style={{ height: rowHeight }}>
                    <div className="flex-1 flex items-center gap-3">
                      {/* Status Card */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm bg-white min-w-[200px] ${isTaskOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${task.progress >= 100 ? 'bg-green-500' : isTaskOverdue ? 'bg-red-500 animate-pulse' : isCritical ? 'bg-rose-500' : 'bg-blue-500'}`} />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-gray-700 leading-none mb-0.5">
                            {task.progress}% - {task.progress >= 100 ? 'Concluído' : isTaskOverdue ? 'Atrasado' : 'Em andamento'}
                          </span>
                          <span className="text-[9px] text-gray-500 leading-none">
                            {task.startDate.split('-').reverse().join('/')} até {task.endDate.split('-').reverse().join('/')}
                          </span>
                        </div>
                        {isCritical && (
                          <div className="ml-auto">
                            <span className="text-[8px] font-extrabold text-rose-600 border border-rose-200 bg-rose-50 px-1 rounded">CRÍTICO</span>
                          </div>
                        )}
                      </div>
                    </div>
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
