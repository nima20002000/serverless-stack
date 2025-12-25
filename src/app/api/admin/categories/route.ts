import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getAllCategories, createCategory } from '@/services/category-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const categories = await getAllCategories();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در دریافت دسته‌بندی‌ها';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, description, image, parentId, isActive } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'نام و نامک (slug) الزامی است' },
        { status: 400 }
      );
    }

    const category = await createCategory({
      name,
      slug,
      description,
      image,
      parentId,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در ایجاد دسته‌بندی';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
