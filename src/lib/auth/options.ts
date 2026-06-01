import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/supabase/server';
import { detectIdentifierType } from '@/services/user-service';
import {
  getPhoneLookupCandidates,
  normalizePhoneNumber,
} from '@/lib/utils/text';

// Extend the built-in types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      name: string;
      role: 'USER' | 'ADMIN';
      isVerified: boolean;
    };
  }

  interface User {
    id: string;
    email: string | null;
    phone: string | null;
    name: string;
    role: 'USER' | 'ADMIN';
    isVerified: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'USER' | 'ADMIN';
    email: string | null;
    phone: string | null;
    name: string;
    isVerified: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'ایمیل یا شماره تلفن', type: 'text' },
        password: { label: 'رمز عبور', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials.password) {
          throw new Error('ایمیل یا شماره تلفن و رمز عبور الزامی است');
        }

        // Detect if identifier is email or phone
        const identifierType = detectIdentifierType(credentials.identifier);

        if (identifierType === 'invalid') {
          throw new Error('فرمت ایمیل یا شماره تلفن نامعتبر است');
        }

        const normalizedIdentifier =
          identifierType === 'phone'
            ? normalizePhoneNumber(credentials.identifier)
            : credentials.identifier;

        const supabase = createClient();

        // Find user by email or phone
        const userQuery = supabase.from('users').select('*').limit(1);
        const { data: user, error } =
          identifierType === 'email'
            ? await userQuery.eq('email', normalizedIdentifier).maybeSingle()
            : await userQuery
                .in('phone', getPhoneLookupCandidates(credentials.identifier))
                .maybeSingle();

        if (error || !user) {
          throw new Error('کاربری با این مشخصات یافت نشد');
        }

        if (!user.password) {
          throw new Error(
            'این حساب رمز عبور ندارد. لطفاً با پشتیبانی تماس بگیرید'
          );
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('رمز عبور اشتباه است');
        }

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.phone = user.phone;
        token.name = user.name;
        token.isVerified = user.isVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'USER' | 'ADMIN';
        session.user.email = token.email as string | null;
        session.user.phone = token.phone as string | null;
        session.user.name = token.name as string;
        session.user.isVerified = token.isVerified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
