export const moduleExtension = import.meta.url.endsWith('.ts') ? '.ts' : '.js';

export function isModuleFile(fileName: string): boolean {
    return fileName.endsWith(moduleExtension);
}

export function moduleIndexFile(): string {
    return `index${moduleExtension}`;
}
