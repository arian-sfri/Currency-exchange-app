// Sanity cap
const MAX_AMOUNT = 1e12;

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Checks the shape of a /convert request body
// Returns an array of error messages so client can fix everything at once
function validateConvertRequest(body) {
    if (!isPlainObject(body)) {
        return ['Request body must be a JSON object'];
    }

    const errors = [];
    const { from, to, amount } = body;

    if (from === undefined) {
        errors.push('"from" is required');
    }
    else if (typeof from !== 'string' || from.trim() === '') {
        errors.push('"from" must be a non-empty string currency code');
    }

    if (to === undefined){
        errors.push('"to" is required');
    }
    else if (typeof to !== 'string' || to.trim() === ''){
        errors.push('"to" must be a non-empty string currency code');
    }

    if (amount === undefined) {
        errors.push('"amount" is required');
    }
    else if (typeof amount !== 'number' || !Number.isFinite(amount)){
        errors.push('"amount" must be a number');
    }
    else if (amount < 0){
        errors.push('"amount" must not be negative');
    }
    else if (amount > MAX_AMOUNT) {
        errors.push(`"amount" must not exceed ${MAX_AMOUNT}`);
    }

    return errors;
}

module.exports = { validateConvertRequest, MAX_AMOUNT };