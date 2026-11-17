const { RATES, SUPPORTED_CURRENCIES } = require('./rates');

// Thrown when a currency code isn't in RATES
class UnsupportedCurrencyError extends Error {
    constructor(currency) {
        super(
            `Unsupported currency: ${currency}. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`
        );
        this.name = 'UnsupportedCurrencyError';
    }
}

// Rounds to a fixed number of decimal places, with halves rounding up
function round(value, decimals) {
  const sign = value < 0 ? -1 : 1;
  const clean = Number(Math.abs(value).toPrecision(15));
  const [mantissa, exp] = clean.toExponential().split('e');
  const shifted = Math.round(Number(`${mantissa}e${Number(exp) + decimals}`));
  return sign * Number(`${shifted}e${-decimals}`);
}

// Trims and uppercases a currency code, and verifies it is supported
function normalizeCurrency(code) {
    const normalized = String(code).trim().toUpperCase();
    if (!Object.hasOwn(RATES, normalized)) {
        throw new UnsupportedCurrencyError(code);
    }
    return normalized;
}

// Converts an amount between any two supported currencies
function convert(from, to, amount){
    const fromCode = normalizeCurrency(from);
    const toCode = normalizeCurrency(to);
    const rate = RATES[toCode] / RATES[fromCode];

    return {
        from: fromCode,
        to: toCode,
        originalAmount: amount,
        // Calculated from the unrounded rate so rounding error doesn't compound
        convertedAmount: round(amount * rate, 2),
        // 6 decimals to avoid float noise
        exchangeRate: round(rate, 6),
    };
}

module.exports = { convert, UnsupportedCurrencyError };