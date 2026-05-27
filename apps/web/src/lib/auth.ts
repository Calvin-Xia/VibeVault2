import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@vibevault/db'
import { verifyOtp } from '@/actions/otpActions'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'OTP',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
        code: { label: '验证码', type: 'text', placeholder: '000000' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null
        }

        const result = await verifyOtp(credentials.email, credentials.code)
        if (!result.success) {
          return null
        }

        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.email.split('@')[0],
            },
          })
        }

        return user
      },
    }),
  ],
  pages: {
    signIn: '/',
    signOut: '/api/auth/signout',
    error: '/api/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        return {
          ...session,
          user: {
            ...session.user,
            id: token.id as string,
            email: token.email as string,
          },
        }
      }
      return session
    },
  },
}
