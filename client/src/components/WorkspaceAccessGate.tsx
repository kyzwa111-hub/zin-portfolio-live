import { FormEvent, useState } from "react";
import { CheckCircle2, ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";

const telegramBot = "Payroll_Officer_bot";

export default function WorkspaceAccessGate() {
  const [requestOpen, setRequestOpen] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = requesterName.trim();
    if (!name) return;
    setSubmitted(true);
    const start = `access_${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
    window.open(`https://t.me/${telegramBot}?start=${encodeURIComponent(start)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="workspace-unlock" id="telegram-unlock">
      <div className="workspace-unlock-icon"><LockKeyhole size={24} /></div>
      <div className="workspace-unlock-copy">
        <p className="section-kicker"><span className="telegram-dot" /> One Telegram unlock</p>
        <h3>Unlock the complete HR workspace.</h3>
        {!requestOpen ? (
          <>
            <p>Request access once for the HR, payroll, bulk export, and C&amp;B workspace.</p>
            <div className="calculator-gate-actions">
              <button type="button" className="button-primary" onClick={() => setRequestOpen(true)}>Request access</button>
            </div>
          </>
        ) : (
          <form className="workspace-request-form" onSubmit={submitRequest}>
            <p>Enter your name first. Telegram will open after you submit the request.</p>
            <label className="calculator-requester-field">
              <span>Your name</span>
              <input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} placeholder="Enter your name" autoComplete="name" maxLength={160} autoFocus />
            </label>
            <div className="calculator-gate-actions">
              <button type="submit" className="button-primary" disabled={!requesterName.trim()}>{submitted ? "Open Telegram again" : "Continue to Telegram"} <ExternalLink size={14} /></button>
              <button type="button" className="text-link workspace-cancel" onClick={() => setRequestOpen(false)}>Cancel</button>
            </div>
          </form>
        )}
        <small>Telegram opens only after you submit the access request.</small>
      </div>
      <div className="workspace-unlock-status">{submitted ? <><CheckCircle2 size={16} /> Request started</> : <><ShieldCheck size={16} /> One access point</>}</div>
    </div>
  );
}
