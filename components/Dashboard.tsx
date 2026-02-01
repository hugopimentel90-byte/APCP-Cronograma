
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { Project, Task, Resource } from '../types';

interface DashboardProps {
  project: Project;
  tasks: Task[];
  resources: Resource[];
  onEditProject: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ project, tasks, resources, onEditProject }) => {
  const avgProgress = tasks.length > 0
    ? tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length
    : 0;

  const statusData = [
    { name: 'Concluídas', value: tasks.filter(t => t.progress === 100).length },
    { name: 'Em Aberto', value: tasks.filter(t => t.progress < 100).length },
  ];

  const COLORS = ['#10b981', '#3b82f6'];

  const totalPlannedCost = useMemo(() => tasks.reduce((acc, t) => acc + (t.cost || 0), 0), [tasks]);

  const totalRealizedCost = useMemo(() => tasks.reduce((acc, t) => {
    return acc + (t.realizedCost !== undefined ? t.realizedCost : (t.cost * t.progress / 100));
  }, 0), [tasks]);

  const budgetRemaining = Math.max(0, project.budget - totalRealizedCost);
  const costVariance = totalPlannedCost - totalRealizedCost;

  const completionForecast = useMemo(() => {
    const today = new Date();
    const startDate = new Date(project.startDate);
    const plannedEndDate = new Date(project.endDate);

    if (isNaN(startDate.getTime()) || isNaN(plannedEndDate.getTime())) {
      return { date: "Data Inválida", status: "Erro no plano", color: "text-red-400" };
    }

    const msPerDay = 1000 * 60 * 60 * 24;

    if (avgProgress >= 100) {
      return {
        date: "Projeto Concluído",
        status: "Finalizado",
        color: "text-green-600"
      };
    }

    const daysElapsed = Math.max(1, (today.getTime() - startDate.getTime()) / msPerDay);

    if (avgProgress <= 0) {
      return {
        date: plannedEndDate.toLocaleDateString('pt-BR'),
        status: "Pelo planejado",
        color: "text-gray-400"
      };
    }

    const velocity = avgProgress / daysElapsed;

    if (velocity <= 0 || !isFinite(velocity)) {
      return {
        date: plannedEndDate.toLocaleDateString('pt-BR'),
        status: "Pelo planejado",
        color: "text-gray-400"
      };
    }

    const estimatedTotalDays = 100 / velocity;

    const maxProjectDurationDays = 365 * 100;
    if (estimatedTotalDays > maxProjectDurationDays) {
      return {
        date: "> 100 anos",
        status: "Progresso muito lento",
        color: "text-orange-500"
      };
    }

    const forecastedDate = new Date(startDate.getTime() + estimatedTotalDays * msPerDay);

    if (isNaN(forecastedDate.getTime())) {
      return {
        date: "Data Indeterminada",
        status: "Erro de cálculo",
        color: "text-red-500"
      };
    }

    const isOverdue = forecastedDate > plannedEndDate;
    const diffDays = Math.abs(Math.round((forecastedDate.getTime() - plannedEndDate.getTime()) / msPerDay));

    return {
      date: forecastedDate.toLocaleDateString('pt-BR'),
      status: isOverdue ? `${diffDays} dias de atraso` : `${diffDays} dias adiantado`,
      color: isOverdue ? "text-red-600" : "text-green-600"
    };
  }, [project, avgProgress]);

  const taskCostComparison = useMemo(() => {
    return [...tasks]
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)
      .map(t => ({
        name: t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name,
        Planejado: t.cost,
        Realizado: t.realizedCost !== undefined ? t.realizedCost : (t.cost * t.progress / 100)
      }));
  }, [tasks]);

  const hhOverTimeData = useMemo(() => {
    const monthMap: Record<string, { estimated: number; realized: number }> = {};
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    let current = new Date(start.getFullYear(), start.getMonth(), 1);

    let iterations = 0;
    while (current <= end && iterations < 1200) {
      const monthKey = current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthMap[monthKey] = { estimated: 0, realized: 0 };
      current.setMonth(current.getMonth() + 1);
      iterations++;
    }

    tasks.forEach(task => {
      const taskDate = new Date(task.endDate);
      if (isNaN(taskDate.getTime())) return;
      const monthKey = taskDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (monthMap[monthKey]) {
        monthMap[monthKey].estimated += (task.manHours || 0);
        monthMap[monthKey].realized += (task.realizedManHours || 0);
      }
    });

    let accEst = 0;
    let accReal = 0;
    return Object.entries(monthMap).map(([name, values]) => {
      accEst += values.estimated;
      accReal += values.realized;
      return {
        name,
        estimado: accEst,
        realizado: accReal
      };
    });
  }, [tasks, project]);

  return (
    <div className="space-y-6">
      {/* Project Description Header */}
      <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Sobre o Projeto</h3>
          <p className="text-xs lg:text-sm text-gray-600 leading-relaxed italic">
            {project.description || "Nenhuma descrição detalhada fornecida para este projeto."}
          </p>
        </div>
        <button
          onClick={onEditProject}
          className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Editar Info
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4">
        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-[9px] lg:text-xs font-semibold text-gray-400 uppercase tracking-wider">Progresso Real</h3>
          <p className="text-xl lg:text-3xl font-extrabold text-gray-900 mt-2">{avgProgress.toFixed(1)}%</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${avgProgress}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-[9px] lg:text-xs font-semibold text-gray-400 uppercase tracking-wider">Previsão Término</h3>
          <p className="text-base lg:text-2xl font-extrabold text-gray-900 mt-2 truncate">{completionForecast.date}</p>
          <p className={`text-[8px] lg:text-[10px] mt-2 font-bold uppercase ${completionForecast.color}`}>
            {completionForecast.status}
          </p>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-[9px] lg:text-xs font-semibold text-gray-400 uppercase tracking-wider">Custo Planejado</h3>
          <p className="text-lg lg:text-2xl font-extrabold text-gray-900 mt-2">R$ {totalPlannedCost.toLocaleString()}</p>
          <p className="text-[8px] lg:text-[10px] text-gray-400 mt-2 font-bold uppercase">Baseado no plano</p>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-[9px] lg:text-xs font-semibold text-gray-400 uppercase tracking-wider">Custo Realizado</h3>
          <p className="text-lg lg:text-2xl font-extrabold text-blue-600 mt-2">R$ {totalRealizedCost.toLocaleString()}</p>
          <p className={`text-[8px] lg:text-[10px] mt-2 font-bold uppercase ${costVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {costVariance >= 0 ? `Economia: R$ ${costVariance.toLocaleString()}` : `Desvio: R$ ${Math.abs(costVariance).toLocaleString()}`}
          </p>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-[9px] lg:text-xs font-semibold text-gray-400 uppercase tracking-wider">Saldo Orçamentário</h3>
          <p className="text-lg lg:text-2xl font-extrabold text-gray-900 mt-2">R$ {budgetRemaining.toLocaleString()}</p>
          <p className="text-[8px] lg:text-[10px] text-gray-400 mt-2 truncate font-bold uppercase">de R$ {project.budget.toLocaleString()}</p>
        </div>

        <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-[9px] lg:text-xs font-semibold text-gray-400 uppercase tracking-wider">Saúde Financeira</h3>
          <p className={`text-base lg:text-lg font-extrabold mt-2 ${totalRealizedCost > project.budget ? 'text-red-600' : 'text-green-600'}`}>
            {totalRealizedCost > project.budget ? 'ESTOURADO' : 'DENTRO DO PLANO'}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${totalRealizedCost > project.budget ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-[8px] lg:text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Status Financeiro</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Status das Tarefas</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex justify-between items-center">
            Custo Planejado vs Realizado (Top 5 Tarefas)
            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded font-bold uppercase">Análise de Desvio</span>
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={taskCostComparison} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => `R$ ${value.toLocaleString()}`}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" />
              <Bar dataKey="Planejado" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="Realizado" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 lg:col-span-3">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex justify-between items-center">
            Esforço Acumulado (HH): Planejado vs Realizado
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">Curva S</span>
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hhOverTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" />
              <Line
                type="monotone"
                dataKey="estimado"
                name="HH Estimado"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="realizado"
                name="HH Realizado"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
