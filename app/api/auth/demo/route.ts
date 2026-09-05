// app/api/auth/demo/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST() {
  const admin = createAdminClient();
  const demoEmail = 'priya@crafts.com';
  const demoPassword = 'DemoPassword123!';

  try {
    // Check if user already exists
    const { data: usersData } = await admin.auth.admin.listUsers();
    const existing = usersData?.users?.find((u: any) => u.email === demoEmail);

    if (!existing) {
      // Create confirmed demo user
      await admin.auth.admin.createUser({
        email: demoEmail,
        password: demoPassword,
        email_confirm: true,
        user_metadata: {
          name: 'Priya Crafts Store',
          gstin: '27AABCP1234Q1Z5',
          razorpay_merchant_id: 'acc_PriyaCrafts2025',
        },
      });

      // Ensure merchant record exists
      const { data: mData } = await admin.from('merchants').select('id').limit(1);
      if (!mData || mData.length === 0) {
        await admin.from('merchants').insert({
          name: 'Priya Crafts Store',
          gstin: '27AABCP1234Q1Z5',
          razorpay_merchant_id: 'acc_PriyaCrafts2025',
        });
      }
    }

    return NextResponse.json({
      success: true,
      email: demoEmail,
      password: demoPassword,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
