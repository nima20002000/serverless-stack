import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getAllCategories, createCategory } from '@/services/category-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const categories = await getAllCategories();

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در دریافت دسته‌بندی‌ها' },
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
    const { name, slug, description, parentId, isActive } = body;

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
      parentId,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در ایجاد دسته‌بندی' },
      { status: 500 }
    );
  }
}
