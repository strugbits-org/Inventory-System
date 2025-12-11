import { defineConfig } from '@prisma/config';
import 'dotenv/config';

export default defineConfig({

  schema: './src/db/prisma/schema.prisma',

  // Prisma Migrate needs the database URL here now
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
