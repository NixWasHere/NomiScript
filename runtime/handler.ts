export class LexerError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "LexerError";
    }
}

export class ParserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ParserError";
    }
}

export class RuntimeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RuntimeError";
    }
}

export class ExprError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ExprError";
    }
}

export class EnvError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EnvError";
    }
}

// Add more error classes as needed...

export function handleError(error: Error) {
    console.error(`${error.name}: ${error.message}`);
    Deno.exit(1);
}

