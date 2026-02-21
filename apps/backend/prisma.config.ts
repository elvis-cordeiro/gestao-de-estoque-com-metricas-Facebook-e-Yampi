// prisma.config.ts (na raiz do projeto)
import 'dotenv/config'; // Carrega o .env automaticamente
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma', // Caminho do seu schema
  migrations: {
    path: 'prisma/migrations', // Pasta padrão das migrations
  },
  datasource: {
    url: env('DATABASE_URL'), // Lê do .env
  },
});