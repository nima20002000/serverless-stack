import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getAllTags, createTag } from '@/services/tag-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const tags = await getAllTags();
    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Get tags error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در دریافت برچسب‌ها' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'نام و نامک (slug) الزامی است' },
        { status: 400 }
      );
    }

    const tag = await createTag({ name, slug });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error: any) {
    console.error('Create tag error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در ایجاد برچسب' },
      { status: 500 }
    );
  }
}
