
import { GoogleGenAI, Type } from "@google/genai";
import { Project, Task, Resource, TaskHistoryEntry } from "../../types";

/**
 * Gera insights estratégicos usando o modelo Gemini 3 Pro.
 */
export const getProjectInsights = async (project: Project, tasks: Task[], resources: Resource[]) => {
  try {
    // Inicialização interna para evitar travamento no carregamento do módulo
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `Analise o projeto e dê 3 insights estratégicos (Riscos/Prazos/Recursos): 
    Projeto: ${project.name}, Orçamento: ${project.budget}.
    Tarefas: ${JSON.stringify(tasks.slice(0, 10).map(t => ({ n: t.name, p: t.progress })))}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["insights"],
        },
      }
    });

    const textOutput = response.text || '{"insights": []}';
    const data = JSON.parse(textOutput);
    return data.insights && data.insights.length > 0 ? data.insights : ["Analizando dados iniciais..."];
  } catch (error) {
    console.warn("IA Insights indisponível no momento:", error);
    return ["Aguardando sincronização de dados para insights."];
  }
};

/**
 * Gera um resumo executivo para o relatório do projeto.
 */
export const generateReportExecutiveSummary = async (project: Project, tasks: Task[], history: TaskHistoryEntry[]) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Gere um resumo executivo de 2 parágrafos para o projeto: ${project.name}. Progresso: ${tasks.length} tarefas.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || "Resumo indisponível.";
  } catch (error) {
    return "Falha ao gerar o resumo inteligente.";
  }
};
