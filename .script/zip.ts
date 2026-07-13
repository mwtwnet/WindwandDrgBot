import { createRequire } from 'node:module';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Archiver, ArchiverOptions } from 'archiver';

const require = createRequire(import.meta.url);
const createArchive = require('archiver') as (format: 'zip', options?: ArchiverOptions) => Archiver;

const projectRoot = join(import.meta.dirname, '..');
const outputDirectory = join(projectRoot, 'zips');
const distributionDirectory = join(projectRoot, 'dist');

if (!existsSync(distributionDirectory)) {
    throw new Error('dist directory not found. Run pnpm build before creating a zip.');
}

mkdirSync(outputDirectory, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '');
const zipName = `DisBot-${timestamp}.zip`;
const output = createWriteStream(join(outputDirectory, zipName));
const archive = createArchive('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`Archive created: ${zipName}`);
    console.log(`Total bytes: ${archive.pointer()}`);
});

archive.on('warning', error => {
    if (error.code === 'ENOENT') console.warn(error.message);
    else throw error;
});

archive.on('error', error => {
    throw error;
});

archive.pipe(output);
archive.directory(distributionDirectory, 'dist');

for (const file of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'prisma.config.ts', 'tsconfig.json', '.env']) {
    const filePath = join(projectRoot, file);
    if (existsSync(filePath)) archive.file(filePath, { name: file });
}

const prismaDirectory = join(projectRoot, 'prisma');
if (existsSync(prismaDirectory)) archive.directory(prismaDirectory, 'prisma');

await archive.finalize();
