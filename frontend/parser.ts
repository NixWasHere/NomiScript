// deno-lint-ignore-file
import {
	AssignmentExpr,
	BinaryExpr,
	CallExpr,
	Expr,
	Identifier,
	MemberExpr,
	NumericLiteral,
	StringLiteral,
	ArrayDeclaration,
	ObjectLiteral,
	Program,
	Property,
	Stmt,
	Read,
	VarDeclaration,
	FunctionDeclaration,
} from "./ast.ts";
import { Token, tokenize, TokenType } from "./lexer.ts";
import { ParserError, handleError } from "../runtime/handler.ts";
import { eval_var_declaration } from "../runtime/eval/statements.ts";

export default class Parser {
	private tokens: Token[] = [];

	/*
	 * Determines if the parsing is complete and the END OF FILE Is reached.
	 */
	private not_eof(): boolean {
		return this.tokens[0].type != TokenType.EOF;
	}

	/**
	 * Returns the currently available token
	 */
	private at() {
		return this.tokens[0] as Token;
	}

	/**
	 * Returns the previous token and then advances the tokens array to the next value.
	 */
	private eat() {
		const prev = this.tokens.shift() as Token;
		return prev;
	}

	// Check if the current token matches the expected type
    private match(expectedType: TokenType): boolean {
        return this.tokens.length > 0 && this.tokens[0].type === expectedType;
    }

	/**
	 * Returns the previous token and then advances the tokens array to the next value.
	 *  Also checks the type of expected token and throws if the values dont match.
	 */
	private expect(type: TokenType, err: any) {
		const current = this.at();
	  
		if (current.type !== type) {
		  handleError(new ParserError(`${err} Expecting: ${TokenType[type]}. Got: ${TokenType[current.type]}.`));
		}
	  
		this.eat(); // Consume the expected token
		return current;
	  }

	public produceAST(sourceCode: string): Program {
		this.tokens = tokenize(sourceCode);
		const program: Program = {
			kind: "Program",
			body: [],
		};

		// Parse until end of file
		while (this.not_eof()) {
			program.body.push(this.parse_stmt());
		}

		return program;
	}

	// Handle complex statement types
	private parse_stmt(): Stmt {
		switch (this.at().type) {
		  case TokenType.Let:
		  case TokenType.Const:
			return this.parse_var_declaration();
		  case TokenType.Fn:
			return this.parse_func_declaration();
		  case TokenType.Read:
			this.eat(); // Consume the "Read" token
			return this.parse_read(); // Parse the read statement
		  default:
			const statement = this.parse_expr();
	  
			// Check for semicolon after each statement
			if (this.at().type == TokenType.Semicolon) {
			  this.eat(); // Consume the semicolon
			}
	  
			return statement;
		}
	  }
	
	parse_func_declaration(): Stmt {
		this.eat(); // eat func keyword
		const name = this.expect(
			TokenType.Identifier,
			"Expected function name following func keyword"
		).value;

		const args = this.parse_args();
		const params: string[] = [];
		for (const arg of args) {
			if (arg.kind !== "Identifier") {
				console.log(arg);
				handleError(new ParserError ("Inside function declaration expected parameters to be of type string."));
			}

			params.push((arg as Identifier).symbol);
		}

		this.expect(
			TokenType.OpenBrace,
			"Expected function body following declaration"
		);
		const body: Stmt[] = [];

		while (
			this.at().type !== TokenType.EOF &&
			this.at().type !== TokenType.CloseBrace
		) {
			body.push(this.parse_stmt());
		}

		this.expect(
			TokenType.CloseBrace,
			"Closing brace expected inside function declaration"
		);

		const func = {
			body,
			name,
			parameters: params,
			kind: "FunctionDeclaration",
		} as FunctionDeclaration;

		return func;
	}

	private parse_read(): Read {
		const variable = this.expect(TokenType.Identifier, "Expected an identifier after 'read'").value;
		this.expect(TokenType.Semicolon, "Expected a semicolon after 'read'");
		
		return {
			kind: "Read",
			variable,
			value: "string",
		};
	}
	
	  
	  private parse_read_var_declaration(isConstant: boolean, identifier: string): Stmt {
		this.eat(); // consume 'read'
		this.expect(
		  TokenType.Semicolon,
		  "Expected a semicolon after 'read' in variable declaration."
		);
	  
		return {
		  kind: "VarDeclaration",
		  identifier,
		  constant: isConstant,
		  value: {
			kind: "Read",
			variable: identifier,
		  },
		} as VarDeclaration;
	  }

