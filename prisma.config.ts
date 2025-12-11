import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',

  // Prisma Migrate needs the database URL here now
  datasource: {
    url: process.env.DATABASE_URL!,
  },

  // Prisma Client connection (Node.js runtime)
  client: {
    adapter: 'postgresql', // or postgresjs
    url: process.env.DATABASE_URL!,
  },
});
