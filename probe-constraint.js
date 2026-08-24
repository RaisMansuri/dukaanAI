const url = 'https://muozewnqikscwtfnilpn.supabase.co';
const apiKey = 'sb_publishable_Xs3Un2JkOV2EUbEVGJ1_Xg_f2SYO_ix';
const shopId = 'a1b2c3d4-e5f6-47a8-b901-c2d3e4f5a6b7';

const candidates = ['paid', 'PAID', 'Paid', 'unpaid', 'UNPAID', 'Unpaid', 'partial', 'PARTIAL', 'pending', 'COMPLETED', 'completed'];

async function probeConstraint() {
  console.log('--- PROBING invoices_payment_status_check CONSTRAINT ---');

  for (const statusVal of candidates) {
    const invId = '11111111-2222-4333-8444-555555555555';
    const payload = {
      id: invId,
      shop_id: shopId,
      customer_id: null,
      invoice_number: 'INV-TEST-CHK',
      subtotal: 10,
      discount_amount: 0,
      total_amount: 10,
      payment_status: statusVal,
      status: 'COMPLETED',
      notes: 'test',
    };

    const res = await fetch(`${url}/rest/v1/invoices`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const txt = await res.text();
    if (txt.includes('invoices_payment_status_check')) {
      console.log(`[REJECTED] payment_status: "${statusVal}" -> violates constraint`);
    } else if (txt.includes('42501')) {
      console.log(`[ACCEPTED VALUE FORMAT] payment_status: "${statusVal}" -> passed check constraint! (stopped at RLS 42501)`);
    } else {
      console.log(`[STATUS ${res.status}] payment_status: "${statusVal}" -> ${txt}`);
    }
  }
}

probeConstraint();