	  parse_var_declaration(): Stmt {
		const isConstant = this.eat().type == TokenType.Const;
		const identifier = this.expect(
		  TokenType.Identifier,
		  "Expected identifier name following let | const keywords."
		).value;
	  
		if (this.match(TokenType.Equals)) {
		  this.eat(); // consume equals
	  
		  if (this.match(TokenType.Read)) {
			// Handle read statement
			return this.parse_read_var_declaration(isConstant, identifier);
		  } else {
			// Handle regular assignment
			const declaration = {
			  kind: "VarDeclaration",
			  value: this.parse_expr(),
			  identifier,
			  constant: isConstant,
			} as VarDeclaration;
	  
			this.expect(
			  TokenType.Semicolon,
			  "Variable declaration statement must end with ';'."
			);
	  
			return declaration;
		  }
		} else {
		  // No assignment, just variable declaration
		  this.expect(
			TokenType.Semicolon,
			"Variable declaration statement must end with ';'."
		  );
	  
		  if (isConstant) {
			handleError(
			  new ParserError(
				"Must assign value to constant expression. No value provided."
			  )
			);
		  }
	  
		  return {
			kind: "VarDeclaration",
			identifier,
			constant: false,
		  } as VarDeclaration;
		}
	  }
	  

	private parse_array_literal_elements(): Expr[] {
		const elements: Expr[] = [];
	
		// Check for the opening '['
		if (!this.match(TokenType.OpenBracket)) {
			console.error("Expected an opening bracket '['");
			Deno.exit(1);
		}
	
		// Consume the opening '['
		this.eat();
	
		// Parse elements inside the array
		while (this.tokens.length > 0 && !this.match(TokenType.CloseBracket)) {
			elements.push(this.parse_expr());
	
			// Optional: Check for a comma ',' to separate elements
			if (this.match(TokenType.Comma)) {
				this.eat();
			}
		}
	
		// Check for the closing ']'
		if (!this.match(TokenType.CloseBracket)) {
			console.error("Expected a closing bracket ']'");
			Deno.exit(1);
		}
	
		// Consume the closing ']'
		this.eat();
	
		return elements;
	}

	private parse_array_declaration(): ArrayDeclaration {
		const isConstant = false; // Set this based on your array declaration syntax
		const identifier = "example"; // Set this based on your array declaration syntax
		const elements = this.parse_array_literal_elements();
	
		return {
			kind: "ArrayDeclaration",
			constant: isConstant,
			identifier,
			elements,
		};
	}
	
	
	private parse_expr(): Expr {
		// Check for read function
		if (this.match(TokenType.Read)) {
			return this.parse_read();
		}
	
		// Check for array declaration
		if (this.match(TokenType.OpenBracket)) {
			return this.parse_array_declaration();
		}
	
		// If not an array declaration or read function, proceed with assignment expressions
		return this.parse_assignment_expr();
	}
	
	

	private parse_assignment_expr(): Expr {
		const left = this.parse_object_expr();
	
		if (this.at().type == TokenType.Equals) {
			this.eat(); // advance past equals
			const value = this.parse_assignment_expr();
			return { value, assigne: left, kind: "AssignmentExpr" } as AssignmentExpr;
		}
	
		return left;
	}

	private parse_object_expr(): Expr {
		// { Prop[] }
		if (this.at().type !== TokenType.OpenBrace) {
			return this.parse_comparison_expr();
		}

		this.eat(); // Advance past open brace.
		const properties = new Array<Property>();

		while (this.not_eof() && this.at().type != TokenType.CloseBrace) {
			const key = this.expect(
				TokenType.Identifier,
				"Object literal key expected"
			).value;

			// Allows shorthand key: pair -> { key, }
			if (this.at().type == TokenType.Comma) {
				this.eat(); // advance past comma
				properties.push({ key, kind: "Property" } as Property);
				continue;
			} // Allows shorthand key: pair -> { key }
			else if (this.at().type == TokenType.CloseBrace) {
				properties.push({ key, kind: "Property" });
				continue;
			}

			// { key: val }
			this.expect(
				TokenType.Colon,
				"Missing ':' following identifier in ObjectExpr"
			);
			const value = this.parse_expr();

			properties.push({ kind: "Property", value, key });
			if (this.at().type != TokenType.CloseBrace) {
				this.expect(
					TokenType.Comma,
					"Expected ',' or ')' following property"
				);
			}
		}

		this.expect(TokenType.CloseBrace, "Object literal missing '}'.");
		return { kind: "ObjectLiteral", properties } as ObjectLiteral;
	}

