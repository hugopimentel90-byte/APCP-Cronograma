
import fetch from 'node-fetch';

const SUPABASE_URL = 'https://dczjsumagxjswctjjmhf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DVpKI-tMYS5q7y30WLN2ig_6lmBP6GS';

async function finalRecover() {
    try {
        const recoveryProject = {
            id: 'p-1768914645974',
            name: 'Poti',
            description: 'Projeto restaurado.',
            start_date: '2024-01-01',
            end_date: '2025-12-31',
            status: 'Em execução'
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(recoveryProject)
        });

        console.log('Status da recuperação final:', res.status);
        if (!res.ok) console.log(await res.text());
    } catch (e) {
        console.error(e);
    }
}

finalRecover();
