// Gedeelde, luie initialisatie van Supabase- en Stripe-clients.
//
// Waarom: `createClient(undefined, undefined)` en `new Stripe(undefined)` gooien een
// exception op het moment dat de module laadt. Netlify antwoordt dan met een 502 vóór
// de handler ooit draait. Door de clients pas ín de handler aan te maken, na een
// env-check, geeft elke functie een nette 503 als de omgeving (nog) niet is ingericht.
//
// Dit bestand staat in een submap zodat Netlify het NIET als eigen function deployt.

const { createClient } = require('@supabase/supabase-js');

const ONBESCHIKBAAR = { error: 'Tijdelijk niet beschikbaar' };

/** Namen van ontbrekende env-variabelen (lege string telt als ontbrekend). */
function ontbrekendeEnv(namen) {
  return namen.filter((n) => !process.env[n]);
}

/** 503-response, met optionele extra headers (bijv. CORS). */
function onbeschikbaar(headers) {
  return {
    statusCode: 503,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(ONBESCHIKBAAR),
  };
}

/**
 * Controleert de env en geeft óf een 503-response (om direct te returnen), óf null.
 * Gebruik: `const fout = envCheck(['SUPABASE_URL', ...], CORS); if (fout) return fout;`
 */
function envCheck(namen, headers) {
  const missing = ontbrekendeEnv(namen);
  if (missing.length === 0) return null;
  console.error('[env] ontbrekende variabelen:', missing.join(', '));
  return onbeschikbaar(headers);
}

/** Supabase-client met service role (omzeilt RLS). Alleen aanroepen ná envCheck. */
function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Stripe-client. Alleen aanroepen ná envCheck. `require` hier zodat functies zonder
 *  Stripe de module niet laden. */
function getStripe() {
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

module.exports = { envCheck, getSupabase, getStripe, onbeschikbaar };
