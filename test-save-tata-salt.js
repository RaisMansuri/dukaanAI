const { createClient } = require('@supabase/supabase-js');

const url = 'https://muozewnqikscwtfnilpn.supabase.co';
const apiKey = 'sb_publishable_Xs3Un2JkOV2EUbEVGJ1_Xg_f2SYO_ix';

const supabase = createClient(url, apiKey, {
  auth: { persistSession: false },
  realtime: { transport: null }
});

const shopId = 'a1b2c3d4-e5f6-47a8-b901-c2d3e4f5a6b7';

async function testSaveTataSalt() {
  console.log('--- Testing saving "Tata Salt 1kg" to Supabase products table ---');

  // Ensure shop exists in shops table first so FK constraint is happy
  const { data: shopData } = await supabase.from('shops').select('*').eq('id', shopId).maybeSingle();
  if (!shopData) {
    console.log('Inserting default shop into Supabase...');
    const { error: shopErr } = await supabase.from('shops').insert({
      id: shopId,
      name: 'Shree Ganesh Super Market',
      address: 'Shop 12, Main Market, Mumbai',
      phone: '+91 98200 12345',
    });
    if (shopErr) console.log('Shop insert info:', shopErr.message);
  }

  const prodPayload = {
    id: 'b2c3d4e5-f6a7-48b9-9012-c3d4e5f6a7b8',
    shop_id: shopId,
    name: 'Tata Salt 1kg',
    barcode: '8901058852310',
    sku: 'TS-1KG',
    selling_price: 28,
    purchase_price: 22,
    gst_rate: 0,
    hsn_code: '2501',
    unit: 'Kg',
  };

  console.log('Sending insert payload:', prodPayload);

  const { data, error } = await supabase.from('products').insert(prodPayload).select();

  if (error) {
    console.error('INSERT ERROR:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  } else {
    console.log('INSERT SUCCESS! Saved product in Supabase:', data);
  }
}

testSaveTataSalt();
