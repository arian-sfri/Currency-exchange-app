const { validateConvertRequest, MAX_AMOUNT } = require('../src/validate');

describe('validateConvertRequest', () => {
  const valid = { from: 'CAD', to: 'USD', amount: 100 };

  describe('valid requests', () => {
    test('accepts a well-formed request', () => {
      expect(validateConvertRequest(valid)).toEqual([]);
    });

    test('accepts zero', () => {
      expect(validateConvertRequest({ ...valid, amount: 0 })).toEqual([]);
    });

    test('accepts decimals', () => {
      expect(validateConvertRequest({ ...valid, amount: 19.99 })).toEqual([]);
    });

    test('accepts lowercase codes (case is handled by the converter)', () => {
      expect(
        validateConvertRequest({ from: 'cad', to: 'usd', amount: 5 })
      ).toEqual([]);
    });

    test('accepts the maximum amount', () => {
      expect(validateConvertRequest({ ...valid, amount: MAX_AMOUNT })).toEqual(
        []
      );
    });
  });

  describe('invalid body', () => {
    test.each([
      ['undefined', undefined],
      ['null', null],
      ['a string', 'hello'],
      ['a number', 42],
      ['an array', []],
    ])('rejects %s', (_label, body) => {
      expect(validateConvertRequest(body)).toEqual([
        'Request body must be a JSON object',
      ]);
    });

    test('rejects an empty object with all three required errors', () => {
      expect(validateConvertRequest({})).toEqual([
        '"from" is required',
        '"to" is required',
        '"amount" is required',
      ]);
    });
  });

  describe('missing fields', () => {
    test('missing "from"', () => {
      expect(validateConvertRequest({ to: 'USD', amount: 1 })).toEqual([
        '"from" is required',
      ]);
    });

    test('missing "to"', () => {
      expect(validateConvertRequest({ from: 'CAD', amount: 1 })).toEqual([
        '"to" is required',
      ]);
    });

    test('missing "amount"', () => {
      expect(validateConvertRequest({ from: 'CAD', to: 'USD' })).toEqual([
        '"amount" is required',
      ]);
    });
  });

  describe('invalid currency fields', () => {
    test.each([
      ['a number', 123],
      ['null', null],
      ['an empty string', ''],
      ['whitespace only', '   '],
      ['an object', {}],
      ['an array', ['USD']],
      ['a boolean', true],
    ])('rejects "from" when it is %s', (_label, value) => {
      expect(validateConvertRequest({ ...valid, from: value })).toEqual([
        '"from" must be a non-empty string currency code',
      ]);
    });

    test('rejects invalid "to"', () => {
      expect(validateConvertRequest({ ...valid, to: 42 })).toEqual([
        '"to" must be a non-empty string currency code',
      ]);
    });
  });

  describe('invalid amount', () => {
    test.each([
      ['a numeric string', '100'],
      ['null', null],
      ['a boolean', true],
      ['an object', {}],
      ['an array', [100]],
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['-Infinity', -Infinity],
    ])('rejects amount when it is %s', (_label, value) => {
      expect(validateConvertRequest({ ...valid, amount: value })).toEqual([
        '"amount" must be a number',
      ]);
    });

    test('rejects negative amounts', () => {
      expect(validateConvertRequest({ ...valid, amount: -1 })).toEqual([
        '"amount" must not be negative',
      ]);
    });

    test('rejects amounts above the maximum', () => {
      expect(
        validateConvertRequest({ ...valid, amount: MAX_AMOUNT + 1 })
      ).toEqual([`"amount" must not exceed ${MAX_AMOUNT}`]);
    });
  });

  describe('multiple errors', () => {
    test('reports every problem at once', () => {
      expect(
        validateConvertRequest({ from: 123, to: '', amount: 'abc' })
      ).toEqual([
        '"from" must be a non-empty string currency code',
        '"to" must be a non-empty string currency code',
        '"amount" must be a number',
      ]);
    });
  });
});