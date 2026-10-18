import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertCircle, AlertTriangle, Bell, CheckCircle2, ChevronRight,
  CircleHelp, Clock3, Cpu, Gauge, LayoutDashboard, LoaderCircle, Menu, RefreshCw,
  Search, Server, Shield, ShieldCheck, SlidersHorizontal, Wifi, X, Zap
} from "lucide-react";
import "./App.css";

const initialEvent = {
  response_time_ms: "220",
  error_rate: "0.015",
  cpu_usage_pct: "48",
  transactions_per_minute: "650",
};

const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const isAnomaly = (item) => Boolean(item?.is_anomaly ?? item?.anomaly ?? item?.predicted_anomaly ?? String(item?.ml_prediction ?? "").toLowerCase() === "anomaly");
const severity = (item) => {
  const s = String(item?.severity ?? item?.risk_level ?? item?.risk ?? "").toLowerCase();
  if (s.includes("critical")) return "Critical";
  if (s.includes("high")) return "High";
  if (s.includes("medium") || s.includes("moderate")) return "Medium";
  if (s.includes("low")) return "Low";
  return isAnomaly(item) ? "High" : "Normal";
};
const fmt = (v, digits = 1) => asNumber(v) === null ? "—" : Number(v).toFixed(digits);

function Donut({ anomaly, normal }) {
  const total = anomaly + normal;
  const pct = total ? anomaly / total * 100 : 0;
  return <div className="donut-wrap">
    <div className="donut" style={{ "--pct": `${pct}%` }}>
      <div className="donut-center"><strong>{total}</strong><span>ALERTS</span></div>
    </div>
    <div className="legend">
      <span><i className="dot red" />Anomalies <b>{anomaly}</b></span>
      <span><i className="dot green" />Normal <b>{normal}</b></span>
    </div>
  </div>;
}

function BarBreakdown({ items }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return <div className="breakdown">
    {items.map((item) => <div className="bar-row" key={item.label}>
      <div className="bar-label"><span><i className={`dot ${item.tone}`} />{item.label}</span><b>{item.count}</b></div>
      <div className="bar-track"><div className={`bar-fill ${item.tone}`} style={{ width: `${total ? item.count / total * 100 : 0}%` }} /></div>
    </div>)}
    {!total && <p className="empty-small">No alert data available yet.</p>}
  </div>;
}

function Panel({ title, subtitle, icon: Icon, action, children, className = "" }) {
  return <section className={`panel ${className}`}>
    <header className="panel-head">
      <div className="panel-title-icon"><Icon size={16} /></div>
      <div className="panel-heading"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {action && <div className="panel-action">{action}</div>}
    </header>
    {children}
  </section>;
}

