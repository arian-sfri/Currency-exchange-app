const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  test('returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('GET /currencies', () => {
  test('returns the supported currencies', async () => {
    const res = await request(app).get('/currencies');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      currencies: ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'],
    });
  });
});

describe('POST /convert', () => {
  describe('successful conversions', () => {
    test('matches the assignment example exactly', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'CAD', to: 'USD', amount: 100.0 });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toEqual({
        from: 'CAD',
        to: 'USD',
        originalAmount: 100,
        convertedAmount: 72,
        exchangeRate: 0.72,
      });
    });

    test('converts between two non-CAD currencies', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'EUR', to: 'JPY', amount: 100 });

      expect(res.status).toBe(200);
      expect(res.body.convertedAmount).toBe(16590.91);
      expect(res.body.exchangeRate).toBe(165.909091);
    });

    test('converts to CAD', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'USD', to: 'CAD', amount: 100 });

      expect(res.status).toBe(200);
      expect(res.body.convertedAmount).toBe(138.89);
    });

    test('same currency returns the same amount', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'GBP', to: 'GBP', amount: 42.5 });

      expect(res.status).toBe(200);
      expect(res.body.convertedAmount).toBe(42.5);
      expect(res.body.exchangeRate).toBe(1);
    });

    test('accepts zero', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'CAD', to: 'USD', amount: 0 });

      expect(res.status).toBe(200);
      expect(res.body.convertedAmount).toBe(0);
    });

    test('accepts lowercase codes and returns them uppercase', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'cad', to: 'usd', amount: 100 });

      expect(res.status).toBe(200);
      expect(res.body.from).toBe('CAD');
      expect(res.body.to).toBe('USD');
      expect(res.body.convertedAmount).toBe(72);
    });
  });

  describe('validation errors (400)', () => {
    test('missing "from"', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ to: 'USD', amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid request');
      expect(res.body.details).toEqual(['"from" is required']);
    });

    test('missing "to"', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'CAD', amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(['"to" is required']);
    });

    test('missing "amount"', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'CAD', to: 'USD' });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(['"amount" is required']);
    });

    test('empty object reports all three missing fields', async () => {
      const res = await request(app).post('/convert').send({});

      expect(res.status).toBe(400);
      expect(res.body.details).toHaveLength(3);
    });

    test('amount sent as a string', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'CAD', to: 'USD', amount: '100' });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(['"amount" must be a number']);
    });

    test('negative amount', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'CAD', to: 'USD', amount: -5 });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(['"amount" must not be negative']);
    });

    test('amount above the maximum', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'CAD', to: 'USD', amount: 1e13 });

      expect(res.status).toBe(400);
    });

    test('currency code of the wrong type', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 123, to: 'USD', amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual([
        '"from" must be a non-empty string currency code',
      ]);
    });

    test('JSON body that is an array', async () => {
      const res = await request(app).post('/convert').send([1, 2, 3]);

      expect(res.status).toBe(400);
      expect(res.body.details).toEqual(['Request body must be a JSON object']);
    });

    test('no body at all', async () => {
      const res = await request(app).post('/convert');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('wrong content type', async () => {
      const res = await request(app)
        .post('/convert')
        .set('Content-Type', 'text/plain')
        .send('from=CAD&to=USD&amount=100');

      expect(res.status).toBe(400);
    });
  });

  describe('unsupported currency (400)', () => {
    test('unsupported "from"', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'XYZ', to: 'USD', amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Unsupported currency: XYZ');
      expect(res.body.error).toContain('CAD, USD, EUR, GBP, AUD, JPY');
    });

    test('unsupported "to"', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'USD', to: 'BTC', amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Unsupported currency: BTC');
    });

    test('prototype keys are not treated as currencies', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'constructor', to: 'USD', amount: 100 });

      expect(res.status).toBe(400);
    });
  });

  describe('malformed requests', () => {
    test('malformed JSON returns 400 with a clear message', async () => {
      const res = await request(app)
        .post('/convert')
        .set('Content-Type', 'application/json')
        .send('{"from": "CAD", "to": ');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Malformed JSON in request body' });
    });

    test('oversized body returns 413', async () => {
      const res = await request(app)
        .post('/convert')
        .send({ from: 'CAD', to: 'USD', amount: 1, padding: 'x'.repeat(20000) });

      expect(res.status).toBe(413);
    });
  });
});

describe('routing', () => {
  test('GET /convert returns 405 with an Allow header', async () => {
    const res = await request(app).get('/convert');

    expect(res.status).toBe(405);
    expect(res.headers.allow).toBe('POST');
    expect(res.body.error).toMatch(/POST/);
  });

  test('unknown route returns 404 JSON', async () => {
    const res = await request(app).get('/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});