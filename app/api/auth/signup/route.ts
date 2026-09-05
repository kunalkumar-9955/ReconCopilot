// app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, gstin, razorpayMerchantId } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Create user with email auto-confirmed
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || 'Demo Merchant',
        gstin: gstin || '27AABCP1234Q1Z5',
        razorpay_merchant_id: razorpayMerchantId || 'acc_merchant_demo',
      },
    });

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // Insert merchant record in merchants table if not exists
    const merchantName = name || 'Merchant Store';
    await admin.from('merchants').insert({
      name: merchantName,
      gstin: gstin || '27AABCP1234Q1Z5',
      razorpay_merchant_id: razorpayMerchantId || 'acc_' + Math.random().toString(36).substring(2, 9),
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now log in.',
      user: userData.user,
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: err.message || 'Signup failed' }, { status: 500 });
  }
}
