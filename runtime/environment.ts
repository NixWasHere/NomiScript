import {
	MK_BOOL,
	MK_NATIVE_FN,
	MK_NULL,
	MK_NUMBER,
	RuntimeVal,
} from "./values.ts";
import { EnvError, handleError } from "./handler.ts";

function formatArray(elements: RuntimeVal[]): string {
    return `[${elements.map(element => formatElement(element)).join(", ")}]`;
}

function formatElement(element: RuntimeVal | unknown): string {
    if (typeof element === 'object' && element !== null) {
        const obj = element as Record<string, unknown>;
        if ('value' in obj && typeof obj.value !== 'undefined' && obj.value !== null) {
            return obj.value.toString();
        } else if ('elements' in obj && Array.isArray(obj.elements)) {
            // Handle ArrayDeclaration separately
            return `[${obj.elements.map(el => formatElement(el)).join(", ")}]`;
        }
    }
    return JSON.stringify(element, (key, value) => (key !== 'type' ? value : undefined));
}


export function createGlobalEnv() {
	const env = new Environment();
	// Create Default Global Enviornment
	env.declareVar("true", MK_BOOL(true), true);
	env.declareVar("false", MK_BOOL(false), true);
	env.declareVar("null", MK_NULL(), true);

	// Define a native builtin method
	env.declareVar(
        "print",
        MK_NATIVE_FN((args, _scope) => {
            let output = "";
    
            for (const arg of args) {
                if (arg === undefined) {
                    console.error("Error: Undefined value encountered during evaluation.");
                } else if (Array.isArray(arg)) {
                    output += formatArray(arg); // Format arrays
                } else if (typeof arg === 'object' && arg !== null) {
                    output += formatElement(arg); // Format individual elements
                } else {
                    output += arg; // Directly append non-objects
                }
            }
			
			console.log(output);
            return MK_NULL();
        }),
        true
    );
	

	function timeFunction(_args: RuntimeVal[], _env: Environment) {
		return MK_NUMBER(Date.now());
	}

	env.declareVar("time", MK_NATIVE_FN(timeFunction), true);

	return env;
}

export default class Environment {
	private parent?: Environment;
	private variables: Map<string, RuntimeVal>;
	private constants: Set<string>;

	constructor(parentENV?: Environment) {
		const _global = parentENV ? true : false;
		this.parent = parentENV;
		this.variables = new Map();
		this.constants = new Set();
	}

	public declareVar(
		varname: string,
		value: RuntimeVal,
		constant: boolean
	): RuntimeVal {
		if (this.variables.has(varname)) {
			handleError(new EnvError(`Cannot declare variable ${varname}. As it already is defined.`));
		}

		this.variables.set(varname, value);
		if (constant) {
			this.constants.add(varname);
		}
		return value;
	}

	public assignVar(varname: string, value: RuntimeVal): RuntimeVal {
		const env = this.resolve(varname);

		// Cannot assign to constant
		if (env.constants.has(varname)) {
			handleError(new EnvError(`Cannot reasign to variable ${varname} as it was declared constant.`));
		}

		env.variables.set(varname, value);
		return value;
	}

	public lookupVar(varname: string): RuntimeVal {
		const env = this.resolve(varname);
		return env.variables.get(varname) as RuntimeVal;
	}

	public resolve(varname: string): Environment {
		if (this.variables.has(varname)) {
			return this;
		}
	
		if (this.parent === undefined) {
			// Throw an error if this.parent is undefined
			handleError(new EnvError(`Cannot resolve '${varname}' as it does not exist.`));

			return this;
		}
	
		// At this point, TypeScript knows that 'this.parent' is not undefined
		return this.parent.resolve(varname);
	}
	
}