import { PrismaClient } from '@generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

const adapter = new PrismaMariaDb({
    host: requireEnv('DATABASE_HOST'),
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: requireEnv('DATABASE_USER'),
    password: requireEnv('DATABASE_PASSWORD'),
    database: requireEnv('DATABASE_NAME'),
});

const prisma = new PrismaClient({ adapter });

export default prisma;

