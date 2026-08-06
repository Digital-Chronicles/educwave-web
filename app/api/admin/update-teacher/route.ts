import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type AppRole = 'ADMIN' | 'ACADEMIC' | 'TEACHER' | 'FINANCE' | 'STUDENT' | 'PARENT';

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function safeStr(value: any) {
  return typeof value === 'string' ? value.trim() : '';
}

function computeInitials(firstName: string, lastName: string) {
  const initials = `${(firstName || '').trim().charAt(0) || ''}${(lastName || '').trim().charAt(0) || ''}`;
  return initials ? initials.toUpperCase() : null;
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      return json(
        {
          error:
            'Server env missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (do NOT expose service role to client).',
        },
        500
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: 'Invalid JSON body.' }, 400);

    const registrationId = safeStr(body.registration_id);
    const schoolId = safeStr(body.school_id);
    const userId = safeStr(body.user_id);
    const firstName = safeStr(body.first_name);
    const lastName = safeStr(body.last_name);
    const gender = safeStr(body.gender) || null;
    const yearOfEntry = safeStr(body.year_of_entry);
    const role = (body.role as AppRole) || 'TEACHER';
    const initials = safeStr(body.initials) || computeInitials(firstName, lastName);

    if (!registrationId) return json({ error: 'registration_id is required' }, 400);
    if (!firstName || !lastName) return json({ error: 'first_name and last_name are required' }, 400);
    if (!/^(\d{4})$/.test(yearOfEntry)) return json({ error: 'year_of_entry must be a 4-digit year' }, 400);

    const { data: teacherRecord, error: teacherLookupErr } = await admin
      .from('teachers')
      .select('registration_id, user_id, school_id')
      .eq('registration_id', registrationId)
      .maybeSingle();

    if (teacherLookupErr) return json({ error: teacherLookupErr.message }, 400);
    if (!teacherRecord) return json({ error: 'Teacher not found.' }, 404);

    const resolvedUserId = userId || teacherRecord.user_id;
    const resolvedSchoolId = schoolId || teacherRecord.school_id;

    if (!resolvedUserId) return json({ error: 'User id not found for teacher record.' }, 400);
    if (!resolvedSchoolId) return json({ error: 'School id not found for teacher record.' }, 400);

    const fullName = `${firstName} ${lastName}`.trim();

    const { error: profileErr } = await admin
      .from('profiles')
      .upsert(
        {
          user_id: resolvedUserId,
          full_name: fullName,
          school_id: resolvedSchoolId,
          role,
        },
        { onConflict: 'user_id' }
      );

    if (profileErr) return json({ error: profileErr.message }, 400);

    const { error: updateTeacherErr } = await admin
      .from('teachers')
      .update({
        first_name: firstName,
        last_name: lastName,
        gender,
        year_of_entry: yearOfEntry,
        initials,
        school_id: resolvedSchoolId,
      })
      .eq('registration_id', registrationId)
      .eq('school_id', resolvedSchoolId);

    if (updateTeacherErr) return json({ error: updateTeacherErr.message }, 400);

    return json(
      {
        ok: true,
        registration_id: registrationId,
        user_id: resolvedUserId,
        school_id: resolvedSchoolId,
      },
      200
    );
  } catch (e: any) {
    return json({ error: e?.message || 'Unexpected server error' }, 500);
  }
}
