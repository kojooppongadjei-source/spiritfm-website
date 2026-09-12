// POST /.netlify/functions/paystack-webhook
// Register this URL in Paystack Dashboard → Settings → API Keys & Webhooks:
//   https://spiritfm.co.ug/.netlify/functions/paystack-webhook
//
// Keeps Supabase in sync automatically as Paystack renews (or fails to renew)
// each station's subscription every month — no manual work needed after setup.

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 1. Verify this request really came from Paystack (never trust an unverified webhook)
  const signature = event.headers['x-paystack-signature'];
  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(event.body)
    .digest('hex');

  if (signature !== expected) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const payload = JSON.parse(event.body);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    switch (payload.event) {
      case 'charge.success': {
        // A monthly renewal (or the first payment) succeeded
        const subCode = payload.data.plan && payload.data.plan.plan_code
          ? payload.data.subscription_code
          : null;
        const customerCode = payload.data.customer.customer_code;

        await supabase
          .from('station_subscriptions')
          .update({
            status: 'active',
            last_charged_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('paystack_customer_code', customerCode);
        break;
      }

      case 'subscription.disable': {
        await supabase
          .from('station_subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('paystack_subscription_code', payload.data.subscription_code);
        break;
      }

      case 'invoice.payment_failed': {
        await supabase
          .from('station_subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('paystack_subscription_code', payload.data.subscription.subscription_code);
        break;
      }

      case 'invoice.create': {
        // Paystack about to attempt the next month's charge — update next_billing_at for visibility
        await supabase
          .from('station_subscriptions')
          .update({
            next_billing_at: payload.data.period_end || null,
            updated_at: new Date().toISOString(),
          })
          .eq('paystack_subscription_code', payload.data.subscription.subscription_code);
        break;
      }

      default:
        // Ignore events we don't care about
        break;
    }

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    // Still return 200 so Paystack doesn't hammer retries on our own bug;
    // log details for later manual reconciliation instead.
    console.error('Webhook handling error:', err);
    return { statusCode: 200, body: 'received (logged error)' };
  }
};
