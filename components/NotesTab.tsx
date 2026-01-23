import React, { useState } from 'react';
import { TaskNote } from '../types';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

interface NotesTabProps {
  notes: TaskNote[];
  onDeleteNote?: (id: string) => void;
}

const NotesTab: React.FC<NotesTabProps> = ({ notes, onDeleteNote }) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const sortedNotes = [...notes].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleExportExcel = () => {
    if (sortedNotes.length === 0) return;

    const data = sortedNotes.map(note => ({
      'Data': new Date(note.timestamp).toLocaleDateString('pt-BR'),
      'Hora': new Date(note.timestamp).toLocaleTimeString('pt-BR'),
      'Tarefa': note.taskName,
      'Nota de Progresso': note.text
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notas de Progresso");

    // Configura largura das colunas para melhor visualização
    const wscols = [
      { wch: 12 }, // Data
      { wch: 10 }, // Hora
      { wch: 30 }, // Tarefa
      { wch: 80 }  // Nota
    ];
    worksheet['!cols'] = wscols;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const saveAsFunc = (FileSaver as any).saveAs || (FileSaver as any).default?.saveAs || (FileSaver as any).default || (window as any).saveAs;

    const fileName = `Notas_Progresso_${new Date().toISOString().split('T')[0]}.xlsx`;

    if (typeof saveAsFunc === 'function') {
      saveAsFunc(blob, fileName);
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async (id: string) => {
    if (!onDeleteNote) return;

    setDeletingId(id);
    try {
      await onDeleteNote(id);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="p-6 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Notas de Progresso</h2>
          <p className="text-sm text-gray-500">Registro de observações e andamentos reportados nas tarefas</p>
        </div>

        <div className="flex items-center gap-3">
          {sortedNotes.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 text-green-600 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar .XLSX
            </button>
          )}
          <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">
            {notes.length} Anotações
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-[10px] uppercase text-gray-500 font-bold tracking-wider">
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Hora</th>
              <th className="px-6 py-4 text-center">Tarefa</th>
              <th className="px-6 py-4">Nota de Progresso</th>
              {onDeleteNote && (
                <th className="px-4 py-4 text-center w-16">Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedNotes.length === 0 ? (
              <tr>
                <td colSpan={onDeleteNote ? 5 : 4} className="px-6 py-12 text-center text-gray-400 italic">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Nenhuma nota registrada. Adicione notas editando uma tarefa na EAP.
                  </div>
                </td>
              </tr>
            ) : (
              sortedNotes.map((note) => (
                <tr key={note.id} className="border-b hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(note.timestamp).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(note.timestamp).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800 text-center">
                    {note.taskName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 leading-relaxed">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {note.text}
                    </div>
                  </td>
                  {onDeleteNote && (
                    <td className="px-4 py-4 text-center">
                      {confirmDeleteId === note.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleConfirmDelete(note.id)}
                            disabled={deletingId === note.id}
                            className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            title="Confirmar exclusão"
                          >
                            {deletingId === note.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={handleCancelDelete}
                            className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                            title="Cancelar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDeleteClick(note.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors group"
                          title="Excluir nota"
                        >
                          <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NotesTab;
