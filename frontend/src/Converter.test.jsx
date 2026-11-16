import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Converter from './Converter';

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'];

const SUCCESS = {
  from: 'CAD',
  to: 'USD',
  originalAmount: 100,
  convertedAmount: 72,
  exchangeRate: 0.72,
};

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

// Replaces global fetch. Override either endpoint's behaviour per test.
function setupFetch({
  currencies = () => Promise.resolve(jsonResponse({ currencies: CURRENCIES })),
  convert = () => Promise.resolve(jsonResponse(SUCCESS)),
} = {}) {
  const mock = vi.fn((url) => (url === '/currencies' ? currencies() : convert()));
  vi.stubGlobal('fetch', mock);
  return mock;
}

// Renders and waits until currencies have loaded (the Convert button becomes enabled)
async function renderConverter() {
  render(<Converter />);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Convert' })).toBeEnabled()
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Converter', () => {
  test('renders the form controls', async () => {
    setupFetch();
    await renderConverter();

    expect(screen.getByRole('heading', { name: 'Currency Converter' })).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Swap currencies' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convert' })).toBeInTheDocument();
  });

  test('populates both dropdowns from GET /currencies', async () => {
    const fetchMock = setupFetch();
    await renderConverter();

    expect(fetchMock).toHaveBeenCalledWith('/currencies');

    for (const label of ['From', 'To']) {
      const options = within(screen.getByLabelText(label)).getAllByRole('option');
      expect(options.map((o) => o.textContent)).toEqual(CURRENCIES);
    }
    expect(screen.getByLabelText('From')).toHaveValue('CAD');
    expect(screen.getByLabelText('To')).toHaveValue('USD');
  });

  test('shows the converted amount and rate after clicking Convert', async () => {
    setupFetch();
    const user = userEvent.setup();
    await renderConverter();

    await user.type(screen.getByLabelText('Amount'), '100');
    await user.click(screen.getByRole('button', { name: 'Convert' }));

    expect(await screen.findByText('72.00 USD')).toBeInTheDocument();
    expect(screen.getByText('100.00 CAD =')).toBeInTheDocument();
    expect(screen.getByText('Rate: 1 CAD = 0.72 USD')).toBeInTheDocument();
  });

  test('sends the correct request to POST /convert', async () => {
    const fetchMock = setupFetch();
    const user = userEvent.setup();
    await renderConverter();

    await user.selectOptions(screen.getByLabelText('From'), 'EUR');
    await user.selectOptions(screen.getByLabelText('To'), 'JPY');
    await user.type(screen.getByLabelText('Amount'), '100');
    await user.click(screen.getByRole('button', { name: 'Convert' }));

    await screen.findByText('72.00 USD'); // wait for the request to finish

    expect(fetchMock).toHaveBeenCalledWith('/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'EUR', to: 'JPY', amount: 100 }),
    });
  });

  test('shows validation details when the API returns 400', async () => {
    setupFetch({
      convert: () =>
        Promise.resolve(
          jsonResponse(
            { error: 'Invalid request', details: ['"amount" must not be negative'] },
            false,
            400
          )
        ),
    });
    const user = userEvent.setup();
    await renderConverter();

    await user.type(screen.getByLabelText('Amount'), '5');
    await user.click(screen.getByRole('button', { name: 'Convert' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '"amount" must not be negative'
    );
    expect(screen.queryByText('72.00 USD')).not.toBeInTheDocument();
  });

  test('shows the error message when the API returns a plain error', async () => {
    setupFetch({
      convert: () =>
        Promise.resolve(
          jsonResponse({ error: 'Unsupported currency: XYZ' }, false, 400)
        ),
    });
    const user = userEvent.setup();
    await renderConverter();

    await user.type(screen.getByLabelText('Amount'), '5');
    await user.click(screen.getByRole('button', { name: 'Convert' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unsupported currency: XYZ'
    );
  });

  test('shows a friendly message on network failure', async () => {
    setupFetch({ convert: () => Promise.reject(new Error('Network down')) });
    const user = userEvent.setup();
    await renderConverter();

    await user.type(screen.getByLabelText('Amount'), '5');
    await user.click(screen.getByRole('button', { name: 'Convert' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server. Please try again.'
    );
  });

  test('disables the button while the request is in flight', async () => {
    let resolveConvert;
    setupFetch({
      convert: () =>
        new Promise((resolve) => {
          resolveConvert = resolve;
        }),
    });
    const user = userEvent.setup();
    await renderConverter();

    await user.type(screen.getByLabelText('Amount'), '100');
    await user.click(screen.getByRole('button', { name: 'Convert' }));

    expect(await screen.findByRole('button', { name: 'Converting...' })).toBeDisabled();

    resolveConvert(jsonResponse(SUCCESS));

    expect(await screen.findByText('72.00 USD')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Convert' })).toBeEnabled()
    );
  });

  test('swap button exchanges the From and To selections', async () => {
    setupFetch();
    const user = userEvent.setup();
    await renderConverter();

    await user.selectOptions(screen.getByLabelText('From'), 'EUR');
    await user.selectOptions(screen.getByLabelText('To'), 'JPY');
    await user.click(screen.getByRole('button', { name: 'Swap currencies' }));

    expect(screen.getByLabelText('From')).toHaveValue('JPY');
    expect(screen.getByLabelText('To')).toHaveValue('EUR');
  });

  test('empty amount shows a message and does not call POST /convert', async () => {
    const fetchMock = setupFetch();
    const user = userEvent.setup();
    await renderConverter();

    await user.click(screen.getByRole('button', { name: 'Convert' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please enter a valid amount.'
    );
    // Only the initial GET /currencies call, nothing else
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('shows an error and keeps Convert disabled if currencies fail to load', async () => {
    setupFetch({ currencies: () => Promise.reject(new Error('Network down')) });
    render(<Converter />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load currencies.'
    );
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled();
  });
});