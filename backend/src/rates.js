const RATES = Object.freeze({
    CAD: 1.0,
    USD: 0.72,
    EUR: 0.66,
    GBP: 0.57,
    AUD: 1.09,
    JPY: 109.50,
});

const SUPPORTED_CURRENCIES = Object.freeze(Object.keys(RATES));
module.exports = { RATES, SUPPORTED_CURRENCIES };