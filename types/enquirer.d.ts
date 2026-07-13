declare module 'enquirer' {
    interface Choice<T extends string> {
        name: T;
        message?: string;
    }

    interface SelectOptions<T extends string> {
        name: string;
        message: string;
        choices: Array<T | Choice<T>>;
        initial?: number;
    }

    interface InputOptions {
        name: string;
        message: string;
        initial?: string;
        validate?(value: string): boolean | string | Promise<boolean | string>;
    }

    export class Select<T extends string = string> {
        constructor(options: SelectOptions<T>);
        run(): Promise<T>;
    }

    export class Input {
        constructor(options: InputOptions);
        run(): Promise<string>;
    }

    const enquirer: {
        Input: typeof Input;
        Select: typeof Select;
    };

    export default enquirer;
}
