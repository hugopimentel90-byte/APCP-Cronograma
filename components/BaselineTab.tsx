
import React, { useState } from 'react';
import { Task, Project, Resource } from '../types';
import { BASELINE_ADMIN_PASSWORD } from '../constants';
import GanttChart from './GanttChart';
import TaskModal from './TaskModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface BaselineTabProps {
  project: Project;
  resources: Resource[];
  onUpdateBaselineTasks: (tasks: Task[]) => void;
  onSetBaseline: () => void;
  onApplyBaselineToPlan: () => void;
}

const BaselineTab: React.FC<BaselineTabProps> = ({ project, resources, onUpdateBaselineTasks, onSetBaseline, onApplyBaselineToPlan }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [isApplyConfirmModalOpen, setIsApplyConfirmModalOpen] = useState(false);

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === BASELINE_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Senha incorreta. Tente novamente.');
    }
  };

  const handleBaselineTaskChange = (updatedTask: Task) => {
    if (!project.baselineTasks) return;
    const newTasks = [...project.baselineTasks];
    const index = newTasks.findIndex(t => t.id === updatedTask.id);
    if (index === -1) {
      newTasks.push(updatedTask);
    } else {
      newTasks[index] = updatedTask;
    }
    onUpdateBaselineTasks(newTasks);
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete && project.baselineTasks) {
      const newTasks = project.baselineTasks.filter(t => t.id !== taskToDelete.id);
      onUpdateBaselineTasks(newTasks);
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleApplyClick = () => {
    setIsApplyConfirmModalOpen(true);
  };

  const confirmApplyBaseline = () => {
    onApplyBaselineToPlan();
    setIsApplyConfirmModalOpen(false);
  };

  const openTaskModal = (task?: Task) => {
    setTaskToEdit(task || null);
    setIsTaskModalOpen(true);
  };

  if (!project.baselineTasks) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Linha de Base não Definida</h2>
        <p className="text-gray-500 max-w-md mb-8">
          A linha de base é o plano aprovado original do seu projeto. 
          Defina-a agora para comparar o progresso real com o planejado futuramente.
        </p>
        <button 
          onClick={onSetBaseline}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Capturar Baseline Inicial
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4">
        <div className="w-16 h-16 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Acesso Protegido ao Baseline</h2>
        <form onSubmit={handleAuthenticate} className="w-full space-y-4">
          <div>
            <input 
              type="password"
              placeholder="Digite a senha do Baseline"
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-2 font-medium animate-pulse">{error}</p>}
          </div>
          <button 
            type="submit"
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-all shadow-md active:scale-95 transition-transform"
          >
            Acessar Dados
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 text-white p-6 rounded-xl shadow-sm flex justify-between items-center">
        <div className="flex-1">
          <h2 className="text-lg font-bold">Linha de Base (Baseline)</h2>
          <p className="text-slate-400 text-sm">Gerencie o cronograma de referência do projeto.</p>
        </div>
        
        <div className="flex-1 flex justify-center">
           <button 
            onClick={handleApplyClick}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg flex items-center gap-2 border border-blue-400/30"
            title="Sincronizar tarefas da baseline com o cronograma ativo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Sincronizar Cronograma
          </button>
        </div>

        <div className="flex-1 flex justify-end gap-2">
           <button 
            onClick={() => setIsAuthenticated(false)}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Bloquear
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-700">Comparação Visual (Baseline)</h3>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-bold uppercase tracking-wider">Edição Habilitada</span>
        </div>
        <div className="h-[500px]">
             <GanttChart tasks={project.baselineTasks} onTaskChange={handleBaselineTaskChange} />
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
           <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider">Tarefas do Baseline</h3>
           <button 
             onClick={() => openTaskModal()}
             className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
           >
             + Adicionar Tarefa no Baseline
           </button>
        </div>
        <table className="w-full text-left">
           <thead>
              <tr className="bg-gray-50 border-b text-[10px] uppercase text-gray-500 font-bold">
                <th className="px-6 py-4">Nome da Tarefa</th>
                <th className="px-6 py-4 text-center">Duração</th>
                <th className="px-6 py-4">Início Plan.</th>
                <th className="px-6 py-4">Fim Plan.</th>
                <th className="px-6 py-4">Custo Est.</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
           </thead>
           <tbody>
              {project.baselineTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400 italic">Nenhuma tarefa no baseline.</td>
                </tr>
              ) : (
                project.baselineTasks.map(t => (
                  <tr key={t.id} className="border-b text-sm hover:bg-gray-50 transition-colors group">
                     <td className="px-6 py-4 font-medium text-gray-900">{t.name}</td>
                     <td className="px-6 py-4 text-gray-500 text-center">{t.duration} d</td>
                     <td className="px-6 py-4 text-gray-500">{t.startDate}</td>
                     <td className="px-6 py-4 text-gray-500">{t.endDate}</td>
                     <td className="px-6 py-4 text-gray-900 font-bold">R$ {t.cost.toLocaleString('pt-BR')}</td>
                     <td className="px-6 py-4">
                        <div className="flex justify-center gap-3">
                           <button onClick={() => openTaskModal(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Editar tarefa no baseline">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                           </button>
                           <button onClick={() => handleDeleteClick(t)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Remover tarefa do baseline">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </div>
                     </td>
                  </tr>
                ))
              )}
           </tbody>
        </table>
      </div>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => { setIsTaskModalOpen(false); setTaskToEdit(null); }} 
        onSubmit={handleBaselineTaskChange} 
        projectId={project.id} 
        resources={resources} 
        existingTasks={project.baselineTasks} 
        taskToEdit={taskToEdit} 
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Excluir Tarefa do Baseline"
        message={`ATENÇÃO: Você está prestes a excluir a tarefa "${taskToDelete?.name}" da Linha de Base (Baseline). Esta ação removerá o ponto de referência original desta atividade e não poderá ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => { setIsDeleteModalOpen(false); setTaskToDelete(null); }}
      />

      <DeleteConfirmationModal
        isOpen={isApplyConfirmModalOpen}
        title="Sincronizar Cronograma"
        message="Deseja espelhar as atividades e o gráfico de Gantt da Linha de Base para o Cronograma Principal? Isso substituirá as tarefas atuais pelas tarefas salvas neste baseline."
        confirmText="Sim, Sincronizar"
        variant="primary"
        onConfirm={confirmApplyBaseline}
        onCancel={() => setIsApplyConfirmModalOpen(false)}
      />
    </div>
  );
};

export default BaselineTab;
