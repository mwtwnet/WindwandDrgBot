import fs from 'node:fs';
import path from 'node:path';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'success';
type Metadata = Record<string, unknown>;

interface Logger {
    info(message: unknown, meta?: Metadata): void;
    success(message: unknown, meta?: Metadata): void;
    warn(message: unknown, meta?: Metadata): void;
    error(message: unknown, meta?: Metadata): void;
    debug(message: unknown, meta?: Metadata): void;
    section(title: string): void;
    line(char?: string, length?: number): void;
    box(message: string, type?: LogLevel): void;
    table(data: unknown, title?: string): void;
    tree(data: unknown, title?: string): void;
    json(data: unknown, title?: string): void;
    list(items: string[], title?: string): void;
    time(label?: string): void;
    timeEnd(label?: string): void;
    saveErrorLog(error: Error | string, type?: string, additionalInfo?: Metadata): string | null;
    progress(current: number, total: number, label?: string, barLength?: number): void;
}

const tones: Record<LogLevel, { fg: string; bold: string }> = {
    error: { fg: '\x1b[91m', bold: '\x1b[1m' },
    warn: { fg: '\x1b[93m', bold: '\x1b[1m' },
    info: { fg: '\x1b[94m', bold: '\x1b[1m' },
    debug: { fg: '\x1b[90m', bold: '\x1b[1m' },
    success: { fg: '\x1b[92m', bold: '\x1b[1m' },
};

const colors = {
    white: '\x1b[97m',
    gray: '\x1b[90m',
    reset: '\x1b[0m',
};

const levelNames: Record<LogLevel, string> = {
    error: '[ error   ]',
    warn: '[ warning ]',
    info: '[ info    ]',
    debug: '[ debug   ]',
    success: '[ success ]',
};

function getTimestamp(): string {
    const now = new Date();
    return [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map(value => String(value).padStart(2, '0'))
        .join(':');
}

function formatLog(timestamp: string, level: LogLevel, message: string, meta?: Metadata): string {
    const tone = tones[level];
    const levelName = levelNames[level];
    const coloredMessage = message.startsWith('!')
        ? tone.fg + message.slice(1)
        : message;
    const metaText = meta && Object.keys(meta).length > 0
        ? `\n${JSON.stringify(meta, null, 2)}`
        : '';

    return `${colors.gray}+ ${colors.white}${timestamp} ${tone.bold}${tone.fg}${levelName} ${colors.reset}${level === 'info' ? colors.gray : tone.fg}${coloredMessage}${colors.reset}${metaText}`;
}

function writeLog(level: LogLevel, message: unknown, meta?: Metadata): void {
    console.log(formatLog(getTimestamp(), level, String(message), meta));
}

function toRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null) {
        return value as Record<string, unknown>;
    }

    return { value };
}

const timers: Record<string, number> = {};

