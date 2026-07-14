export interface CommandTree {
    [name: string]: string | CommandTree;
}

export interface CommandEntry {
    name: string;
    description: string;
}

function flattenCommands(tree: CommandTree, parent: string[] = []): CommandEntry[] {
    const commands: CommandEntry[] = [];

    for (const [name, value] of Object.entries(tree)) {
        const path = [...parent, name];
        if (typeof value === 'string') {
            commands.push({ name: path.join('.'), description: value });
        } else {
            commands.push(...flattenCommands(value, path));
        }
    }

    return commands;
}

function editDistance(left: string, right: string): number {
    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
        const current = [leftIndex];

        for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
            const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
            current[rightIndex] = Math.min(
                (current[rightIndex - 1] ?? 0) + 1,
                (previous[rightIndex] ?? 0) + 1,
                (previous[rightIndex - 1] ?? 0) + substitutionCost,
            );
        }

        previous = current;
    }

    return previous[right.length] ?? right.length;
}

export function findSimilarCommands(tree: CommandTree, command: string, root: string | undefined): CommandEntry[] {
    if (!root) return [];

    return flattenCommands(tree)
        .filter(candidate => candidate.name.split('.')[0] === root)
        .map(candidate => ({
            ...candidate,
            distance: editDistance(command, candidate.name),
        }))
        .filter(candidate => candidate.distance / Math.max(command.length, candidate.name.length) <= 0.4)
        .sort((left, right) => left.distance - right.distance || left.name.localeCompare(right.name))
        .slice(0, 3);
}
