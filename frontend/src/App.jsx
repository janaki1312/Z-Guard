
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Cpu,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import "./App.css";

const initialEvent = {
  response_time_ms: "220",
  error_rate: "0.015",
  cpu_usage_pct: "48",
  transactions_per_minute: "650",
};

function formatNumber(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function getRisk(item) {
  const value = String(
    item?.risk_level ?? item?.severity ?? item?.risk ?? ""
  ).toLowerCase();

  if (value.includes("high") || value.includes("critical")) return "High";
  if (value.includes("medium") || value.includes("moderate")) return "Medium";
  if (value.includes("low")) return "Low";

  return item?.is_anomaly ? "High" : "Review";
}

function isAnomaly(item) {
  return Boolean(
    item?.is_anomaly ??
      item?.anomaly ??
      item?.predicted_anomaly ??
      false
  );
}

function App() {
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [event, setEvent] = useState(initialEvent);
  const [result, setResult] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("Overview");
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const response = await fetch("/health");
      if (!response.ok) throw new Error("Backend health check failed");
      setHealth(await response.json());
    } catch {
      setHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const response = await fetch("/api/alerts?limit=50");
      if (!response.ok) throw new Error("Could not load alerts");
      const data = await response.json();
      setAlerts(Array.isArray(data) ? data : data.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadAlerts();
  }, [loadHealth, loadAlerts]);

  async function analyzeEvent(e) {
    e.preventDefault();
    setAnalyzing(true);
    setError("");
    setResult(null);

    const payload = {
      response_time_ms: Number(event.response_time_ms),
      error_rate: Number(event.error_rate),
      cpu_usage_pct: Number(event.cpu_usage_pct),
      transactions_per_minute: Number(event.transactions_per_minute),
    };

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Analysis failed. Check the backend and model."
        );
      }

      setResult(data);
      await loadAlerts();
      await loadHealth();
    } catch (err) {
      setError(
        `${err.message}. Make sure the FastAPI backend is running on port 8000.`
      );
    } finally {
      setAnalyzing(false);
    }
  }

  const filteredAlerts = alerts.filter((item) => {
    const text = [
      item.event_id,
      item.risk_level,
      item.severity,
      item.message,
      item.description,
      item.reason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const anomalyCount = alerts.filter(isAnomaly).length;
  const apiOnline = Boolean(health);
  const modelLoaded = Boolean(health?.model_loaded);

  const navItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Event Analysis", icon: Activity },
    { name: "Alerts", icon: Bell },
  ];

  function navigate(name) {
    setActivePage(name);
    setMobileMenu(false);
    if (name === "Alerts") {
      document.getElementById("alerts-section")?.scrollIntoView({
        behavior: "smooth",
      });
    } else if (name === "Event Analysis") {
      document.getElementById("analysis-section")?.scrollIntoView({
        behavior: "smooth",
      });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={25} />
          </div>
          <div>
            <div className="brand-name">Z-GUARD</div>
            <div className="brand-caption">SECURITY OPERATIONS</div>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list">
          {navItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${activePage === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "Alerts" && alerts.length > 0 && (
                <span className="nav-count">{alerts.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <div className="status-icon">
              <Shield size={20} />
            </div>
            <div>
              <div className="status-title">Protection status</div>
              <div className="status-subtitle">
                {modelLoaded ? "Detection model ready" : "Model status pending"}
              </div>
            </div>
            <span
              className={`status-dot ${modelLoaded ? "online" : "offline"}`}
            />
          </div>
          <div className="sidebar-footer">
            <span className="footer-dot" />
            Z-GUARD <span>·</span> DEVELOPMENT
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <div className="environment-tag">
              <span className="footer-dot" /> LOCAL ENVIRONMENT
            </div>
            <button
              className="icon-button refresh-button"
              onClick={() => {
                loadHealth();
                loadAlerts();
              }}
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
            >
              <RefreshCw size={18} />
            </button>
            <div className="avatar">ZG</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" /> THREAT MONITORING PLATFORM
              </div>
              <h1>
                Security <span>Overview</span>
              </h1>
              <p className="welcome-description">
                Monitor operational events, detect anomalies, and investigate
                alerts from one workspace.
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => navigate("Event Analysis")}
            >
              <Zap size={17} />
              Analyze an event
            </button>
          </section>

          <section className="connection-banner">
            <div className="connection-left">
              <div
                className={`connection-icon ${apiOnline ? "connected" : ""}`}
              >
                {apiOnline ? (
                  <Wifi size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
              </div>
              <div>
                <div className="connection-title">
                  {loadingHealth
                    ? "Checking backend connection…"
                    : apiOnline
                      ? "FastAPI backend connected"
                      : "Backend not connected"}
                </div>
                <div className="connection-subtitle">
                  {apiOnline
                    ? "Health endpoint responded successfully."
                    : "Start the backend server to load live health and alerts."}
                </div>
              </div>
            </div>
            <span
              className={`connection-badge ${apiOnline ? "success" : "warning"}`}
            >
              <span className="status-dot" />
              {apiOnline ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </section>

          <section className="metrics-grid">
            <MetricCard
              icon={Server}
              label="API STATUS"
              value={loadingHealth ? "…" : apiOnline ? "Online" : "Offline"}
              note={apiOnline ? "Health check successful" : "Awaiting connection"}
              tone="blue"
              indicator={apiOnline}
            />
            <MetricCard
              icon={ShieldCheck}
              label="AI MODEL"
              value={
                loadingHealth ? "…" : modelLoaded ? "Ready" : "Unavailable"
              }
              note={
                modelLoaded
                  ? "Model loaded successfully"
                  : "Check model training and loading"
              }
              tone="purple"
              indicator={modelLoaded}
            />
            <MetricCard
              icon={AlertTriangle}
              label="ALERTS LOADED"
              value={loadingAlerts ? "…" : alerts.length}
              note="Alerts returned by the API"
              tone="orange"
            />
            <MetricCard
              icon={Activity}
              label="ANOMALIES"
              value={loadingAlerts ? "…" : anomalyCount}
              note="Based on available alert fields"
              tone="red"
            />
          </section>

          <section className="content-grid">
            <div className="panel analysis-panel" id="analysis-section">
              <PanelHeading
                icon={Zap}
                title="Event analysis"
                subtitle="Submit operational metrics to the AI detector."
              />

              <form onSubmit={analyzeEvent} className="analysis-form">
                <div className="form-grid">
                  <MetricInput
                    label="Response time"
                    unit="ms"
                    icon={Clock3}
                    value={event.response_time_ms}
                    onChange={(value) =>
                      setEvent({ ...event, response_time_ms: value })
                    }
                    min="0"
                    step="any"
                  />
                  <MetricInput
                    label="Error rate"
                    unit="0–1"
                    icon={AlertCircle}
                    value={event.error_rate}
                    onChange={(value) =>
                      setEvent({ ...event, error_rate: value })
                    }
                    min="0"
                    max="1"
                    step="any"
                  />
                  <MetricInput
                    label="CPU usage"
                    unit="%"
                    icon={Cpu}
                    value={event.cpu_usage_pct}
                    onChange={(value) =>
                      setEvent({ ...event, cpu_usage_pct: value })
                    }
                    min="0"
                    max="100"
                    step="any"
                  />
                  <MetricInput
                    label="Transactions/min"
                    unit="TPM"
                    icon={Activity}
                    value={event.transactions_per_minute}
                    onChange={(value) =>
                      setEvent({
                        ...event,
                        transactions_per_minute: value,
                      })
                    }
                    min="0"
                    step="any"
                  />
                </div>

                <div className="form-footer">
                  <span className="form-hint">
                    <Shield size={14} /> Input values are validated by the API.
                  </span>
                  <button
                    className="primary-button analyze-button"
                    type="submit"
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Zap size={17} />
                    )}
                    {analyzing ? "Analyzing…" : "Run analysis"}
                  </button>
                </div>
              </form>

              {error && (
                <div className="feedback error-feedback">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div className="result-card">
                  <div className="result-heading">
                    <CheckCircle2 size={19} />
                    Analysis completed
                  </div>
                  <div className="result-grid">
                    <div>
                      <span className="result-label">Classification</span>
                      <strong
                        className={
                          isAnomaly(result) ? "result-danger" : "result-safe"
                        }
                      >
                        {isAnomaly(result) ? "Anomaly" : "Normal / not flagged"}
                      </strong>
                    </div>
                    <div>
                      <span className="result-label">Risk level</span>
                      <strong>{getRisk(result)}</strong>
                    </div>
                    <div>
                      <span className="result-label">Event ID</span>
                      <strong className="event-id">
                        {result.event_id ?? "Not returned"}
                      </strong>
                    </div>
                    <div>
                      <span className="result-label">Anomaly score</span>
                      <strong>
                        {result.anomaly_score != null
                          ? formatNumber(result.anomaly_score, 3)
                          : result.score != null
                            ? formatNumber(result.score, 3)
                            : "Not returned"}
                      </strong>
                    </div>
                  </div>
                  <details className="raw-result">
                    <summary>View full API response</summary>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>

            <div className="panel system-panel">
              <PanelHeading
                icon={ShieldCheck}
                title="System health"
                subtitle="Current status reported by FastAPI."
              />

              <div className="health-list">
                <HealthRow
                  label="REST API"
                  description="GET /health"
                  value={apiOnline ? "Operational" : "Unavailable"}
                  ok={apiOnline}
                />
                <HealthRow
                  label="Anomaly detector"
                  description="Machine learning model"
                  value={
                    loadingHealth
                      ? "Checking"
                      : modelLoaded
                        ? "Loaded"
                        : "Not loaded"
                  }
                  ok={modelLoaded}
                />
                <HealthRow
                  label="Alert service"
                  description="GET /api/alerts"
                  value={
                    loadingAlerts
                      ? "Checking"
                      : apiOnline
                        ? "Checked"
                        : "Unavailable"
                  }
                  ok={apiOnline && !loadingAlerts}
                />
              </div>

              <div className="system-note">
                <div className="note-icon">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <strong>Detection status</strong>
                  <p>
                    {modelLoaded
                      ? "The model reports that it is loaded and ready."
                      : "The dashboard cannot confirm that the model is loaded."}
                  </p>
                </div>
              </div>

              <button
                className="secondary-button full-width"
                onClick={() => {
                  loadHealth();
                  loadAlerts();
                }}
              >
                <RefreshCw size={16} /> Refresh system status
              </button>
            </div>
          </section>

          <section className="panel alerts-panel" id="alerts-section">
            <div className="alerts-heading-row">
              <PanelHeading
                icon={Bell}
                title="Recent alerts"
                subtitle="Events returned by your backend alert endpoint."
              />
              <div className="alerts-actions">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="Search alerts…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search alerts"
                  />
                </div>
                <button
                  className="icon-button"
                  onClick={loadAlerts}
                  title="Refresh alerts"
                  aria-label="Refresh alerts"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="alerts-table">
                <thead>
                  <tr>
                    <th>EVENT</th>
                    <th>CLASSIFICATION</th>
                    <th>RISK</th>
                    <th>RESPONSE TIME</th>
                    <th>CPU</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAlerts ? (
                    <tr>
                      <td colSpan="5" className="table-empty">
                        <LoaderCircle className="spin" size={20} />
                        Loading alerts…
                      </td>
                    </tr>
                  ) : filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="table-empty">
                        <div className="empty-icon">
                          <Bell size={22} />
                        </div>
                        <strong>
                          {alerts.length === 0
                            ? "No alerts returned"
                            : "No matching alerts"}
                        </strong>
                        <span>
                          {alerts.length === 0
                            ? apiOnline
                              ? "Your API returned no alerts. Analyze an event to get started."
                              : "Start the backend to load alert data."
                            : "Try a different search term."}
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((item, index) => (
                      <tr key={item.event_id ?? index}>
                        <td>
                          <div className="table-event">
                            <span
                              className={`event-icon ${
                                isAnomaly(item) ? "event-icon-danger" : ""
                              }`}
                            >
                              {isAnomaly(item) ? (
                                <AlertTriangle size={16} />
                              ) : (
                                <Activity size={16} />
                              )}
                            </span>
                            <div>
                              <strong>
                                {item.event_id
                                  ? String(item.event_id).slice(0, 18)
                                  : `Event ${index + 1}`}
                              </strong>
                              <span>
                                {item.message ??
                                  item.description ??
                                  item.reason ??
                                  "Operational event"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`classification ${
                              isAnomaly(item) ? "classification-danger" : ""
                            }`}
                          >
                            {isAnomaly(item) ? "Anomaly" : "Alert"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`risk-pill risk-${getRisk(item).toLowerCase()}`}
                          >
                            {getRisk(item)}
                          </span>
                        </td>
                        <td>
                          {item.response_time_ms != null
                            ? `${formatNumber(item.response_time_ms)} ms`
                            : "—"}
                        </td>
                        <td>
                          {item.cpu_usage_pct != null
                            ? `${formatNumber(item.cpu_usage_pct)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>
                Showing {filteredAlerts.length} of {alerts.length} returned
                alerts
              </span>
              <span className="footer-live">
                <span className="footer-dot" /> API-backed data
              </span>
            </div>
          </section>

          <footer className="page-footer">
            <span>© {new Date().getFullYear()} Z-Guard</span>
            <span>AI-assisted operational anomaly detection</span>
            <button
              className="footer-link"
              onClick={() => window.open("/docs", "_blank", "noopener,noreferrer")}
            >
              API documentation <ArrowUpRight size={13} />
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, note, tone, indicator }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className={`metric-icon tone-${tone}`}>
          <Icon size={20} />
        </span>
        {indicator !== undefined && (
          <span className={`metric-indicator ${indicator ? "good" : "bad"}`}>
            {indicator ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          </span>
        )}
      </div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </article>
  );
}

function PanelHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="panel-heading">
      <div className="panel-heading-icon">
        <Icon size={19} />
      </div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function MetricInput({ label, unit, icon: Icon, value, onChange, ...props }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-wrap">
        <Icon size={17} />
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          {...props}
        />
        <span className="input-unit">{unit}</span>
      </span>
    </label>
  );
}

function HealthRow({ label, description, value, ok }) {
  return (
    <div className="health-row">
      <div className={`health-status-icon ${ok ? "health-ok" : "health-warn"}`}>
        {ok ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
      </div>
      <div className="health-copy">
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
      <span className={`health-value ${ok ? "text-good" : "text-muted"}`}>
        {value}
      </span>
    </div>
  );
}

export default App;
