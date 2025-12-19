import { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@vibevault/db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'your@email.com',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null
        }

        // Find or create user based on email
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
    // Remove custom signIn page to use default NextAuth signIn page
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
            email: token.email as string
          }
        }
      }
      return session
    },
  },
}
