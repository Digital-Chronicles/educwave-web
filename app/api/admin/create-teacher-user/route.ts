import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const role = String(body?.role || 'TEACHER');
    const school_id = String(body?.school_id || '').trim(); // uuid

    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    if (!password || password.length < 6)
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    if (!school_id) return NextResponse.json({ error: 'school_id is required.' }, { status: 400 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✅ MUST exist on server
      { auth: { persistSession: false } }
    );

    // ✅ Create auth user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,       // optional
        school_id,  // optional (can help triggers)
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data?.user?.id) return NextResponse.json({ error: 'Auth user created but no id returned.' }, { status: 500 });

    const user_id = data.user.id;

    // ✅ OPTIONAL BUT RECOMMENDED:
    // If your profiles trigger exists, it will insert automatically.
    // But we also "upsert" to ensure school_id/role are set immediately.
    const { error: upErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id,
          email,
          role,
          school_id,
        },
        { onConflict: 'user_id' }
      );

    if (upErr) {
      // Not fatal if RLS/permissions block it, but usually service role can write.
      return NextResponse.json(
        { error: `User created, but failed to upsert profile: ${upErr.message}`, user_id },
        { status: 200 }
      );
    }

    return NextResponse.json({ user_id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
