# Node Calculator

A calculator with a Node.js/Express backend and a vanilla HTML/CSS/JS frontend.

## How it works

- **Frontend** (`public/`) — renders the calculator UI, builds up the expression
  as you tap keys, and sends it to the backend when you press `=`.
- **Backend** (`server.js`) — an Express server that serves the frontend and
  exposes `POST /api/calculate`. It evaluates expressions with a small
  hand-written tokenizer + recursive-descent parser instead of `eval()`, so
  it only ever understands numbers, `+ - * / %`, and parentheses — nothing
  else can be injected or executed.

## Run it

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

(To use a different port: `PORT=4000 npm start`.)

## Features

- Standard operations: `+ − × ÷ %` and parentheses
- Full keyboard support (digits, operators, `Enter`/`=`, `Backspace`, `Esc`)
- Division-by-zero and malformed-expression handling, with a status message
- Graceful "offline" message if the frontend can't reach the server

## Project structure

```
calculator-app/
├── server.js          # Express server + safe expression evaluator
├── package.json
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```
