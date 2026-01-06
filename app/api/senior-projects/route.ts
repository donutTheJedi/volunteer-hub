import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

// GET: list senior projects (optionally filter by institution via join)
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || 50);

  const { data, error } = await supabase
    .from('senior_projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ projects: data }, { status: 200 });
}

// POST: create senior project (title, description, poster_url optional)
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const title = (body?.title || '').trim();
  const description = (body?.description || '').trim();
  const poster_url = (body?.poster_url || '').trim() || null;
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const { error } = await supabase.from('senior_projects').insert({
    user_id: user.id,
    title,
    description,
    poster_url,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true }, { status: 201 });
}


