import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma/client";
import { Role } from "@prisma/client";
import { detectIdentifierType } from "@/services/user-service";

// Extend the built-in types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      name: string;
      role: Role;
      isVerified: boolean;
    }
  }

  interface User {
    id: string;
    email: string | null;
    phone: string | null;
    name: string;
    role: Role;
    isVerified: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    email: string | null;
    phone: string | null;
    name: string;
    isVerified: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "ایمیل یا شماره تلفن", type: "text" },
        password: { label: "رمز عبور", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier) {
          throw new Error("ایمیل یا شماره تلفن الزامی است");
        }

        // Detect if identifier is email or phone
        const identifierType = detectIdentifierType(credentials.identifier);

        if (identifierType === 'invalid') {
          throw new Error("فرمت ایمیل یا شماره تلفن نامعتبر است");
        }

        // Find user by email or phone
        const user = await prisma.user.findFirst({
          where: identifierType === 'email'
            ? { email: credentials.identifier }
            : { phone: credentials.identifier }
        });

        if (!user) {
          throw new Error("کاربری با این مشخصات یافت نشد");
        }

        // For authentication without password (OTP-verified)
        // Allow passwordless login for both phone and email after OTP verification
        if (!credentials.password) {
          // This path is used after OTP verification
          // The OTP was already verified before calling signIn
          // Security: Only allow if user is verified (went through OTP for phone)
          if (identifierType === 'phone' && !user.isVerified) {
            throw new Error("لطفاً ابتدا شماره تلفن خود را تایید کنید");
          }

          return {
            id: user.id,
            email: user.email,
            phone: user.phone,
            name: user.name,
            role: user.role,
            isVerified: user.isVerified,
          };
        }

        // For email/phone authentication with password
        if (!user.password) {
          throw new Error("برای این حساب از ورود با کد تایید استفاده کنید");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password!,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("رمز عبور اشتباه است");
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
        session.user.role = token.role as Role;
        session.user.email = token.email as string | null;
        session.user.phone = token.phone as string | null;
        session.user.name = token.name as string;
        session.user.isVerified = token.isVerified as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
