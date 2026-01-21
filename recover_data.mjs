
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://dczjsumagxjswctjjmhf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DVpKI-tMYS5q7y30WLN2ig_6lmBP6GS';

async function recover() {
    try {
        const resTasks = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const tasks = await resTasks.json();

        if (tasks.length === 0) {
            console.log('Nenhuma tarefa encontrada.');
            return;
        }

        const projectIds = [...new Set(tasks.map(t => t.project_id))];
        console.log('Project IDs encontrados nas tarefas:', projectIds);

        for (const pid of projectIds) {
            if (!pid || pid === 'p1') continue;

            console.log(`\nTentando recuperar projeto: ${pid}`);

            // Checar se o projeto existe
            const resProj = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${pid}`, {
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            const proj = await resProj.json();

            if (proj.length === 0) {
                console.log(`Projeto ${pid} não encontrado. Criando registro de recuperação...`);

                const recoveryProject = {
                    id: pid,
                    name: 'Projeto Recuperado',
                    description: 'Projeto restaurado automaticamente após detecção de dados órfãos.',
                    start_date: tasks.find(t => t.project_id === pid)?.start_date || '2024-01-01',
                    end_date: '2025-12-31',
                    status: 'Em execução'
                };

                const resCreate = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(recoveryProject)
                });

                if (resCreate.ok) {
                    console.log(`Sucesso ao recriar projeto ${pid}`);
                } else {
                    console.error(`Erro ao recriar projeto ${pid}:`, await resCreate.text());
                }
            } else {
                console.log(`Projeto ${pid} já existe:`, proj[0].name);
            }
        }
    } catch (e) {
        console.error('Falha na recuperação:', e);
    }
}

recover();
