import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 9158;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * ---------------------------------------------------------------
 * Safe arithmetic evaluator
 * ---------------------------------------------------------------
 * We deliberately avoid eval() / new Function() on user input.
 * Instead we tokenize the expression and run a small recursive-
 * descent parser that only understands numbers, + - * / %, unary
 * minus, and parentheses. Anything else throws a clear error.
 *
 * Grammar:
 *   expression -> term (('+' | '-') term)*
 *   term       -> factor (('*' | '/' | '%') factor)*
 *   factor     -> ('-' | '+') factor | number | '(' expression ')'
 * ---------------------------------------------------------------
 */

function tokenize(input) {
    const tokens = [];
    let i = 0;

    while (i < input.length) {
        const ch = input[i];

        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(input[i + 1] || ''))) {
            let num = ch;
            i++;
            while (i < input.length && /[0-9.]/.test(input[i])) {
                num += input[i];
                i++;
            }
            if ((num.match(/\./g) || []).length > 1) {
                throw new Error(`Malformed number "${num}"`);
            }
            tokens.push({ type: 'NUMBER', value: parseFloat(num) });
            continue;
        }

        if ('+-*/%()'.includes(ch)) {
            tokens.push({ type: 'OP', value: ch });
            i++;
            continue;
        }

        throw new Error(`Unexpected character "${ch}"`);
    }

    return tokens;
}

function parseExpression(tokens) {
    let pos = 0;

    function peek() {
        return tokens[pos];
    }

    function consume(expected) {
        const token = tokens[pos];
        if (!token || (expected && token.value !== expected)) {
            throw new Error(expected ? `Expected "${expected}"` : 'Unexpected end of expression');
        }
        pos++;
        return token;
    }

    function parseFactor() {
        const token = peek();
        if (!token) throw new Error('Unexpected end of expression');

        if (token.type === 'OP' && (token.value === '-' || token.value === '+')) {
            consume();
            const value = parseFactor();
            return token.value === '-' ? -value : value;
        }

        if (token.type === 'NUMBER') {
            consume();
            return token.value;
        }

        if (token.type === 'OP' && token.value === '(') {
            consume('(');
            const value = parseExpr();
            consume(')');
            return value;
        }

        throw new Error(`Unexpected token "${token.value}"`);
    }

    function parseTerm() {
        let value = parseFactor();
        while (peek() && peek().type === 'OP' && ['*', '/', '%'].includes(peek().value)) {
            const op = consume().value;
            const rhs = parseFactor();
            if (op === '*') value *= rhs;
            else if (op === '/') {
                if (rhs === 0) throw new Error('Division by zero');
                value /= rhs;
            } else {
                if (rhs === 0) throw new Error('Division by zero');
                value %= rhs;
            }
        }
        return value;
    }

    function parseExpr() {
        let value = parseTerm();
        while (peek() && peek().type === 'OP' && ['+', '-'].includes(peek().value)) {
            const op = consume().value;
            const rhs = parseTerm();
            value = op === '+' ? value + rhs : value - rhs;
        }
        return value;
    }

    const result = parseExpr();
    if (pos !== tokens.length) {
        throw new Error(`Unexpected token "${tokens[pos].value}"`);
    }
    return result;
}

function safeEvaluate(expression) {
    if (typeof expression !== 'string' || !expression.trim()) {
        throw new Error('Empty expression');
    }
    if (expression.length > 200) {
        throw new Error('Expression too long');
    }
    const tokens = tokenize(expression);
    if (tokens.length === 0) {
        throw new Error('Empty expression');
    }
    const result = parseExpression(tokens);
    if (!Number.isFinite(result)) {
        throw new Error('Result is not a finite number');
    }
    return result;
}

app.post('/api/calculate', (req, res) => {
    const { expression } = req.body || {};
    try {
        const result = safeEvaluate(expression);
        res.json({ result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Calculator server running at http://localhost:${PORT}`);
});