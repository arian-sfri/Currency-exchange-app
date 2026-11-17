const { RATES, SUPPORTED_CURRENCIES } = require('./rates');

class UnsupportedCurrencyError extends Error {
    constructor(currency) {
        super(
            `Unsupported currency: ${currency}. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`
        );
        this.name = 'UnsupportedCurrencyError';
    }
}

function round(value, decimals) {
  const sign = value < 0 ? -1 : 1;
  const clean = Number(Math.abs(value).toPrecision(15));
  const [mantissa, exp] = clean.toExponential().split('e');
  const shifted = Math.round(Number(`${mantissa}e${Number(exp) + decimals}`));
  return sign * Number(`${shifted}e${-decimals}`);
}

function normalizeCurrency(code) {
    const normalized = String(code).trim().toUpperCase();
    if (!Object.hasOwn(RATES, normalized)) {
        throw new UnsupportedCurrencyError(code);
    }
    return normalized;
}

function convert(from, to, amount){
    const fromCode = normalizeCurrency(from);
    const toCode = normalizeCurrency(to);
    const rate = RATES[toCode] / RATES[fromCode];

    return {
        from: fromCode,
        to: toCode,
        originalAmount: amount,
        convertedAmount: round(amount * rate, 2),
        exchangeRate: round(rate, 6),
    };
}

module.exports = { convert, UnsupportedCurrencyError };