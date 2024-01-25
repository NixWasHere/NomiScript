import { 
	NumberVal, 
	StringVal, 
	RuntimeVal, 
	ArrayVal ,
} from "./values.ts";
import {
	AssignmentExpr,
	BinaryExpr,
	MemberExpr,
	CallExpr,
	FunctionDeclaration,
	Identifier,
	NumericLiteral,
	StringLiteral,
	ObjectLiteral,
	Program,
	Stmt,
	VarDeclaration,
  	ArrayDeclaration,
} from "../frontend/ast.ts";
import Environment from "./environment.ts";
import {
	eval_function_declaration,
	eval_program,
	eval_var_declaration,
} from "./eval/statements.ts";
import {
	eval_assignment,
	eval_binary_expr,
	eval_call_expr,
	eval_identifier,
	eval_object_expr,
	eval_member_expr,
} from "./eval/expressions.ts";

export function evaluate(astNode: Stmt, env: Environment): RuntimeVal {

	switch (astNode.kind) {

		case "NumericLiteral":
			return {
				value: (astNode as NumericLiteral).value,
				type: "number",
			} as NumberVal;

		case "StringLiteral":
			return {
				value: (astNode as StringLiteral).value,
				type: "string",
			} as StringVal;

		case "Identifier":
			return eval_identifier(astNode as Identifier, env);

		case "ObjectLiteral":
			return eval_object_expr(astNode as ObjectLiteral, env);

		case "CallExpr":
			return eval_call_expr(astNode as CallExpr, env);

		case "AssignmentExpr":
			return eval_assignment(astNode as AssignmentExpr, env);

		case "BinaryExpr":
			return eval_binary_expr(astNode as BinaryExpr, env);

		case "MemberExpr":
			return eval_member_expr(astNode as MemberExpr, env);

		case "Program":
			return eval_program(astNode as Program, env);

		// Handle statements
		case "VarDeclaration":
			return eval_var_declaration(astNode as VarDeclaration, env);

		case "FunctionDeclaration":
			return eval_function_declaration(astNode as FunctionDeclaration, env);

		case "ArrayDeclaration": {
			const arrayLiteral = astNode as ArrayDeclaration;
			const evaluatedElements = arrayLiteral.elements.map(element => evaluate(element, env));
			return {
				type: "array",
				elements: evaluatedElements,
			} as ArrayVal;
		}
		case "Read": {
			const userInput = prompt('');
		
			if (userInput === null) {
				// User canceled input
				console.error("Read operation canceled by the user.");
				Deno.exit(0);
			}
		
			return {
				type: "string",
				value: userInput,
			} as StringVal;
		}
		
		// Handle unimplimented ast types as error.
		default:
			console.error(
				"This AST Node has not yet been setup for interpretation.\n",
				astNode
			);
			Deno.exit(0);
	}
}