import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./admin-control.css";
import { ExternalLink, Loader2, LogOut, Plus, RefreshCw, RotateCcw, ShieldCheck, UserX } from "lucide-react";
import { Link } from "wouter";

type RequestRow = { request_id: string; requester_name: string; status: string; telegram_username: string | null; expires_at: number; created_at: number; ip_address: string | null; country: string | null; city: string | null };
type PaymentRow = { id: number; request_id: string; requester_name: string; amount: number; currency: string; method: string; reference: string | null; status: string; note: string | null; recorded_at: number };
type Overview = { requests: RequestRow[]; payments: PaymentRow[] };

async function api(path: string, body?: unknown) {
  const response = await fetch(path, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return result;
}

export default function AdminControlCenter() {
  const [data, setData] = useState<Overview>({ requests: [], payments: [] });
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");
  const [amount, setAmount] = useState("50000");
  const [method, setMethod] = useState("KBZPay");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const refresh = async () => {
    const result = await api("/api/admin/overview") as Overview;
    setData(result); setAuthorized(true);
  };
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = new URLSearchParams(window.location.search).get("login");
        if (token) { await api("/api/admin/session", { token }); window.history.replaceState({}, "", "/admin"); }
        await refresh();
      } catch (e) { if (alive) { setAuthorized(false); setError(e instanceof Error ? e.message : "Sign-in required."); } }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await action(); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Action failed."); }
    finally { setBusy(false); }
  };
  const addPayment = async (event: FormEvent) => {
    event.preventDefault();
    await run(async () => { await api("/api/admin/payments", { requestId, amount: Number(amount), method, reference, note, status: "pending" }); setReference(""); setNote(""); });
  };
  const revoke = (id: string) => { if (window.confirm("Revoke this access request?")) void run(() => api("/api/admin/requests/revoke", { requestId: id })); };
  const restore = (id: string) => { if (window.confirm("Restore access for this request? It will be approved again for 24 hours.")) void run(() => api("/api/admin/requests/restore", { requestId: id })); };
  const logout = () => void run(async () => { await api("/api/admin/logout", {}); setAuthorized(false); });

  if (loading) return <main className="admin-control-shell"><p><Loader2 className="spin" /> Checking secure access…</p></main>;
  if (!authorized) return <main className="admin-control-shell"><section className="admin-control-login"><ShieldCheck size={30} /><p className="section-kicker">Private workspace</p><h1>Admin Control Center</h1><p>{error || "Open the Telegram bot from your admin account and send /admin. The bot will reply with a one-time secure sign-in link."}</p><a className="button-primary" href="https://t.me/Payroll_Officer_bot" target="_blank" rel="noreferrer">Open Telegram bot <ExternalLink size={14} /></a><small>Sign-in links expire after 10 minutes and can be used once.</small><Link href="/">Back to portfolio</Link></section></main>;

  const approved = data.requests.filter((r) => r.status === "approved");
  return <main className="admin-control-shell">
    <header className="admin-control-header"><div><p className="section-kicker"><ShieldCheck size={14} /> Private workspace</p><h1>Admin Control Center</h1><p>Review Telegram access requests and record verified payments.</p></div><div className="admin-control-actions"><button onClick={() => void run(refresh)} disabled={busy}><RefreshCw size={14} /> Refresh</button><button onClick={logout} disabled={busy}><LogOut size={14} /> Sign out</button></div></header>
    {error && <p className="admin-control-error" role="alert">{error}</p>}
    <section className="admin-control-stats"><article><span>Pending requests</span><strong>{data.requests.filter((r) => r.status === "pending").length}</strong></article><article><span>Approved</span><strong>{approved.length}</strong></article><article><span>Payment records</span><strong>{data.payments.length}</strong></article></section>
    <section className="admin-control-card"><div className="admin-control-card-head"><div><p className="section-kicker">Telegram approval</p><h2>Access requests</h2></div><span>{data.requests.length} total</span></div>
      {data.requests.length ? <div className="admin-control-table-wrap"><table className="admin-control-table"><thead><tr><th>Requester</th><th>Origin</th><th>Request ID</th><th>Status</th><th>Created</th><th>Expires</th><th></th></tr></thead><tbody>{data.requests.map((r) => <tr key={r.request_id}><td><strong>{r.requester_name}</strong><small>{r.telegram_username ? "@" + r.telegram_username : "Telegram user not linked"}</small></td><td className="admin-origin-cell">{[r.city, r.country].filter(Boolean).join(", ") || r.ip_address || "—"}{r.ip_address && <small>{r.ip_address}</small>}</td><td><code>{r.request_id}</code></td><td><span className={"admin-status-pill " + r.status}>{r.status}</span></td><td>{new Date(r.created_at).toLocaleString()}</td><td>{new Date(r.expires_at).toLocaleString()}</td><td>{["pending","approved"].includes(r.status) && <button className="admin-revoke-button" onClick={() => revoke(r.request_id)} disabled={busy}><UserX size={13} /> Revoke</button>}{r.status === "revoked" && <button className="admin-restore-button" onClick={() => restore(r.request_id)} disabled={busy}><RotateCcw size={13} /> Restore</button>}</td></tr>)}</tbody></table></div> : <p className="admin-control-empty">No access requests yet.</p>}
    </section>
    <section className="admin-control-card"><div className="admin-control-card-head"><div><p className="section-kicker">Manual ledger</p><h2>Payment records</h2></div><span>Review evidence before confirming</span></div>
      <form className="admin-payment-form" onSubmit={addPayment}><label><span>Approved request</span><select value={requestId} onChange={(e) => setRequestId(e.target.value)} required><option value="">Select requester</option>{approved.map((r) => <option key={r.request_id} value={r.request_id}>{r.requester_name} · {r.request_id.slice(-8)}</option>)}</select></label><label><span>Amount (MMK)</span><input type="number" min="1" max="100000000" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label><label><span>Method</span><select value={method} onChange={(e) => setMethod(e.target.value)}><option>KBZPay</option><option>Bank transfer</option><option>Cash</option><option>Other</option></select></label><label><span>Reference</span><input maxLength={160} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" /></label><label className="admin-payment-wide"><span>Internal note</span><input maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></label><button className="button-primary" type="submit" disabled={busy || !approved.length}><Plus size={14} /> Record payment</button></form>
      {data.payments.length ? <div className="admin-control-table-wrap"><table className="admin-control-table"><thead><tr><th>Requester</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th>Recorded</th></tr></thead><tbody>{data.payments.map((p) => <tr key={p.id}><td><strong>{p.requester_name}</strong><small>{p.request_id.slice(-8)}</small></td><td>{p.amount.toLocaleString()} {p.currency}</td><td>{p.method}</td><td>{p.reference || "—"}</td><td><select aria-label={"Payment status for " + p.requester_name} value={p.status} disabled={busy} onChange={(e) => void run(() => api("/api/admin/payments/update", { id: p.id, status: e.target.value, reference: p.reference || "", note: p.note || "" }))}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option></select></td><td>{new Date(p.recorded_at).toLocaleString()}</td></tr>)}</tbody></table></div> : <p className="admin-control-empty">No payments recorded yet.</p>}
      <p className="admin-control-note">Manual admin record only; this page does not process payments or store receipt images.</p>
    </section>
    <footer className="admin-control-footer"><span><ShieldCheck size={14} /> Protected by one-time Telegram sign-in.</span><Link href="/">Return to portfolio</Link></footer>
  </main>;
}
