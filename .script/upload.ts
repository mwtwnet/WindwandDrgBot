import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

interface ZipFile {
    name: string;
    path: string;
    modifiedAt: number;
    size: number;
}

interface TmpfilesResponse {
    status?: string;
    data?: { url?: string };
}

const zipDirectory = join(import.meta.dirname, '..', 'zips');
const uploadUrl = 'https://tmpfiles.org/api/v1/upload';

async function getLatestZipFile(directory: string): Promise<ZipFile> {
    const entries = await readdir(directory, { withFileTypes: true });
    const zipFiles = entries.filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.zip'));
    let latest: ZipFile | undefined;

    for (const file of zipFiles) {
        const filePath = join(directory, file.name);
        const fileStats = await stat(filePath);
        if (!latest || fileStats.mtimeMs > latest.modifiedAt) {
            latest = {
                name: file.name,
                path: filePath,
                modifiedAt: fileStats.mtimeMs,
                size: fileStats.size,
            };
        }
    }

    if (!latest) throw new Error(`No .zip files found in ${directory}`);
    return latest;
}

function toDirectDownloadUrl(url: string): string {
    return url.replace(/^https?:\/\/tmpfiles\.org\//i, 'https://tmpfiles.org/dl/');
}

async function uploadFile(file: ZipFile): Promise<{ pageUrl: string; directUrl: string }> {
    const bytes = new Uint8Array(await readFile(file.path));
    const formData = new FormData();
    formData.append('file', new Blob([bytes], { type: 'application/zip' }), file.name);

    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: { 'User-Agent': 'ZipUploader/1.0' },
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Upload failed (${response.status} ${response.statusText}): ${body}`);

    const parsed = JSON.parse(body) as TmpfilesResponse;
    const pageUrl = parsed.data?.url;
    if (parsed.status !== 'success' || !pageUrl) {
        throw new Error(`Upload did not return a valid URL: ${body.trim()}`);
    }

    return { pageUrl, directUrl: toDirectDownloadUrl(pageUrl) };
}

async function main(): Promise<void> {
    const latest = await getLatestZipFile(zipDirectory);
    console.log(`Latest zip: ${latest.name}`);
    console.log(`Size: ${latest.size} bytes`);

    const result = await uploadFile(latest);
    console.log(`Uploaded URL: ${result.pageUrl}`);
    console.log(`Direct URL: ${result.directUrl}`);
}

void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
