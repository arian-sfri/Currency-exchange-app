# Currency Exchange API

A small REST API that converts monetary amounts between currencies using static exchange rates. Built with Node.js and Express.

An optional React frontend is available as well but the REST API can be ran and tested separately.

## Prequisites

- Node.js 20 or newer (`node -v` to check)
- npm

## Getting started (API/backend)

```bash
cd backend
npm install
npm start
```

The server listens on `http://localhost:3000`. To use another port:

```bash
PORT=4000 npm start
```

For development with automatic restart on file changes:

```bash
npm run dev
```

## Running the tests

```bash
cd backend
npm test
```

Tests use [Jest](https://jestjs.io/) and [Supertest](https://github.com/ladjs/supertest):

- `tests/converter.test.js`: conversion logic (all currency pairs, rounding, case handling, unsupported currencies)
- `tests/validate.test.js`: request validation
- `tests/api.test.js`: HTTP (status codes, response shapes, errors)

### Frontend Setup + Testing

```bash
cd frontend
npm install
npm test
```

Tests use [Vitest](https://vitest.dev/) and React Testing Library, with
`fetch` mocked so no backend needs to be running.

## Exchange rates

Base currency is CAD (1 CAD = rate units of the currency).

| Currency | Rate |
|---|---|
| CAD | 1.00 |
| USD | 0.72 |
| EUR | 0.66 |
| GBP | 0.57 |
| AUD | 1.09 |
| JPY | 109.50 |

Conversions between any two currencies go through CAD:

```
exchangeRate = rates[to] / rates[from]
convertAmount = amount * exchangeRate
```

## API

### `POST /convert`

Request:

```json
{
    "from": "CAD",
    "to": "USD",
    "amount": 100.00
}
```

Success response (`200`):

```json
{
    "from": "CAD",
    "to": "USD",
    "originalAmount": 100,
    "convertedAmount": 72,
    "exchangeRate": 0.72
}
```

Example:

```bash
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{"from":"CAD","to":"USD","amount":100.00}'
```

### Other endpoints

| Endpoint | Description |
|---|---|
| `GET /currencies` | Returns `{ "currencies": ["CAD", "USD", ...] }` |
| `GET /health` | Returns `{ "status": "ok" }` |

### Error responses

All errors are JSON with an `error` field.

| Status | When | Example body |
|---|---|---|
| 400 | Missing or invalid fields, negative amount | `{ "error": "Invalid request", "details": ["\"amount\" must be a number"] }` |
| 400 | Unsupported currency | `{ "error": "Unsupported currency: XYZ. Supported currencies: CAD, USD, EUR, GBP, AUD, JPY" }` |
| 400 | Malformed JSON | `{ "error": "Malformed JSON in request body" }` |
| 404 | Unknown route | `{ "error": "Not found" }` |
| 405 | Non-POST request to `/convert` | `{ "error": "Method not allowed. Use POST." }` |
| 413 | Request body over 10 KB | `{ "error": "Request body too large" }` |
| 500 | Unexpected error | `{ "error": "Internal server error" }` |

## Frontend (optional)

A small React + Vite UI is included in `frontend/`. The API works
standalone; the frontend is an optional extra and is not required to use or
test the API.

Features: currency dropdowns loaded from `GET /currencies`, a swap button,
loading and error states, and automatic dark mode.

### Running the full app

Terminal 1 (backend):

```bash
cd backend
npm install
npm start
```

Terminal 2 (frontend):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/convert` and
`/currencies` to the backend on port 3000, so the backend must be running.

## Assumptions and design decisions

- **Rounding:** `convertedAmount` is rounded to 2 decimal places, calculated from the unrounded rate so errors do not compound. `exchangeRate` is rounded to 6 decimal places. JPY is also kept to 2 decimals for consistency.
- **Case-insensitive currency codes:** `usd` and `USD` are equivalent. Codes are returned in uppercase. Surrounding whitespace is ignored.
- **Strict types:** `amount` must be a JSON number. A string such ass `"100"` is rejected rather than coerced.
- **Amount limits:** zero is allowed. Negative amounts and anything above 1,000,000,000,000 is rejected.
- **All validation errors are reported together** so a client can fix everything in one request.
- **Validation and conversion is separate:** `validate.js` checks that the request is well-formed; `converter.js` checks that currencies are supported.
- **Static rates:** rates live in `src/rates.js`. No external service or database is used.
- **No stack traces** are returned to clients on unexpected errors.
- **Frontend is separate:** `backend/` and `frontend/` have their own `package.json` and share no code.

## AI Usage
I used AI tools mainly to speed up repetitive work, in two areas:

- **Tests:** I described the scenarios and edge cases I wanted covered, and the AI generated the test cases. This let me build a comprehensive suite (172 backend tests and 12 frontend tests) in a fraction of the time it would take to write them by hand.
- **Frontend:** I used AI to help build the React frontend, for similar reasons. It saved time on boilerplate, component structure, and styling, so I could focus on making sure the frontend worked correctly with the API.