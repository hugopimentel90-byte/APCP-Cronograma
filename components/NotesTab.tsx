
import React from 'react';
import { TaskNote } from '../types';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

interface NotesTabProps {
  notes: TaskNote[];
}

const NotesTab: React.FC<NotesTabProps> = ({ notes }) => {
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
            </tr>
          </thead>
          <tbody>
            {sortedNotes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
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
