
import React, { useState, useEffect, useRef } from 'react';
import { Task, Resource, DependencyType, TaskImage } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Task, note?: string) => void;
  projectId: string;
  resources: Resource[];
  existingTasks: Task[];
  taskToEdit?: Task | null;
  initialParentId?: string;
}

const TaskModal: React.FC<TaskModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  projectId, 
  resources, 
  existingTasks, 
  taskToEdit,
  initialParentId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    cost: 0,
    manHours: 0,
    isMilestone: false,
    resourceIds: [] as string[],
    dependencyTaskId: '',
    dependencyType: DependencyType.FS,
    progress: 0,
    parentId: '',
    note: '',
    images: [] as TaskImage[],
  });

  useEffect(() => {
    if (taskToEdit) {
      setFormData({
        name: taskToEdit.name,
        startDate: taskToEdit.startDate,
        endDate: taskToEdit.endDate,
        cost: taskToEdit.cost,
        manHours: taskToEdit.manHours || 0,
        isMilestone: taskToEdit.isMilestone,
        resourceIds: taskToEdit.resourceIds || [],
        dependencyTaskId: taskToEdit.dependencies[0]?.taskId || '',
        dependencyType: taskToEdit.dependencies[0]?.type || DependencyType.FS,
        progress: taskToEdit.progress,
        parentId: taskToEdit.parentId || '',
        note: '',
        images: [], // Não carrega imagens existentes para o modal (conforme solicitado)
      });
    } else {
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        cost: 0,
        manHours: 0,
        isMilestone: false,
        resourceIds: [],
        dependencyTaskId: '',
        dependencyType: DependencyType.FS,
        progress: 0,
        parentId: initialParentId || '',
        note: '',
        images: [],
      });
    }
  }, [taskToEdit, isOpen, initialParentId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(formData.startDate);
    const end = formData.isMilestone ? start : new Date(formData.endDate);
    
    if (isNaN(start.getTime()) || (!formData.isMilestone && isNaN(end.getTime()))) {
      alert("Por favor, insira datas válidas.");
      return;
    }

    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const dependencies = formData.dependencyTaskId 
      ? [{ taskId: formData.dependencyTaskId, type: formData.dependencyType }] 
      : [];

    const taskData: Task = {
      id: taskToEdit ? taskToEdit.id : `t-${Date.now()}`,
      projectId,
      name: formData.name,
      startDate: formData.startDate,
      endDate: formData.isMilestone ? formData.startDate : formData.endDate,
      cost: formData.cost,
      manHours: formData.manHours,
      isMilestone: formData.isMilestone,
      resourceIds: formData.resourceIds,
      duration: isNaN(duration) || duration < 0 ? 0 : duration,
      progress: formData.progress,
      priority: taskToEdit ? taskToEdit.priority : 'Medium',
      dependencies,
      parentId: formData.parentId || undefined,
      realizedManHours: taskToEdit?.realizedManHours,
      realizedResourceIds: taskToEdit?.realizedResourceIds,
      images: formData.images,
    };
    onSubmit(taskData, formData.note.trim() || undefined);
    onClose();
  };

  const handleToggleResource = (id: string) => {
    setFormData(prev => ({
      ...prev,
      resourceIds: prev.resourceIds.includes(id)
        ? prev.resourceIds.filter(rid => rid !== id)
        : [...prev.resourceIds, id]
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: TaskImage[] = [];
    
    // Gera data local YYYY-MM-DD evitando o deslocamento do toISOString
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newImages.push({
        id: `img-${Date.now()}-${i}`,
        data,
        name: file.name,
        description: '',
        date: today
      });
    }

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateImageField = (id: string, field: keyof TaskImage, value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map(img => img.id === id ? { ...img, [field]: value } : img)
    }));
  };

  const removeImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== id)
    }));
  };

  const availableParents = existingTasks.filter(t => {
    if (!taskToEdit) return true;
    if (t.id === taskToEdit.id) return false;
    return true; 
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">
            {taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Nome da Tarefa</label>
              <input
                required
                type="text"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Ex: Desenvolver protótipo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tarefa Pai (EAP/WBS)</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              >
                <option value="">Nenhuma (Nível Raiz)</option>
                {availableParents.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isMilestone"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={formData.isMilestone}
                  onChange={(e) => setFormData({ ...formData, isMilestone: e.target.checked })}
                />
                <label htmlFor="isMilestone" className="text-sm font-medium text-gray-700">Marco?</label>
              </div>
              {taskToEdit && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Progresso (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Início</label>
                <input
                  required
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Término</label>
                <input
                  required={!formData.isMilestone}
                  disabled={formData.isMilestone}
                  type="date"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-100"
                  value={formData.isMilestone ? formData.startDate : formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Esforço Planejado (HH)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="0"
                  value={formData.manHours || ''}
                  onChange={(e) => setFormData({ ...formData, manHours: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Custo Planejado (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="0.00"
                  value={formData.cost || ''}
                  onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Campo de Nota de Progresso */}
          <div className="border-t pt-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Adicionar Nota de Progresso</label>
            <textarea
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all h-20 resize-none text-sm"
              placeholder="Descreva o andamento ou observações para o histórico..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />
            <p className="text-[10px] text-gray-400 mt-1 italic">Esta nota será registrada como uma nova entrada na aba "Notas".</p>
          </div>

          {/* Imagens e Evidências */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Adicionar Novos Registros</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload de Imagens
              </button>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-3">
              {formData.images.map(img => (
                <div key={img.id} className="flex gap-3 bg-gray-50 border rounded-xl p-3 relative group animate-in fade-in slide-in-from-left-2">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                    <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Data do Registro</label>
                        <input
                          type="date"
                          className="w-full px-2 py-1 border rounded bg-white text-xs outline-none focus:ring-1 focus:ring-blue-500"
                          value={img.date}
                          onChange={(e) => updateImageField(img.id, 'date', e.target.value)}
                        />
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Descrição / Nota</label>
                        <input
                          type="text"
                          className="w-full px-2 py-1 border rounded bg-white text-xs outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="O que esta foto representa?"
                          value={img.description}
                          onChange={(e) => updateImageField(img.id, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 truncate italic">{img.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {formData.images.length === 0 && (
                <div className="py-8 border border-dashed rounded-xl flex flex-col items-center justify-center text-gray-300">
                  <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs italic text-center px-4">Imagens registradas anteriormente estão visíveis apenas na aba "Registros".</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Recursos Alocados</label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
              {resources.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Nenhum recurso cadastrado.</p>
              ) : (
                resources.map(res => (
                  <div key={res.id} className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      id={`res-${res.id}`}
                      className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                      checked={formData.resourceIds.includes(res.id)}
                      onChange={() => handleToggleResource(res.id)}
                    />
                    <label htmlFor={`res-${res.id}`} className="text-xs text-gray-600 cursor-pointer flex-1">
                      {res.name} <span className="text-[10px] text-gray-400">({res.type})</span>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              {taskToEdit ? 'Salvar Alterações' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
