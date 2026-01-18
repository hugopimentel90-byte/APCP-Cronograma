
import React, { useState, useEffect } from 'react';
import { Task, Resource } from '../types';

interface TaskCompletionModalProps {
  isOpen: boolean;
  task: Task | null;
  resources: Resource[];
  onConfirm: (taskId: string, realizedHH: number, realizedResources: string[], realizedCost: number) => void;
  onCancel: () => void;
}

const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({ 
  isOpen, 
  task, 
  resources, 
  onConfirm, 
  onCancel 
}) => {
  const [realizedHH, setRealizedHH] = useState<number>(0);
  const [realizedCost, setRealizedCost] = useState<number>(0);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setRealizedHH(task.manHours || 0);
      setRealizedCost(task.cost || 0);
      setSelectedResources(task.resourceIds || []);
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleToggleResource = (id: string) => {
    setSelectedResources(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(task.id, realizedHH, selectedResources, realizedCost);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border-t-4 border-green-500">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-green-50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-bold text-green-900">Encerrar Tarefa</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Você está marcando a tarefa <strong className="text-gray-900">"{task.name}"</strong> como concluída. 
              Confirme os dados realizados:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Esforço Realizado (HH)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  autoFocus
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-lg"
                  value={realizedHH}
                  onChange={(e) => setRealizedHH(Number(e.target.value))}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">horas</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Custo Realizado (R$)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-lg"
                  value={realizedCost}
                  onChange={(e) => setRealizedCost(Number(e.target.value))}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">reais</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Recursos Efetivamente Utilizados</label>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-1 bg-gray-50/50">
              {resources.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nenhum recurso cadastrado.</p>
              ) : (
                resources.map(res => (
                  <div key={res.id} className="flex items-center gap-3 hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                    <input
                      type="checkbox"
                      id={`comp-res-${res.id}`}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      checked={selectedResources.includes(res.id)}
                      onChange={() => handleToggleResource(res.id)}
                    />
                    <label htmlFor={`comp-res-${res.id}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                      {res.name} <span className="text-[10px] text-gray-400 font-medium ml-1">[{res.type.toUpperCase()}]</span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
            >
              Finalizar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCompletionModal;
