
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType
} from "docx";
import * as FileSaver from "file-saver";
import { Project, Task, TaskHistoryEntry, Resource, TaskNote } from "../../types";

export const generateDocxReport = async (
  project: Project,
  tasks: Task[],
  history: TaskHistoryEntry[],
  resources: Resource[],
  aiSummary: string,
  stats: any,
  notes: TaskNote[]
) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: `RELATÓRIO EXECUTIVO DE PROJETO`,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: project.name.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          new Paragraph({
            text: "1. RESUMO INTELIGENTE (IA)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: aiSummary,
                italics: true,
              }),
            ],
            spacing: { after: 400 },
          }),

          new Paragraph({
            text: "2. INDICADORES DO DASHBOARD",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Indicador")] }),
                  new TableCell({ children: [new Paragraph("Valor")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Progresso Geral")] }),
                  new TableCell({ children: [new Paragraph(`${stats.avgProgress.toFixed(1)}%`)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Custo Planejado")] }),
                  new TableCell({ children: [new Paragraph(`R$ ${stats.totalPlannedCost.toLocaleString()}`)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Custo Realizado")] }),
                  new TableCell({ children: [new Paragraph(`R$ ${stats.totalRealizedCost.toLocaleString()}`)] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Previsão de Término")] }),
                  new TableCell({ children: [new Paragraph(stats.completionForecastDate)] }),
                ],
              }),
            ],
          }),

          new Paragraph({
            text: "3. TAREFAS EM EXECUÇÃO",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Tarefa")] }),
                  new TableCell({ children: [new Paragraph("Progresso")] }),
                  new TableCell({ children: [new Paragraph("Entrega")] }),
                ],
              }),
              ...tasks.filter(t => t.progress > 0 && t.progress < 100).map(t => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(t.name)] }),
                  new TableCell({ children: [new Paragraph(`${t.progress}%`)] }),
                  new TableCell({ children: [new Paragraph(t.endDate)] }),
                ],
              })),
            ],
          }),

          new Paragraph({
            text: "4. HISTÓRICO DE ALTERAÇÕES E JUSTIFICATIVAS",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Data")] }),
                  new TableCell({ children: [new Paragraph("Tarefa")] }),
                  new TableCell({ children: [new Paragraph("Motivo/Justificativa")] }),
                ],
              }),
              ...history.slice(0, 15).map(h => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(new Date(h.timestamp).toLocaleDateString('pt-BR'))] }),
                  new TableCell({ children: [new Paragraph(h.taskName)] }),
                  new TableCell({ children: [new Paragraph(h.reason)] }),
                ],
              })),
            ],
          }),

          new Paragraph({
            text: "5. NOTAS INFORMATIVAS DE PROGRESSO",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
          notes.length > 0 ? new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph("Data")] }),
                  new TableCell({ children: [new Paragraph("Tarefa")] }),
                  new TableCell({ children: [new Paragraph("Nota")] }),
                ],
              }),
              ...notes.map(n => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(new Date(n.timestamp).toLocaleDateString('pt-BR'))] }),
                  new TableCell({ children: [new Paragraph(n.taskName)] }),
                  new TableCell({ children: [new Paragraph(n.text)] }),
                ],
              })),
            ],
          }) : new Paragraph({ text: "Nenhuma nota informativa registrada para este projeto.", spacing: { after: 200 } }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);

  // Robust check for saveAs function location in various ESM/CJS wrap scenarios
  const saveAsFunc = (FileSaver as any).saveAs || (FileSaver as any).default?.saveAs || (FileSaver as any).default || (window as any).saveAs;

  if (typeof saveAsFunc === 'function') {
    saveAsFunc(blob, `Relatorio_Projeto_${project.name.replace(/\s+/g, '_')}.docx`);
  } else {
    console.warn("Could not find saveAs function from file-saver, using fallback anchor click.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Projeto_${project.name.replace(/\s+/g, '_')}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  }
};
