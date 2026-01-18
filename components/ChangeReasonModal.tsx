
import React, { useState } from 'react';

interface ChangeReasonModalProps {
  isOpen: boolean;
  taskName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const ChangeReasonModal: React.FC<ChangeReasonModalProps> = ({ isOpen, taskName, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) return;
    onConfirm(reason);
    setReason('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border-t-4 border-orange-500">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-orange-50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-lg font-bold text-orange-900">Atenção: Justificativa Obrigatória</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-800">
              Confirmar alteração de cronograma para "{taskName}"?
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Para manter a integridade do planejamento, mudanças de datas devem ser justificadas. Este registro será auditável no histórico do projeto.
            </p>
          </div>
          
          <textarea
            required
            autoFocus
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all h-32 resize-none text-sm"
            placeholder="Digite o motivo aqui (mínimo 5 caracteres)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 border border-gray-200 rounded-lg font-medium text-gray-500 hover:bg-gray-50 transition-colors text-sm"
            >
              Descartar Mudança
            </button>
            <button
              type="submit"
              disabled={reason.trim().length < 5}
              className="flex-1 py-2.5 px-4 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50 text-sm"
            >
              Gravar e Prosseguir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangeReasonModal;
