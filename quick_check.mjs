
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://dczjsumagxjswctjjmhf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DVpKI-tMYS5q7y30WLN2ig_6lmBP6GS';

async function check() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const data = await res.json();
        console.log('--- Projetos no Banco ---');
        console.log(JSON.stringify(data, null, 2));

        const resTasks = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const tasks = await resTasks.json();
        console.log('\n--- Tarefas no Banco ---');
        console.log('Total:', tasks.length);
    } catch (e) {
        console.error('Falha ao conectar:', e);
    }
}

check();
