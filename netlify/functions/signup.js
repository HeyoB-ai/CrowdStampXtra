// NOTE: this version returns detailed error info to the client for debugging.
// Once the signup flow is stable, replace `error: err.message` with a generic
// Dutch message and drop `details`/`stack` from the response body.

const { envCheck, getSupabase } = require('./lib/clients');

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

async function emailExists(sb, email) {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 100; i++) {
    console.log(`[emailExists] checking page ${page}`);
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error(`[emailExists] listUsers error on page ${page}:`, error);
      throw error;
    }
    console.log(`[emailExists] page ${page} returned ${data.users.length} users`);
    if (data.users.some(u => (u.email || '').toLowerCase() === target)) return true;
    if (data.users.length < perPage) return false;
    page++;
  }
  return false;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method Not Allowed' });

  // ── Env-check + client pas hier aanmaken: nette 503 i.p.v. een module-crash (502) ──
  const envFout = envCheck(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'], CORS);
  if (envFout) return envFout;
  const sb = getSupabase();

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return respond(400, { error: 'Ongeldige aanvraag (geen JSON)', step: 'parse' }); }

  const email = (body.email || '').trim().toLowerCase();
  const name = (body.name || '').trim();
  const companyName = (body.company_name || '').trim();

  console.log('[signup] Starting signup for:', email, '| name:', name, '| company:', companyName);

  if (!email || !name || !companyName) {
    return respond(400, { error: 'Vul alle velden in', step: 'validate' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond(400, { error: 'Voer een geldig e-mailadres in', step: 'validate' });
  }

  let newCompanyId = null;
  let step = 'init';

  try {
    // ── Step 1: check duplicate email ──
    step = 'check_email';
    console.log('[step] check_email');
    const exists = await emailExists(sb, email);
    console.log('[step] check_email result:', exists);
    if (exists) {
      return respond(400, { error: 'Dit e-mailadres is al geregistreerd', step });
    }

    // ── Step 2: insert company ──
    step = 'insert_company';
    console.log('[step] insert_company:', companyName);
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: company, error: cErr } = await sb.from('companies').insert({
      name: companyName,
      plan: 'trial',
      status: 'active',
      trial_ends_at: trialEndsAt,
    }).select('id').single();

    if (cErr || !company) {
      console.error('[step] insert_company error:', cErr);
      return respond(500, {
        error: cErr?.message || 'Bedrijf aanmaken mislukt',
        step,
        details: cErr || null,
      });
    }
    newCompanyId = company.id;
    console.log('[step] Company created:', newCompanyId);

    // ── Step 3: invite admin (also sends welcome / magic-link email) ──
    step = 'invite_user';
    console.log('[step] invite_user:', email);
    const { data: invited, error: inviteErr } = await sb.auth.admin.inviteUserByEmail(email, {
      data: {
        role: 'admin',
        company_id: newCompanyId,
        full_name: name,
      },
      redirectTo: 'https://crowdstamp.netlify.app/app',
    });
    console.log('[step] invite_user result:', {
      hasUser: !!invited?.user,
      userId: invited?.user?.id || null,
      error: inviteErr || null,
    });

    if (inviteErr) {
      console.error('[step] invite_user error:', inviteErr);
      // Orphan company cleanup so the user can retry
      try {
        await sb.from('companies').delete().eq('id', newCompanyId);
        console.log('[cleanup] orphan company deleted:', newCompanyId);
      } catch (cleanupErr) {
        console.error('[cleanup] failed:', cleanupErr);
      }
      const msg = (inviteErr.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('registered') || inviteErr.status === 422) {
        return respond(400, { error: 'Dit e-mailadres is al geregistreerd', step, code: inviteErr.code });
      }
      // Return the exact Supabase error so the browser can show what's wrong
      // (e.g. "Email address is invalid" → check Auth → Settings → email restrictions).
      return respond(400, {
        error: inviteErr.message || 'Uitnodiging versturen mislukt',
        code: inviteErr.code,
        step,
      });
    }

    console.log('[signup] Complete for:', email);
    return respond(200, { success: true, message: 'Uitnodiging verstuurd' });

  } catch (err) {
    console.error(`[signup] Unexpected error at step "${step}":`, err);
    if (newCompanyId) {
      try {
        await sb.from('companies').delete().eq('id', newCompanyId);
        console.log('[cleanup] orphan company deleted after exception:', newCompanyId);
      } catch (cleanupErr) {
        console.error('[cleanup] failed:', cleanupErr);
      }
    }
    return respond(500, {
      error: err?.message || 'Onbekende fout',
      step,
      stack: err?.stack || null,
    });
  }
};
