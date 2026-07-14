import fs from "fs";

type JsonObject = Record<string, unknown>;

const blockedPathSegments = new Set(['__proto__', 'prototype', 'constructor']);

function pathSegments(path: string): string[] {
    const segments = path.split('.');
    if (segments.some(segment => segment.length === 0)) {
        throw new Error(`Invalid JSON path: "${path}"`);
    }
    if (segments.some(segment => blockedPathSegments.has(segment))) {
        throw new Error(`Unsafe JSON path: "${path}"`);
    }
    return segments;
}

function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function writeJson(fileName: string, path: string, value: unknown): void {
    const file = JSON.parse(fs.readFileSync(fileName, 'utf-8')) as Record<string, unknown>;
    const segments = pathSegments(path);
    const finalSegment = segments.pop();
    if (!finalSegment) throw new Error('JSON path cannot be empty.');

    let current = file;
    for (const segment of segments) {
        const child = current[segment];
        if (child === undefined || child === null) {
            const newChild: JsonObject = {};
            current[segment] = newChild;
            current = newChild;
            continue;
        }

        if (!isJsonObject(child)) {
            throw new Error(`Cannot write "${path}": "${segment}" is not an object.`);
        }
        current = child;
    }

    current[finalSegment] = value;
    fs.writeFileSync(fileName, JSON.stringify(file, null, 4), 'utf-8');
}

function readJson(fileName: string, path: string): unknown | false {
    const file = JSON.parse(fs.readFileSync(fileName, 'utf-8')) as Record<string, unknown>;
    let current: unknown = file;

    for (const segment of pathSegments(path)) {
        if (!isJsonObject(current) || !(segment in current)) return false;
        current = current[segment];
    }

    return current ?? false;
}

/**
 * Write config
 */
export function writeConfig(path: string, value: unknown): void {
    writeJson('./config.json', path, value);
};

/**
 * Read config
 */
export function readConfig(path: string): unknown | false {
    return readJson('./config.json', path);
};

/**
 * Write language text
 */
export function writeLang(path: string, value: unknown): void {
    writeJson('./lang.json', path, value);
};

/**
 * Read language text
 */
export function readLang(path: string): unknown | false {
    return readJson('./lang.json', path);
};
