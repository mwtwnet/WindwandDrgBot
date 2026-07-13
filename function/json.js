import fs from "fs";

function writeJson(fileName, name, value) {
    const file = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
    file[name] = value;
    fs.writeFileSync(fileName, JSON.stringify(file, null, 4), 'utf-8');
}

function readJson(fileName, name) {
    const file = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
    return file[name] ?? false;
}

/**
 * Write config
 * @param {string} name
 * @param {any} value
 */
export function writeConfig(name, value) {
    writeJson('./config.json', name, value);
};

/**
 * Read config
 * @param {string} name
 * @returns {any}
 */
export function readConfig(name) {
    return readJson('./config.json', name);
};

/**
 * Write language text
 * @param {string} name
 * @param {any} value
 */
export function writeLang(name, value) {
    writeJson('./lang.json', name, value);
};

/**
 * Read language text
 * @param {string} name
 * @returns {any}
 */
export function readLang(name) {
    return readJson('./lang.json', name);
};
