// POST /.netlify/functions/create-subscription
// Body: { reference: string, station_key: string }
//
// Flow:
//   1. Browser runs Paystack Popup for the station's first $25 payment, gets a `reference`.
//   2. This function verifies that transaction server-side with Paystack (never trust the client),
//      pulls the resulting card authorization + customer code off the verified transaction,
//      subscribes that customer to the shared $25/mo USD Plan (PAYSTACK_PLAN_CODE),
//      and records everything in Supabase.
//
// Required env vars (set in Netlify → Site configuration → Environment variables):
//   PAYSTACK_SECRET_KEY   — secret key for the Paystack account issuing these charges
//   PAYSTACK_PLAN_CODE    — the plan_code for the $25/mo USD plan (create once, see README below)
//   SUPABASE_URL
//   SUPABASE_SERVICE_KEY  — service role key (server-side only)

const { createClient } = require('@supabase/supabase-js');

const PAYSTACK_BASE = 'https://api.paystack.co';

async function paystackFetch(path, options = {}) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok || json.status === false) {
    throw new Error(json.message || `Paystack request to ${path} failed`);
  }
  return json.data;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { reference, station_key } = JSON.parse(event.body || '{}');
    if (!reference || !station_key) {
      return { statusCode: 400, body: JSON.stringify({ error: 'reference and station_key are required' }) };
    }

    // 1. Verify the transaction really happened and really succeeded (never trust the client alone)
    const tx = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (tx.status !== 'success') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Transaction was not successful' }) };
    }

    const customerCode = tx.customer.customer_code;
    const authorizationCode = tx.authorization.authorization_code;

    // 2. Subscribe this customer to the shared $25/mo USD plan going forward
    const subscription = await paystackFetch('/subscription', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerCode,
        plan: process.env.PAYSTACK_PLAN_CODE,
        authorization: authorizationCode,
      }),
    });

    // 3. Record it in Supabase
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { error } = await supabase
      .from('station_subscriptions')
      .update({
        billing_email: tx.customer.email,
        paystack_customer_code: customerCode,
        paystack_authorization_code: authorizationCode,
        paystack_subscription_code: subscription.subscription_code,
        status: 'active',
        last_charged_at: new Date().toISOString(),
        next_billing_at: subscription.next_payment_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('station_key', station_key);

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, subscription_code: subscription.subscription_code }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Subscription setup failed' }) };
  }
};
