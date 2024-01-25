import {
	AssignmentExpr,
	MemberExpr,
	BinaryExpr,
	CallExpr,
	Identifier,
	ObjectLiteral,
} from "../../frontend/ast.ts";
import Environment from "../environment.ts";
import { evaluate } from "../interpreter.ts";
import { StringVal, ArrayVal } from "../values.ts";
import {
	FunctionValue,
	MK_NULL,
	NativeFnValue,
	NumberVal,
	ObjectVal,
	RuntimeVal,
} from "../values.ts";
import { ExprError, handleError } from "../handler.ts";

function eval_numeric_binary_expr(
	lhs: NumberVal,
	rhs: NumberVal,
	operator: string
): NumberVal {
	let result: number;

	if (operator == "+") {
		result = lhs.value + rhs.value;
	} else if (operator == "-") {
		result = lhs.value - rhs.value;
	} else if (operator == "*") {
		result = lhs.value * rhs.value;
	} else if (operator == "/") {
		// TODO: Division by zero checks
		result = lhs.value / rhs.value;
	} else {
		result = lhs.value % rhs.value;
	}

	return { value: result, type: "number" };
}

function eval_string_binary_expr(
	lhs: StringVal,
	rhs: StringVal,
	operator: string
): StringVal {
	let result: string;

	if (operator == "+") {
		result = lhs.value + rhs.value;
	} else {
		result = "";
		handleError(new ExprError(`Unsupported string operator: ${operator}`));
	}

	return { value: result, type: "string" };
}

export function eval_member_expr(memberExpr: MemberExpr, env: Environment): RuntimeVal {
    const array = evaluate(memberExpr.object, env) as ArrayVal;
    const index = evaluate(memberExpr.property, env) as NumberVal;

    if (array.type === "array" && index.type === "number") {
        const arrayIndex = Math.floor(index.value);
        if (arrayIndex >= 0 && arrayIndex < array.elements.length) {
            return array.elements[arrayIndex];
        } else {
            handleError(new ExprError("Array index out of bounds"));
        }
    } else {
        handleError(new ExprError("Invalid array or index"));
    }
	return MK_NULL();
}

/**
 * Evaulates expressions following the binary operation type.
 */
export function eval_binary_expr(
	binop: BinaryExpr,
	env: Environment
): RuntimeVal {
	const lhs = evaluate(binop.left, env);
	const rhs = evaluate(binop.right, env);

	// Numeric operations
	if (lhs.type == "number" && rhs.type == "number") {
		return eval_numeric_binary_expr(
			lhs as NumberVal,
			rhs as NumberVal,
			binop.operator
		);
	}

	// String operations
	if (lhs.type == "string" && rhs.type == "string") {
		return eval_string_binary_expr(
			lhs as StringVal,
			rhs as StringVal,
			binop.operator
		);
	}

	// One or both are NULL
	return MK_NULL();
}

export function eval_identifier(
	ident: Identifier,
	env: Environment
): RuntimeVal {
	const val = env.lookupVar(ident.symbol);

	return val;
}

export function eval_assignment(
	node: AssignmentExpr,
	env: Environment
): RuntimeVal {
	if (node.assigne.kind !== "Identifier") {
		handleError(new ExprError(`Invalid LHS inside assignment expr ${JSON.stringify(node.assigne)}`));
	}

	const varname = (node.assigne as Identifier).symbol;
	return env.assignVar(varname, evaluate(node.value, env));
}

export function eval_object_expr(
	obj: ObjectLiteral,
	env: Environment
): RuntimeVal {
	const object = { type: "object", properties: new Map() } as ObjectVal;
	for (const { key, value } of obj.properties) {
		const runtimeVal =
			value == undefined ? env.lookupVar(key) : evaluate(value, env);

		object.properties.set(key, runtimeVal);
	}

	return object;
}

export function eval_call_expr(expr: CallExpr, env: Environment): RuntimeVal {
	const args = expr.args.map((arg) => evaluate(arg, env));
	const fn = evaluate(expr.caller, env);

	if (fn.type == "native-fn") {
		const result = (fn as NativeFnValue).call(args, env);
		return result;
	}

	if (fn.type == "function") {
		const func = fn as FunctionValue;
		const scope = new Environment(func.declarationEnv);

		// Create the variables for the parameters list
		for (let i = 0; i < func.parameters.length; i++) {
			// TODO Check the bounds here.
			// verify arity of function
			const varname = func.parameters[i];
			scope.declareVar(varname, args[i], false);
		}

		let result: RuntimeVal = MK_NULL();
		// Evaluate the function body line by line
		for (const stmt of func.body) {
			result = evaluate(stmt, scope);
		}

		return result;
	}

	handleError(new ExprError("Cannot call value that is not a function: " + JSON.stringify(fn)));
	return MK_NULL();
}