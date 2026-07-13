import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isModuleFile } from './modules.js';
import type { BotTrigger, LoadedTrigger } from '../types/framework.js';

export async function loadTriggers(): Promise<Record<string, LoadedTrigger>> {
    const triggers: Record<string, LoadedTrigger> = {};
    const triggerRoot = join(import.meta.dirname, '..', 'trigger');

    for (const folder of readdirSync(triggerRoot)) {
        const folderPath = join(triggerRoot, folder);
        const files = readdirSync(folderPath).filter(isModuleFile);

        for (const file of files) {
            const filePath = join(folderPath, file);
            const { default: trigger } = await import(pathToFileURL(filePath).href) as { default: BotTrigger };
            triggers[trigger.customId] = {
                trigger,
                admin: file.includes('[admin]'),
            };
        }
    }

    return triggers;
}