function App() {
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [event, setEvent] = useState(initialEvent);
  const [result, setResult] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [healthError, setHealthError] = useState("");
  const [alertsError, setAlertsError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [activePage, setActivePage] = useState("Overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusBusy, setStatusBusy] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState("welcome");
  const [session, setSession] = useState(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("zguard_access_token") || "");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [demoLabel, setDemoLabel] = useState("Illustrative demo data");

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true);
    setHealthError("");
    try {
      const response = await fetch("/health");
      if (!response.ok) throw new Error(`Health endpoint returned ${response.status}`);
      setHealth(await response.json());
    } catch (error) {
      setHealth(null);
      setHealthError(error.message || "Could not reach the backend");
    } finally { setLoadingHealth(false); }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    setAlertsError("");
    try {
      const response = demoMode
        ? await fetch("/api/demo/overview")
        : await fetch("/api/alerts?limit=50", { headers: { Authorization: `Bearer ${authToken}` } });
      if (!response.ok) throw new Error(demoMode ? `Demo endpoint returned ${response.status}` : `Alerts endpoint returned ${response.status}`);
      const data = await response.json();
      const candidates = demoMode
        ? [data?.alerts, data?.overview?.alerts, data?.recent_alerts, data?.data?.alerts]
        : [Array.isArray(data) ? data : data?.alerts];
      const list = candidates.find(Array.isArray);
      if (!list) throw new Error(demoMode ? "Demo overview did not include an alerts list. The dashboard will not invent sample alerts." : "Unexpected alert response format");
      setAlerts(list);
      if (demoMode) setDemoLabel(data?.label || data?.notice || "Illustrative demo data — not live security activity.");
    } catch (error) {
      setAlerts([]);
      setAlertsError(error.message || "Could not load alerts");
    } finally { setLoadingAlerts(false); }
  }, [demoMode, authToken]);

  const refreshAll = useCallback(() => Promise.allSettled([loadHealth(), loadAlerts()]), [loadHealth, loadAlerts]);
  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      if (authToken) {
        try {
          const response = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${authToken}` } });
          if (!response.ok) throw new Error("Your session has expired. Please log in again.");
          const currentUser = await response.json();
          if (!cancelled) { setSession(currentUser); setDemoMode(false); setAuthMode("dashboard"); }
        } catch {
          localStorage.removeItem("zguard_access_token");
          if (!cancelled) { setAuthToken(""); setSession(null); setAuthMode("welcome"); }
        }
      }
    }
    initialize();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (session || demoMode) refreshAll();
  }, [session, demoMode, refreshAll]);

  useEffect(() => {
    const updateActiveSection = () => {
      const marker = 125;
      const sections = [
        ["Overview", document.getElementById("overview-section")],
        ["Event Analysis", document.getElementById("analysis-section")],
        ["Alerts", document.getElementById("alerts-section")],
      ].filter(([, node]) => node);
      let current = "Overview";
      for (const [name, node] of sections) {
        if (node.getBoundingClientRect().top <= marker) current = name;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        current = "Alerts";
      }
      setActivePage(current);
    };
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  const apiOnline = Boolean(health);
  const modelLoaded = Boolean(health?.model_loaded);
  const anomalyCount = alerts.filter(isAnomaly).length;
  const normalCount = Math.max(0, alerts.length - anomalyCount);
  const severityItems = useMemo(() => [
    { label: "Critical", count: alerts.filter(a => severity(a) === "Critical").length, tone: "red" },
    { label: "High", count: alerts.filter(a => severity(a) === "High").length, tone: "orange" },
    { label: "Medium", count: alerts.filter(a => severity(a) === "Medium").length, tone: "yellow" },
    { label: "Low", count: alerts.filter(a => severity(a) === "Low").length, tone: "green" },
  ], [alerts]);
  const signalItems = useMemo(() => {
    const counts = {};
    alerts.forEach(a => (Array.isArray(a.signals) ? a.signals : []).forEach(s => { counts[s] = (counts[s] || 0) + 1; }));
    return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([label,count],i)=>({label,count,tone:["green","blue","orange","red","yellow"][i]}));
  }, [alerts]);

  const activitySamples = useMemo(() => alerts.slice(0, 12).map((item, index) => ({
    label: item.event_id || `Record ${index + 1}`,
    response: asNumber(item.response_time_ms),
    cpu: asNumber(item.cpu_usage_pct),
    anomaly: isAnomaly(item),
  })).reverse(), [alerts]);
  const performanceAvailable = activitySamples.some(item => item.response !== null || item.cpu !== null);
  const maxResponse = Math.max(1, ...activitySamples.map(item => item.response ?? 0));
  const maxCpu = Math.max(1, ...activitySamples.map(item => item.cpu ?? 0));

  const filteredAlerts = alerts.filter(item => {
    const searchable = [
      item.event_id, item.severity, item.risk_level, item.ml_prediction, item.explanation,
      item.status, ...(Array.isArray(item.signals) ? item.signals : [])
    ].filter(Boolean).join(" ").toLowerCase();
    return searchable.includes(search.toLowerCase())
      && (statusFilter === "All" || (item.status || "New") === statusFilter)
      && (severityFilter === "All" || severity(item) === severityFilter);
  });

  async function updateAlertStatus(alert, status) {
    if (demoMode || !authToken || !session || !alert?.alert_id) return;
    setStatusBusy(true);
    setAlertsError("");
    try {
      const response = await fetch(`/api/alerts/${alert.alert_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || `Status update failed (${response.status})`);
      setAlerts(current => current.map(item => item.alert_id === alert.alert_id ? { ...item, status: data.status } : item));
      setSelectedAlert(current => current?.alert_id === alert.alert_id ? { ...current, status: data.status } : current);
    } catch (error) {
      setAlertsError(error.message || "Could not update alert status");
    } finally {
      setStatusBusy(false);
    }
  }

  function navigate(name) {
    setActivePage(name);
    setMobileMenu(false);
    const id = name === "Alerts" ? "alerts-section" : name === "Event Analysis" ? "analysis-section" : "overview-section";
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function analyzeEvent(e) {
    e.preventDefault();
    if (demoMode || !session || !authToken) {
      setAnalysisError("Event analysis is disabled in read-only demo mode. Log in to analyze and save events.");
      return;
    }
    setAnalyzing(true);
    setAnalysisError("");
    setResult(null);
    const payload = Object.fromEntries(Object.entries(event).map(([k,v]) => [k, Number(v)]));
    if (Object.values(payload).some(v => !Number.isFinite(v) || v < 0) ||
        payload.error_rate > 1 || payload.cpu_usage_pct > 100) {
      setAnalysisError("Enter valid non-negative numbers. Error rate must be 0–1 and CPU usage 0–100.");
      setAnalyzing(false);
      return;
    }
    try {
      const response = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Analysis failed (${response.status})`);
      setResult(data);
      await refreshAll();
    } catch (error) {
      setAnalysisError(`${error.message || "Analysis failed"}. Check that the FastAPI backend is running.`);
    } finally { setAnalyzing(false); }
  }

  async function submitAuth(e) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = typeof data.detail === "string" ? data.detail : Array.isArray(data.detail) ? data.detail.map(x => x.msg).join(", ") : "";
        throw new Error(detail || `Request failed (${response.status})`);
      }
      if (!data.access_token || !data.user) throw new Error("The server response did not include a session token and user.");
      localStorage.setItem("zguard_access_token", data.access_token);
      setAuthToken(data.access_token);
      setSession(data.user);
      setDemoMode(false);
      setAuthPassword("");
      setAuthMode("dashboard");
      setAlerts([]);
      setResult(null);
    } catch (error) {
      setAuthError(error.message || "Could not complete authentication. Check that the backend is running.");
    } finally { setAuthBusy(false); }
  }

  async function enterDemo() {
    setAuthError("");
    setSession(null);
    setDemoMode(true);
    setAuthMode("dashboard");
    setAlerts([]);
    setResult(null);
  }

  async function logout() {
    try {
      if (authToken) await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${authToken}` } });
    } catch {}
    localStorage.removeItem("zguard_access_token");
    setAuthToken("");
    setSession(null);
    setDemoMode(false);
    setAlerts([]);
    setResult(null);
    setAuthMode("welcome");
    setAccountMenuOpen(false);
  }

  const navItems = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Event Analysis", icon: Activity },
    { name: "Alerts", icon: Bell },
  ];

  if (authMode !== "dashboard") {
    return <main className="auth-screen">
      <div className="auth-glow auth-glow-one"/><div className="auth-glow auth-glow-two"/>
      <section className="auth-card">
        <div className="auth-brand"><span className="auth-brand-mark"><ShieldCheck size={25}/></span><div><strong>Z-GUARD</strong><small>SECURITY OPERATIONS</small></div></div>
        {authMode === "welcome" ? <>
          <div className="auth-eyebrow"><span/> SECURITY MONITORING PLATFORM</div>
          <h1>See threats clearly.<br/><span>Respond with confidence.</span></h1>
          <p className="auth-description">Access your security operations workspace or explore a clearly labelled, read-only demo.</p>
          <button className="auth-primary" onClick={() => { setAuthMode("login"); setAuthError(""); }}>Log in <ChevronRight size={17}/></button>
          <button className="auth-secondary" onClick={() => { setAuthMode("register"); setAuthError(""); }}>Create account</button>
          <div className="auth-separator"><span/> OR <span/></div>
          <button className="auth-demo" onClick={enterDemo}><Activity size={16}/> Explore read-only demo</button>
          <small className="auth-footnote">Demo content is illustrative and is not live security activity.</small>
        </> : <>
          <button className="auth-back" onClick={() => { setAuthMode("welcome"); setAuthError(""); }}>← Back</button>
          <div className="auth-eyebrow"><span/> {authMode === "register" ? "CREATE YOUR WORKSPACE" : "WELCOME BACK"}</div>
          <h1>{authMode === "register" ? "Create account" : "Log in"}<br/><span>to Z-Guard.</span></h1>
          <p className="auth-description">{authMode === "register" ? "Create an account to keep your alerts and analysis tied to your user." : "Log in to restore your saved alerts and continue analysis."}</p>
          <form className="auth-form" onSubmit={submitAuth}>
            <label>Email address<input type="email" autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" required/></label>
            <label>Password<input type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder={authMode === "register" ? "At least 8 characters" : "Your password"} minLength={authMode === "register" ? 8 : undefined} required/></label>
            {authError && <div className="auth-error" role="alert"><AlertCircle size={15}/>{authError}</div>}
            <button className="auth-primary" type="submit" disabled={authBusy}>{authBusy ? <LoaderCircle className="spin" size={16}/> : null}{authBusy ? "Please wait…" : authMode === "register" ? "Create account" : "Log in"}<ChevronRight size={17}/></button>
          </form>
          <p className="auth-switch">{authMode === "register" ? "Already have an account?" : "New to Z-Guard?"} <button onClick={() => { setAuthMode(authMode === "register" ? "login" : "register"); setAuthError(""); }}>{authMode === "register" ? "Log in" : "Create account"}</button></p>
        </>}
      </section>
      <div className="auth-copyright">Z-GUARD · AI-ASSISTED OPERATIONAL ANOMALY DETECTION</div>
    </main>;
  }

  return <div className="app-shell">
    {mobileMenu && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><ShieldCheck size={22} /></div>
        <div><div className="brand-name">Z-GUARD</div><div className="brand-caption">SECURITY OPERATIONS</div></div>
        <button className="icon-button sidebar-close" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={18}/></button>
      </div>
      <div className="nav-label">MONITORING</div>
      <nav className="nav-list">{navItems.map(({name,icon:Icon}) =>
        <button key={name} className={`nav-item ${activePage===name?"active":""}`} aria-current={activePage===name?"page":undefined} onClick={()=>navigate(name)}>
          <Icon size={17}/><span>{name}</span>{name==="Alerts" && alerts.length>0 && <span className="nav-count">{alerts.length}</span>}
        </button>)}</nav>
      <div className="sidebar-bottom">
        <div className="sidebar-status"><span className={`status-dot ${apiOnline?"online":"offline"}`}/><div><strong>{apiOnline?"Backend connected":"Backend unavailable"}</strong><small>{modelLoaded?"Detector ready":"Detector status unconfirmed"}</small></div></div>
        <div className="sidebar-footer"><span className="dot green"/> Z-GUARD · LOCAL INSTANCE</div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-button mobile-menu-button" onClick={()=>setMobileMenu(true)} aria-label="Open menu"><Menu size={19}/></button>
          <span className="crumb-muted">Workspace</span><ChevronRight size={13}/><strong>{activePage}</strong>
        </div>
        <div className="topbar-right">
          <span className={`environment-tag ${apiOnline?"":"offline"}`}><i className={`dot ${apiOnline?"green":"red"}`}/>{loadingHealth?"CHECKING BACKEND":apiOnline?"BACKEND CONNECTED":"BACKEND OFFLINE"}</span>
          <button className="icon-button refresh-button" onClick={refreshAll} aria-label="Refresh health and alerts" title="Refresh"><RefreshCw size={16}/></button>
          <div className="account-wrap">
            <button className="avatar" title="Account options" aria-label="Open account options" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen(v => !v)}>{demoMode ? "DM" : (session?.email?.slice(0,2).toUpperCase() || "ZG")}</button>
            {accountMenuOpen && <div className="account-menu">
              <div className="account-menu-heading">
                <strong>{session?.email || (demoMode ? "Demo mode" : "Account")}</strong>
                <small>{demoMode ? "Read-only illustrative session" : "Authenticated workspace"}</small>
              </div>
              {demoMode && <p className="account-notice" role="status">Demo mode is read-only. Analysis and saved account data are disabled.</p>}
              <button className="account-close" onClick={logout}>{demoMode ? "Exit demo" : "Log out"}</button>
            </div>}
          </div>
        </div>
      </header>

      <div className="page-content" id="overview-section">
        {demoMode && <div className="demo-banner"><Shield size={16}/><div><strong>READ-ONLY DEMO</strong><span>{demoLabel} — no live activity is claimed.</span></div><button className="secondary-button" onClick={() => { setAuthMode("login"); setDemoMode(false); }}>Log in</button></div>}
        <section className="dashboard-heading">
          <div><div className="eyebrow"><span className="eyebrow-line"/> SECURITY MONITORING / OVERVIEW</div>
            <h1>Security Operations <span>Center</span></h1>
            <p>Monitor system health, review detected anomalies, and investigate operational alerts.</p>
          </div>
          <button className="primary-button" onClick={()=>navigate("Event Analysis")}><Zap size={16}/> Analyze event</button>
        </section>

        <div className={`connection-strip ${apiOnline?"is-online":"is-offline"}`}>
          <span className="connection-symbol">{apiOnline?<Wifi size={17}/>:<AlertCircle size={17}/>}</span>
          <div><strong>{loadingHealth?"Checking backend connection…":apiOnline?"FastAPI backend connected":"Backend connection unavailable"}</strong>
            <small>{apiOnline?"Health endpoint responded successfully.":healthError || "Start the backend server, then refresh this dashboard."}</small></div>
          <span className="connection-state">{loadingHealth?"CHECKING":apiOnline?"CONNECTED":"OFFLINE"}</span>
        </div>

        <section className="metric-grid">
          <Metric icon={Server} label="API STATUS" value={loadingHealth?"…":apiOnline?"Online":"Offline"} note={apiOnline?"GET /health responding":"Connection not confirmed"} tone="blue" good={apiOnline}/>
          <Metric icon={ShieldCheck} label="AI DETECTOR" value={loadingHealth?"…":modelLoaded?"Ready":"Unconfirmed"} note={modelLoaded?"Model reported loaded":"Health response has no loaded model flag"} tone="green" good={modelLoaded}/>
          <Metric icon={Bell} label="ALERTS LOADED" value={loadingAlerts?"…":alerts.length} note="Returned by latest API request" tone="yellow"/>
          <Metric icon={AlertTriangle} label="ANOMALIES" value={loadingAlerts?"…":anomalyCount} note="Among currently loaded alerts" tone="red"/>
        </section>

        <section className="soc-grid">
          <Panel title="Alert distribution" subtitle="Anomaly vs. non-anomaly records" icon={Gauge}>
            {loadingAlerts ? <Loading/> : alertsError ? <ErrorState message={alertsError} retry={loadAlerts}/> : <Donut anomaly={anomalyCount} normal={normalCount}/>}
          </Panel>
          <Panel title="Severity breakdown" subtitle="Based on returned alert severity fields" icon={SlidersHorizontal}>
            {loadingAlerts ? <Loading/> : alertsError ? <ErrorState message={alertsError} retry={loadAlerts}/> : <BarBreakdown items={severityItems}/>}
          </Panel>
          <Panel title="System health" subtitle="Status reported by the backend" icon={ShieldCheck} className="health-panel">
            <div className="health-list">
              <HealthRow label="REST API" detail="GET /health" value={loadingHealth?"Checking":apiOnline?"Operational":"Unavailable"} ok={apiOnline} />
              <HealthRow label="Anomaly detector" detail="Model status" value={loadingHealth?"Checking":modelLoaded?"Loaded":"Unconfirmed"} ok={modelLoaded}/>
              <HealthRow label="Alert service" detail="GET /api/alerts" value={loadingAlerts?"Checking":alertsError?"Error":"Responded"} ok={!loadingAlerts&&!alertsError}/>
            </div>
            {(healthError || alertsError) && <div className="inline-error">{healthError || alertsError}</div>}
            <button className="secondary-button full-width" onClick={refreshAll}><RefreshCw size={14}/> Refresh system status</button>
          </Panel>
          <Panel title="Event activity" subtitle="Response time and CPU from loaded alert records" icon={Clock3} className="activity-panel">
            {loadingAlerts ? <Loading/> : alertsError ? <ErrorState message={alertsError} retry={loadAlerts}/> : performanceAvailable ?
              <div className={`activity-chart ${activitySamples.length < 2 ? "sparse-activity" : ""}`}>
                <div className="activity-legend"><span><i className="dot blue"/>Response time (ms)</span><span><i className="dot green"/>CPU usage (%)</span></div>
                {activitySamples.length < 2 ?
                  <div className="single-sample">
                    {activitySamples.map((sample, index) => <div className="sample-metrics" key={`${sample.label}-${index}`}>
                      <div className="sample-metric"><span>Response time</span><strong>{sample.response === null ? "—" : `${sample.response.toLocaleString()} ms`}</strong><div className="sample-track"><i className="response-bar" style={{width: `${sample.response === null ? 0 : Math.min(100, sample.response / Math.max(maxResponse, 5000) * 100)}%`}}/></div></div>
                      <div className="sample-metric"><span>CPU usage</span><strong>{sample.cpu === null ? "—" : `${sample.cpu}%`}</strong><div className="sample-track"><i className="cpu-bar" style={{width: `${sample.cpu === null ? 0 : Math.min(100, sample.cpu)}%`}}/></div></div>
                      <div className="sample-record"><span className={`activity-marker ${sample.anomaly ? "is-anomaly" : ""}`}/><span>{sample.label}</span><b>{sample.anomaly ? "Anomaly" : "Not flagged"}</b></div>
                    </div>)}
                    {!activitySamples.length && <p className="empty-small">No alert records available.</p>}
                  </div> :
                  <div className="activity-bars">
                    {activitySamples.map((sample, index) => <div className="activity-column" key={`${sample.label}-${index}`} title={`${sample.label}: response ${sample.response ?? "unavailable"} ms, CPU ${sample.cpu ?? "unavailable"}%`}>
                      <div className="activity-bar-pair">
                        <span className="activity-bar response-bar" style={{height: `${sample.response === null ? 0 : Math.max(3, sample.response / maxResponse * 100)}%`}}/>
                        <span className="activity-bar cpu-bar" style={{height: `${sample.cpu === null ? 0 : Math.max(3, sample.cpu / maxCpu * 100)}%`}}/>
                      </div>
                      <span className={`activity-marker ${sample.anomaly ? "is-anomaly" : ""}`}/>
                    </div>)}
                  </div>}
                <div className="activity-axis"><span>{activitySamples.length < 2 ? "Current loaded record" : "Loaded records (oldest shown → newest shown)"}</span><span>{activitySamples.length} records</span></div>
                {activitySamples.length >= 2 && <p className="chart-note">Bars compare relative values within the displayed records; this is not a time-series chart.</p>}
              </div>
              : <div className="empty-state"><Activity size={22}/><strong>No performance samples</strong><span>Loaded alerts do not contain response-time or CPU metrics yet.</span></div>}
          </Panel>
          <Panel title="Detected signals" subtitle="Signal counts from loaded alert records" icon={Activity} className="signals-panel">
            {loadingAlerts ? <Loading/> : alertsError ? <ErrorState message={alertsError} retry={loadAlerts}/> : signalItems.length ? <BarBreakdown items={signalItems}/> : <div className="empty-state"><Activity size={22}/><strong>No signals returned</strong><span>Signal breakdown appears when alerts include signal data.</span></div>}
          </Panel>
        </section>

        <Panel title="Event analysis" subtitle={demoMode ? "Disabled in read-only demo mode" : "Submit operational metrics to the anomaly detector"} icon={Zap} className="analysis-panel" >
          <div id="analysis-section" className="anchor-target"/>
          <form className="analysis-form" onSubmit={analyzeEvent}>
            <div className="form-grid">
              <Field label="Response time" unit="ms" value={event.response_time_ms} onChange={v=>setEvent({...event,response_time_ms:v})} min="0" step="any"/>
              <Field label="Error rate" unit="0–1" value={event.error_rate} onChange={v=>setEvent({...event,error_rate:v})} min="0" max="1" step="any"/>
              <Field label="CPU usage" unit="%" value={event.cpu_usage_pct} onChange={v=>setEvent({...event,cpu_usage_pct:v})} min="0" max="100" step="any"/>
              <Field label="Transactions per minute" unit="TPM" value={event.transactions_per_minute} onChange={v=>setEvent({...event,transactions_per_minute:v})} min="0" step="any"/>
            </div>
            <div className="form-footer"><span className="form-hint"><CircleHelp size={14}/> Values are submitted to the configured API.</span><button className="primary-button" type="submit" disabled={analyzing || demoMode || !session}>{analyzing?<LoaderCircle className="spin" size={16}/>:<Zap size={15}/>} {analyzing?"Analyzing…":"Run analysis"}</button></div>
          </form>
          {analysisError && <div className="inline-error"><AlertCircle size={16}/>{analysisError}</div>}
          {result && <div className="result-card"><div className="result-head"><CheckCircle2 size={17}/><strong>Analysis response received</strong><span className={`severity-pill ${isAnomaly(result)?"high":"low"}`}>{isAnomaly(result)?"ANOMALY":"NOT FLAGGED"}</span></div>
            <div className="result-metrics"><div><small>Event ID</small><strong>{result.event_id ?? "—"}</strong></div><div><small>Severity</small><strong>{result.severity ?? result.risk_level ?? "—"}</strong></div><div><small>Anomaly score</small><strong>{result.anomaly_score!=null?fmt(result.anomaly_score,4):"—"}</strong></div><div><small>Explanation</small><strong>{result.explanation ?? "Not returned"}</strong></div></div>
            <details><summary>View raw API response</summary><pre>{JSON.stringify(result,null,2)}</pre></details>
          </div>}
        </Panel>

        <Panel title="Alert management" subtitle={demoMode ? "Illustrative records · read-only demo" : "Search, triage, and track your saved alerts"} icon={Bell} className="alerts-panel" action={<div className="alert-tools"><label className="search-box"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search alerts…" aria-label="Search alerts"/></label><button className="icon-button" onClick={loadAlerts} aria-label="Refresh alerts" title="Refresh alerts"><RefreshCw size={15}/></button></div>}>
          <div id="alerts-section" className="anchor-target"/>
          <div className="alert-filter-row">
            <label>Status <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option><option>New</option><option>In Progress</option><option>Resolved</option><option>Dismissed</option></select></label>
            <label>Severity <select value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)}><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Normal</option></select></label>
            <span className="filter-summary">{filteredAlerts.length} matching · {alerts.length} loaded</span>
          </div>
          {alertsError && <div className="inline-error"><AlertCircle size={16}/>{alertsError}<button onClick={loadAlerts}>Retry</button></div>}
          <div className="table-wrap"><table className="alerts-table"><thead><tr><th>EVENT ID</th><th>CLASSIFICATION</th><th>SEVERITY</th><th>STATUS</th><th>SCORE</th><th>RESPONSE</th><th>CPU</th></tr></thead>
            <tbody>{loadingAlerts?<tr><td colSpan="7" className="table-empty"><Loading/></td></tr>:filteredAlerts.length===0?<tr><td colSpan="7" className="table-empty">{alertsError?"Could not load alert records":alerts.length?"No alerts match your search":"No alerts returned yet. Analyze an event to populate this table."}</td></tr>:filteredAlerts.map((a,i)=><tr key={a.event_id ?? i} className={`alert-row ${selectedAlert === a ? "selected" : ""}`} tabIndex={0} aria-label={`View details for alert ${a.event_id ?? i+1}`} onClick={()=>setSelectedAlert(selectedAlert === a ? null : a)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelectedAlert(selectedAlert === a ? null : a);}}}>
              <td><strong className="event-id">{a.event_id ?? `Event ${i+1}`}</strong></td>
              <td><span className={`classification ${isAnomaly(a)?"is-anomaly":""}`}>{isAnomaly(a)?"Anomaly":"Normal"}</span></td>
              <td><span className={`severity-pill ${severity(a).toLowerCase()}`}>{severity(a)}</span></td>
              <td><span className={`status-pill status-${String(a.status || "New").toLowerCase().replace(/\s+/g,"-")}`}>{a.status || "New"}</span></td>
              <td>{a.anomaly_score!=null?fmt(a.anomaly_score,4):"—"}</td>
              <td>{a.response_time_ms!=null?`${fmt(a.response_time_ms)} ms`:"—"}</td>
              <td>{a.cpu_usage_pct!=null?`${fmt(a.cpu_usage_pct)}%`:"—"}</td>
            </tr>)}</tbody></table></div>
          <footer className="table-footer"><span>Showing {filteredAlerts.length} of {alerts.length} loaded records · Select a row for details</span><span><i className={`dot ${alertsError?"red":"green"}`}/>{alertsError?"Data unavailable":"API-backed data"}</span></footer>
          {selectedAlert && <div className="alert-detail">
            <div className="alert-detail-head"><div><span className="detail-eyebrow">ALERT DETAILS</span><h3>{selectedAlert.event_id ?? "Selected alert"}</h3></div><button className="icon-button" onClick={()=>setSelectedAlert(null)} aria-label="Close alert details"><X size={16}/></button></div>
            <div className="alert-detail-grid">
              <div><small>Classification</small><strong>{isAnomaly(selectedAlert)?"Anomaly":"Normal"}</strong></div>
              <div><small>Severity</small><strong>{severity(selectedAlert)}</strong></div>
              <div><small>Workflow status</small><strong>{selectedAlert.status || "New"}</strong></div>
              <div><small>Anomaly score</small><strong>{selectedAlert.anomaly_score!=null?fmt(selectedAlert.anomaly_score,4):"—"}</strong></div>
              <div><small>Response time</small><strong>{selectedAlert.response_time_ms!=null?`${fmt(selectedAlert.response_time_ms)} ms`:"—"}</strong></div>
              <div><small>CPU usage</small><strong>{selectedAlert.cpu_usage_pct!=null?`${fmt(selectedAlert.cpu_usage_pct)}%`:"—"}</strong></div>
              <div><small>Transactions / min</small><strong>{selectedAlert.transactions_per_minute!=null?fmt(selectedAlert.transactions_per_minute):"—"}</strong></div>
              <div><small>ML prediction</small><strong>{selectedAlert.ml_prediction ?? "—"}</strong></div>
              <div><small>Baseline</small><strong>{selectedAlert.baseline ?? "—"}</strong></div>
            </div>
            {!demoMode && session && selectedAlert.alert_id && <div className="detail-block status-actions"><small>Update workflow status</small><div className="status-action-buttons">
              {["New", "In Progress", "Resolved", "Dismissed"].map(status => <button key={status} type="button" className={(selectedAlert.status || "New") === status ? "secondary-button active-status" : "secondary-button"} disabled={statusBusy || (selectedAlert.status || "New") === status} onClick={() => updateAlertStatus(selectedAlert, status)}>{statusBusy ? "Saving…" : status}</button>)}
            </div><p className="status-help">Status is saved to your account and remains after refresh or sign-in.</p></div>}
            {demoMode && <div className="detail-block"><small>Read-only demo</small><p>Demo alerts are illustrative and cannot be changed or saved.</p></div>}
            <div className="detail-block"><small>Explanation</small><p>{selectedAlert.explanation || "No explanation was returned for this alert."}</p></div>
            <div className="detail-block"><small>Detected signals</small><div className="detail-signals">{Array.isArray(selectedAlert.signals) && selectedAlert.signals.length ? selectedAlert.signals.map(signal=><span key={signal}>{signal}</span>) : <span className="muted-signal">No signals supplied</span>}</div></div>
            <details className="raw-alert"><summary>View complete alert record</summary><pre>{JSON.stringify(selectedAlert,null,2)}</pre></details>
          </div>}
        </Panel>
        <footer className="page-footer">Z-GUARD · AI-assisted operational anomaly detection <button onClick={()=>window.open("/docs","_blank","noopener,noreferrer")}>API documentation ↗</button></footer>
      </div>
    </main>
  </div>;
}

function Metric({icon:Icon,label,value,note,tone,good}) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={17}/></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div>{good!==undefined&&<span className={`metric-status ${good?"good":"bad"}`}><i className="dot"/>{good?"HEALTHY":"CHECK"}</span>}</article>;
}
function Field({label,unit,value,onChange,...props}) {
  return <label className="field"><span>{label}</span><div className="field-control"><input type="number" value={value} onChange={e=>onChange(e.target.value)} required {...props}/><small>{unit}</small></div></label>;
}
function HealthRow({label,detail,value,ok}) {
  return <div className="health-row"><span className={`health-icon ${ok?"ok":"warn"}`}>{ok?<CheckCircle2 size={15}/>:<AlertCircle size={15}/>}</span><div className="health-copy"><strong>{label}</strong><small>{detail}</small></div><span className={`health-value ${ok?"healthy":""}`}>{value}</span></div>;
}
function Loading(){return <div className="loading-state"><LoaderCircle className="spin" size={18}/> Loading data…</div>}
function ErrorState({message,retry}){return <div className="empty-state"><AlertCircle size={20}/><strong>Could not load data</strong><span>{message}</span><button className="secondary-button" onClick={retry}>Retry</button></div>}

export default App;
