import { Check, ExternalLink } from "lucide-react";
import "./clean-product.css";

type Plan = { name: string; title: string; items: string[] };
const plans: Plan[] = [
  { name: "Public", title: "Explore Zeke", items: ["Ask Zeke guidance", "Events and job feed", "Legal and payroll notes"] },
  { name: "Protected", title: "HR toolkit access", items: ["Payroll calculator", "Bulk payroll exports", "HR forms and C&B resources"] },
  { name: "Admin", title: "Managed workspace", items: ["Access approvals", "Content and template management", "Payment records and service settings"] },
];

export default function Plans() {
  return <main className="clean-page"><header className="clean-page-header"><div><p className="clean-eyebrow">Zeke · Access plans</p><h1>Clear access, no surprise gates.</h1><p>Start with public guidance. Protected HR tools are unlocked through the existing Telegram approval flow. Pricing and payment terms should be confirmed before any paid access is enabled.</p></div><a className="clean-back" href="/">Back to Zeke</a></header><section className="clean-grid">{plans.map((plan) => <article className="clean-card" key={plan.name}><p className="clean-eyebrow">{plan.name}</p><h2>{plan.title}</h2><div className="clean-list">{plan.items.map((item) => <div className="clean-list-row" key={item}><Check size={18}/><span><strong>{item}</strong><small>Available according to current workspace policy</small></span></div>)}</div>{plan.name === "Protected" && <a className="clean-button" style={{marginTop:20}} href="https://t.me/ayelay_bot?start=admin" target="_blank" rel="noreferrer">Request access <ExternalLink size={15}/></a>}</article>)}</section><section className="clean-card" style={{maxWidth:1180,margin:"20px auto 0"}}><h3>Important</h3><p>There is no automatic card charge on this page. Any paid service must be reviewed by an administrator, with the amount, currency, renewal, cancellation, and receipt clearly confirmed before payment.</p></section></main>;
}
