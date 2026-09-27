import { useState } from "react";
import { CheckCircle2, ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { writeAccessSession } from "@/lib/accessSession";

export default function WorkspaceAccessGate() {
  const [requesterName, setRequesterName] = useState("");
  const [paymentRequested, setPaymentRequested] = useState(false);
  const accessRequest = trpc.calculatorAccess.request.useMutation({
    onSuccess: (data) => { setPaymentRequested(true); writeAccessSession({ requestId: data.requestId, token: data.token }); },
    onError: () => setPaymentRequested(false),
  });
  const access = accessRequest.data;
  const statusQuery = trpc.calculatorAccess.status.useQuery(
    access ? { requestId: access.requestId, token: access.token } : { requestId: "pending-request", token: "pending-request-token" },
    { enabled: Boolean(access), refetchInterval: access ? 2500 : false },
  );
  const botUsername = access?.botUsername ?? "Payroll_Officer_bot";
  const botLink = `https://t.me/${botUsername}?start=admin`;

  return (
    <div className="workspace-unlock" id="telegram-unlock">
      <div className="workspace-unlock-icon"><LockKeyhole size={24} /></div>
      <div className="workspace-unlock-copy">
        <p className="section-kicker"><span className="telegram-dot" /> One Telegram unlock</p>
        <h3>Unlock the complete HR workspace.</h3>
        {!access ? (
          <>
            <p>Request access once for the HR, payroll, bulk export, and C&amp;B workspace. The admin will review your request before payment instructions appear.</p>
            <label className="calculator-requester-field">
              <span>Your name</span>
              <input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} placeholder="Enter your name" autoComplete="name" maxLength={160} />
            </label>
            <div className="calculator-gate-actions">
              <button type="button" className="button-primary" onClick={() => accessRequest.mutate({ requesterName: requesterName.trim() })} disabled={accessRequest.isPending || requesterName.trim().length < 2}>{accessRequest.isPending ? "Sending request…" : "Request access"}</button>
              <a className="text-link" href={botLink} target="_blank" rel="noreferrer">Open Telegram bot <ExternalLink size={14} /></a>
            </div>
          </>
        ) : (
          <>
            <p>{statusQuery.data?.status === "approved" ? "Approved. The workspace is unlocked." : "Request sent. Wait for the administrator to approve it after reviewing your request."}</p>
            <small>Request ID: {access.requestId.slice(-8)} · Requests expire after 10 minutes.</small>
          </>
        )}
        {paymentRequested && access && <div className="payment-request-panel workspace-payment-panel" aria-live="polite"><div><p className="section-kicker">Requester-only payment instructions</p><h3>Pay 50,000 MMK via KBZPay</h3><p>After the admin reviews your request, scan the QR code and send the payment screenshot plus your request ID to the Telegram bot. Access unlocks only after administrator approval.</p><strong>Request ID: {access.requestId.slice(-8)}</strong><small>This panel is shown only in the browser session that submitted the request.</small></div><img src="/manus-storage/pasted_file_kNMX4R_image_1509cee3.png" alt="KBZPay QR code for the 50,000 MMK access payment" /></div>}
      </div>
      <div className="workspace-unlock-status">{statusQuery.data?.status === "approved" ? <><CheckCircle2 size={16} /> Approved</> : <><ShieldCheck size={16} /> {access ? "Awaiting approval" : "Admin approval"}</>}</div>
    </div>
  );
}
