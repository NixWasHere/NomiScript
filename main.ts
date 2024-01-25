import Parser from "./frontend/parser.ts";
import { createGlobalEnv } from "./runtime/environment.ts";
import { evaluate } from "./runtime/interpreter.ts";
import { tokenize } from "./frontend/lexer.ts";

const args: string[] = Deno.args;

if (args.length > 1 || args.length == 0) {
	console.error("More than one or no argument is passed. Expecting only 1 argument(ProgramName).")
	Deno.exit(1);
} else {
	const ProgramName: string = args[0];
	const _tokens = tokenize(ProgramName);

	if (ProgramName.slice(-3) == ".nm") {
		run(ProgramName);
	} else {
		console.error("File is not of type .nm(NomiScript).")
	}
}


async function run(filename: string) {
	const parser = new Parser();
	const env = createGlobalEnv();

	const input = await Deno.readTextFile(filename);
	const program = parser.produceAST(input);

	const _result = evaluate(program, env);
	
}