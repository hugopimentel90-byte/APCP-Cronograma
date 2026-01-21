
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dczjsumagxjswctjjmhf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DVpKI-tMYS5q7y30WLN2ig_6lmBP6GS';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    console.log('--- Verificando Projetos ---');
    const { data: projects, error: pErr } = await supabase.from('projects').select('*');
    console.log('Projetos encontrados:', projects?.length || 0);
    if (projects) console.log(projects.map(p => p.name));

    console.log('\n--- Verificando Tarefas ---');
    const { data: tasks, error: tErr } = await supabase.from('tasks').select('*');
    console.log('Tarefas encontradas:', tasks?.length || 0);
    if (tasks && tasks.length > 0) {
        console.log('Primeiras 5 tarefas:', tasks.slice(0, 5).map(t => t.name));
    }

    if (pErr) console.error('Erro Projetos:', pErr);
    if (tErr) console.error('Erro Tarefas:', tErr);
}

check();
