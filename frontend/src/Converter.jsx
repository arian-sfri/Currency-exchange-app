import { useEffect, useRef, useState } from 'react';
import './Converter.css';

const CURRENCY_NAMES = {
  CAD: 'Canadian Dollar',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  AUD: 'Australian Dollar',
  JPY: 'Japanese Yen',
};

export default function Converter() {
  const [currencies, setCurrencies] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrencies() {
      try {
        const res = await fetch('/currencies');
        if (!res.ok) throw new Error('Bad response');
        const data = await res.json();
        if (cancelled) return;
        setCurrencies(data.currencies);
        setFrom(data.currencies[0]);
        setTo(data.currencies[1] ?? data.currencies[0]);
      } catch {
        if (!cancelled) setError('Could not load currencies.');
      }
    }

    loadCurrencies();
    return () => {
      cancelled = true;
    };
  }, []);

  // Any input change makes an in-flight request obsolete
  function invalidateRequest() {
    requestId.current += 1;
    setResult(null);
    setLoading(false);
  }

  function handleSwap() {
    invalidateRequest();
    setFrom(to);
    setTo(from);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setResult(null);

    const trimmed = amount.trim();
    const numericAmount = Number(trimmed);
    if (trimmed === '' || !Number.isFinite(numericAmount)) {
      setError('Please enter a valid amount.');
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await fetch('/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, amount: numericAmount }),
      });
      const data = await res.json();
      if (id !== requestId.current) return; // inputs changed, ignore this response

      if (!res.ok) {
        setError(
          data.details ? data.details.join(', ') : data.error || 'Something went wrong.'
        );
        return;
      }
      setResult(data);
    } catch {
      if (id !== requestId.current) return;
      setError('Could not reach the server. Please try again.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  const notReady = currencies.length === 0;

  return (
    <main className="converter">
      <header className="header">
        <div className="logo" aria-hidden="true">
          $
        </div>
        <div>
          <h1>Currency Converter</h1>
          <p className="subtitle">Instant conversion between six currencies</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field amount-field">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              invalidateRequest();
              setAmount(e.target.value);
            }}
          />
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="from">From</label>
            <select
              id="from"
              value={from}
              onChange={(e) => {
                invalidateRequest();
                setFrom(e.target.value);
              }}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="currency-name">{CURRENCY_NAMES[from] || '\u00A0'}</span>
          </div>

          <button
            type="button"
            className="swap"
            onClick={handleSwap}
            aria-label="Swap currencies"
            disabled={notReady}
          >
            ⇄
          </button>

          <div className="field">
            <label htmlFor="to">To</label>
            <select
              id="to"
              value={to}
              onChange={(e) => {
                invalidateRequest();
                setTo(e.target.value);
              }}
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="currency-name">{CURRENCY_NAMES[to] || '\u00A0'}</span>
          </div>
        </div>

        <button
          type="submit"
          className={loading ? 'convert is-loading' : 'convert'}
          disabled={loading || notReady}
        >
          {loading ? 'Converting...' : 'Convert'}
        </button>
      </form>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      {result && (
        <section className="result" aria-live="polite">
          <p className="original">{`${result.originalAmount.toFixed(2)} ${result.from} =`}</p>
          <p className="converted">{`${result.convertedAmount.toFixed(2)} ${result.to}`}</p>
          <p className="rate">{`Rate: 1 ${result.from} = ${result.exchangeRate} ${result.to}`}</p>
        </section>
      )}

      <footer className="footnote">Demo app using fictional exchange rates</footer>
    </main>
  );
}