import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function getSchoolAbbr(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => (w[0] ? w[0].toUpperCase() : ''))
    .join('');
}

function safeStr(v: any) {
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(req: Request) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json(
        {
          error:
            'Server env missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (do NOT expose service role to client).',
        },
        500
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: 'Invalid JSON body.' }, 400);

    const email = safeStr(body.email).toLowerCase();
    const password = safeStr(body.password);
    const role = body.role as AppRole;
    const school_id = safeStr(body.school_id);

    const first_name = safeStr(body.first_name);
    const last_name = safeStr(body.last_name);
    const gender = safeStr(body.gender) || null;
    const year_of_entry = safeStr(body.year_of_entry);

    if (!email) return json({ error: 'email is required' }, 400);
    if (!password || password.length < 6) return json({ error: 'password must be at least 6 characters' }, 400);
    if (!role) return json({ error: 'role is required' }, 400);
    if (!school_id) return json({ error: 'school_id is required' }, 400);
    if (!first_name || !last_name) return json({ error: 'first_name and last_name are required' }, 400);
    if (!/^\d{4}$/.test(year_of_entry)) return json({ error: 'year_of_entry must be a 4-digit year' }, 400);

    // 1) Load school name (for reg id)
    const { data: school, error: schErr } = await admin
      .from('general_information')
      .select('id, school_name')
      .eq('id', school_id)
      .maybeSingle();

    if (schErr) return json({ error: schErr.message }, 400);
    if (!school) return json({ error: 'School not found or not accessible.' }, 404);

    const schoolName = (school as any).school_name as string;
    const abbr = getSchoolAbbr(schoolName) || 'SCH';

    // 2) Create or reuse auth user by email
    // Supabase Admin: try list users to find existing by email
    let userId: string | null = null;

    const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 2000 });
    if (listErr) return json({ error: listErr.message }, 400);

    const existing = (listed?.users || []).find(u => (u.email || '').toLowerCase() === email);

    if (existing?.id) {
      userId = existing.id;

      // Optional: update password (only if you want)
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { full_name: `${first_name} ${last_name}` },
      });
      if (updErr) return json({ error: updErr.message }, 400);
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `${first_name} ${last_name}` },
      });

      if (createErr) return json({ error: createErr.message }, 400);
      userId = created?.user?.id ?? null;
    }

    if (!userId) return json({ error: 'Failed to get/create auth user id.' }, 500);

    // 3) Upsert profile (service role bypasses RLS)
    const full_name = `${first_name} ${last_name}`.trim();

    const { error: profErr } = await admin.from('profiles').upsert(
      {
        user_id: userId,
        email,
        full_name,
        role,
        school_id,
      },
      { onConflict: 'user_id' }
    );

    if (profErr) return json({ error: profErr.message }, 400);

    // 4) Insert teacher row with generated registration_id
    // Build sequence based on existing teachers for school/year.
    // Try a few times in case of race/duplicate.
    let regId: string | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { count, error: cErr } = await admin
        .from('teachers')
        .select('registration_id', { count: 'exact', head: true })
        .eq('school_id', school_id)
        .eq('year_of_entry', year_of_entry);

      if (cErr) return json({ error: cErr.message }, 400);

      const seq = String((count ?? 0) + 1 + attempt).padStart(3, '0');
      regId = `${abbr}/T/${year_of_entry}/${seq}`;

      const initials = `${first_name[0] || ''}${last_name[0] || ''}`.toUpperCase() || null;

      const { error: insErr } = await admin.from('teachers').insert({
        registration_id: regId,
        user_id: userId,
        first_name,
        last_name,
        gender,
        year_of_entry,
        school_id,
        initials,
      });

      if (!insErr) break;

      // Duplicate? try next seq
      const msg = (insErr as any).message || '';
      const code = (insErr as any).code || '';
      if (code === '23505' || msg.toLowerCase().includes('duplicate')) {
        regId = null;
        continue;
      }

      return json({ error: insErr.message }, 400);
    }

    if (!regId) return json({ error: 'Failed to generate unique registration id.' }, 500);

    return json({ ok: true, user_id: userId, registration_id: regId }, 200);
  } catch (e: any) {
    return json({ error: e?.message || 'Unexpected server error' }, 500);
  }
}
