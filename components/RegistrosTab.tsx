
import React, { useState, useMemo } from 'react';
import { Task, TaskImage } from '../types';

interface RegistrosTabProps {
  tasks: Task[];
  onDeleteImage?: (taskId: string, imageId: string) => void;
}

const RegistrosTab: React.FC<RegistrosTabProps> = ({ tasks, onDeleteImage }) => {
  const [selectedImage, setSelectedImage] = useState<TaskImage & { taskName: string; taskId: string } | null>(null);
  const [filterTaskId, setFilterTaskId] = useState<string>('all');

  // Função para formatar a data YYYY-MM-DD para o formato local PT-BR sem deslocamento de fuso horário
  const formatLocalDate = (dateStr: string) => {
    if (!dateStr) return "Sem data";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Obtém todas as imagens de todas as tarefas
  const allImages = useMemo(() => {
    const images: (TaskImage & { taskName: string; taskId: string })[] = [];
    tasks.forEach(task => {
      if (task.images && task.images.length > 0) {
        task.images.forEach(img => {
          images.push({ ...img, taskName: task.name, taskId: task.id });
        });
      }
    });
    // Ordena por data decrescente
    return images.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tasks]);

  // Lista de tarefas que possuem imagens para o filtro
  const tasksWithImages = useMemo(() => {
    const uniqueTasks = new Map<string, string>();
    allImages.forEach(img => {
      if (!uniqueTasks.has(img.taskId)) {
        uniqueTasks.set(img.taskId, img.taskName);
      }
    });
    return Array.from(uniqueTasks.entries()).map(([id, name]) => ({ id, name }));
  }, [allImages]);

  // Filtra as imagens baseado na seleção
  const filteredImages = useMemo(() => {
    if (filterTaskId === 'all') return allImages;
    return allImages.filter(img => img.taskId === filterTaskId);
  }, [allImages, filterTaskId]);

  if (allImages.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhum Registro Fotográfico</h2>
        <p className="text-gray-500 max-w-md">
          Não há imagens anexadas às tarefas deste projeto no momento.
          Você pode adicionar registros editando as tarefas na aba EAP.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Registros Fotográficos</h2>
            <p className="text-sm text-gray-500">Galeria de evidências coletadas durante a execução do projeto</p>
          </div>

          <div className="relative group">
            <select
              value={filterTaskId}
              onChange={(e) => setFilterTaskId(e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-all shadow-sm hover:border-gray-300"
            >
              <option value="all">Todas as Tarefas</option>
              {tasksWithImages.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-xs font-bold shadow-sm">
          {filteredImages.length} {filteredImages.length === 1 ? 'Imagem' : 'Imagens'}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 animate-in fade-in duration-500">
        {filteredImages.map((img) => (
          <div
            key={img.id}
            className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer flex flex-col relative"
            onClick={() => setSelectedImage(img)}
          >
            {onDeleteImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Deseja realmente excluir este registro fotográfico?")) {
                    onDeleteImage(img.taskId, img.id);
                  }
                }}
                className="absolute top-2 right-2 z-10 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                title="Excluir Registro"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
              <img
                src={img.data}
                alt={img.description || img.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="bg-white/90 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
                  <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-2 sm:p-4 flex flex-col flex-1 gap-1 sm:gap-2">
              <div className="flex justify-between items-start gap-1 sm:gap-2">
                <span className="text-[7px] sm:text-[9px] bg-blue-50 text-blue-600 px-1.5 sm:px-2 py-0.5 rounded-full font-bold uppercase truncate max-w-full">
                  {img.taskName}
                </span>
                <span className="text-[7px] sm:text-[9px] text-gray-400 font-bold whitespace-nowrap">
                  {formatLocalDate(img.date)}
                </span>
              </div>
              <h3 className="text-[10px] sm:text-sm font-bold text-gray-800 line-clamp-2" title={img.description || img.name}>
                {img.description || img.name}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Visualizador Fullscreen */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            className="max-w-5xl w-full flex flex-col md:flex-row bg-white rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md:flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
              <img
                src={selectedImage.data}
                alt={selectedImage.description}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            <div className="p-8 md:w-80 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tarefa Associada</label>
                  <p className="text-blue-600 font-bold text-sm">{selectedImage.taskName}</p>
                </div>
                {onDeleteImage && (
                  <button
                    onClick={() => {
                      if (confirm("Deseja realmente excluir este registro fotográfico?")) {
                        onDeleteImage(selectedImage.taskId, selectedImage.id);
                        setSelectedImage(null);
                      }
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir Registro"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Data do Registro</label>
                <p className="text-gray-900 font-medium">{formatLocalDate(selectedImage.date)}</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Descrição</label>
                <p className="text-gray-600 text-sm leading-relaxed">{selectedImage.description || 'Nenhuma descrição fornecida.'}</p>
              </div>
              <div className="mt-auto">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedImage.data;
                    link.download = `registro_${selectedImage.id}.png`;
                    link.click();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar Imagem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrosTab;
