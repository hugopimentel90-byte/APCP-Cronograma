
import React from 'react';
import { TaskHistoryEntry } from '../types';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

interface HistoryTabProps {
  history: TaskHistoryEntry[];
}

const HistoryTab: React.FC<HistoryTabProps> = ({ history }) => {
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleExportExcel = () => {
    if (sortedHistory.length === 0) return;

    const data = sortedHistory.map(entry => ({
      'Data': new Date(entry.timestamp).toLocaleDateString('pt-BR'),
      'Hora': new Date(entry.timestamp).toLocaleTimeString('pt-BR'),
      'Tarefa': entry.taskName,
      'Campo Alterado': entry.field === 'combined' ? 'Cronograma' : entry.field,
      'Valor Anterior': entry.oldValue,
      'Novo Valor': entry.newValue,
      'Justificativa / Motivo': entry.reason
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico de Alterações");
    
    // Geração do buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Verificação robusta para a função saveAs (mesmo padrão do reportGenerator)
    const saveAsFunc = (FileSaver as any).saveAs || (FileSaver as any).default?.saveAs || (FileSaver as any).default || (window as any).saveAs;
    
    const fileName = `Historico_Alteracoes_${new Date().toISOString().split('T')[0]}.xlsx`;
    
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
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Histórico de Alterações</h2>
          <p className="text-sm text-gray-500">Registros de modificações no cronograma das atividades</p>
        </div>
        
        <div className="flex items-center gap-3">
          {sortedHistory.length > 0 && (
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
            {history.length} Registros
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Data</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Hora</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Tarefa</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Campo</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Valor Anterior</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Novo Valor</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase min-w-[300px]">Motivo da Alteração</th>
            </tr>
          </thead>
          <tbody>
            {sortedHistory.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-gray-400 italic">
                  Nenhuma alteração de cronograma registrada até o momento.
                </td>
              </tr>
            ) : (
              sortedHistory.map((entry) => (
                <tr key={entry.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(entry.timestamp).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(entry.timestamp).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {entry.taskName}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold uppercase">
                      {entry.field === 'combined' ? 'Cronograma' : entry.field}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 line-through opacity-60">
                    {entry.oldValue}
                  </td>
                  <td className="px-6 py-4 text-sm text-green-700 font-semibold">
                    {entry.newValue}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 italic">
                    {entry.reason}
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

export default HistoryTab;
