const { convert, UnsupportedCurrencyError } = require('../src/converter');
const { SUPPORTED_CURRENCIES, RATES } = require('../src/rates');

describe('convert', () => {
    describe('from CAD (base currency)', () => {
        test('CAD to USD matches example', () => {
            expect(convert('CAD', 'USD', 100)).toEqual({
                from: 'CAD',
                to: 'USD',
                originalAmount: 100,
                convertedAmount: 72,
                exchangeRate: 0.72,
            });
        });

        test('CAD to JPY', () => {
            const result = convert('CAD', 'JPY', 100);
            expect(result.convertedAmount).toBe(10950);
            expect(result.exchangeRate).toBe(109.5);
        });

        test('CAD to EUR, GBP, AUD', () => {
            expect(convert('CAD', 'EUR', 100).convertedAmount).toBe(66);
            expect(convert('CAD', 'GBP', 100).convertedAmount).toBe(57);
            expect(convert('CAD', 'AUD', 100).convertedAmount).toBe(109);
        });
    });

    describe ('to CAD', () => {
        test ('USD to CAD', () => {
            const result = convert('USD', 'CAD', 100);
            expect(result.convertedAmount).toBe(138.89);
            expect(result.exchangeRate).toBe(1.388889);
        });
        test('JPY to CAD', () => {
            expect(convert('JPY', 'CAD', 1000).convertedAmount).toBe(9.13);
        });
    });

  describe('cross-currency (neither side is CAD)', () => {
    test('EUR to JPY', () => {
      const result = convert('EUR', 'JPY', 100);
      expect(result.convertedAmount).toBe(16590.91);
      expect(result.exchangeRate).toBe(165.909091);
    });

    test('GBP to AUD', () => {
      const result = convert('GBP', 'AUD', 100);
      expect(result.convertedAmount).toBe(191.23);
      expect(result.exchangeRate).toBe(1.912281);
    });

    test('is consistent in both directions (round trip is close)', () => {
      const there = convert('USD', 'EUR', 250);
      const back = convert('EUR', 'USD', there.convertedAmount);
      expect(back.convertedAmount).toBeCloseTo(250, 1);
    });
  });

  describe('edge cases', () => {
    test('same currency returns the same amount with rate 1', () => {
      expect(convert('USD', 'USD', 50)).toEqual({
        from: 'USD',
        to: 'USD',
        originalAmount: 50,
        convertedAmount: 50,
        exchangeRate: 1,
      });
    });

    test('zero amount returns zero', () => {
      expect(convert('CAD', 'USD', 0).convertedAmount).toBe(0);
    });

    test('rounds to 2 decimal places', () => {
      // 19.99 * 0.72 = 14.3928
      expect(convert('CAD', 'USD', 19.99).convertedAmount).toBe(14.39);
    });

    test('handles very small amounts', () => {
      expect(convert('CAD', 'USD', 0.01).convertedAmount).toBe(0.01);
    });

    test('handles large amounts', () => {
      expect(convert('CAD', 'JPY', 1000000).convertedAmount).toBe(109500000);
    });

    test('preserves the original amount unchanged', () => {
      expect(convert('CAD', 'USD', 19.99).originalAmount).toBe(19.99);
    });
  });

  describe('currency code handling', () => {
    test('accepts lowercase codes and returns them uppercase', () => {
      const result = convert('usd', 'eur', 100);
      expect(result.from).toBe('USD');
      expect(result.to).toBe('EUR');
    });

    test('accepts mixed case and surrounding whitespace', () => {
      expect(convert(' cAd ', 'Usd', 100).convertedAmount).toBe(72);
    });
  });

  describe('unsupported currencies', () => {
    test('throws for unknown "from" currency', () => {
      expect(() => convert('XYZ', 'USD', 100)).toThrow(UnsupportedCurrencyError);
    });

    test('throws for unknown "to" currency', () => {
      expect(() => convert('USD', 'XYZ', 100)).toThrow(UnsupportedCurrencyError);
    });

    test('error message lists supported currencies', () => {
      expect(() => convert('XYZ', 'USD', 100)).toThrow(
        'Unsupported currency: XYZ. Supported currencies: CAD, USD, EUR, GBP, AUD, JPY'
      );
    });

    test('does not treat object prototype keys as currencies', () => {
      expect(() => convert('constructor', 'USD', 100)).toThrow(
        UnsupportedCurrencyError
      );
      expect(() => convert('__proto__', 'USD', 100)).toThrow(
        UnsupportedCurrencyError
      );
    });
  });
});

describe('all currency pairs', () => {
  const amounts = [0.01, 1, 19.99, 100, 250.5, 9999.99];

  for (const from of SUPPORTED_CURRENCIES) {
    for (const to of SUPPORTED_CURRENCIES) {
      test(`${from} to ${to} uses the correct cross rate`, () => {
        for (const amount of amounts) {
          const result = convert(from, to, amount);
          const expected = Math.round(((amount * RATES[to]) / RATES[from]) * 100) / 100;
          expect(result.convertedAmount).toBeCloseTo(expected, 2);
        }
      });

      test(`${from} to ${to} round trip stays close`, () => {
        const there = convert(from, to, 1000);
        const back = convert(to, from, there.convertedAmount);
        // Allow more tolerance when converting through a tiny-value currency like JPY
        expect(Math.abs(back.convertedAmount - 1000)).toBeLessThan(10);
      });
    }
  }

  test('uppercase, lowercase and mixed case give identical results', () => {
    const upper = convert('USD', 'EUR', 123.45);
    expect(convert('usd', 'eur', 123.45)).toEqual(upper);
    expect(convert('Usd', 'eUr', 123.45)).toEqual(upper);
  });
});