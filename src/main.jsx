import { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import OfflineFilingStudio from './OfflineFilingStudio.jsx';
import SmartFilingScreen from './SmartFiling.jsx';
import {
  BUSINESS, RETURN_PERIOD, FY_PERIODS_DATA,
  INITIAL_B2B_INVOICES, INITIAL_B2C_INVOICES,
  INITIAL_EXPORTS, INITIAL_CREDIT_NOTES,
  INITIAL_ADVANCES, INITIAL_AMENDMENTS,
  INITIAL_HSN_SUMMARY, INITIAL_DOCUMENT_SERIES,
  PLACES_OF_SUPPLY,
  formatCurrency, formatDate, validateGstin, computeSummary,
} from './mockData.js';

// ─── Shared atoms ────────────────────────────────────────────────────────────

const Arrow = () => <span aria-hidden="true" className="arrow">→</span>;

function Brand({ onClick }) {
  return (
    <a className="brand" href="#" aria-label="GEZT home" onClick={e => { e.preventDefault(); onClick?.(); }}>
      <span className="brand-mark" aria-hidden="true"><b>G</b><i /><i /></span>
      <span><strong>GEZT</strong><small>Taxpayer Services</small></span>
    </a>
  );
}

function StatusBadge({ status }) {
  const map = { processed: 'Processed', pending: 'Pending', error: 'Error', saved: 'Saved', 'in-progress': 'In Progress', done: 'Done', 'coming-soon': 'Coming Soon', filed: 'Filed', upcoming: 'Upcoming', overdue: 'Overdue', current: 'Current' };
  return <span className={`badge badge-${status}`}>{map[status] || status}</span>;
}

function Spinner() {
  return <span className="spinner" aria-label="Loading" />;
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ view, auth, navigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const close = () => setOpen(false);
  const isPortal = view !== 'home';

  const goHome = () => { close(); navigate('home'); };
  const goLogin = () => { close(); navigate('login'); };

  const confirmSignOut = () => {
    setShowConfirmLogout(false);
    onLogout();
    goHome();
    close();
  };

  const scrollToSection = (sectionId) => {
    close();
    if (view !== 'home') {
      navigate('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>GEZT prototype portal</span>
          <div>
            <button type="button" onClick={() => alert('Accessibility settings coming soon.')}>Accessibility</button>
            <span className="utility-divider" />
            <button type="button" onClick={() => alert('Language selection coming soon.')}>English ▾</button>
          </div>
        </div>
      </div>
      <header className="site-header" id="top">
        <div className="container masthead">
          <Brand onClick={goHome} />
          <div className="masthead-right">
            {isPortal ? (
              <span className="prototype-tag">Prototype</span>
            ) : (
              <div className="masthead-meta">
                <span className="prototype-tag">Prototype</span>
                <p>Digital tax services, redesigned</p>
              </div>
            )}
            {auth && (
              <div className="auth-chip">
                <div className="auth-info">
                  <span className="auth-gstin">{BUSINESS.gstin}</span>
                  <span className="auth-name">{BUSINESS.name}</span>
                </div>
                <button type="button" className="logout-btn" onClick={() => setShowConfirmLogout(true)}>Sign out</button>
              </div>
            )}
          </div>
          <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="main-nav" id="mobile-menu-btn">
            <span className="sr-only">{open ? 'Close' : 'Open'} navigation</span>
            <i /><i /><i />
          </button>
        </div>
        <nav className="main-nav" id="main-nav" aria-label="Main navigation">
          <div className={open ? 'container nav-inner nav-open' : 'container nav-inner'}>
            <a href="#" className={view === 'home' ? 'active' : ''} onClick={e => { e.preventDefault(); goHome(); }}>Home</a>
            {auth && (
              <a href="#" className={view === 'dashboard' ? 'active' : ''} onClick={e => { e.preventDefault(); navigate('dashboard'); close(); }} id="nav-dashboard">
                <span>Dashboard</span>
              </a>
            )}
            <a href="#services" onClick={e => { e.preventDefault(); scrollToSection('services'); }}>Services</a>
            <a href="#filing-options" onClick={e => { e.preventDefault(); scrollToSection('filing-options'); }}>Returns</a>
            <a href="#information" onClick={e => { e.preventDefault(); scrollToSection('information'); }}>Information</a>
            <a href="#help" onClick={e => { e.preventDefault(); scrollToSection('help'); }}>Help and support</a>
            {!auth && (
              <button type="button" className="login-button" onClick={() => { goLogin(); close(); }} id="btn-header-signin">Sign in <Arrow /></button>
            )}
            {auth && open && (
              <button type="button" className="nav-link-btn mobile-nav-logout-btn" onClick={() => { close(); setShowConfirmLogout(true); }}>
                Sign Out
              </button>
            )}
          </div>
        </nav>
      </header>

      {showConfirmLogout && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
          <div className="modal-card">
            <h3 id="logout-modal-title">Sign Out Confirmation</h3>
            <p>Are you sure you want to sign out of your account?</p>
            <div className="modal-actions">
              <button type="button" className="modal-btn-cancel" onClick={() => setShowConfirmLogout(false)}>Cancel</button>
              <button type="button" className="modal-btn-danger" onClick={confirmSignOut}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

function HomeScreen({ navigate }) {
  const services = [
    { icon: '↗', title: 'Registration', text: 'Registration requests and related information.', href: 'https://services.gst.gov.in/services/quicklinks/registration' },
    { icon: '₹', title: 'Payments', text: 'Payment-related services and information.', href: 'https://services.gst.gov.in/services/quicklinks/payments' },
    { icon: '◉', title: 'User Services', text: 'Services available for registered users.', href: 'https://services.gst.gov.in/services/quicklinks/userservices' },
    { icon: '↶', title: 'Refunds', text: 'Refund-related services and information.', href: 'https://services.gst.gov.in/services/quicklinks/refunds' },
    { icon: '⇄', title: 'e-Way Bill System', text: 'Access the e-Way Bill System.', href: 'https://services.gst.gov.in/services/ewaybill/ewaybillsystem' },
    { icon: '⌕', title: 'Track Application Status', text: 'Check the progress of an application.', href: 'https://services.gst.gov.in/services/trackstatus' },
  ];

  const filing = [
    { num: '01', title: 'Prepare Online', desc: 'Fill your GSTR-1 directly in the portal — section by section, with live validation.', action: 'Start online filing', dest: 'login', onlineDest: 'online-b2b' },
    { num: '02', title: 'Prepare Offline', desc: 'Download a template, fill in Excel or CSV, then upload and validate your file.', action: 'Start offline filing', dest: 'login', offlineDest: 'offline-landing' },
    { num: '03', title: 'Smart Filing', desc: 'Tell us what happened in your business and we identify the relevant GST filing path.', action: 'Try Smart Filing', dest: 'smart-filing', smartDest: 'smart-filing', featured: true },
  ];

  return (
    <main>
      {/* Hero */}
      <section className="welcome-section">
        <div className="container welcome-grid">
          <div className="welcome-copy">
            <p className="crumb">Home <span>/</span> Taxpayer services</p>
            <h1>Welcome to GEZT<br />Taxpayer Services</h1>
            <p>Clearer digital services for preparing tax returns, managing business information and understanding what to do next.</p>
            <div className="welcome-actions">
              <button className="primary-action" onClick={() => navigate('login')}>File Your GST Return <Arrow /></button>
              <a href="#filing-options" className="secondary-action">View filing options</a>
            </div>
          </div>
          <aside className="quick-panel" aria-label="Quick services">
            <h2>Quick services</h2>
            <button type="button" onClick={() => navigate('login')}>
              <span className="quick-icon">▤</span>File a return <Arrow />
            </button>
            <button type="button" onClick={() => alert('Application tracking coming soon.')}>
              <span className="quick-icon">⌕</span>Track an application <Arrow />
            </button>
            <button type="button" onClick={() => alert('Registration status coming soon.')}>
              <span className="quick-icon">✓</span>Check registration status <Arrow />
            </button>
          </aside>
        </div>
      </section>

      {/* Notice */}
      <section className="notice-strip">
        <div className="container notice-inner">
          <span className="notice-icon">i</span>
          <p><strong>Prototype notice:</strong> GEZT is an original hackathon concept. Do not enter real taxpayer information.</p>
          <a href="#disclosure">Read disclosure <Arrow /></a>
        </div>
      </section>

      {/* Smart Filing Announcement */}
      <section className="smart-announce-section">
        <div className="container smart-announce-inner">
          <div className="smart-announce-badge"><span>★</span> NEW</div>
          <div className="smart-announce-copy">
            <h2>Introducing Smart Filing</h2>
            <p>Describe your business activity in plain language — GEZT identifies the relevant GST filing path, section by section.</p>
          </div>
          <button className="smart-announce-cta" onClick={() => navigate('smart-filing')}>
            Try Smart Filing <Arrow />
          </button>
        </div>
      </section>

      {/* Filing Options */}
      <section id="filing-options" className="returns-section">
        <div className="container">
          <div className="section-heading split-heading">
            <div>
              <p className="overline">Returns</p>
              <h2>Choose how to prepare your return</h2>
            </div>
            <p>GEZT keeps familiar routes available while offering a clearer starting point for anyone new to the process.</p>
          </div>
          <div className="filing-grid">
            {filing.map((item) => (
              <article className={item.featured ? 'filing-card featured smart-filing-card' : 'filing-card'} key={item.title}>
                <div className="filing-title">
                  <span>{item.num}</span>
                  {item.featured && <small>★ SMART FILING — NEW</small>}
                </div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <button type="button" onClick={() => navigate(item.dest, item.smartDest ? 'smart-filing' : undefined)}>
                  {item.action} <Arrow />
                </button>
                <em>{item.featured ? 'Prototype demo available' : 'Full flow available in prototype'}</em>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Smart Filing Section */}
      <section className="guided-section" id="information">
        <div className="container guided-grid">
          <div>
            <p className="overline pale">SMART FILING — NO GST EXPERTISE REQUIRED</p>
            <h2>Not sure where to start? Just describe what happened.</h2>
            <p>Smart Filing takes the complexity out of GST returns. Simply describe your sales or receipts in plain everyday language, and GEZT automatically guides you to the exact GST sections and prefills your return for you.</p>
            <button className="primary-action" style={{ marginTop: 18 }} onClick={() => navigate('smart-filing')}>
              Try Smart Filing <Arrow />
            </button>
          </div>
          <div className="interpretation-card">
            <div className="interpret-step">
              <span>You describe in plain English</span>
              <p>"I sold 20 laptops to a buyer in Dubai and received an advance payment."</p>
            </div>
            <div className="step-line">↓</div>
            <div className="interpret-step result">
              <span>GEZT Smart Engine guides you to</span>
              <p><strong>6A — Export Invoices</strong><small>Identified as zero-rated export supply</small></p>
              <p style={{ marginTop: 6 }}><strong>11A — Advances Received</strong><small>Prefilled tax liability for advance</small></p>
            </div>
            <div className="review-note">
              <b>✓</b>
              <p>Always under your control. You review and confirm every section before filing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="how-section">
        <div className="container">
          <div className="section-heading">
            <p className="overline">How it works</p>
            <h2>Designed around clarity and control</h2>
          </div>
          <div className="how-grid">
            <article><span>01</span><h3>Start with the task</h3><p>Choose what you need to do, not a tax table number.</p></article>
            <article><span>02</span><h3>Understand what matters</h3><p>See the relevant information and why it is needed.</p></article>
            <article><span>03</span><h3>Review your details</h3><p>Check what has been understood before you move forward.</p></article>
            <article><span>04</span><h3>Use the right service</h3><p>Continue into the appropriate return or taxpayer workflow.</p></article>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="services-section">
        <div className="container">
          <div className="section-heading">
            <p className="overline">Services</p>
            <h2>What would you like to do?</h2>
            <p>Service links open the relevant official GST resource in a new tab.</p>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <article className="service-tile" key={service.title}>
                <span className="service-icon">{service.icon}</span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <a href={service.href} target="_blank" rel="noreferrer">Open service <Arrow /><span className="sr-only"> (opens official GST resource in a new tab)</span></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Help */}
      <section id="help" className="help-section">
        <div className="container help-inner">
          <div>
            <p className="overline">Help and support</p>
            <h2>Need help getting started?</h2>
            <p>Find straightforward explanations, step-by-step guidance and support options for common taxpayer tasks.</p>
          </div>
          <div className="help-links">
            <button type="button" onClick={() => alert('Guides and tutorials coming soon.')}>Guides and tutorials <Arrow /></button>
            <button type="button" onClick={() => alert('FAQ coming soon.')}>Frequently asked questions <Arrow /></button>
            <button type="button" onClick={() => alert('Contact support coming soon.')}>Contact support <Arrow /></button>
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ navigate, onAuth, postLoginDest }) {
  const [gstin, setGstin] = useState(BUSINESS.gstin);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const dest = postLoginDest || 'dashboard';

  const doLogin = () => {
    if (!password && gstin === BUSINESS.gstin) {
      setError('Enter any password.');
      return;
    }
    onAuth(dest);
  };

  const demoLogin = () => {
    onAuth(dest);
  };

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="login-header">
          <p className="overline">GEZT Portal</p>
          <h1 style={{ fontSize: '26px' }}>Sign in to your account</h1>
          <p className="login-sub">Use your GSTIN and portal password.</p>

        </div>

        <div className="field">
          <label htmlFor="login-gstin">GSTIN / Username</label>
          <input id="login-gstin" type="text" value={gstin} onChange={e => setGstin(e.target.value)} autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Enter any password" autoComplete="current-password" />
        </div>
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <button className="primary-action full-width-btn" onClick={doLogin} id="btn-login">
          Sign in <Arrow />
        </button>

        <div className="login-divider"><span>or</span></div>

        <button className="demo-account-btn" onClick={demoLogin} id="btn-demo-login">
          <span className="demo-star">★</span>
          USE DEMO ACCOUNT
          <small>ShreeTech Electronics · {BUSINESS.gstin}</small>
        </button>

        <p className="login-disclaimer">
          <strong>Prototype:</strong> GEZT is a hackathon prototype. Do not use real credentials or taxpayer data.
        </p>
      </div>
    </main>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

function DashboardScreen({ navigate }) {
  const [selectedFy, setSelectedFy] = useState("2026–27");
  const [selectedMonthId, setSelectedMonthId] = useState("sep-2026");
  const [showHistoryView, setShowHistoryView] = useState(false);

  const monthsForFy = FY_PERIODS_DATA[selectedFy] || FY_PERIODS_DATA["2026–27"];
  const currentPeriod = monthsForFy.find(m => m.id === selectedMonthId) || monthsForFy.find(m => m.isCurrent) || monthsForFy[0];

  // Helper counts for summary strip
  let inProgressCount = 0;
  let filedCount = 0;
  let upcomingCount = 0;
  let overdueCount = 0;

  if (currentPeriod.gstr1Status === 'in-progress') inProgressCount++;
  else if (currentPeriod.gstr1Status === 'filed') filedCount++;
  else if (currentPeriod.gstr1Status === 'upcoming') upcomingCount++;
  else if (currentPeriod.gstr1Status === 'overdue') overdueCount++;

  if (currentPeriod.gstr3bStatus === 'in-progress') inProgressCount++;
  else if (currentPeriod.gstr3bStatus === 'filed') filedCount++;
  else if (currentPeriod.gstr3bStatus === 'upcoming') upcomingCount++;
  else if (currentPeriod.gstr3bStatus === 'overdue') overdueCount++;

  const totalReturnsCount = 2; // GSTR-1 & GSTR-3B

  return (
    <main className="portal-page">
      <div className="container">
        <h1 className="page-title" style={{ marginTop: 6 }}>Taxpayer Dashboard</h1>

        <div className="dashboard-grid">
          {/* Taxpayer info */}
          <aside className="taxpayer-panel">
            <div className="taxpayer-panel-head">
              <span className="taxpayer-avatar">{BUSINESS.name[0]}</span>
              <div>
                <strong>{BUSINESS.name}</strong>
                <span>{BUSINESS.tradeName}</span>
              </div>
            </div>
            <dl className="taxpayer-dl">
              <dt>GSTIN</dt><dd><code>{BUSINESS.gstin}</code></dd>
              <dt>State</dt><dd>{BUSINESS.state}</dd>
              <dt>PAN</dt><dd>{BUSINESS.pan}</dd>
              <dt>Constitution</dt><dd>{BUSINESS.constitution}</dd>
              <dt>Registered</dt><dd>{BUSINESS.registrationDate}</dd>
              <dt>Address</dt><dd>{BUSINESS.address}</dd>
              <dt>Email</dt><dd>{BUSINESS.email}</dd>
            </dl>
          </aside>

          {/* Returns / Filing History Panel */}
          <section className="returns-panel">
            {showHistoryView ? (
              <div className="filing-history-section">
                <div className="returns-panel-head history-head">
                  <div>
                    <button type="button" className="history-back-btn" onClick={() => setShowHistoryView(false)}>
                      ← Back to Dashboard
                    </button>
                    <h2 style={{ marginTop: 6 }}>Filing History</h2>
                  </div>
                  <div className="fy-select-box">
                    <label htmlFor="history-fy-select">Financial Year:</label>
                    <select
                      id="history-fy-select"
                      className="fy-dropdown"
                      value={selectedFy}
                      onChange={e => setSelectedFy(e.target.value)}
                    >
                      <option value="2026–27">FY 2026–27</option>
                      <option value="2025–26">FY 2025–26</option>
                    </select>
                  </div>
                </div>

                <div className="history-list">
                  {monthsForFy.map(m => (
                    <div key={m.id} className="history-month-card">
                      <div className="history-month-head">
                        <strong>{m.label}</strong>
                        <span className={`badge badge-${m.status === 'filed' ? 'done' : m.status === 'current' ? 'in-progress' : 'coming-soon'}`}>
                          {m.status === 'filed' ? 'Completed' : m.status === 'current' ? 'Active Period' : 'Upcoming'}
                        </span>
                      </div>
                      <table className="history-table">
                        <tbody>
                          <tr>
                            <td className="history-return-name">
                              <strong>GSTR-1</strong> <small>Outward Supplies</small>
                            </td>
                            <td className="history-return-meta">
                              {m.gstr1Status === 'filed' ? (
                                <span>Filed on {m.gstr1Date} <code className="arn-tag">ARN: {m.gstr1Arn}</code></span>
                              ) : m.gstr1Status === 'in-progress' ? (
                                <span>In Progress (Due: {m.gstr1DueDate})</span>
                              ) : (
                                <span>Due: {m.gstr1DueDate}</span>
                              )}
                            </td>
                            <td className="history-return-status text-right">
                              <span className={`status-pill status-${m.gstr1Status}`}>
                                {m.gstr1Status === 'filed' ? '✓ Filed' : m.gstr1Status === 'in-progress' ? '● In Progress' : '○ Upcoming'}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="history-return-name">
                              <strong>GSTR-3B</strong> <small>Summary Return</small>
                            </td>
                            <td className="history-return-meta">
                              {m.gstr3bStatus === 'filed' ? (
                                <span>Filed on {m.gstr3bDate} <code className="arn-tag">ARN: {m.gstr3bArn}</code></span>
                              ) : (
                                <span>Due: {m.gstr3bDueDate}</span>
                              )}
                            </td>
                            <td className="history-return-status text-right">
                              <span className={`status-pill status-${m.gstr3bStatus}`}>
                                {m.gstr3bStatus === 'filed' ? '✓ Filed' : '○ Upcoming'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="returns-panel-head">
                  <div>
                    <h2>Returns — FY {selectedFy}</h2>
                    <div className="top-summary-strip">
                      <strong className="summary-period-title">{currentPeriod.label}</strong>
                      <span className="summary-divider">•</span>
                      <span><b>{totalReturnsCount}</b> Returns</span>
                      <span className="summary-divider">•</span>
                      <span><b>{inProgressCount}</b> In Progress</span>
                      <span className="summary-divider">•</span>
                      <span><b>{overdueCount}</b> Overdue</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="history-link-btn"
                    onClick={() => setShowHistoryView(true)}
                    id="dash-filing-history"
                  >
                    Filing History →
                  </button>
                </div>

                {/* Timeline Month Selector — Compact Horizontal Dot Row */}
                <div className="timeline-section">
                  <div className="timeline-header">
                    <div className="timeline-fy-badge">FY {selectedFy}</div>
                    <div className="timeline-legend">
                      <span className="legend-item"><span className="status-dot dot-green" /> Filed</span>
                      <span className="legend-item"><span className="status-dot dot-yellow" /> In Progress</span>
                      <span className="legend-item"><span className="status-dot dot-red" /> Overdue</span>
                      <span className="legend-item"><span className="status-dot dot-gray" /> Upcoming</span>
                      <span className="legend-item"><span className="status-dot dot-blue" /> Current Month</span>
                    </div>
                  </div>

                  <div className="timeline-dots-row">
                    {monthsForFy.map((m) => {
                      const isSelected = m.id === selectedMonthId;
                      const isCurrent = m.status === 'current' || m.isCurrent;

                      let dotColorClass = 'dot-gray';
                      let statusLabel = 'Upcoming';

                      if (isCurrent) {
                        dotColorClass = 'dot-blue';
                        statusLabel = 'Current Month';
                      } else if (m.status === 'filed') {
                        dotColorClass = 'dot-green';
                        statusLabel = 'Filed';
                      } else if (m.status === 'in-progress') {
                        dotColorClass = 'dot-yellow';
                        statusLabel = 'In Progress';
                      } else if (m.status === 'overdue') {
                        dotColorClass = 'dot-red';
                        statusLabel = 'Overdue';
                      }

                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`timeline-dot-item ${isCurrent ? 'is-current' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedMonthId(m.id)}
                          aria-label={`Select ${m.label} (${statusLabel})`}
                          title={`${m.label} — ${statusLabel}`}
                        >
                          <span className={`status-dot ${dotColorClass}`} />
                          <span className="item-month-label">{m.shortMonth}</span>
                          {isCurrent && <span className="current-pill">Current</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Return Cards for Selected Month */}
                {/* GSTR-1 */}
                <div className={`return-card ${currentPeriod.gstr1Status === 'in-progress' ? 'active-return' : currentPeriod.gstr1Status === 'filed' ? 'filed-return' : 'disabled-return'}`}>
                  <div className="return-card-top">
                    <div className="return-id">
                      <strong>GSTR-1</strong>
                      <span>Outward Supplies Return</span>
                    </div>
                    <StatusBadge status={currentPeriod.gstr1Status === 'filed' ? 'done' : currentPeriod.gstr1Status} />
                  </div>

                  <div className="return-meta">
                    <span>Period: <b>{currentPeriod.label}</b></span>
                    {currentPeriod.gstr1Status === 'filed' ? (
                      <span>Filed: <b>{currentPeriod.gstr1Date}</b> <code className="arn-tag">ARN: {currentPeriod.gstr1Arn}</code></span>
                    ) : (
                      <span>Due: <b>{currentPeriod.gstr1DueDate || '11th of following month'}</b></span>
                    )}
                  </div>

                  {currentPeriod.gstr1Status === 'in-progress' && (
                    <div className="return-actions">
                      <button className="action-btn" onClick={() => navigate('online-b2b')} id="dash-prepare-online">
                        ▤ Online Direct
                      </button>
                      <button className="action-btn" onClick={() => navigate('offline-landing')} id="dash-prepare-offline">
                        ↓ Offline Utility
                      </button>
                      <button className="action-btn featured-action-btn" onClick={() => navigate('smart-filing')} id="dash-smart-filing">
                        ★ Smart Filing <span className="new-tag">NEW</span>
                      </button>
                    </div>
                  )}

                  {currentPeriod.gstr1Status === 'filed' && (
                    <div className="return-actions">
                      <button className="action-btn primary-action-btn" onClick={() => alert(`Showing filed GSTR-1 details for ${currentPeriod.label}\nARN: ${currentPeriod.gstr1Arn}`)}>
                        View Filed Return
                      </button>
                    </div>
                  )}

                  {currentPeriod.gstr1Status === 'upcoming' && (
                    <p className="coming-soon-note">Filing for {currentPeriod.label} will open after period end.</p>
                  )}
                </div>

                {/* GSTR-3B */}
                <div className={`return-card ${currentPeriod.gstr3bStatus === 'filed' ? 'filed-return' : 'disabled-return'}`}>
                  <div className="return-card-top">
                    <div className="return-id">
                      <strong>GSTR-3B</strong>
                      <span>Summary Return</span>
                    </div>
                    <StatusBadge status={currentPeriod.gstr3bStatus === 'filed' ? 'done' : currentPeriod.gstr3bStatus} />
                  </div>

                  <div className="return-meta">
                    <span>Period: <b>{currentPeriod.label}</b></span>
                    {currentPeriod.gstr3bStatus === 'filed' ? (
                      <span>Filed: <b>{currentPeriod.gstr3bDate}</b> <code className="arn-tag">ARN: {currentPeriod.gstr3bArn}</code></span>
                    ) : (
                      <span>Due: <b>{currentPeriod.gstr3bDueDate || '20th of following month'}</b></span>
                    )}
                  </div>

                  {currentPeriod.gstr3bStatus === 'filed' ? (
                    <div className="return-actions">
                      <button className="action-btn" onClick={() => alert(`Showing filed GSTR-3B details for ${currentPeriod.label}\nARN: ${currentPeriod.gstr3bArn}`)}>
                        View Summary
                      </button>
                    </div>
                  ) : (
                    <p className="coming-soon-note">GSTR-3B filing will be available in a later prototype stage.</p>
                  )}
                </div>

                {/* GSTR-1A */}
                <div className="return-card disabled-return">
                  <div className="return-card-top">
                    <div className="return-id">
                      <strong>GSTR-1A</strong>
                      <span>Amendment to GSTR-1</span>
                    </div>
                    <StatusBadge status="coming-soon" />
                  </div>
                  <div className="return-meta">
                    <span>Period: <b>{currentPeriod.label}</b></span>
                  </div>
                  <p className="coming-soon-note">GSTR-1A will be enabled after GSTR-1 is filed.</p>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

// ─── GSTR-1 Method Select ─────────────────────────────────────────────────────

function Gstr1SelectScreen({ navigate }) {
  return (
    <main className="portal-page">
      <div className="container">
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('dashboard')}>Dashboard</button> <span>/</span>
          <span>GSTR-1</span>
        </div>
        <h1 className="page-title">Prepare GSTR-1 — {RETURN_PERIOD.label}</h1>
        <p className="page-sub">Select a preparation method to continue. You can switch methods at any point before submission.</p>

        <div className="select-method-grid">
          <article className="method-card" onClick={() => navigate('online-b2b')} tabIndex={0} role="button" id="method-online">
            <span className="method-icon">▤</span>
            <h3>Prepare Online</h3>
            <p>Fill each GSTR-1 section directly in the portal. Suitable for taxpayers with a moderate number of invoices.</p>
            <span className="method-link">Start online <Arrow /></span>
          </article>
          <article className="method-card" onClick={() => navigate('offline-landing')} tabIndex={0} role="button" id="method-offline">
            <span className="method-icon">↓</span>
            <h3>Prepare Offline</h3>
            <p>Download an Excel/CSV template, fill in your data, and upload the file for validation and processing.</p>
            <span className="method-link">Start offline <Arrow /></span>
          </article>
          <article className="method-card featured-method" onClick={() => navigate('smart-filing')} tabIndex={0} role="button" id="method-smart">
            <span className="method-icon">★</span>
            <div className="method-new-badge">NEW</div>
            <h3>Smart Filing</h3>
            <p>Describe what happened in your business. GEZT identifies the relevant GST sections and prefills what it can.</p>
            <span className="method-link">Try Smart Filing <Arrow /></span>
          </article>
        </div>
      </div>
    </main>
  );
}

// ─── Online Filing Screen ─────────────────────────────────────────────────────

const SIDEBAR_TABS = [
  { key: 'b2b', label: '4A — B2B Invoices' },
  { key: 'b2c', label: '5 — B2C Invoices' },
  { key: 'exports', label: '6A — Exports' },
  { key: 'cdn', label: '9B — Cr / Dr Notes' },
  { key: 'advances', label: '11A — Advances' },
  { key: 'amendments', label: '9A — Amendments' },
  { key: 'hsn', label: '12 — HSN Summary' },
  { key: 'docs', label: '13 — Documents' },
];

function OnlineFilingScreen({ navigate, filingState, setFilingState, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'b2b');
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768) ? 'cards' : 'table');

  const tabCounts = {
    b2b: filingState.b2bInvoices.length,
    b2c: filingState.b2cInvoices.length,
    exports: filingState.exports.length,
    cdn: filingState.creditNotes.length,
    advances: filingState.advances.length,
    amendments: filingState.amendments.length,
    hsn: filingState.hsnSummary.length,
    docs: filingState.documentSeries.length,
  };

  const goNext = () => {
    const idx = SIDEBAR_TABS.findIndex(t => t.key === tab);
    if (idx < SIDEBAR_TABS.length - 1) setTab(SIDEBAR_TABS[idx + 1].key);
    else navigate('online-summary');
  };
  const goPrev = () => {
    const idx = SIDEBAR_TABS.findIndex(t => t.key === tab);
    if (idx > 0) setTab(SIDEBAR_TABS[idx - 1].key);
    else navigate('gstr1-select');
  };

  const tabContent = {
    b2b: <B2BSection filingState={filingState} setFilingState={setFilingState} viewMode={viewMode} />,
    b2c: <B2CSection filingState={filingState} setFilingState={setFilingState} viewMode={viewMode} />,
    exports: <ExportsSection filingState={filingState} setFilingState={setFilingState} viewMode={viewMode} />,
    cdn: <CDNSection filingState={filingState} setFilingState={setFilingState} viewMode={viewMode} />,
    advances: <AdvancesSection filingState={filingState} setFilingState={setFilingState} viewMode={viewMode} />,
    amendments: <AmendmentsSection filingState={filingState} setFilingState={setFilingState} viewMode={viewMode} />,
    hsn: <HSNSection filingState={filingState} setFilingState={setFilingState} viewMode={viewMode} />,
    docs: <DocsSection filingState={filingState} setFilingState={setFilingState} viewMode={viewMode} />,
  };

  return (
    <main className="portal-page portal-filing-page">
      <div className="container">
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('dashboard')}>Dashboard</button> <span>/</span>
          <span>Online Filing</span>
        </div>
        <div className="filing-header-bar">
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>GSTR-1 — Online Filing</h1>
            <p className="page-sub" style={{ margin: 0 }}>{BUSINESS.name} · {BUSINESS.gstin} · {RETURN_PERIOD.label}</p>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="view-toggle-bar">
              <span className="view-toggle-label">Layout:</span>
              <div className="view-toggle-group">
                <button type="button" className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`} onClick={() => setViewMode('table')}>
                  ▤ Table
                </button>
                <button type="button" className={`view-toggle-btn${viewMode === 'cards' ? ' active' : ''}`} onClick={() => setViewMode('cards')}>
                  🗂️ Cards
                </button>
              </div>
            </div>
            <button className="action-btn primary-action-btn" onClick={() => navigate('online-summary')} id="btn-go-summary">
              View Summary <Arrow />
            </button>
          </div>
        </div>
      </div>

      <div className="portal-layout">
        <div className="container portal-layout-inner">
          {/* Sidebar */}
          <aside className="portal-sidebar">
            <nav className="sidebar-nav" aria-label="GSTR-1 sections">
              {SIDEBAR_TABS.map(t => (
                <button
                  key={t.key}
                  className={`sidebar-nav-item${tab === t.key ? ' active' : ''}`}
                  onClick={() => setTab(t.key)}
                  id={`tab-${t.key}`}
                >
                  <span>{t.label}</span>
                  {tabCounts[t.key] > 0 && <span style={{ marginLeft: 6, opacity: 0.85, fontSize: '0.9em' }}>({tabCounts[t.key]})</span>}
                </button>
              ))}
            </nav>
            <div className="sidebar-actions">
              <button className="sidebar-summary-btn" onClick={() => navigate('online-summary')}>
                Summary &amp; Submit <Arrow />
              </button>
            </div>
          </aside>

          {/* Main content */}
          <section className="portal-main">
            {tabContent[tab]}
            <div className="filing-footer">
              <button className="action-btn" onClick={goPrev}>← Previous</button>
              <button className="action-btn primary-action-btn" onClick={goNext}>
                {tab === 'docs' ? 'Go to Summary' : 'Save & Next'} <Arrow />
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

// B2B Section — most interactive

function B2BSection({ filingState, setFilingState, viewMode }) {
  const emptyForm = { invoiceNo: '', invoiceDate: '', recipientGstin: '', recipientName: '', pos: '27', invoiceValue: '', taxableValue: '', gstRate: '18', igst: '', cgst: '', sgst: '', hsn: '', reverseCharge: 'N' };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  // Pick up highlight from Smart Filing additions
  useEffect(() => {
    if (filingState.smartLastAddedId) {
      const exists = filingState.b2bInvoices.some(i => i.id === filingState.smartLastAddedId);
      if (exists) setLastAddedId(filingState.smartLastAddedId);
    }
  }, [filingState.smartLastAddedId, filingState.b2bInvoices]);


  const validate = () => {
    const errs = {};
    if (!form.invoiceNo.trim()) errs.invoiceNo = 'Required';
    if (!form.invoiceDate) errs.invoiceDate = 'Required';
    const gErr = validateGstin(form.recipientGstin);
    if (gErr) errs.recipientGstin = gErr;
    if (!form.recipientName.trim()) errs.recipientName = 'Required';
    if (!form.taxableValue || isNaN(form.taxableValue)) errs.taxableValue = 'Enter a valid amount';
    return errs;
  };


  const saveInvoice = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const rate = Number(form.gstRate);
    const taxable = Number(form.taxableValue);
    const tax = taxable * rate / 100;
    const isIntra = form.pos === '29';
    const newInv = {
      id: `b2b-new-${Date.now()}`,
      ...form,
      invoiceValue: taxable + tax,
      taxableValue: taxable,
      gstRate: rate,
      igst: isIntra ? 0 : tax,
      cgst: isIntra ? tax / 2 : 0,
      sgst: isIntra ? tax / 2 : 0,
      cess: 0,
      posName: PLACES_OF_SUPPLY.find(p => p.code === form.pos)?.name || form.pos,
      status: 'saved',
    };
    setFilingState(s => ({ ...s, b2bInvoices: [...s.b2bInvoices, newInv] }));
    setLastAddedId(newInv.id);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(false);
  };

  const removeInvoice = (id) => {
    if (window.confirm('Remove this invoice?')) {
      setFilingState(s => ({ ...s, b2bInvoices: s.b2bInvoices.filter(i => i.id !== id) }));
      if (lastAddedId === id) setLastAddedId(null);
    }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const totalTaxable = filingState.b2bInvoices.reduce((s, i) => s + (Number(i.taxableValue) || 0), 0);
  const totalTax = filingState.b2bInvoices.reduce((s, i) => s + (Number(i.igst) || 0) + (Number(i.cgst) || 0) + (Number(i.sgst) || 0), 0);

  return (
    <div className="section-content">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">4A — B2B Invoices</h2>
          <p className="section-desc">Invoices issued to registered GST taxpayers.</p>
        </div>
        <button className="action-btn primary-action-btn" onClick={() => setShowForm(!showForm)} id="btn-add-invoice">
          {showForm ? '✕ Cancel' : '+ Add Invoice'}
        </button>
      </div>

      <div className="section-metrics-strip">
        <div className="metric-chip"><label>Invoices:</label> <strong>{filingState.b2bInvoices.length}</strong></div>
        <div className="metric-chip"><label>Total Taxable:</label> <strong>{formatCurrency(totalTaxable)}</strong></div>
        <div className="metric-chip"><label>Total Tax:</label> <strong>{formatCurrency(totalTax)}</strong></div>
      </div>

      {showForm && (
        <div className="add-invoice-form">
          <h3 className="form-section-title">New B2B Invoice</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Invoice Number *</label>
              <input type="text" value={form.invoiceNo} onChange={e => f('invoiceNo', e.target.value)} placeholder="INV-XXXX" id="field-inv-no" />
              {formErrors.invoiceNo && <span className="field-error">{formErrors.invoiceNo}</span>}
            </div>
            <div className="field">
              <label>Invoice Date *</label>
              <input type="date" value={form.invoiceDate} onChange={e => f('invoiceDate', e.target.value)} id="field-inv-date" />
              {formErrors.invoiceDate && <span className="field-error">{formErrors.invoiceDate}</span>}
            </div>
            <div className="field">
              <label>Recipient GSTIN *</label>
              <input type="text" value={form.recipientGstin} onChange={e => f('recipientGstin', e.target.value.toUpperCase())} placeholder="27AAAAA0000A1Z5" maxLength={15} id="field-rec-gstin" />
              {formErrors.recipientGstin && <span className="field-error">{formErrors.recipientGstin}</span>}
            </div>
            <div className="field">
              <label>Recipient Name *</label>
              <input type="text" value={form.recipientName} onChange={e => f('recipientName', e.target.value)} placeholder="Company name" id="field-rec-name" />
              {formErrors.recipientName && <span className="field-error">{formErrors.recipientName}</span>}
            </div>
            <div className="field">
              <label>Place of Supply</label>
              <select value={form.pos} onChange={e => f('pos', e.target.value)} id="field-pos">
                {PLACES_OF_SUPPLY.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>GST Rate (%)</label>
              <select value={form.gstRate} onChange={e => f('gstRate', e.target.value)} id="field-gst-rate">
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="field">
              <label>Taxable Value (₹) *</label>
              <input type="number" value={form.taxableValue} onChange={e => f('taxableValue', e.target.value)} placeholder="0" id="field-taxable" />
              {formErrors.taxableValue && <span className="field-error">{formErrors.taxableValue}</span>}
            </div>
            <div className="field">
              <label>HSN Code</label>
              <input type="text" value={form.hsn} onChange={e => f('hsn', e.target.value)} placeholder="e.g. 8471" id="field-hsn" />
            </div>
            <div className="field">
              <label>Reverse Charge</label>
              <select value={form.reverseCharge} onChange={e => f('reverseCharge', e.target.value)} id="field-rc">
                <option value="N">No</option>
                <option value="Y">Yes</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="action-btn primary-action-btn" onClick={saveInvoice} id="btn-save-invoice">Save Invoice</button>
            <button className="action-btn" onClick={() => { setShowForm(false); setFormErrors({}); }}>Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="data-cards-grid">
          {filingState.b2bInvoices.map(inv => {
            const isLatest = inv.id === lastAddedId;
            return (
              <div key={inv.id} className={`data-card${isLatest ? ' recently-added-card' : ''}`}>
                <div className="data-card-header">
                  <div>
                    <span className="data-card-title">{inv.invoiceNo}</span>
                    {isLatest && <span className="recently-added-tag">Newly Added</span>}
                    <span className="data-card-date">{formatDate(inv.invoiceDate)}</span>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="data-card-body">
                  <div className="data-card-row">
                    <span className="data-card-label">Recipient</span>
                    <span className="data-card-value">{inv.recipientName}</span>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">GSTIN</span>
                    <code className="data-card-code">{inv.recipientGstin}</code>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">POS</span>
                    <span className="data-card-value">{inv.posName}</span>
                  </div>
                  <div className="data-card-divider" />
                  <div className="data-card-row accent-row">
                    <span className="data-card-label">Taxable Value</span>
                    <strong className="data-card-amount">{formatCurrency(inv.taxableValue)}</strong>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">GST Rate</span>
                    <span>{inv.gstRate}%</span>
                  </div>
                </div>
                {(inv.status === 'saved' || inv.id.startsWith('b2b-new-')) && (
                  <div className="data-card-footer">
                    <button className="row-remove-btn" onClick={() => removeInvoice(inv.id)}>✕ Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="b2b-table">
            <thead>
              <tr>
                <th>Invoice No.</th><th>Date</th><th>Recipient</th><th>GSTIN</th>
                <th>POS</th><th>Taxable (₹)</th><th>IGST (₹)</th><th>CGST (₹)</th><th>SGST (₹)</th>
                <th>Rate</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filingState.b2bInvoices.map(inv => {
                const isLatest = inv.id === lastAddedId;
                return (
                  <tr key={inv.id} className={isLatest ? 'recently-added-row' : ''}>
                    <td><code>{inv.invoiceNo}</code>{isLatest && <span className="recently-added-tag">Newly Added</span>}</td>
                    <td>{formatDate(inv.invoiceDate)}</td>
                    <td className="col-name">{inv.recipientName}</td>
                    <td><code>{inv.recipientGstin}</code></td>
                    <td>{inv.posName}</td>
                    <td className="num">{formatCurrency(inv.taxableValue)}</td>
                    <td className="num">{inv.igst ? formatCurrency(inv.igst) : '—'}</td>
                    <td className="num">{inv.cgst ? formatCurrency(inv.cgst) : '—'}</td>
                    <td className="num">{inv.sgst ? formatCurrency(inv.sgst) : '—'}</td>
                    <td>{inv.gstRate}%</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>
                      {(inv.status === 'saved' || inv.id.startsWith('b2b-new-')) && (
                        <button className="row-remove-btn" onClick={() => removeInvoice(inv.id)} title="Remove">✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-total">
                <td colSpan={5}><strong>Total ({filingState.b2bInvoices.length} invoices)</strong></td>
                <td className="num"><strong>{formatCurrency(totalTaxable)}</strong></td>
                <td className="num"><strong>{formatCurrency(filingState.b2bInvoices.reduce((s, i) => s + (Number(i.igst) || 0), 0))}</strong></td>
                <td className="num"><strong>{formatCurrency(filingState.b2bInvoices.reduce((s, i) => s + (Number(i.cgst) || 0), 0))}</strong></td>
                <td className="num"><strong>{formatCurrency(filingState.b2bInvoices.reduce((s, i) => s + (Number(i.sgst) || 0), 0))}</strong></td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// B2C Section
function B2CSection({ filingState, setFilingState, viewMode }) {
  const emptyForm = { invoiceNo: '', invoiceDate: '', type: 'intrastate', pos: '29', gstRate: '18', taxableValue: '' };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  // Pick up highlight from Smart Filing additions
  useEffect(() => {
    if (filingState.smartLastAddedId) {
      const exists = filingState.b2cInvoices.some(i => i.id === filingState.smartLastAddedId);
      if (exists) setLastAddedId(filingState.smartLastAddedId);
    }
  }, [filingState.smartLastAddedId, filingState.b2cInvoices]);

  const validate = () => {

    const errs = {};
    if (!form.invoiceNo.trim()) errs.invoiceNo = 'Required';
    if (!form.invoiceDate) errs.invoiceDate = 'Required';
    if (!form.taxableValue || isNaN(form.taxableValue)) errs.taxableValue = 'Enter valid taxable value';
    return errs;
  };

  const saveRecord = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const rate = Number(form.gstRate);
    const taxable = Number(form.taxableValue);
    const tax = taxable * rate / 100;
    const isIntra = form.type === 'intrastate';
    const newRec = {
      id: `b2c-new-${Date.now()}`,
      ...form,
      taxableValue: taxable,
      gstRate: rate,
      igst: isIntra ? 0 : tax,
      cgst: isIntra ? tax / 2 : 0,
      sgst: isIntra ? tax / 2 : 0,
      cess: 0,
      posName: PLACES_OF_SUPPLY.find(p => p.code === form.pos)?.name || form.pos,
      status: 'saved',
    };
    setFilingState(s => ({ ...s, b2cInvoices: [...s.b2cInvoices, newRec] }));
    setLastAddedId(newRec.id);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(false);
  };

  const removeRecord = (id) => {
    if (window.confirm('Remove this record?')) {
      setFilingState(s => ({ ...s, b2cInvoices: s.b2cInvoices.filter(i => i.id !== id) }));
      if (lastAddedId === id) setLastAddedId(null);
    }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const totalTaxable = filingState.b2cInvoices.reduce((s, i) => s + (Number(i.taxableValue) || 0), 0);

  return (
    <div className="section-content">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">5 — B2C Invoices</h2>
          <p className="section-desc">Invoices to unregistered consumers.</p>
        </div>
        <button className="action-btn primary-action-btn" onClick={() => setShowForm(!showForm)} id="btn-add-b2c">
          {showForm ? '✕ Cancel' : '+ Add Record'}
        </button>
      </div>

      <div className="section-metrics-strip">
        <div className="metric-chip"><label>Invoices:</label> <strong>{filingState.b2cInvoices.length}</strong></div>
        <div className="metric-chip"><label>Total Taxable:</label> <strong>{formatCurrency(totalTaxable)}</strong></div>
      </div>

      {showForm && (
        <div className="add-invoice-form">
          <h3 className="form-section-title">New B2C Invoice</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Invoice Number *</label>
              <input type="text" value={form.invoiceNo} onChange={e => f('invoiceNo', e.target.value)} placeholder="B2C-XXXX" id="field-b2c-inv-no" />
              {formErrors.invoiceNo && <span className="field-error">{formErrors.invoiceNo}</span>}
            </div>
            <div className="field">
              <label>Invoice Date *</label>
              <input type="date" value={form.invoiceDate} onChange={e => f('invoiceDate', e.target.value)} id="field-b2c-date" />
              {formErrors.invoiceDate && <span className="field-error">{formErrors.invoiceDate}</span>}
            </div>
            <div className="field">
              <label>Supply Type</label>
              <select value={form.type} onChange={e => f('type', e.target.value)} id="field-b2c-type">
                <option value="intrastate">Intrastate (Within State)</option>
                <option value="interstate">Interstate (Outside State)</option>
              </select>
            </div>
            <div className="field">
              <label>Place of Supply</label>
              <select value={form.pos} onChange={e => f('pos', e.target.value)} id="field-b2c-pos">
                {PLACES_OF_SUPPLY.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>GST Rate (%)</label>
              <select value={form.gstRate} onChange={e => f('gstRate', e.target.value)} id="field-b2c-rate">
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="field">
              <label>Taxable Value (₹) *</label>
              <input type="number" value={form.taxableValue} onChange={e => f('taxableValue', e.target.value)} placeholder="0" id="field-b2c-taxable" />
              {formErrors.taxableValue && <span className="field-error">{formErrors.taxableValue}</span>}
            </div>
          </div>
          <div className="form-actions">
            <button className="action-btn primary-action-btn" onClick={saveRecord} id="btn-save-b2c">Save Record</button>
            <button className="action-btn" onClick={() => { setShowForm(false); setFormErrors({}); }}>Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="data-cards-grid">
          {filingState.b2cInvoices.map(inv => {
            const isLatest = inv.id === lastAddedId;
            return (
              <div key={inv.id} className={`data-card${isLatest ? ' recently-added-card' : ''}`}>
                <div className="data-card-header">
                  <div>
                    <span className="data-card-title">{inv.invoiceNo}</span>
                    {isLatest && <span className="recently-added-tag">Newly Added</span>}
                    <span className="data-card-date">{formatDate(inv.invoiceDate)}</span>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="data-card-body">
                  <div className="data-card-row">
                    <span className="data-card-label">Supply Type</span>
                    <span className={`type-tag ${inv.type}`}>{inv.type === 'intrastate' ? 'Intra' : 'Inter'}</span>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">POS</span>
                    <span className="data-card-value">{inv.posName}</span>
                  </div>
                  <div className="data-card-divider" />
                  <div className="data-card-row accent-row">
                    <span className="data-card-label">Taxable Value</span>
                    <strong className="data-card-amount">{formatCurrency(inv.taxableValue)}</strong>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">GST Rate</span>
                    <span>{inv.gstRate}%</span>
                  </div>
                </div>
                {(inv.status === 'saved' || inv.id.startsWith('b2c-new-')) && (
                  <div className="data-card-footer">
                    <button className="row-remove-btn" onClick={() => removeRecord(inv.id)}>✕ Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="b2c-table">
            <thead>
              <tr><th>Invoice No.</th><th>Date</th><th>Type</th><th>POS</th><th>Taxable (₹)</th><th>IGST (₹)</th><th>CGST (₹)</th><th>SGST (₹)</th><th>Rate</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filingState.b2cInvoices.map(inv => {
                const isLatest = inv.id === lastAddedId;
                return (
                  <tr key={inv.id} className={isLatest ? 'recently-added-row' : ''}>
                    <td><code>{inv.invoiceNo}</code>{isLatest && <span className="recently-added-tag">Newly Added</span>}</td>
                    <td>{formatDate(inv.invoiceDate)}</td>
                    <td><span className={`type-tag ${inv.type}`}>{inv.type === 'intrastate' ? 'Intra' : 'Inter'}</span></td>
                    <td>{inv.posName}</td>
                    <td className="num">{formatCurrency(inv.taxableValue)}</td>
                    <td className="num">{inv.igst ? formatCurrency(inv.igst) : '—'}</td>
                    <td className="num">{inv.cgst ? formatCurrency(inv.cgst) : '—'}</td>
                    <td className="num">{inv.sgst ? formatCurrency(inv.sgst) : '—'}</td>
                    <td>{inv.gstRate}%</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>
                      {(inv.status === 'saved' || inv.id.startsWith('b2c-new-')) && (
                        <button className="row-remove-btn" onClick={() => removeRecord(inv.id)} title="Remove">✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-total">
                <td colSpan={4}><strong>Total ({filingState.b2cInvoices.length} invoices)</strong></td>
                <td className="num"><strong>{formatCurrency(totalTaxable)}</strong></td>
                <td colSpan={6}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// Exports Section
function ExportsSection({ filingState, setFilingState, viewMode }) {
  const emptyForm = { invoiceNo: '', invoiceDate: '', shippingBillNo: '', shippingBillDate: '', portName: 'Chennai Sea Port', country: 'United Arab Emirates', currencyCode: 'USD', foreignCurrencyValue: '', invoiceValue: '', exportType: 'WOPT' };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  useEffect(() => {
    if (filingState.smartLastAddedId) {
      const exists = filingState.exports.some(i => i.id === filingState.smartLastAddedId);
      if (exists) setLastAddedId(filingState.smartLastAddedId);
    }
  }, [filingState.smartLastAddedId, filingState.exports]);

  const validate = () => {
    const errs = {};
    if (!form.invoiceNo.trim()) errs.invoiceNo = 'Required';
    if (!form.invoiceDate) errs.invoiceDate = 'Required';
    if (!form.shippingBillNo.trim()) errs.shippingBillNo = 'Required';
    if (!form.invoiceValue || isNaN(form.invoiceValue)) errs.invoiceValue = 'Enter valid INR value';
    return errs;
  };

  const saveRecord = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const inrVal = Number(form.invoiceValue);
    const foreignVal = Number(form.foreignCurrencyValue) || 0;
    const newRec = {
      id: `exp-new-${Date.now()}`,
      ...form,
      invoiceValue: inrVal,
      taxableValue: inrVal,
      foreignCurrencyValue: foreignVal,
      gstRate: 0,
      igst: 0,
      status: 'saved',
    };
    setFilingState(s => ({ ...s, exports: [...s.exports, newRec] }));
    setLastAddedId(newRec.id);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(false);
  };

  const removeRecord = (id) => {
    if (window.confirm('Remove this record?')) {
      setFilingState(s => ({ ...s, exports: s.exports.filter(e => e.id !== id) }));
      if (lastAddedId === id) setLastAddedId(null);
    }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const totalValue = filingState.exports.reduce((s, e) => s + (Number(e.invoiceValue) || 0), 0);

  return (
    <div className="section-content">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">6A — Export Invoices</h2>
          <p className="section-desc">Zero-rated supplies (exports).</p>
        </div>
        <button className="action-btn primary-action-btn" onClick={() => setShowForm(!showForm)} id="btn-add-export">
          {showForm ? '✕ Cancel' : '+ Add Export Record'}
        </button>
      </div>

      <div className="section-metrics-strip">
        <div className="metric-chip"><label>Records:</label> <strong>{filingState.exports.length}</strong></div>
        <div className="metric-chip"><label>Total INR Value:</label> <strong>{formatCurrency(totalValue)}</strong></div>
      </div>

      {showForm && (
        <div className="add-invoice-form">
          <h3 className="form-section-title">New Export Record</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Invoice Number *</label>
              <input type="text" value={form.invoiceNo} onChange={e => f('invoiceNo', e.target.value)} placeholder="EXP-XXXX" id="field-exp-inv-no" />
              {formErrors.invoiceNo && <span className="field-error">{formErrors.invoiceNo}</span>}
            </div>
            <div className="field">
              <label>Invoice Date *</label>
              <input type="date" value={form.invoiceDate} onChange={e => f('invoiceDate', e.target.value)} id="field-exp-date" />
              {formErrors.invoiceDate && <span className="field-error">{formErrors.invoiceDate}</span>}
            </div>
            <div className="field">
              <label>Shipping Bill No. *</label>
              <input type="text" value={form.shippingBillNo} onChange={e => f('shippingBillNo', e.target.value)} placeholder="SB-XXXX" id="field-exp-sb" />
              {formErrors.shippingBillNo && <span className="field-error">{formErrors.shippingBillNo}</span>}
            </div>
            <div className="field">
              <label>Port Name</label>
              <input type="text" value={form.portName} onChange={e => f('portName', e.target.value)} placeholder="e.g. Chennai Sea Port" id="field-exp-port" />
            </div>
            <div className="field">
              <label>Country</label>
              <input type="text" value={form.country} onChange={e => f('country', e.target.value)} placeholder="e.g. Singapore" id="field-exp-country" />
            </div>
            <div className="field">
              <label>Currency</label>
              <select value={form.currencyCode} onChange={e => f('currencyCode', e.target.value)} id="field-exp-currency">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (Dh)</option>
                <option value="SGD">SGD ($)</option>
              </select>
            </div>
            <div className="field">
              <label>Foreign Value</label>
              <input type="number" value={form.foreignCurrencyValue} onChange={e => f('foreignCurrencyValue', e.target.value)} placeholder="0" id="field-exp-foreign-val" />
            </div>
            <div className="field">
              <label>INR Value (₹) *</label>
              <input type="number" value={form.invoiceValue} onChange={e => f('invoiceValue', e.target.value)} placeholder="0" id="field-exp-inr-val" />
              {formErrors.invoiceValue && <span className="field-error">{formErrors.invoiceValue}</span>}
            </div>
            <div className="field">
              <label>Export Type</label>
              <select value={form.exportType} onChange={e => f('exportType', e.target.value)} id="field-exp-type">
                <option value="WOPT">Without Payment of Tax (WOPT)</option>
                <option value="WPAY">With Payment of Tax (WPAY)</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="action-btn primary-action-btn" onClick={saveRecord} id="btn-save-export">Save Export Record</button>
            <button className="action-btn" onClick={() => { setShowForm(false); setFormErrors({}); }}>Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="data-cards-grid">
          {filingState.exports.map(exp => {
            const isLatest = exp.id === lastAddedId;
            return (
              <div key={exp.id} className={`data-card${isLatest ? ' recently-added-card' : ''}`}>
                <div className="data-card-header">
                  <div>
                    <span className="data-card-title">{exp.invoiceNo}</span>
                    {isLatest && <span className="recently-added-tag">Newly Added</span>}
                    <span className="data-card-date">{formatDate(exp.invoiceDate)}</span>
                  </div>
                  <StatusBadge status={exp.status} />
                </div>
                <div className="data-card-body">
                  <div className="data-card-row">
                    <span className="data-card-label">Shipping Bill</span>
                    <code className="data-card-code">{exp.shippingBillNo}</code>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">Port / Country</span>
                    <span className="data-card-value">{exp.portName} ({exp.country})</span>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">Foreign Amount</span>
                    <span className="data-card-value">{exp.currencyCode} {Number(exp.foreignCurrencyValue || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="data-card-divider" />
                  <div className="data-card-row accent-row">
                    <span className="data-card-label">INR Value</span>
                    <strong className="data-card-amount">{formatCurrency(exp.invoiceValue)}</strong>
                  </div>
                </div>
                {(exp.status === 'saved' || exp.id.startsWith('exp-new-')) && (
                  <div className="data-card-footer">
                    <button className="row-remove-btn" onClick={() => removeRecord(exp.id)}>✕ Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="exports-table">
            <thead>
              <tr><th>Invoice No.</th><th>Date</th><th>Shipping Bill</th><th>Port</th><th>Country</th><th>Currency</th><th>Foreign Value</th><th>INR Value (₹)</th><th>Type</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filingState.exports.map(exp => {
                const isLatest = exp.id === lastAddedId;
                return (
                  <tr key={exp.id} className={isLatest ? 'recently-added-row' : ''}>
                    <td><code>{exp.invoiceNo}</code>{isLatest && <span className="recently-added-tag">Newly Added</span>}</td>
                    <td>{formatDate(exp.invoiceDate)}</td>
                    <td><code>{exp.shippingBillNo}</code></td>
                    <td>{exp.portName}</td>
                    <td>{exp.country}</td>
                    <td>{exp.currencyCode}</td>
                    <td className="num">{Number(exp.foreignCurrencyValue || 0).toLocaleString('en-IN')}</td>
                    <td className="num">{formatCurrency(exp.invoiceValue)}</td>
                    <td><span className="type-tag">{exp.exportType}</span></td>
                    <td><StatusBadge status={exp.status} /></td>
                    <td>
                      {(exp.status === 'saved' || exp.id.startsWith('exp-new-')) && (
                        <button className="row-remove-btn" onClick={() => removeRecord(exp.id)} title="Remove">✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-total">
                <td colSpan={7}><strong>Total ({filingState.exports.length} records)</strong></td>
                <td className="num"><strong>{formatCurrency(totalValue)}</strong></td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// Credit/Debit Notes Section
function CDNSection({ filingState, setFilingState, viewMode }) {
  const emptyForm = { noteNo: '', noteDate: '', noteType: 'Credit', recipientGstin: '', recipientName: '', originalInvoiceNo: '', taxableValue: '', gstRate: '18', reason: 'Sales return' };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  useEffect(() => {
    if (filingState.smartLastAddedId) {
      const exists = filingState.creditNotes.some(i => i.id === filingState.smartLastAddedId);
      if (exists) setLastAddedId(filingState.smartLastAddedId);
    }
  }, [filingState.smartLastAddedId, filingState.creditNotes]);

  const validate = () => {
    const errs = {};
    if (!form.noteNo.trim()) errs.noteNo = 'Required';
    if (!form.noteDate) errs.noteDate = 'Required';
    if (!form.recipientName.trim()) errs.recipientName = 'Required';
    if (!form.originalInvoiceNo.trim()) errs.originalInvoiceNo = 'Required';
    if (!form.taxableValue || isNaN(form.taxableValue)) errs.taxableValue = 'Enter valid taxable value';
    return errs;
  };

  const saveRecord = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const rate = Number(form.gstRate);
    const taxable = Number(form.taxableValue);
    const tax = taxable * rate / 100;
    const isIntra = form.recipientGstin.startsWith('29');
    const newRec = {
      id: `cdn-new-${Date.now()}`,
      ...form,
      taxableValue: taxable,
      noteValue: taxable + tax,
      gstRate: rate,
      igst: isIntra ? 0 : tax,
      cgst: isIntra ? tax / 2 : 0,
      sgst: isIntra ? tax / 2 : 0,
      status: 'saved',
    };
    setFilingState(s => ({ ...s, creditNotes: [...s.creditNotes, newRec] }));
    setLastAddedId(newRec.id);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(false);
  };

  const removeRecord = (id) => {
    if (window.confirm('Remove this note?')) {
      setFilingState(s => ({ ...s, creditNotes: s.creditNotes.filter(n => n.id !== id) }));
      if (lastAddedId === id) setLastAddedId(null);
    }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const totalTaxable = filingState.creditNotes.reduce((s, n) => s + (Number(n.taxableValue) || 0), 0);

  return (
    <div className="section-content">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">9B — Credit / Debit Notes (Registered)</h2>
          <p className="section-desc">{filingState.creditNotes.length} notes loaded.</p>
        </div>
        <button className="action-btn primary-action-btn" onClick={() => setShowForm(!showForm)} id="btn-add-cdn">
          {showForm ? '✕ Cancel' : '+ Add Note'}
        </button>
      </div>

      <div className="section-metrics-strip">
        <div className="metric-chip"><label>Notes:</label> <strong>{filingState.creditNotes.length}</strong></div>
        <div className="metric-chip"><label>Total Value:</label> <strong>{formatCurrency(totalTaxable)}</strong></div>
      </div>

      {showForm && (
        <div className="add-invoice-form">
          <h3 className="form-section-title">New Credit / Debit Note</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Note Number *</label>
              <input type="text" value={form.noteNo} onChange={e => f('noteNo', e.target.value)} placeholder="CDN-XXXX" id="field-cdn-no" />
              {formErrors.noteNo && <span className="field-error">{formErrors.noteNo}</span>}
            </div>
            <div className="field">
              <label>Note Date *</label>
              <input type="date" value={form.noteDate} onChange={e => f('noteDate', e.target.value)} id="field-cdn-date" />
              {formErrors.noteDate && <span className="field-error">{formErrors.noteDate}</span>}
            </div>
            <div className="field">
              <label>Note Type</label>
              <select value={form.noteType} onChange={e => f('noteType', e.target.value)} id="field-cdn-type">
                <option value="Credit">Credit Note</option>
                <option value="Debit">Debit Note</option>
              </select>
            </div>
            <div className="field">
              <label>Recipient GSTIN</label>
              <input type="text" value={form.recipientGstin} onChange={e => f('recipientGstin', e.target.value.toUpperCase())} placeholder="27AAAAA0000A1Z5" maxLength={15} id="field-cdn-gstin" />
            </div>
            <div className="field">
              <label>Recipient Name *</label>
              <input type="text" value={form.recipientName} onChange={e => f('recipientName', e.target.value)} placeholder="Company Name" id="field-cdn-rec-name" />
              {formErrors.recipientName && <span className="field-error">{formErrors.recipientName}</span>}
            </div>
            <div className="field">
              <label>Original Invoice No. *</label>
              <input type="text" value={form.originalInvoiceNo} onChange={e => f('originalInvoiceNo', e.target.value)} placeholder="INV-XXXX" id="field-cdn-orig-inv" />
              {formErrors.originalInvoiceNo && <span className="field-error">{formErrors.originalInvoiceNo}</span>}
            </div>
            <div className="field">
              <label>Taxable Value (₹) *</label>
              <input type="number" value={form.taxableValue} onChange={e => f('taxableValue', e.target.value)} placeholder="0" id="field-cdn-taxable" />
              {formErrors.taxableValue && <span className="field-error">{formErrors.taxableValue}</span>}
            </div>
            <div className="field">
              <label>GST Rate (%)</label>
              <select value={form.gstRate} onChange={e => f('gstRate', e.target.value)} id="field-cdn-rate">
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="field">
              <label>Reason</label>
              <input type="text" value={form.reason} onChange={e => f('reason', e.target.value)} placeholder="e.g. Sales return, Price adjustment" id="field-cdn-reason" />
            </div>
          </div>
          <div className="form-actions">
            <button className="action-btn primary-action-btn" onClick={saveRecord} id="btn-save-cdn">Save Note</button>
            <button className="action-btn" onClick={() => { setShowForm(false); setFormErrors({}); }}>Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="data-cards-grid">
          {filingState.creditNotes.map(note => {
            const isLatest = note.id === lastAddedId;
            return (
              <div key={note.id} className={`data-card${isLatest ? ' recently-added-card' : ''}`}>
                <div className="data-card-header">
                  <div>
                    <span className="data-card-title">{note.noteNo}</span>
                    {isLatest && <span className="recently-added-tag">Newly Added</span>}
                    <span className="data-card-date">{formatDate(note.noteDate)}</span>
                  </div>
                  <StatusBadge status={note.status} />
                </div>
                <div className="data-card-body">
                  <div className="data-card-row">
                    <span className="data-card-label">Type</span>
                    <span className={`type-tag ${note.noteType === 'Credit' ? 'credit' : 'debit'}`}>{note.noteType}</span>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">Recipient</span>
                    <span className="data-card-value">{note.recipientName}</span>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">Original Invoice</span>
                    <code className="data-card-code">{note.originalInvoiceNo}</code>
                  </div>
                  <div className="data-card-divider" />
                  <div className="data-card-row accent-row">
                    <span className="data-card-label">Taxable Value</span>
                    <strong className="data-card-amount">{formatCurrency(note.taxableValue)}</strong>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">Reason</span>
                    <span>{note.reason}</span>
                  </div>
                </div>
                {(note.status === 'saved' || note.id.startsWith('cdn-new-')) && (
                  <div className="data-card-footer">
                    <button className="row-remove-btn" onClick={() => removeRecord(note.id)}>✕ Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="cdn-table">
            <thead>
              <tr><th>Note No.</th><th>Date</th><th>Type</th><th>Recipient</th><th>Original Invoice</th><th>Taxable (₹)</th><th>IGST (₹)</th><th>CGST (₹)</th><th>SGST (₹)</th><th>Reason</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filingState.creditNotes.map(note => {
                const isLatest = note.id === lastAddedId;
                return (
                  <tr key={note.id} className={isLatest ? 'recently-added-row' : ''}>
                    <td><code>{note.noteNo}</code>{isLatest && <span className="recently-added-tag">Newly Added</span>}</td>
                    <td>{formatDate(note.noteDate)}</td>
                    <td><span className={`type-tag ${note.noteType === 'Credit' ? 'credit' : 'debit'}`}>{note.noteType}</span></td>
                    <td className="col-name">{note.recipientName}</td>
                    <td><code>{note.originalInvoiceNo}</code></td>
                    <td className="num">{formatCurrency(note.taxableValue)}</td>
                    <td className="num">{note.igst ? formatCurrency(note.igst) : '—'}</td>
                    <td className="num">{note.cgst ? formatCurrency(note.cgst) : '—'}</td>
                    <td className="num">{note.sgst ? formatCurrency(note.sgst) : '—'}</td>
                    <td>{note.reason}</td>
                    <td><StatusBadge status={note.status} /></td>
                    <td>
                      {(note.status === 'saved' || note.id.startsWith('cdn-new-')) && (
                        <button className="row-remove-btn" onClick={() => removeRecord(note.id)} title="Remove">✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Advances Section
function AdvancesSection({ filingState, setFilingState, viewMode }) {
  const emptyForm = { advanceNo: '', receiptDate: '', recipientGstin: '', recipientName: '', pos: '27', advanceValue: '', taxableValue: '', gstRate: '18' };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  const validate = () => {
    const errs = {};
    if (!form.advanceNo.trim()) errs.advanceNo = 'Required';
    if (!form.receiptDate) errs.receiptDate = 'Required';
    if (!form.recipientName.trim()) errs.recipientName = 'Required';
    if (!form.taxableValue || isNaN(form.taxableValue)) errs.taxableValue = 'Enter valid taxable value';
    return errs;
  };

  const saveRecord = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const rate = Number(form.gstRate);
    const taxable = Number(form.taxableValue);
    const tax = taxable * rate / 100;
    const isIntra = form.pos === '29';
    const newRec = {
      id: `adv-new-${Date.now()}`,
      ...form,
      advanceValue: Number(form.advanceValue) || (taxable + tax),
      taxableValue: taxable,
      gstRate: rate,
      igst: isIntra ? 0 : tax,
      cgst: isIntra ? tax / 2 : 0,
      sgst: isIntra ? tax / 2 : 0,
      posName: PLACES_OF_SUPPLY.find(p => p.code === form.pos)?.name || form.pos,
      status: 'saved',
    };
    setFilingState(s => ({ ...s, advances: [...s.advances, newRec] }));
    setLastAddedId(newRec.id);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(false);
  };

  const removeRecord = (id) => {
    if (window.confirm('Remove this advance record?')) {
      setFilingState(s => ({ ...s, advances: s.advances.filter(a => a.id !== id) }));
      if (lastAddedId === id) setLastAddedId(null);
    }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const totalTaxable = filingState.advances.reduce((s, a) => s + (Number(a.taxableValue) || 0), 0);

  return (
    <div className="section-content">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">11A — Advances Received</h2>
          <p className="section-desc">{filingState.advances.length} advance records loaded.</p>
        </div>
        <button className="action-btn primary-action-btn" onClick={() => setShowForm(!showForm)} id="btn-add-advance">
          {showForm ? '✕ Cancel' : '+ Add Advance Record'}
        </button>
      </div>

      <div className="section-metrics-strip">
        <div className="metric-chip"><label>Records:</label> <strong>{filingState.advances.length}</strong></div>
        <div className="metric-chip"><label>Total Taxable:</label> <strong>{formatCurrency(totalTaxable)}</strong></div>
      </div>

      {showForm && (
        <div className="add-invoice-form">
          <h3 className="form-section-title">New Advance Record</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Advance Receipt No. *</label>
              <input type="text" value={form.advanceNo} onChange={e => f('advanceNo', e.target.value)} placeholder="ADV-XXXX" id="field-adv-no" />
              {formErrors.advanceNo && <span className="field-error">{formErrors.advanceNo}</span>}
            </div>
            <div className="field">
              <label>Receipt Date *</label>
              <input type="date" value={form.receiptDate} onChange={e => f('receiptDate', e.target.value)} id="field-adv-date" />
              {formErrors.receiptDate && <span className="field-error">{formErrors.receiptDate}</span>}
            </div>
            <div className="field">
              <label>Recipient Name *</label>
              <input type="text" value={form.recipientName} onChange={e => f('recipientName', e.target.value)} placeholder="Customer/Company Name" id="field-adv-rec-name" />
              {formErrors.recipientName && <span className="field-error">{formErrors.recipientName}</span>}
            </div>
            <div className="field">
              <label>Place of Supply</label>
              <select value={form.pos} onChange={e => f('pos', e.target.value)} id="field-adv-pos">
                {PLACES_OF_SUPPLY.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Advance Amount Received (₹)</label>
              <input type="number" value={form.advanceValue} onChange={e => f('advanceValue', e.target.value)} placeholder="0" id="field-adv-val" />
            </div>
            <div className="field">
              <label>Taxable Value (₹) *</label>
              <input type="number" value={form.taxableValue} onChange={e => f('taxableValue', e.target.value)} placeholder="0" id="field-adv-taxable" />
              {formErrors.taxableValue && <span className="field-error">{formErrors.taxableValue}</span>}
            </div>
            <div className="field">
              <label>GST Rate (%)</label>
              <select value={form.gstRate} onChange={e => f('gstRate', e.target.value)} id="field-adv-rate">
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="action-btn primary-action-btn" onClick={saveRecord} id="btn-save-advance">Save Advance Record</button>
            <button className="action-btn" onClick={() => { setShowForm(false); setFormErrors({}); }}>Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="data-cards-grid">
          {filingState.advances.map(adv => {
            const isLatest = adv.id === lastAddedId;
            return (
              <div key={adv.id} className={`data-card${isLatest ? ' recently-added-card' : ''}`}>
                <div className="data-card-header">
                  <div>
                    <span className="data-card-title">{adv.advanceNo}</span>
                    {isLatest && <span className="recently-added-tag">Newly Added</span>}
                    <span className="data-card-date">{formatDate(adv.receiptDate)}</span>
                  </div>
                  <StatusBadge status={adv.status} />
                </div>
                <div className="data-card-body">
                  <div className="data-card-row">
                    <span className="data-card-label">Recipient</span>
                    <span className="data-card-value">{adv.recipientName}</span>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">POS</span>
                    <span className="data-card-value">{adv.posName}</span>
                  </div>
                  <div className="data-card-divider" />
                  <div className="data-card-row accent-row">
                    <span className="data-card-label">Advance Value</span>
                    <strong className="data-card-amount">{formatCurrency(adv.advanceValue)}</strong>
                  </div>
                </div>
                {(adv.status === 'saved' || adv.id.startsWith('adv-new-')) && (
                  <div className="data-card-footer">
                    <button className="row-remove-btn" onClick={() => removeRecord(adv.id)}>✕ Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="advances-table">
            <thead>
              <tr><th>Advance No.</th><th>Receipt Date</th><th>Recipient</th><th>POS</th><th>Advance (₹)</th><th>Taxable (₹)</th><th>IGST (₹)</th><th>Rate</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filingState.advances.map(adv => {
                const isLatest = adv.id === lastAddedId;
                return (
                  <tr key={adv.id} className={isLatest ? 'recently-added-row' : ''}>
                    <td><code>{adv.advanceNo}</code>{isLatest && <span className="recently-added-tag">Newly Added</span>}</td>
                    <td>{formatDate(adv.receiptDate)}</td>
                    <td className="col-name">{adv.recipientName}</td>
                    <td>{adv.posName}</td>
                    <td className="num">{formatCurrency(adv.advanceValue)}</td>
                    <td className="num">{formatCurrency(adv.taxableValue)}</td>
                    <td className="num">{formatCurrency(adv.igst)}</td>
                    <td>{adv.gstRate}%</td>
                    <td><StatusBadge status={adv.status} /></td>
                    <td>
                      {(adv.status === 'saved' || adv.id.startsWith('adv-new-')) && (
                        <button className="row-remove-btn" onClick={() => removeRecord(adv.id)} title="Remove">✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Amendments Section
function AmendmentsSection({ filingState, setFilingState, viewMode }) {
  const emptyForm = { originalInvoiceNo: '', originalInvoiceDate: '', amendedInvoiceNo: '', amendDate: '', recipientGstin: '', recipientName: '', pos: '27', taxableValue: '', gstRate: '18', reason: 'Value correction' };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  const validate = () => {
    const errs = {};
    if (!form.originalInvoiceNo.trim()) errs.originalInvoiceNo = 'Required';
    if (!form.amendedInvoiceNo.trim()) errs.amendedInvoiceNo = 'Required';
    if (!form.amendDate) errs.amendDate = 'Required';
    if (!form.taxableValue || isNaN(form.taxableValue)) errs.taxableValue = 'Enter valid taxable value';
    return errs;
  };

  const saveRecord = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const rate = Number(form.gstRate);
    const taxable = Number(form.taxableValue);
    const tax = taxable * rate / 100;
    const isIntra = form.pos === '29';
    const newRec = {
      id: `amnd-new-${Date.now()}`,
      ...form,
      taxableValue: taxable,
      gstRate: rate,
      igst: isIntra ? 0 : tax,
      cgst: isIntra ? tax / 2 : 0,
      sgst: isIntra ? tax / 2 : 0,
      posName: PLACES_OF_SUPPLY.find(p => p.code === form.pos)?.name || form.pos,
      status: 'saved',
    };
    setFilingState(s => ({ ...s, amendments: [...s.amendments, newRec] }));
    setLastAddedId(newRec.id);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(false);
  };

  const removeRecord = (id) => {
    if (window.confirm('Remove this amendment record?')) {
      setFilingState(s => ({ ...s, amendments: s.amendments.filter(a => a.id !== id) }));
      if (lastAddedId === id) setLastAddedId(null);
    }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const totalTaxable = filingState.amendments.reduce((s, a) => s + (Number(a.taxableValue) || 0), 0);

  return (
    <div className="section-content">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">9A — Amendments to B2B Invoices</h2>
          <p className="section-desc">{filingState.amendments.length} amendment(s) from prior period.</p>
        </div>
        <button className="action-btn primary-action-btn" onClick={() => setShowForm(!showForm)} id="btn-add-amendment">
          {showForm ? '✕ Cancel' : '+ Add Amendment'}
        </button>
      </div>

      <div className="section-metrics-strip">
        <div className="metric-chip"><label>Amendments:</label> <strong>{filingState.amendments.length}</strong></div>
        <div className="metric-chip"><label>Total Taxable:</label> <strong>{formatCurrency(totalTaxable)}</strong></div>
      </div>

      {showForm && (
        <div className="add-invoice-form">
          <h3 className="form-section-title">New Amendment Record</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Original Invoice No. *</label>
              <input type="text" value={form.originalInvoiceNo} onChange={e => f('originalInvoiceNo', e.target.value)} placeholder="INV-XXXX" id="field-amnd-orig-no" />
              {formErrors.originalInvoiceNo && <span className="field-error">{formErrors.originalInvoiceNo}</span>}
            </div>
            <div className="field">
              <label>Original Invoice Date</label>
              <input type="date" value={form.originalInvoiceDate} onChange={e => f('originalInvoiceDate', e.target.value)} id="field-amnd-orig-date" />
            </div>
            <div className="field">
              <label>Amended Invoice No. *</label>
              <input type="text" value={form.amendedInvoiceNo} onChange={e => f('amendedInvoiceNo', e.target.value)} placeholder="INV-XXXX-A" id="field-amnd-new-no" />
              {formErrors.amendedInvoiceNo && <span className="field-error">{formErrors.amendedInvoiceNo}</span>}
            </div>
            <div className="field">
              <label>Amendment Date *</label>
              <input type="date" value={form.amendDate} onChange={e => f('amendDate', e.target.value)} id="field-amnd-date" />
              {formErrors.amendDate && <span className="field-error">{formErrors.amendDate}</span>}
            </div>
            <div className="field">
              <label>Recipient Name</label>
              <input type="text" value={form.recipientName} onChange={e => f('recipientName', e.target.value)} placeholder="Company Name" id="field-amnd-rec-name" />
            </div>
            <div className="field">
              <label>Place of Supply</label>
              <select value={form.pos} onChange={e => f('pos', e.target.value)} id="field-amnd-pos">
                {PLACES_OF_SUPPLY.map(p => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Revised Taxable Value (₹) *</label>
              <input type="number" value={form.taxableValue} onChange={e => f('taxableValue', e.target.value)} placeholder="0" id="field-amnd-taxable" />
              {formErrors.taxableValue && <span className="field-error">{formErrors.taxableValue}</span>}
            </div>
            <div className="field">
              <label>GST Rate (%)</label>
              <select value={form.gstRate} onChange={e => f('gstRate', e.target.value)} id="field-amnd-rate">
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="field">
              <label>Reason for Amendment</label>
              <input type="text" value={form.reason} onChange={e => f('reason', e.target.value)} placeholder="e.g. Corrected invoice amount" id="field-amnd-reason" />
            </div>
          </div>
          <div className="form-actions">
            <button className="action-btn primary-action-btn" onClick={saveRecord} id="btn-save-amendment">Save Amendment Record</button>
            <button className="action-btn" onClick={() => { setShowForm(false); setFormErrors({}); }}>Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="data-cards-grid">
          {filingState.amendments.map(amnd => {
            const isLatest = amnd.id === lastAddedId;
            return (
              <div key={amnd.id} className={`data-card${isLatest ? ' recently-added-card' : ''}`}>
                <div className="data-card-header">
                  <div>
                    <span className="data-card-title">{amnd.amendedInvoiceNo}</span>
                    {isLatest && <span className="recently-added-tag">Newly Added</span>}
                    <span className="data-card-date">{formatDate(amnd.amendDate)}</span>
                  </div>
                  <StatusBadge status={amnd.status} />
                </div>
                <div className="data-card-body">
                  <div className="data-card-row">
                    <span className="data-card-label">Original Invoice</span>
                    <code className="data-card-code">{amnd.originalInvoiceNo}</code>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">Recipient</span>
                    <span className="data-card-value">{amnd.recipientName}</span>
                  </div>
                  <div className="data-card-divider" />
                  <div className="data-card-row accent-row">
                    <span className="data-card-label">Taxable Value</span>
                    <strong className="data-card-amount">{formatCurrency(amnd.taxableValue)}</strong>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">Reason</span>
                    <span>{amnd.reason}</span>
                  </div>
                </div>
                {(amnd.status === 'saved' || amnd.id.startsWith('amnd-new-')) && (
                  <div className="data-card-footer">
                    <button className="row-remove-btn" onClick={() => removeRecord(amnd.id)}>✕ Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="amendments-table">
            <thead>
              <tr><th>Original Invoice</th><th>Original Date</th><th>Amended Invoice</th><th>Amend Date</th><th>Recipient</th><th>POS</th><th>Taxable (₹)</th><th>IGST (₹)</th><th>Reason</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filingState.amendments.map(amnd => {
                const isLatest = amnd.id === lastAddedId;
                return (
                  <tr key={amnd.id} className={isLatest ? 'recently-added-row' : ''}>
                    <td><code>{amnd.originalInvoiceNo}</code></td>
                    <td>{formatDate(amnd.originalInvoiceDate)}</td>
                    <td><code>{amnd.amendedInvoiceNo}</code>{isLatest && <span className="recently-added-tag">Newly Added</span>}</td>
                    <td>{formatDate(amnd.amendDate)}</td>
                    <td className="col-name">{amnd.recipientName}</td>
                    <td>{amnd.posName}</td>
                    <td className="num">{formatCurrency(amnd.taxableValue)}</td>
                    <td className="num">{amnd.igst ? formatCurrency(amnd.igst) : '—'}</td>
                    <td>{amnd.reason}</td>
                    <td><StatusBadge status={amnd.status} /></td>
                    <td>
                      {(amnd.status === 'saved' || amnd.id.startsWith('amnd-new-')) && (
                        <button className="row-remove-btn" onClick={() => removeRecord(amnd.id)} title="Remove">✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// HSN Summary Section
function HSNSection({ filingState, setFilingState, viewMode }) {
  const emptyForm = { hsn: '', description: '', uqc: 'NOS', quantity: '', rate: '18', taxableValue: '' };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  const validate = () => {
    const errs = {};
    if (!form.hsn.trim()) errs.hsn = 'Required';
    if (!form.description.trim()) errs.description = 'Required';
    if (!form.quantity || isNaN(form.quantity)) errs.quantity = 'Required';
    if (!form.taxableValue || isNaN(form.taxableValue)) errs.taxableValue = 'Enter valid taxable value';
    return errs;
  };

  const saveRecord = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const rate = Number(form.rate);
    const taxable = Number(form.taxableValue);
    const qty = Number(form.quantity);
    const tax = taxable * rate / 100;
    const newRec = {
      id: `hsn-new-${Date.now()}`,
      ...form,
      quantity: qty,
      rate: rate,
      taxableValue: taxable,
      igst: tax,
      cgst: 0,
      sgst: 0,
      status: 'saved',
    };
    setFilingState(s => ({ ...s, hsnSummary: [...s.hsnSummary, newRec] }));
    setLastAddedId(newRec.id);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(false);
  };

  const removeRecord = (id) => {
    if (window.confirm('Remove this HSN entry?')) {
      setFilingState(s => ({ ...s, hsnSummary: s.hsnSummary.filter(h => h.id !== id) }));
      if (lastAddedId === id) setLastAddedId(null);
    }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const totalTaxable = filingState.hsnSummary.reduce((s, h) => s + (Number(h.taxableValue) || 0), 0);

  return (
    <div className="section-content">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">12 — HSN-wise Summary</h2>
          <p className="section-desc">{filingState.hsnSummary.length} HSN codes reported.</p>
        </div>
        <button className="action-btn primary-action-btn" onClick={() => setShowForm(!showForm)} id="btn-add-hsn">
          {showForm ? '✕ Cancel' : '+ Add HSN Record'}
        </button>
      </div>

      <div className="section-metrics-strip">
        <div className="metric-chip"><label>HSN Entries:</label> <strong>{filingState.hsnSummary.length}</strong></div>
        <div className="metric-chip"><label>Total Taxable:</label> <strong>{formatCurrency(totalTaxable)}</strong></div>
      </div>

      {showForm && (
        <div className="add-invoice-form">
          <h3 className="form-section-title">New HSN Summary Record</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>HSN Code *</label>
              <input type="text" value={form.hsn} onChange={e => f('hsn', e.target.value)} placeholder="e.g. 8471" id="field-hsn-code" />
              {formErrors.hsn && <span className="field-error">{formErrors.hsn}</span>}
            </div>
            <div className="field">
              <label>Description *</label>
              <input type="text" value={form.description} onChange={e => f('description', e.target.value)} placeholder="Goods or Services description" id="field-hsn-desc" />
              {formErrors.description && <span className="field-error">{formErrors.description}</span>}
            </div>
            <div className="field">
              <label>UQC (Unit)</label>
              <select value={form.uqc} onChange={e => f('uqc', e.target.value)} id="field-hsn-uqc">
                <option value="NOS">NOS — Numbers</option>
                <option value="PCS">PCS — Pieces</option>
                <option value="KGS">KGS — Kilograms</option>
                <option value="BOX">BOX — Boxes</option>
                <option value="MTR">MTR — Meters</option>
              </select>
            </div>
            <div className="field">
              <label>Quantity *</label>
              <input type="number" value={form.quantity} onChange={e => f('quantity', e.target.value)} placeholder="1" id="field-hsn-qty" />
              {formErrors.quantity && <span className="field-error">{formErrors.quantity}</span>}
            </div>
            <div className="field">
              <label>GST Rate (%)</label>
              <select value={form.rate} onChange={e => f('rate', e.target.value)} id="field-hsn-rate">
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            <div className="field">
              <label>Taxable Value (₹) *</label>
              <input type="number" value={form.taxableValue} onChange={e => f('taxableValue', e.target.value)} placeholder="0" id="field-hsn-taxable" />
              {formErrors.taxableValue && <span className="field-error">{formErrors.taxableValue}</span>}
            </div>
          </div>
          <div className="form-actions">
            <button className="action-btn primary-action-btn" onClick={saveRecord} id="btn-save-hsn">Save HSN Record</button>
            <button className="action-btn" onClick={() => { setShowForm(false); setFormErrors({}); }}>Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="data-cards-grid">
          {filingState.hsnSummary.map(h => {
            const isLatest = h.id === lastAddedId;
            return (
              <div key={h.id} className={`data-card${isLatest ? ' recently-added-card' : ''}`}>
                <div className="data-card-header">
                  <div>
                    <span className="data-card-title">HSN {h.hsn}</span>
                    {isLatest && <span className="recently-added-tag">Newly Added</span>}
                    <span className="data-card-date">{h.description}</span>
                  </div>
                </div>
                <div className="data-card-body">
                  <div className="data-card-row">
                    <span className="data-card-label">Quantity / UQC</span>
                    <span className="data-card-value">{h.quantity} {h.uqc}</span>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">Rate</span>
                    <span className="data-card-value">{h.rate}%</span>
                  </div>
                  <div className="data-card-divider" />
                  <div className="data-card-row accent-row">
                    <span className="data-card-label">Taxable Value</span>
                    <strong className="data-card-amount">{formatCurrency(h.taxableValue)}</strong>
                  </div>
                </div>
                {(h.status === 'saved' || h.id.startsWith('hsn-new-')) && (
                  <div className="data-card-footer">
                    <button className="row-remove-btn" onClick={() => removeRecord(h.id)}>✕ Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="hsn-table">
            <thead>
              <tr><th>HSN Code</th><th>Description</th><th>UQC</th><th>Quantity</th><th>Rate</th><th>Taxable (₹)</th><th>IGST (₹)</th><th>CGST (₹)</th><th>SGST (₹)</th><th></th></tr>
            </thead>
            <tbody>
              {filingState.hsnSummary.map(h => {
                const isLatest = h.id === lastAddedId;
                return (
                  <tr key={h.id} className={isLatest ? 'recently-added-row' : ''}>
                    <td><code>{h.hsn}</code>{isLatest && <span className="recently-added-tag">Newly Added</span>}</td>
                    <td>{h.description}</td>
                    <td>{h.uqc}</td>
                    <td className="num">{h.quantity}</td>
                    <td>{h.rate}%</td>
                    <td className="num">{formatCurrency(h.taxableValue)}</td>
                    <td className="num">{formatCurrency(h.igst)}</td>
                    <td className="num">{formatCurrency(h.cgst)}</td>
                    <td className="num">{formatCurrency(h.sgst)}</td>
                    <td>
                      {(h.status === 'saved' || h.id.startsWith('hsn-new-')) && (
                        <button className="row-remove-btn" onClick={() => removeRecord(h.id)} title="Remove">✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-total">
                <td colSpan={5}><strong>Total</strong></td>
                <td className="num"><strong>{formatCurrency(totalTaxable)}</strong></td>
                <td className="num"><strong>{formatCurrency(filingState.hsnSummary.reduce((s, h) => s + (Number(h.igst) || 0), 0))}</strong></td>
                <td className="num"><strong>{formatCurrency(filingState.hsnSummary.reduce((s, h) => s + (Number(h.cgst) || 0), 0))}</strong></td>
                <td className="num"><strong>{formatCurrency(filingState.hsnSummary.reduce((s, h) => s + (Number(h.sgst) || 0), 0))}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// Documents Issued Section
function DocsSection({ filingState, setFilingState, viewMode }) {
  const emptyForm = { nature: 'Tax Invoices', fromNo: '', toNo: '', totalIssued: '', totalCancelled: '0' };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);

  const validate = () => {
    const errs = {};
    if (!form.nature.trim()) errs.nature = 'Required';
    if (!form.fromNo.trim()) errs.fromNo = 'Required';
    if (!form.toNo.trim()) errs.toNo = 'Required';
    if (!form.totalIssued || isNaN(form.totalIssued)) errs.totalIssued = 'Required';
    return errs;
  };

  const saveRecord = () => {
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const issued = Number(form.totalIssued);
    const cancelled = Number(form.totalCancelled) || 0;
    const newRec = {
      id: `ds-new-${Date.now()}`,
      nature: form.nature,
      fromNo: form.fromNo,
      toNo: form.toNo,
      totalIssued: issued,
      totalCancelled: cancelled,
      status: 'saved',
    };
    setFilingState(s => ({ ...s, documentSeries: [...s.documentSeries, newRec] }));
    setLastAddedId(newRec.id);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(false);
  };

  const removeRecord = (id) => {
    if (window.confirm('Remove this document series?')) {
      setFilingState(s => ({ ...s, documentSeries: s.documentSeries.filter(d => d.id !== id) }));
      if (lastAddedId === id) setLastAddedId(null);
    }
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const totalIssued = filingState.documentSeries.reduce((s, d) => s + (Number(d.totalIssued) || 0), 0);
  const totalCancelled = filingState.documentSeries.reduce((s, d) => s + (Number(d.totalCancelled) || 0), 0);

  return (
    <div className="section-content">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">13 — Documents Issued</h2>
          <p className="section-desc">Summary of document series issued during the return period.</p>
        </div>
        <button className="action-btn primary-action-btn" onClick={() => setShowForm(!showForm)} id="btn-add-docs">
          {showForm ? '✕ Cancel' : '+ Add Document Series'}
        </button>
      </div>

      <div className="section-metrics-strip">
        <div className="metric-chip"><label>Total Issued:</label> <strong>{totalIssued}</strong></div>
        <div className="metric-chip"><label>Cancelled:</label> <strong>{totalCancelled}</strong></div>
        <div className="metric-chip"><label>Net Active:</label> <strong>{totalIssued - totalCancelled}</strong></div>
      </div>

      {showForm && (
        <div className="add-invoice-form">
          <h3 className="form-section-title">New Document Series</h3>
          <div className="form-grid-2">
            <div className="field">
              <label>Nature of Document *</label>
              <input type="text" value={form.nature} onChange={e => f('nature', e.target.value)} placeholder="e.g. Tax Invoices, Credit Notes" id="field-docs-nature" />
              {formErrors.nature && <span className="field-error">{formErrors.nature}</span>}
            </div>
            <div className="field">
              <label>Sr. From *</label>
              <input type="text" value={form.fromNo} onChange={e => f('fromNo', e.target.value)} placeholder="INV-1001" id="field-docs-from" />
              {formErrors.fromNo && <span className="field-error">{formErrors.fromNo}</span>}
            </div>
            <div className="field">
              <label>Sr. To *</label>
              <input type="text" value={form.toNo} onChange={e => f('toNo', e.target.value)} placeholder="INV-1050" id="field-docs-to" />
              {formErrors.toNo && <span className="field-error">{formErrors.toNo}</span>}
            </div>
            <div className="field">
              <label>Total Issued *</label>
              <input type="number" value={form.totalIssued} onChange={e => f('totalIssued', e.target.value)} placeholder="50" id="field-docs-issued" />
              {formErrors.totalIssued && <span className="field-error">{formErrors.totalIssued}</span>}
            </div>
            <div className="field">
              <label>Total Cancelled</label>
              <input type="number" value={form.totalCancelled} onChange={e => f('totalCancelled', e.target.value)} placeholder="0" id="field-docs-cancelled" />
            </div>
          </div>
          <div className="form-actions">
            <button className="action-btn primary-action-btn" onClick={saveRecord} id="btn-save-docs">Save Document Series</button>
            <button className="action-btn" onClick={() => { setShowForm(false); setFormErrors({}); }}>Cancel</button>
          </div>
        </div>
      )}

      {viewMode === 'cards' ? (
        <div className="data-cards-grid">
          {filingState.documentSeries.map(ds => {
            const isLatest = ds.id === lastAddedId;
            return (
              <div key={ds.id} className={`data-card${isLatest ? ' recently-added-card' : ''}`}>
                <div className="data-card-header">
                  <div>
                    <span className="data-card-title" style={{ fontFamily: 'inherit' }}>{ds.nature}</span>
                    {isLatest && <span className="recently-added-tag">Newly Added</span>}
                  </div>
                </div>
                <div className="data-card-body">
                  <div className="data-card-row">
                    <span className="data-card-label">Series Range</span>
                    <code className="data-card-code">{ds.fromNo} to {ds.toNo}</code>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">Total Issued</span>
                    <span className="data-card-value">{ds.totalIssued}</span>
                  </div>
                  <div className="data-card-row">
                    <span className="data-card-label">Cancelled</span>
                    <span className="data-card-value">{ds.totalCancelled}</span>
                  </div>
                  <div className="data-card-divider" />
                  <div className="data-card-row accent-row">
                    <span className="data-card-label">Net Documents</span>
                    <strong className="data-card-amount">{ds.totalIssued - ds.totalCancelled}</strong>
                  </div>
                </div>
                {(ds.status === 'saved' || ds.id.startsWith('ds-new-')) && (
                  <div className="data-card-footer">
                    <button className="row-remove-btn" onClick={() => removeRecord(ds.id)}>✕ Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table" id="docs-table">
            <thead>
              <tr><th>Nature of Document</th><th>Sr. From</th><th>Sr. To</th><th>Total Issued</th><th>Cancelled</th><th>Net Documents</th><th></th></tr>
            </thead>
            <tbody>
              {filingState.documentSeries.map(ds => {
                const isLatest = ds.id === lastAddedId;
                return (
                  <tr key={ds.id} className={isLatest ? 'recently-added-row' : ''}>
                    <td><strong>{ds.nature}</strong>{isLatest && <span className="recently-added-tag">Newly Added</span>}</td>
                    <td><code>{ds.fromNo}</code></td>
                    <td><code>{ds.toNo}</code></td>
                    <td className="num">{ds.totalIssued}</td>
                    <td className="num">{ds.totalCancelled}</td>
                    <td className="num"><strong>{ds.totalIssued - ds.totalCancelled}</strong></td>
                    <td>
                      {(ds.status === 'saved' || ds.id.startsWith('ds-new-')) && (
                        <button className="row-remove-btn" onClick={() => removeRecord(ds.id)} title="Remove">✕</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="table-total">
                <td colSpan={3}><strong>Total</strong></td>
                <td className="num"><strong>{totalIssued}</strong></td>
                <td className="num"><strong>{totalCancelled}</strong></td>
                <td className="num"><strong>{totalIssued - totalCancelled}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Online Summary Screen ────────────────────────────────────────────────────

// ─── GSTR-3B Tax Impact Card ──────────────────────────────────────────────────

function GSTR3BImpactCard({ summary }) {
  const outwardIgst = summary.totalIgst;
  const outwardCgst = summary.totalCgst;
  const outwardSgst = summary.totalSgst;
  const outwardTotal = summary.totalTax;

  // Estimated ITC Available (auto-drafted from GSTR-2B inward supplies benchmark)
  const estimatedItcIgst = Math.round(outwardIgst * 0.65);
  const estimatedItcCgst = Math.round(outwardCgst * 0.70);
  const estimatedItcSgst = Math.round(outwardSgst * 0.70);
  const totalItc = estimatedItcIgst + estimatedItcCgst + estimatedItcSgst;

  // Net Cash Payable
  const cashIgst = Math.max(0, outwardIgst - estimatedItcIgst);
  const cashCgst = Math.max(0, outwardCgst - estimatedItcCgst);
  const cashSgst = Math.max(0, outwardSgst - estimatedItcSgst);
  const netCashPayable = cashIgst + cashCgst + cashSgst;

  return (
    <div className="gstr3b-impact-card" id="gstr3b-impact-preview">
      <div className="gstr3b-impact-header">
        <div>
          <span className="gstr3b-badge">GSTR-3B Tax Impact Live Preview</span>
          <h3>Estimated Monthly Tax Liability</h3>
          <p>Auto-drafted from your GSTR-1 outward supplies and GSTR-2B input tax credit ledger.</p>
        </div>
        <div className="gstr3b-total-box">
          <span>Net Payable in Cash</span>
          <strong>{formatCurrency(netCashPayable)}</strong>
        </div>
      </div>
      <div className="gstr3b-impact-grid">
        <div className="gstr3b-impact-col">
          <span className="col-title">Table 3.1 — Gross Tax Liability</span>
          <div className="impact-row"><span>Integrated Tax (IGST)</span><strong>{formatCurrency(outwardIgst)}</strong></div>
          <div className="impact-row"><span>Central Tax (CGST)</span><strong>{formatCurrency(outwardCgst)}</strong></div>
          <div className="impact-row"><span>State Tax (SGST)</span><strong>{formatCurrency(outwardSgst)}</strong></div>
          <div className="impact-row subtotal"><span>Total Outward Tax</span><strong>{formatCurrency(outwardTotal)}</strong></div>
        </div>
        <div className="gstr3b-impact-col">
          <span className="col-title">Table 4 — Auto-Drafted ITC (2B)</span>
          <div className="impact-row"><span>Eligible IGST Credit</span><strong className="text-credit">− {formatCurrency(estimatedItcIgst)}</strong></div>
          <div className="impact-row"><span>Eligible CGST Credit</span><strong className="text-credit">− {formatCurrency(estimatedItcCgst)}</strong></div>
          <div className="impact-row"><span>Eligible SGST Credit</span><strong className="text-credit">− {formatCurrency(estimatedItcSgst)}</strong></div>
          <div className="impact-row subtotal"><span>Total Available ITC</span><strong className="text-credit">− {formatCurrency(totalItc)}</strong></div>
        </div>
        <div className="gstr3b-impact-col highlighted-col">
          <span className="col-title">Table 6.1 — Payment in Cash</span>
          <div className="impact-row"><span>IGST Cash Offset</span><strong>{formatCurrency(cashIgst)}</strong></div>
          <div className="impact-row"><span>CGST Cash Offset</span><strong>{formatCurrency(cashCgst)}</strong></div>
          <div className="impact-row"><span>SGST Cash Offset</span><strong>{formatCurrency(cashSgst)}</strong></div>
          <div className="impact-row subtotal grand-cash"><span>Net Cash Required</span><strong>{formatCurrency(netCashPayable)}</strong></div>
        </div>
      </div>
    </div>
  );
}

// ─── Online Summary Screen ────────────────────────────────────────────────────

function OnlineSummaryScreen({ navigate, filingState, onResetData }) {
  const summary = computeSummary(filingState);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <main className="portal-page">
      <div className="container">
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('dashboard')}>Dashboard</button> <span>/</span>
          <button onClick={() => navigate('online-b2b')}>GSTR-1 Online</button> <span>/</span>
          <span>Summary</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">GSTR-1 Summary — {RETURN_PERIOD.label}</h1>
            <p className="page-sub">{BUSINESS.name} · {BUSINESS.gstin}</p>
          </div>
          {onResetData && (
            <button
              className="action-btn"
              onClick={() => setShowResetConfirm(true)}
              style={{ fontSize: 12, padding: '6px 12px', alignSelf: 'center' }}
              title="Reset all return records to initial demo sample dataset"
            >
              ↺ Reset to Sample Data
            </button>
          )}
        </div>

        <div className="summary-card">
          <div className="summary-card-header">
            <h2>Return Summary</h2>
            <span className="summary-period">{RETURN_PERIOD.label} | Due: {RETURN_PERIOD.dueDate}</span>
          </div>

          <div className="table-wrap">
            <table className="data-table summary-table" id="summary-table">
              <thead>
                <tr><th>Section</th><th>Records</th><th>Taxable Value (₹)</th><th>IGST (₹)</th><th>CGST (₹)</th><th>SGST (₹)</th><th>Total Tax (₹)</th></tr>
              </thead>
              <tbody>
                {summary.sections.map(sec => (
                  <tr key={sec.label}>
                    <td><strong>{sec.label}</strong></td>
                    <td className="num">{sec.count}</td>
                    <td className="num">{formatCurrency(sec.taxable)}</td>
                    <td className="num">{sec.igst ? formatCurrency(sec.igst) : '—'}</td>
                    <td className="num">{sec.cgst ? formatCurrency(sec.cgst) : '—'}</td>
                    <td className="num">{sec.sgst ? formatCurrency(sec.sgst) : '—'}</td>
                    <td className="num">{formatCurrency(sec.igst + sec.cgst + sec.sgst)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="table-total grand-total">
                  <td><strong>Grand Total</strong></td>
                  <td className="num"><strong>{summary.sections.reduce((s, r) => s + r.count, 0)}</strong></td>
                  <td className="num"><strong>{formatCurrency(summary.totalTaxable)}</strong></td>
                  <td className="num"><strong>{formatCurrency(summary.totalIgst)}</strong></td>
                  <td className="num"><strong>{formatCurrency(summary.totalCgst)}</strong></td>
                  <td className="num"><strong>{formatCurrency(summary.totalSgst)}</strong></td>
                  <td className="num"><strong>{formatCurrency(summary.totalTax)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="summary-totals-strip">
            <div className="total-chip">
              <span>Total Taxable Value</span>
              <strong>{formatCurrency(summary.totalTaxable)}</strong>
            </div>
            <div className="total-chip highlighted">
              <span>Total GST Payable</span>
              <strong>{formatCurrency(summary.totalTax)}</strong>
            </div>
            <div className="total-chip">
              <span>Total IGST</span>
              <strong>{formatCurrency(summary.totalIgst)}</strong>
            </div>
            <div className="total-chip">
              <span>Total CGST + SGST</span>
              <strong>{formatCurrency(summary.totalCgst + summary.totalSgst)}</strong>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginTop: 20 }}>
            <strong>Before you submit:</strong> Verify that all invoices, credit notes, and HSN details are complete and accurate. Once submitted, a correction can only be made through GSTR-1A in the next period.
          </div>
        </div>

        {/* Live GSTR-3B Tax Impact Card */}
        <GSTR3BImpactCard summary={summary} />

        <div className="summary-actions">
          <button className="action-btn" onClick={() => navigate('online-b2b')}>← Edit Return</button>
          <button className="action-btn primary-action-btn" onClick={() => navigate('online-preview')} id="btn-validate-preview">
            Validate &amp; Preview <Arrow />
          </button>
        </div>

        {showResetConfirm && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card">
              <h3>Reset Return Data?</h3>
              <p>This will restore all GSTR-1 tables to the default sample dataset for ShreeTech Electronics. Any newly added invoices will be cleared.</p>
              <div className="modal-actions">
                <button type="button" className="modal-btn-cancel" onClick={() => setShowResetConfirm(false)}>Cancel</button>
                <button type="button" className="modal-btn-danger" onClick={() => { onResetData?.(); setShowResetConfirm(false); }}>Yes, Reset Data</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Online Preview Screen ────────────────────────────────────────────────────

function OnlinePreviewScreen({ navigate, filingState }) {
  const summary = computeSummary(filingState);
  return (
    <main className="portal-page">
      <div className="container">
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('dashboard')}>Dashboard</button> <span>/</span>
          <button onClick={() => navigate('online-summary')}>Summary</button> <span>/</span>
          <span>Preview</span>
        </div>
        <h1 className="page-title">GSTR-1 Preview — {RETURN_PERIOD.label}</h1>

        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          <strong>✓ Validation passed.</strong> No errors found. Your return is ready for submission.
        </div>

        <div className="preview-card">
          <div className="preview-header">
            <div>
              <h2>GSTR-1 — Outward Supplies Return</h2>
              <p><strong>Taxpayer:</strong> {BUSINESS.name} ({BUSINESS.gstin})</p>
              <p><strong>Return Period:</strong> {RETURN_PERIOD.label} | <strong>Due Date:</strong> {RETURN_PERIOD.dueDate}</p>
              <p><strong>Filing Mode:</strong> Online</p>
            </div>
            <div className="preview-status">
              <span className="preview-status-dot" />
              Ready to Submit
            </div>
          </div>

          <div className="preview-summary-grid">
            {summary.sections.map(sec => (
              <div className="preview-section-chip" key={sec.label}>
                <span className="preview-section-name">{sec.label}</span>
                <span className="preview-section-count">{sec.count} records</span>
                <span className="preview-section-amount">{formatCurrency(sec.taxable)}</span>
              </div>
            ))}
          </div>

          <div className="preview-grand-total">
            <span>Total Tax Liability</span>
            <strong>{formatCurrency(summary.totalTax)}</strong>
          </div>
        </div>

        <div className="alert alert-info" style={{ marginTop: 16 }}>
          By clicking <strong>Submit Return</strong>, you confirm that the information provided is true and correct to the best of your knowledge. This is a prototype — no data is transmitted.
        </div>

        <div className="summary-actions">
          <button className="action-btn" onClick={() => navigate('online-summary')}>← Back to Summary</button>
          <button className="action-btn primary-action-btn" onClick={() => navigate('online-submit')} id="btn-submit-return">
            Submit Return <Arrow />
          </button>
        </div>
      </div>
    </main>
  );
}

// ─── Online Submit Screen ─────────────────────────────────────────────────────

function OnlineSubmitScreen({ navigate, filingState }) {
  const summary = computeSummary(filingState);
  const arn = `AA29${RETURN_PERIOD.code}${Math.floor(10000000 + Math.random() * 90000000)}`;
  const now = new Date();
  const timestamp = now.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <main className="portal-page">
      <div className="container">
        <div className="success-screen" id="submit-success">
          <div className="success-icon">✓</div>
          <h1>Return Filed Successfully</h1>
          <p className="success-sub">Your GSTR-1 for {RETURN_PERIOD.label} has been submitted. An acknowledgement has been sent to {BUSINESS.email}.</p>

          <div className="arn-card">
            <div className="arn-row">
              <span>Acknowledgement Reference Number (ARN)</span>
              <strong className="arn-value">{arn}</strong>
            </div>
            <div className="arn-row">
              <span>Taxpayer</span>
              <strong>{BUSINESS.name} — {BUSINESS.gstin}</strong>
            </div>
            <div className="arn-row">
              <span>Return Period</span>
              <strong>{RETURN_PERIOD.label}</strong>
            </div>
            <div className="arn-row">
              <span>Filing Date &amp; Time</span>
              <strong>{timestamp}</strong>
            </div>
            <div className="arn-row">
              <span>Total Tax Liability</span>
              <strong>{formatCurrency(summary.totalTax)}</strong>
            </div>
          </div>

          <div className="alert alert-info" style={{ textAlign: 'left', maxWidth: 620, margin: '20px auto' }}>
            <strong>Prototype notice:</strong> This is a simulated submission. No data has been transmitted to any government system. The ARN above is generated for demonstration purposes only.
          </div>

          <div className="success-actions">
            <button className="action-btn" onClick={() => window.print()}>⎙ Print Acknowledgement</button>
            <button className="action-btn primary-action-btn" onClick={() => navigate('dashboard')} id="btn-back-dashboard">
              Back to Dashboard <Arrow />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Offline Landing Screen ───────────────────────────────────────────────────

function OfflineLandingScreen({ navigate }) {
  const steps = [
    { num: 1, title: 'Download Template', desc: 'Get the GSTR-1 Excel/CSV template pre-formatted for import.' },
    { num: 2, title: 'Fill Your Data', desc: 'Enter invoice details in the downloaded template offline.' },
    { num: 3, title: 'Upload & Validate', desc: 'Upload your completed file and run the validation check.' },
    { num: 4, title: 'Generate JSON', desc: 'Convert your validated data to the GSTN-compatible JSON format.' },
    { num: 5, title: 'Upload JSON', desc: 'Upload the generated JSON to the portal for processing.' },
    { num: 6, title: 'Review & Submit', desc: 'Confirm the summary and file your GSTR-1.' },
  ];

  const downloadTemplate = () => {
    const headers = ['Invoice No,Invoice Date,Recipient GSTIN,Recipient Name,Place of Supply,Taxable Value,GST Rate,IGST,CGST,SGST,HSN'];
    const rows = INITIAL_B2B_INVOICES.slice(0, 3).map(i =>
      `${i.invoiceNo},${i.invoiceDate},${i.recipientGstin},${i.recipientName},${i.posName},${i.taxableValue},${i.gstRate}%,${i.igst},${i.cgst},${i.sgst},${i.hsn}`
    );
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `GSTR1_Template_${RETURN_PERIOD.code}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="portal-page">
      <div className="container">
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('dashboard')}>Dashboard</button> <span>/</span>
          <span>Offline Filing</span>
        </div>
        <h1 className="page-title">GSTR-1 — Offline Preparation</h1>
        <p className="page-sub">{BUSINESS.name} · {BUSINESS.gstin} · {RETURN_PERIOD.label}</p>

        <div className="wizard-steps">
          {steps.map((step) => (
            <div className="wizard-step" key={step.num}>
              <div className="wizard-step-num">{step.num}</div>
              <div className="wizard-step-body">
                <strong>{step.title}</strong>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="offline-start-card">
          <h2>Ready to begin?</h2>
          <p>Start by downloading the GSTR-1 template for {RETURN_PERIOD.label}. The template includes sample data for reference.</p>
          <div className="offline-start-actions">
            <button className="action-btn primary-action-btn" onClick={downloadTemplate} id="btn-download-template">
              ↓ Download Template (.xlsx)
            </button>
            <button className="action-btn" onClick={() => navigate('offline-validate')} id="btn-offline-next">
              Already have a file? Upload & Validate <Arrow />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── Offline Validate Screen ──────────────────────────────────────────────────

function OfflineValidateScreen({ navigate }) {
  const [file, setFile] = useState(null);
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(false);
  const fileRef = useRef();

  const useSample = () => { setFile({ name: 'GSTR1_Sample_092026.xlsx', size: 28400 }); };

  const validate = () => {
    if (!file) { alert('Please upload a file or use the sample.'); return; }
    setValidating(true);
    setTimeout(() => { setValidating(false); setValidated(true); }, 1800);
  };

  const errors = [
    { row: 7, field: 'Recipient GSTIN', issue: 'Invalid GSTIN format — must be 15 characters' },
    { row: 14, field: 'Taxable Value', issue: 'Value cannot be zero or negative' },
  ];

  return (
    <main className="portal-page">
      <div className="container">
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('offline-landing')}>Offline Filing</button> <span>/</span>
          <span>Validate File</span>
        </div>
        <h1 className="page-title">Upload &amp; Validate File</h1>

        {!validated ? (
          <>
            <div className="dropzone" onClick={() => fileRef.current?.click()} id="file-dropzone">
              <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
              <span className="dropzone-icon">↑</span>
              <strong>{file ? file.name : 'Drop your file here or click to browse'}</strong>
              <p>Accepted: .xlsx, .xls, .csv · Max 5 MB</p>
              {file && <span className="dropzone-file-name">Selected: {file.name}</span>}
            </div>
            <div className="offline-start-actions" style={{ marginTop: 16 }}>
              <button className="action-btn" onClick={useSample} id="btn-use-sample">Use Sample File</button>
              <button className="action-btn primary-action-btn" onClick={validate} disabled={!file || validating} id="btn-run-validate">
                {validating ? <><Spinner /> Validating…</> : 'Run Validation'}
              </button>
            </div>
          </>
        ) : (
          <div className="validation-results">
            <div className="validation-summary">
              <div className="val-chip val-valid">
                <strong>21</strong><span>Valid records</span>
              </div>
              <div className="val-chip val-error">
                <strong>{errors.length}</strong><span>Errors found</span>
              </div>
              <div className="val-chip val-total">
                <strong>23</strong><span>Total records</span>
              </div>
            </div>

            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <strong>{errors.length} validation error(s) found.</strong> In a real portal, you would fix these in your file and re-upload. For this prototype, you may continue with the 21 valid records.
            </div>

            <div className="table-wrap">
              <table className="data-table" id="validation-errors-table">
                <thead>
                  <tr><th>Row</th><th>Field</th><th>Issue</th></tr>
                </thead>
                <tbody>
                  {errors.map((err, i) => (
                    <tr key={i} className="row-error">
                      <td>{err.row}</td>
                      <td><strong>{err.field}</strong></td>
                      <td>{err.issue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="offline-start-actions" style={{ marginTop: 20 }}>
              <button className="action-btn" onClick={() => { setValidated(false); setFile(null); }}>← Re-upload File</button>
              <button className="action-btn primary-action-btn" onClick={() => navigate('offline-json')} id="btn-proceed-json">
                Proceed with 21 valid records <Arrow />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Offline JSON Screen ──────────────────────────────────────────────────────

function OfflineJsonScreen({ navigate }) {
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 1500);
  };

  const downloadJson = () => {
    const payload = {
      gstin: BUSINESS.gstin,
      ret_period: RETURN_PERIOD.code,
      b2b: INITIAL_B2B_INVOICES.slice(0, 11).map(i => ({ inv_no: i.invoiceNo, inv_dt: i.invoiceDate, val: i.invoiceValue, txval: i.taxableValue, igst: i.igst, cgst: i.cgst, sgst: i.sgst })),
      exp: INITIAL_EXPORTS,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `GSTR1_${BUSINESS.gstin}_${RETURN_PERIOD.code}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="portal-page">
      <div className="container">
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('offline-validate')}>Validate</button> <span>/</span>
          <span>Generate JSON</span>
        </div>
        <h1 className="page-title">Generate GSTN-Compatible JSON</h1>

        {!generated ? (
          <div className="offline-start-card">
            <h2>Ready to generate</h2>
            <p>21 validated records will be converted to the GSTN-compatible JSON format. The file can then be uploaded to the portal.</p>
            <div className="json-preview">
              <pre>{`{
  "gstin": "${BUSINESS.gstin}",
  "ret_period": "${RETURN_PERIOD.code}",
  "b2b": [ /* 11 invoice records */ ],
  "b2c": [ /* 10 records */ ],
  "exp": [ /* 2 export records */ ],
  ...
}`}</pre>
            </div>
            <button className="action-btn primary-action-btn" onClick={generate} id="btn-generate-json">
              {generating ? <><Spinner /> Generating…</> : '⚙ Generate JSON'}
            </button>
          </div>
        ) : (
          <div className="validation-results">
            <div className="alert alert-success">
              <strong>✓ JSON generated successfully.</strong> GSTR1_{BUSINESS.gstin}_{RETURN_PERIOD.code}.json is ready for upload.
            </div>
            <div className="json-preview">
              <pre>{`{
  "gstin": "${BUSINESS.gstin}",
  "ret_period": "${RETURN_PERIOD.code}",
  "version": "GST3.0.4",
  "b2b": [
    {
      "inv_no": "INV-1042",
      "inv_dt": "03/09/2026",
      "val": 59000,
      "txval": 50000,
      "igst": 9000
    },
    /* … ${INITIAL_B2B_INVOICES.length - 1} more records */
  ]
}`}</pre>
            </div>
            <div className="offline-start-actions" style={{ marginTop: 16 }}>
              <button className="action-btn" onClick={downloadJson} id="btn-download-json">↓ Download JSON</button>
              <button className="action-btn primary-action-btn" onClick={() => navigate('offline-upload')} id="btn-proceed-upload">
                Proceed to Upload <Arrow />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Offline Upload Screen ────────────────────────────────────────────────────

function OfflineUploadScreen({ navigate }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const useSampleJson = () => { setFile({ name: `GSTR1_${BUSINESS.gstin}_${RETURN_PERIOD.code}.json`, size: 14800, isSample: true }); };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <main className="portal-page">
      <div className="container">
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('offline-json')}>Generate JSON</button> <span>/</span>
          <span>Upload JSON</span>
        </div>
        <h1 className="page-title">Upload JSON to Portal</h1>

        <div
          className={`dropzone${dragging ? ' dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          id="json-dropzone"
        >
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
          <span className="dropzone-icon">{file ? '✓' : '↑'}</span>
          <strong>{file ? file.name : 'Drop JSON file here or click to browse'}</strong>
          <p>Accepted: .json · Max 5 MB</p>
          {file && <span className="dropzone-file-name">Ready: {file.name} ({file.size ? `${Math.round(file.size / 1024)} KB` : '~15 KB'})</span>}
        </div>

        <div className="offline-start-actions" style={{ marginTop: 16 }}>
          <button className="action-btn" onClick={useSampleJson} id="btn-use-sample-json">Use Sample JSON</button>
          <button className="action-btn primary-action-btn" onClick={() => { if (!file) { alert('Please select or use sample JSON.'); return; } navigate('offline-processing'); }} id="btn-upload-json">
            Upload &amp; Process <Arrow />
          </button>
        </div>
      </div>
    </main>
  );
}

// ─── Offline Processing Screen ────────────────────────────────────────────────

function OfflineProcessingScreen({ navigate }) {
  const [step, setStep] = useState(0);
  const steps = ['Uploading file…', 'Parsing JSON…', 'Validating records…', 'Merging into return…', 'Processing complete'];

  useEffect(() => {
    if (step < steps.length - 1) {
      const t = setTimeout(() => setStep(s => s + 1), 900);
      return () => clearTimeout(t);
    }
  }, [step]);

  const done = step === steps.length - 1;

  return (
    <main className="portal-page">
      <div className="container">
        <div className="page-crumb">
          <button onClick={() => navigate('home')}>Home</button> <span>/</span>
          <button onClick={() => navigate('offline-upload')}>Upload JSON</button> <span>/</span>
          <span>Processing</span>
        </div>
        <h1 className="page-title">Processing Upload</h1>

        <div className="processing-card" id="processing-card">
          <div className="processing-steps">
            {steps.map((s, i) => (
              <div key={i} className={`processing-step${i < step ? ' done' : i === step ? ' active' : ''}`}>
                <span className="proc-indicator">
                  {i < step ? '✓' : i === step ? <Spinner /> : '○'}
                </span>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {done && (
            <div style={{ marginTop: 28 }}>
              <div className="alert alert-success">
                <strong>✓ Upload processed successfully.</strong> 21 records have been merged into your GSTR-1 for {RETURN_PERIOD.label}. 2 error records were skipped.
              </div>
              <div className="validation-summary" style={{ marginTop: 16 }}>
                <div className="val-chip val-valid"><strong>21</strong><span>Records imported</span></div>
                <div className="val-chip val-error"><strong>2</strong><span>Skipped (errors)</span></div>
                <div className="val-chip val-total"><strong>{INITIAL_B2B_INVOICES.length}</strong><span>Total B2B in return</span></div>
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <button className="action-btn primary-action-btn" onClick={() => navigate('online-summary')} id="btn-view-summary">
                  View Return Summary <Arrow />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ navigate }) {
  return (
    <footer id="disclosure">
      <div className="container footer-top">
        <Brand onClick={() => navigate('home')} />
        <div className="footer-links">
          <a href="#" onClick={e => { e.preventDefault(); navigate('home'); }}>Home</a>
          <a href="#services">Services</a>
          <a href="#filing-options">Returns</a>
          <a href="#help">Help and support</a>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>GEZT is an independent, original hackathon prototype. It is not affiliated with, endorsed by, or operated by the Government of India, GSTN, or any official tax authority.</p>
        <p>No real taxpayer information is used. © 2026 GEZT Prototype.</p>
      </div>
    </footer>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────

function App() {
  const [view, setView] = useState('home');
  const [auth, setAuth] = useState(false);
  // postLoginDest: where to go after login (defaults to 'dashboard')
  const [postLoginDest, setPostLoginDest] = useState('dashboard');

  const PORTAL_STORAGE_KEY = 'gezt_portal_filing_state_v1';

  const [filingState, setFilingState] = useState(() => {
    try {
      const saved = localStorage.getItem(PORTAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.b2bInvoices) && parsed.b2bInvoices.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[GEZT Storage] Failed to load filingState from localStorage:', e);
    }
    return {
      b2bInvoices: [...INITIAL_B2B_INVOICES],
      b2cInvoices: [...INITIAL_B2C_INVOICES],
      exports: [...INITIAL_EXPORTS],
      creditNotes: [...INITIAL_CREDIT_NOTES],
      advances: [...INITIAL_ADVANCES],
      amendments: [...INITIAL_AMENDMENTS],
      hsnSummary: [...INITIAL_HSN_SUMMARY],
      documentSeries: [...INITIAL_DOCUMENT_SERIES],
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(filingState));
    } catch (e) {
      console.warn('[GEZT Storage] Failed to persist filingState:', e);
    }
  }, [filingState]);

  const resetFilingData = () => {
    const fresh = {
      b2bInvoices: [...INITIAL_B2B_INVOICES],
      b2cInvoices: [...INITIAL_B2C_INVOICES],
      exports: [...INITIAL_EXPORTS],
      creditNotes: [...INITIAL_CREDIT_NOTES],
      advances: [...INITIAL_ADVANCES],
      amendments: [...INITIAL_AMENDMENTS],
      hsnSummary: [...INITIAL_HSN_SUMMARY],
      documentSeries: [...INITIAL_DOCUMENT_SERIES],
    };
    setFilingState(fresh);
    try {
      localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(fresh));
    } catch (e) {
      console.warn('Reset storage failed', e);
    }
  };

  const navigate = (dest, smartIntent) => {
    // Guard portal views behind auth
    const publicViews = ['home', 'login'];
    if (!publicViews.includes(dest) && !auth) {
      // Remember where user wanted to go
      const intent = smartIntent || dest;
      setPostLoginDest(intent);
      setView('login');
      return;
    }
    setView(dest);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onAuth = (dest = 'dashboard') => {
    setAuth(true);
    setView(dest);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const onLogout = () => { setAuth(false); setView('home'); setPostLoginDest('dashboard'); };

  // Derive initialTab for online filing screens
  const onlineTabMap = {
    'online-b2b': 'b2b', 'online-b2c': 'b2c', 'online-exports': 'exports',
    'online-cdn': 'cdn', 'online-advances': 'advances', 'online-amendments': 'amendments',
    'online-hsn': 'hsn', 'online-docs': 'docs',
  };
  const isOnlineSection = view in onlineTabMap;

  const renderScreen = () => {
    if (isOnlineSection) {
      return <OnlineFilingScreen navigate={navigate} filingState={filingState} setFilingState={setFilingState} initialTab={onlineTabMap[view]} />;
    }
    switch (view) {
      case 'home': return <HomeScreen navigate={navigate} />;
      case 'login': return <LoginScreen navigate={navigate} onAuth={onAuth} postLoginDest={postLoginDest} />;
      case 'dashboard': return <DashboardScreen navigate={navigate} />;
      case 'gstr1-select': return <DashboardScreen navigate={navigate} />;
      case 'online-summary': return <OnlineSummaryScreen navigate={navigate} filingState={filingState} onResetData={resetFilingData} />;
      case 'online-preview': return <OnlinePreviewScreen navigate={navigate} filingState={filingState} />;
      case 'online-submit': return <OnlineSubmitScreen navigate={navigate} filingState={filingState} />;
      case 'offline-landing':
      case 'offline-validate':
      case 'offline-json':
      case 'offline-upload':
      case 'offline-processing':
      case 'offline-studio':
        return <OfflineFilingStudio navigate={navigate} rootFilingState={filingState} setRootFilingState={setFilingState} />;
      case 'smart-filing': return <SmartFilingScreen navigate={navigate} filingState={filingState} setFilingState={setFilingState} />;
      default: return <HomeScreen navigate={navigate} />;
    }
  };

  return (
    <>
      <Header view={view} auth={auth} navigate={navigate} onLogout={onLogout} />
      {renderScreen()}
      {view === 'home' && <Footer navigate={navigate} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
