const express = require('express');
const { convert, UnsupportedCurrencyError } = require('./converter');
const { validateConvertRequest } = require('./validate');
const { SUPPORTED_CURRENCIES } = require('./rates');

const app = express();
app.use(express.json({ limit: '10kb' }));
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.get('/currencies', (req, res) => {
    res.json({ currencies: SUPPORTED_CURRENCIES });
});

app.post('/convert', (req, res) => {
    const errors = validateConvertRequest(req.body);
    if (errors.length > 0){
        return res.status(400).json({error: 'Invalid request', details: errors });
    }

    try {
        const { from, to, amount } = req.body;
        return res.status(200).json(convert(from, to, amount));
    } catch (err) {
        if (err instanceof UnsupportedCurrencyError) {
            return res.status(400).json({ error: err.message });
        }
        throw err;
    }
});

app.all('/convert', (req, res) => {
    res.set('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Malformed JSON in request body' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request body too large' });
    }

    if (process.env.NODE_ENV !== 'test') {
        console.error(err);
    }
    return res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;