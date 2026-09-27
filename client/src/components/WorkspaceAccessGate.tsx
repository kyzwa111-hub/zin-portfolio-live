import { ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";

const telegramUrl = "https://t.me/Payroll_Officer_bot?start=access";

export default function WorkspaceAccessGate() {
  return (
    <div className="workspace-unlock" id="telegram-unlock">
      <div className="workspace-unlock-icon"><LockKeyhole size={24} /></div>
      <div className="workspace-unlock-copy">
        <p className="section-kicker"><span className="telegram-dot" /> One Telegram unlock</p>
        <h3>Unlock the complete HR workspace.</h3>
        <p>Open Telegram once to request access for the HR, payroll, bulk export, and C&amp;B workspace.</p>
        <div className="calculator-gate-actions">
          <a className="button-primary" href={telegramUrl} target="_blank" rel="noreferrer">Unlock in Telegram <ExternalLink size={14} /></a>
        </div>
        <small>Telegram will open in a new tab. Follow the bot instructions to request access.</small>
      </div>
      <div className="workspace-unlock-status"><ShieldCheck size={16} /> One access point</div>
    </div>
  );
}
