jest.mock('../src/converter', () => {
  const actual = jest.requireActual('../src/converter');
  return { ...actual, convert: jest.fn() };
});

const request = require('supertest');
const { convert } = require('../src/converter');
const app = require('../src/app');

describe('unexpected errors (500)', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    convert.mockImplementation(() => {
      throw new Error('boom: secret internal detail');
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    convert.mockReset();
    jest.restoreAllMocks();
  });

  const validBody = { from: 'CAD', to: 'USD', amount: 100 };

  test('returns a generic 500 and leaks no internal details', async () => {
    const res = await request(app).post('/convert').send(validBody);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(res.body)).not.toContain('boom');
  });

  test('logs the error with console.error outside the test environment', async () => {
    process.env.NODE_ENV = 'production';
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/convert').send(validBody);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(spy).toHaveBeenCalled();
  });
});