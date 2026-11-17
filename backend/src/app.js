const express = require('express');
const { convert, UnsupportedCurrencyError } = require('./converter');
const { validateConvertRequest } = require('./validate');
const { SUPPORTED_CURRENCIES } = require('./rates');

const app = express();
// Parse JSON request bodies. Bodies over 10KB are rejected
app.use(express.json({ limit: '10kb' }));
// Simple health checks to ensure server is running
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Lists supported currency codes
app.get('/currencies', (req, res) => {
    res.json({ currencies: SUPPORTED_CURRENCIES });
});

// Main endpoint
app.post('/convert', (req, res) => {
    // Check the request shape
    const errors = validateConvertRequest(req.body);
    if (errors.length > 0){
        return res.status(400).json({error: 'Invalid request', details: errors });
    }

    try {
        // Perform conversion
        const { from, to, amount } = req.body;
        return res.status(200).json(convert(from, to, amount));
    } catch (err) {
        // Unsupported currency code, respond with 400
        if (err instanceof UnsupportedCurrencyError) {
            return res.status(400).json({ error: err.message });
        }
        throw err;
    }
});

// Any non-POST request to /convert gets 405, with an Allow header per HTTP spec
app.all('/convert', (req, res) => {
    res.set('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
});

// Catch-all for unknown routes
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    // Malformed JSON thrown by express.json()
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Malformed JSON in request body' });
    }
    // Body larger than 10 KB limit
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request body too large' });
    }

    // Unexpected error
    if (process.env.NODE_ENV !== 'test') {
        console.error(err);
    }
    return res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;