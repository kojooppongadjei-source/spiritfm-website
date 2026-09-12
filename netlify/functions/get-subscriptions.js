// GET /.netlify/functions/get-subscriptions
// Returns the public-safe billing status for all four stations.
// Uses the Supabase SERVICE key server-side only — never exposed to the browser.

const { createClient } = require('@supabase/supabase-js');

exports.handler = async function () {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase
      .from('station_subscriptions')
      .select('station_key, station_name, status, amount_usd, next_billing_at')
      .order('station_name', { ascending: true });

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stations: data }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Failed to load subscriptions' }),
    };
  }
};
