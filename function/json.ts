import fs from "fs";

function writeJson(fileName: string, name: string, value: unknown): void {
    const file = JSON.parse(fs.readFileSync(fileName, 'utf-8')) as Record<string, unknown>;
    file[name] = value;
    fs.writeFileSync(fileName, JSON.stringify(file, null, 4), 'utf-8');
}

function readJson(fileName: string, name: string): unknown | false {
    const file = JSON.parse(fs.readFileSync(fileName, 'utf-8')) as Record<string, unknown>;
    return file[name] ?? false;
}

/**
 * Write config
 * @param {string} name
 * @param {any} value
 */
export function writeConfig(name: string, value: unknown): void {
    writeJson('./config.json', name, value);
};

/**
 * Read config
 * @param {string} name
 * @returns {any}
 */
export function readConfig(name: string): unknown | false {
    return readJson('./config.json', name);
};

/**
 * Write language text
 * @param {string} name
 * @param {any} value
 */
export function writeLang(name: string, value: unknown): void {
    writeJson('./lang.json', name, value);
};

/**
 * Read language text
 * @param {string} name
 * @returns {any}
 */
export function readLang(name: string): unknown | false {
    return readJson('./lang.json', name);
};