	private parse_comparison_expr(): Expr {
		let left = this.parse_additive_expr();
		console.log(this.at().value);

		while (
			this.at().value == "<" || 
			this.at().value == ">"
			) {
			const operator = this.eat().value;
			const right = this.parse_additive_expr();
			left = {
				kind: "BinaryExpr",
				left,
				right,
				operator
			} as BinaryExpr;
		}

		return left;
	}

	// Handle Addition & Subtraction Operations
	private parse_additive_expr(): Expr {
		let left = this.parse_multiplicitave_expr();

		while (this.at().value == "+" || this.at().value == "-") {
			const operator = this.eat().value;
			const right = this.parse_multiplicitave_expr();
			left = {
				kind: "BinaryExpr",
				left,
				right,
				operator,
			} as BinaryExpr;
		}

		return left;
	}

	// Handle Multiplication, Division & Modulo Operations
	private parse_multiplicitave_expr(): Expr {
		let left = this.parse_call_member_expr();

		while (
			this.at().value == "/" ||
			this.at().value == "*" ||
			this.at().value == "%"
		) {
			const operator = this.eat().value;
			const right = this.parse_call_member_expr();
			left = {
				kind: "BinaryExpr",
				left,
				right,
				operator,
			} as BinaryExpr;
		}

		return left;
	}

	// foo.x()()
	private parse_call_member_expr(): Expr {
		const member = this.parse_member_expr();

		if (this.at().type == TokenType.OpenParen) {
			return this.parse_call_expr(member);
		}

		return member;
	}

	private parse_call_expr(caller: Expr): Expr {
		let call_expr: Expr = {
			kind: "CallExpr",
			caller,
			args: this.parse_args(),
		} as CallExpr;

		if (this.at().type == TokenType.OpenParen) {
			call_expr = this.parse_call_expr(call_expr);
		}

		return call_expr;
	}

	private parse_args(): Expr[] {
		this.expect(TokenType.OpenParen, "Expected '('.");
		const args =
			this.at().type == TokenType.CloseParen ? [] : this.parse_arguments_list();

		this.expect(
			TokenType.CloseParen,
			"Missing ')' inside arguments list."
		);
		return args;
	}

	private parse_arguments_list(): Expr[] {
		const args = [this.parse_assignment_expr()];

		while (this.at().type == TokenType.Comma && this.eat()) {
			args.push(this.parse_assignment_expr());
		}

		return args;
	}

	private parse_member_expr(): Expr {
		let object = this.parse_primary_expr();
	
		while (
			this.at().type == TokenType.Dot ||
			this.at().type == TokenType.OpenBracket
		) {
			const operator = this.eat();
			let property: Expr;
			let computed: boolean;
	
			// non-computed values aka obj.expr
			if (operator.type == TokenType.Dot) {
				computed = false;
				// get identifier
				property = this.parse_primary_expr();
				if (property.kind != "Identifier") {
					handleError(new ParserError (`Cannot use '.' operator without right hand side being an identifier.`));
				}
			} else {
				// this allows obj[computedValue]
				computed = true;
				property = this.parse_expr();
				this.expect(
					TokenType.CloseBracket,
					"Missing ']' in computed value."
				);
			}
	
			// Use type assertion to inform TypeScript that property has a value property
			const numericProperty = property as NumericLiteral;
	
			object = {
				kind: "MemberExpr",
				object,
				property: numericProperty,
				computed,
			} as MemberExpr;
		}
	
		return object;
	}


	// Parse Literal Values & Grouping Expressions
	private parse_primary_expr(): Expr {
		const tk = this.at().type;

		// Determine which token we are currently at and return literal value
		switch (tk) {
			// User defined values.
			case TokenType.Identifier:
				return { kind: "Identifier", symbol: this.eat().value } as Identifier;

			// Constants and Numeric Constants
			case TokenType.Number:
				return {
					kind: "NumericLiteral",
					value: parseFloat(this.eat().value),
				} as NumericLiteral;

			case TokenType.String:
				return {
					kind: "StringLiteral",
					value: this.eat().value,
				} as StringLiteral;

			// Grouping Expressions
			case TokenType.OpenParen: {
				this.eat(); // eat the opening paren
				const value = this.parse_expr();
				this.expect(
					TokenType.CloseParen,
					"Unexpected token found inside parenthesised expression. Expected '}'."
				); // closing paren
				return value;
			}

			// Unidentified Tokens and Invalid Code Reached
			default:
				console.error("Unexpected token found during parsing!", this.at());
				Deno.exit(1);
		}
	}
}