const logger: Logger = {
    info: (message, meta) => writeLog('info', message, meta),
    success: (message, meta) => writeLog('success', message, meta),
    warn: (message, meta) => writeLog('warn', message, meta),
    error: (message, meta) => writeLog('error', message, meta),
    debug: (message, meta) => writeLog('debug', message, meta),

    section(title) {
        const separator = '═'.repeat(process.stdout.columns || 80);
        console.log(`${colors.reset}${separator}\n${title}\n${separator}${colors.reset}\n`);
    },

    line(char = '─', length = 80) {
        console.log(`${tones.info.fg}${char.repeat(length)}${colors.reset}`);
    },

    box(message, type = 'info') {
        const tone = tones[type];
        this.line();
        console.log(`${tone.fg}${tone.bold}+ ${colors.white}${getTimestamp()} ${tone.fg}${tone.bold}[ ${message} ]`);
        this.line();
    },

    table(data, title = '') {
        if (title) console.log(`\n${tones.info.fg}${tones.info.bold}📊 ${title}${colors.reset}`);
        console.table(data);
    },

    tree(data, title = '') {
        if (title) console.log(`\n${tones.success.fg}${tones.success.bold}🌳 ${title}${colors.reset}`);

        const printTree = (object: Record<string, unknown>, prefix = ''): void => {
            const entries = Object.entries(object);
            entries.forEach(([key, value], index) => {
                const isLast = index === entries.length - 1;
                const connector = isLast ? '└── ' : '├── ';
                const isBranch = typeof value === 'object' && value !== null;
                const formattedValue = isBranch ? '' : `: ${String(value)}`;
                console.log(`${prefix}${connector}${tones.info.fg}${tones.info.bold}${key}${colors.reset}${formattedValue}`);

                if (isBranch) {
                    const nested = Array.isArray(value)
                        ? Object.fromEntries(value.map((item, itemIndex) => [`[${itemIndex}]`, item]))
                        : toRecord(value);
                    printTree(nested, prefix + (isLast ? '    ' : '│   '));
                }
            });
        };

        printTree(toRecord(data));
        console.log('');
    },

    json(data, title = '') {
        if (title) console.log(`\n${tones.debug.fg}${tones.debug.bold}📋 ${title}${colors.reset}`);
        console.log(JSON.stringify(data, null, 2));
    },

    list(items, title = '') {
        if (title) console.log(`\n${tones.info.fg}${tones.info.bold}📝 ${title}${colors.reset}`);
        items.forEach((item, index) => {
            const icon = index === items.length - 1 ? '└' : '├';
            console.log(`${tones.info.fg}${icon}──${colors.reset} ${item}`);
        });
        console.log('');
    },

    time(label = 'default') {
        timers[label] = Date.now();
        this.debug(`⏱ Timer started: ${label}`);
    },

    timeEnd(label = 'default') {
        const startedAt = timers[label];
        if (startedAt === undefined) {
            this.warn(`⏱ Timer "${label}" not started`);
            return;
        }

        const duration = Date.now() - startedAt;
        const durationText = duration > 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;
        this.success(`⏱ ${label} completed, elapsed time: ${tones.info.fg}${durationText}${colors.reset}`);
        delete timers[label];
    },

    saveErrorLog(error, type = 'error', additionalInfo = {}) {
        const logDir = path.join(process.cwd(), 'log');
        fs.mkdirSync(logDir, { recursive: true });

        const now = new Date();
        const date = now.toISOString().split('T')[0] ?? 'unknown-date';
        const time = (now.toTimeString().split(' ')[0] ?? 'unknown-time').replace(/:/g, '-');
        const filename = `${date}_${time}_${type}.log`;
        const filePath = path.join(logDir, filename);
        const message = error instanceof Error
            ? `[Error Message]\n${error.message}\n\n[Error Stack]\n${error.stack ?? ''}`
            : `[Error Message]\n${error}`;
        const extra = Object.keys(additionalInfo).length > 0
            ? `\n\n[Additional Information]\n${JSON.stringify(additionalInfo, null, 2)}`
            : '';

        try {
            fs.writeFileSync(filePath, `${message}${extra}\n`, 'utf8');
            this.info(`Error log saved to: ${colors.gray}log/${filename}${colors.reset}`);
            return filePath;
        } catch (writeError) {
            this.error(`Failed to write error log: ${writeError instanceof Error ? writeError.message : String(writeError)}`);
            return null;
        }
    },

    progress(current, total, label = '', barLength = 20) {
        const percentage = (current / total) * 100;
        const filledLength = Math.round((barLength * current) / total);
        const bar = `[${'█'.repeat(filledLength)}${'░'.repeat(barLength - filledLength)}]`;
        process.stdout.write(`\r${tones.success.fg}${label ? `${label} ` : ''}${bar} ${percentage.toFixed(0).padStart(3)}%${colors.reset}`);
        if (current === total) console.log();
    },
};

export default logger;
