import { Prisma, PrismaClient } from '@generated/prisma/client';
import type { RespondType } from '@generated/prisma/enums';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

const adapter = new PrismaMariaDb({
    host: requireEnv('DATABASE_HOST'),
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: requireEnv('DATABASE_USER'),
    password: requireEnv('DATABASE_PASSWORD'),
    database: requireEnv('DATABASE_NAME'),
});

const prisma = new PrismaClient({ adapter });

export default prisma;

// interface PlayerData {
//     id: string;
//     gameName: string;
//     applyData: Record<string, unknown>;
// }

export type ApplyPlayerType = 'game-mechanics' | 'building-and-art' | 'workers' | 'technical-operations';

export interface GameMechanicAnswer {
    QuestionId: number;
    Order: number;
    Question: string;
    RespondType: RespondType;
    Difficulty: number;
    MaxScore: number;
    Attachment: string;
    Options: string[];
    Answer: string;
}

export interface GameMechanicQuestion {
    id: number;
    type: RespondType;
    difficulty: number;
    question: string;
    attachment: string | null;
    options: Array<{ option: string }>;
}

export interface ApplyData {
    applyOpened: {
        opened: boolean;
        channelId: string;
    };
    answers: {
        ZoneI: {
            Q1: string;
            Q2: string;
            Q3: string;
            Q4: string;
            Q5: string;
        },
        ZoneII: {
            Q1: string;
            Q2: string;
            Q3: string;
            Q4: string;
        },
        ZoneIII: {
            Q1: string;
            Q2: string;
            Q3: string;
            Q4: string;
            Q5: string;
        },
        ZoneIV?: {
            PlayerType: ApplyPlayerType | '';
            Completed: boolean;
            Q1: string;
            Q2: string;
            Q3: string;
            Q4: string;
            Q5: string;
            Q6: string;
            GameMechanics?: {
                Questions: GameMechanicAnswer[];
            };
        },
        ZoneV?: {
            Honesty: string;
        }
    }
}


export async function getApplyPlayerData(id: string): Promise<ApplyData | undefined> {
    const player = await prisma.player.findUnique({
        where: { id },
    });

    if (player && player.applyData) return player.applyData as unknown as ApplyData;
    return undefined;
}

export async function setApplyPlayerData(id: string, applyData: ApplyData): Promise<void> {
    const jsonApplyData = applyData as unknown as Prisma.InputJsonValue;

    await prisma.player.upsert({
        where: { id },
        update: { applyData: jsonApplyData },
        create: { id, gameName: '', applyData: jsonApplyData },
    });
}

export async function deletePlayerData(id: string): Promise<boolean> {
    const result = await prisma.player.deleteMany({
        where: { id },
    });

    return result.count > 0;
}

function shuffle<T>(values: T[]): T[] {
    const shuffled = [...values];

    for (let index = shuffled.length - 1; index > 0; index--) {
        const target = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
    }

    return shuffled;
}

export async function selectGameMechanicQuestions(distribution: {
    Hard: number;
    Medium: number;
    Easy: number;
}): Promise<GameMechanicQuestion[]> {
    const questions = await prisma.questions.findMany({
        where: { category: 'GAMEMECHANIC' },
        include: { options: { select: { option: true } } },
        orderBy: { id: 'asc' },
    });

    const pools = {
        Hard: questions.filter(question => question.difficulty === 3),
        Medium: questions.filter(question => question.difficulty === 2),
        Easy: questions.filter(question => question.difficulty === 1),
    };

    const missing = (Object.keys(distribution) as Array<keyof typeof distribution>)
        .filter(level => pools[level].length < distribution[level])
        .map(level => `${level}: ${pools[level].length}/${distribution[level]}`);

    if (missing.length > 0) {
        throw new Error(`Game Mechanics question pool is incomplete (${missing.join(', ')})`);
    }

    return shuffle([
        ...shuffle(pools.Hard).slice(0, distribution.Hard),
        ...shuffle(pools.Medium).slice(0, distribution.Medium),
        ...shuffle(pools.Easy).slice(0, distribution.Easy),
    ]);
}
