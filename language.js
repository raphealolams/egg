/*
define a function parseExpression, which takes a string as input and
returns an object containing the data structure for the expression at the
start of the string, along with the part of the string left after parsing
this expression.
*/
function parseExpression(program) {
    program = skipSpace(program);
    var match, expr;
    if (match = /^"([^"]*)"/.exec(program))
        expr = { type: "value", value: match[1] };
    else if (match = /^\d+\b/.exec(program))
        expr = { type: "value", value: Number(match[0]) };
    else if (match = /^[^\s(),"]+/.exec(program))
        expr = { type: "word", name: match[0] };
    else
        throw new SyntaxError("Unexpected syntax: " + program);

    return parseApply(expr, program.slice(match[0].length));
}

/*
Because Egg allows any amount of whitespace between its elements, we
have to repeatedly cut the whitespace off the start of the program string.
This is what the skipSpace function helps with.
*/
function skipSpace(string) {
    var first = string.search(/\S/);
    if (first == -1)
        return "";
    var skippable = string.match(/^(\s|#.*) * /);
    if (skippable)
        return string.slice(skippable[0].length);
    return string.slice(first);

}

/*
checks whether the expression is an application.
*/
function parseApply(expr, program) {
    program = skipSpace(program);
    if (program[0] != "(")
        return { expr: expr, rest: program };

    program = skipSpace(program.slice(1));
    expr = { type: "apply", operator: expr, args: [] };
    while (program[0] != ")") {
        var arg = parseExpression(program);
        expr.args.push(arg.expr);
        program = skipSpace(arg.rest);
        if (program[0] == ",")
            program = skipSpace(program.slice(1));
        else if (program[0] != ")")
            throw new SyntaxError("Expected ',' or ')' ");
    }
    return parseApply(expr, program.slice(1));
}

/*
we need to parse Egg. We wrap it in a convenient parse
function that verifies that it has reached the end of the input string after
parsing the expression (an Egg program is a single expression), and that
gives us the program’s data structure.
*/

function parse(program) {
    var result = parseExpression(program);
    if (skipSpace(result.rest).length > 0)
        throw new SyntaxError("Unexpexted text After Program");
    return result.expr;
}

/*

*/
function evaluate(expr, env) {
    switch (expr.type) {
        case "value":
            return expr.value;
        case "word":
            if (expr.name in env)
                return env[expr.name];
            else
                throw new ReferenceError("Undefined variable : " + expr.name)
        case "apply":
            if (expr.operator.type == "word" && expr.operator.name in specialForms)
                return specialForms[expr.operator.name](expr.args, env);
            var op = evaluate(expr.operator, env);
            if (typeof op != "function")
                throw new TypeError("Applying a Non-function");
            return op.apply(null, expr.args.map(function(arg) {
                return evaluate(arg, env);
            }))
    }
}

var specialForms = Object.create(null);

specialForms["if"] = function(args, env) {
    if (args.length != 3)
        throw new SyntaxError("Bad number of args to if");

    if (evaluate(args[0], env) !== false)
        return evaluate(args[1], env);
    else
        return evaluate(args[2], env);
};

specialForms["while"] = function(args, env) {
    if (args.length != 2)
        throw new SyntaxError("Bad number of args to while");

    while (evaluate(args[0], env) !== false)
        evaluate(args[1], env);

    // Since undefined does not exist in Egg, we return false,
    // for lack of a meaningful result.
    return false;
};

specialForms["do"] = function(args, env) {
    var value = false;
    args.forEach(function(arg) {
        value = evaluate(arg, env);
    });
    return value;
};

specialForms["define"] = function(args, env) {
    if (args.length != 2 || args[0].type != "word")
        throw new SyntaxError("Bad use of define");
    var value = evaluate(args[1], env);
    env[args[0].name] = value;
    return value;
};

specialForms["set"] = function(args, env) {
    if (args.length != 2 || args[0].type != "word")
        throw new SyntaxError("Bad Use of Set");
    var varName = args[0].name;
    var value = evaluate(args[1], env);
    for (var scope = env; scope; scope = Object.getPrototypeOf(scope)) {
        if (Object.prototype.hasOwnProperty.call(scope, varName)) {
            scope[varName] = value;
            return value;
        }
    }
    throw new ReferenceError("Setting Undefined Variable:" + varName)
}

specialForms["fun"] = function(args, env) {
    if (!args.length)
        throw new SyntaxError("Functions need a body");

    function name(expr) {
        if (expr.type != "word")
            throw new SyntaxError("Arg names must be words");
        return expr.name;
    }
    var argNames = args.slice(0, args.length - 1).map(name);
    var body = args[args.length - 1];

    return function() {
        if (arguments.length != argNames.length)
            throw new TypeError("Wrong number of arguments");
        var localEnv = Object.create(env);
        for (var i = 0; i < arguments.length; i++)
            localEnv[argNames[i]] = arguments[i];
        return evaluate(body, localEnv);
    };
};

var topEnv = Object.create(null);

topEnv["false"] = false;
topEnv['true'] = true;

/*
To supply basic arithmetic and comparison operators,
*/
["+", "-", "*", "/", "==", "<", ">"].forEach(function(op) {
    topEnv[op] = new Function("a, b", "return a " + op + " b;");
});

/*
Array
*/
topEnv["array"] = function() {
    return Array.prototype.slice.call(arguments, 0);
}

/*
Length Of Array
*/
topEnv["length"] = function(array) {
    return array.length;
}

/*
Element Of Array
*/
topEnv["element"] = function(array, i) {
    return array[i];
}

/*
output values
*/
topEnv["print"] = function(value) {
    console.log(value);
    return value;
};

/*
The following run function provides a convenient way to write and run them.
It creates a fresh environment and parses and evaluates the strings we
give it as a single program.
*/
function run() {
    var env = Object.create(topEnv);
    var program = Array.prototype.slice.call(arguments, 0).join("\n");
    return evaluate(parse(program), env);
}