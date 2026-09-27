import { useState } from "react";
import { CheckCircle2, ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { writeAccessSession } from "@/lib/accessSession";

export default function WorkspaceAccessGate() {
  const [requesterName, setRequesterName] = useState("");
  const accessRequest = trpc.calculatorAccess.request.useMutation({
    onSuccess: (data) => writeAccessSession({ requestId: data.requestId, token: data.token }),
  });
  const botUsername = accessRequest.data?.botUsername ?? "Payroll_Officer_bot";
  const statusMessage = accessRequest.data?.adminNotified
    ? "Approval request sent. Waiting for the administrator."
    : "Request access once to unlock every HR, payroll, and C&B tool below.";

  return (
    <div className="workspace-unlock" id="telegram-unlock">
      <div className="workspace-unlock-icon"><LockKeyhole size={24} /></div>
      <div className="workspace-unlock-copy">
        <p className="section-kicker"><span className="telegram-dot" /> One Telegram unlock</p>
        <h3>Unlock the complete HR workspace.</h3>
        <p>{statusMessage} One approval covers payroll calculations, bulk exports, and C&amp;B resources.</p>
        <label className="calculator-requester-field">
          <span>Your name</span>
          <input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} placeholder="Enter your name" autoComplete="name" maxLength={160} />
        </label>
        <div className="calculator-gate-actions">
          <button className="button-primary" onClick={() => accessRequest.mutate({ requesterName: requesterName.trim() })} disabled={accessRequest.isPending || requesterName.trim().length < 2}>
            {accessRequest.isPending ? "Sending request…" : "Request access"}
          </button>
          <a className="text-link" href={`https://t.me/${botUsername}?start=admin`} target="_blank" rel="noreferrer">Open Telegram bot <ExternalLink size={14} /></a>
        </div>
        <small>Requests expire after 10 minutes. Salary data stays locked until admin approval.</small>
      </div>
      <div className="workspace-unlock-status">{accessRequest.data ? <><CheckCircle2 size={16} /> Request sent</> : <><ShieldCheck size={16} /> One approval for all tools</>}</div>
    </div>
  );
}
