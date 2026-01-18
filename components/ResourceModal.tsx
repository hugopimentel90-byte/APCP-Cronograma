
import React, { useState } from 'react';
import { Resource, ResourceType } from '../types';

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resource: Resource) => void;
}

const ResourceModal: React.FC<ResourceModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: ResourceType.HUMAN,
    costRate: 0,
    availability: 8,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newResource: Resource = {
      id: `r-${Date.now()}`,
      ...formData,
    };
    onSubmit(newResource);
    onClose();
    setFormData({ name: '', type: ResourceType.HUMAN, costRate: 0, availability: 8 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Novo Recurso</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Recurso</label>
            <input
              required
              type="text"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Ex: Engenheiro de Software"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Recurso</label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ResourceType })}
            >
              <option value={ResourceType.HUMAN}>Humano</option>
              <option value={ResourceType.MATERIAL}>Material</option>
              <option value={ResourceType.FINANCIAL}>Financeiro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo (R$)</label>
              <input
                required
                type="number"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Taxa/Preço"
                value={formData.costRate || ''}
                onChange={(e) => setFormData({ ...formData, costRate: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disponibilidade (h/dia)</label>
              <input
                required
                type="number"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Horas"
                value={formData.availability || ''}
                onChange={(e) => setFormData({ ...formData, availability: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Adicionar Recurso
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResourceModal;
