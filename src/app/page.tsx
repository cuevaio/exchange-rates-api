import { LiveRates } from "./_components/live-rates";

export default function Home() {
  return (
    <main className="page-shell">
      <div className="page-glow" aria-hidden="true" />
      <div className="page-noise" aria-hidden="true" />

      <div className="page-column">
        <header className="page-header">
          <div>
            <p className="page-kicker">Exchange Rates API</p>
            <h1 className="page-title">Live online dollar exchange houses in Peru.</h1>
          </div>

          <p className="page-copy">
            Minimal, fast, and updated from the upstream source through this repo&apos;s
            own API.
          </p>
        </header>

        <LiveRates />

        <footer className="page-footer">
          <a href="http://www.cueva.io/" target="_blank" rel="noopener noreferrer">
            cueva.io
          </a>
          <div className="page-footer-links">
            <a href="https://instagram.com/cueva.io" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href="https://github.com/cuevaio" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://linkedin.com/in/cuevaio" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <a href="mailto:hi@cueva.io">Email</a>
            <a href="https://cal.com/cuevaio" target="_blank" rel="noopener noreferrer">
              Cal
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
