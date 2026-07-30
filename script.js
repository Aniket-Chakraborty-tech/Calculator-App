(() => {
    const expressionEl = document.getElementById('expression');
    const resultEl = document.getElementById('result');
    const statusEl = document.getElementById('status');
    const keysEl = document.getElementById('keys');

    let expression = '';
    let justEvaluated = false;

    const OP_DISPLAY = { '*': '×', '/': '÷', '-': '−' };

    function toDisplay(expr) {
        return expr.replace(/[*/\-]/g, (m) => OP_DISPLAY[m] || m);
    }

    function formatNumber(value) {
        if (!Number.isFinite(value)) return 'Error';
        // Trim floating point noise (e.g. 0.1 + 0.2) without mangling large numbers.
        const rounded = Math.round((value + Number.EPSILON) * 1e10) / 1e10;
        return rounded.toString();
    }

    function setStatus(message) {
        statusEl.textContent = message || '';
    }

    function renderTyping() {
        expressionEl.textContent = '';
        resultEl.classList.remove('is-error');
        resultEl.textContent = expression ? toDisplay(expression) : '0';
    }

    function renderResult(evaluatedExpr, value) {
        expressionEl.textContent = `${toDisplay(evaluatedExpr)} =`;
        resultEl.classList.remove('is-error');
        resultEl.textContent = formatNumber(value);
    }

    function renderError(evaluatedExpr, message) {
        expressionEl.textContent = toDisplay(evaluatedExpr);
        resultEl.classList.add('is-error');
        resultEl.textContent = message || 'Error';
    }

    function lastChar() {
        return expression.slice(-1);
    }

    function isOperator(ch) {
        return ['+', '-', '*', '/', '%'].includes(ch);
    }

    function appendValue(value) {
        if (justEvaluated) {
            // Starting fresh after a result, unless continuing with an operator.
            if (isOperator(value)) {
                justEvaluated = false;
            } else {
                expression = '';
                justEvaluated = false;
            }
        }

        if (value === '.') {
            // Find the current number segment (after the last operator/paren) and
            // block a second decimal point within it.
            const segment = expression.split(/[+\-*/%()]/).pop();
            if (segment.includes('.')) return;
            if (segment === '') expression += '0';
        }

        if (isOperator(value)) {
            if (expression === '' && value !== '-') return; // can't start with * / %
            if (isOperator(lastChar())) {
                expression = expression.slice(0, -1) + value; // replace trailing operator
                renderTyping();
                return;
            }
        }

        if (value === '0' && expression === '0') return;
        if (expression === '0' && /[0-9]/.test(value)) {
            expression = value;
        } else {
            expression += value;
        }

        renderTyping();
    }

    function clearAll() {
        expression = '';
        justEvaluated = false;
        setStatus('');
        renderTyping();
    }

    function backspace() {
        if (justEvaluated) {
            clearAll();
            return;
        }
        expression = expression.slice(0, -1);
        renderTyping();
    }

    async function calculate() {
        const inputExpression = document.getElementById('your-input-id').value;

        try {
            const response = await fetch('/api/calculate', {
                method: 'POST', // Must be POST
                headers: {
                    'Content-Type': 'application/json'
                },
                // The backend expects { "expression": "1+1" }
                body: JSON.stringify({ expression: inputExpression })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Backend error:", data.error);
                // Display error to user
                return;
            }

            console.log("Result:", data.result);
            // Update your UI with data.result

        } catch (error) {
            console.error("Network error:", error);
        }
    }

    async function evaluate() {
        if (!expression || isOperator(lastChar())) return;

        setStatus('');
        const exprToSend = expression;

        try {
            const response = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expression: exprToSend }),
            });
            const data = await response.json();

            if (!response.ok) {
                renderError(exprToSend, 'Error');
                setStatus(data.error || 'Could not evaluate that expression');
                justEvaluated = true;
                expression = '';
                return;
            }

            renderResult(exprToSend, data.result);
            expression = formatNumber(data.result);
            justEvaluated = true;
        } catch (err) {
            setStatus('OFFLINE — is the Node server running?');
            renderError(exprToSend, 'No connection');
            justEvaluated = true;
            expression = '';
        }
    }

    function flashKey(el) {
        if (!el) return;
        el.classList.add('is-pressed');
        setTimeout(() => el.classList.remove('is-pressed'), 100);
    }

    keysEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.key');
        if (!btn) return;

        const { action, value } = btn.dataset;
        if (action === 'clear') clearAll();
        else if (action === 'backspace') backspace();
        else if (action === 'equals') evaluate();
        else if (value !== undefined) appendValue(value);
    });

    const KEY_MAP = {
        '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
        '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
        '.': '.', '+': '+', '-': '-', '*': '*', '/': '/',
        '%': '%', '(': '(', ')': ')',
    };

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === '=') {
            e.preventDefault();
            evaluate();
            flashKey(keysEl.querySelector('[data-action="equals"]'));
            return;
        }
        if (e.key === 'Backspace') {
            backspace();
            flashKey(keysEl.querySelector('[data-action="backspace"]'));
            return;
        }
        if (e.key === 'Escape') {
            clearAll();
            flashKey(keysEl.querySelector('[data-action="clear"]'));
            return;
        }
        if (KEY_MAP[e.key] !== undefined) {
            appendValue(KEY_MAP[e.key]);
            flashKey(keysEl.querySelector(`[data-value="${CSS.escape(e.key)}"]`));
        }
    });

    renderTyping();
})();