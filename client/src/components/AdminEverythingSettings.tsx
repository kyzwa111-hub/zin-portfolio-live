import { useEffect, useState } from "react";
import { Loader2, Save, Settings2 } from "lucide-react";

type SettingKey = "zeke_voice_default" | "zeke_daily_quotes" | "hr_game_cases" | "service_fee_note" | "payroll_display_note" | "linkedin_job_feed_url" | "jobnet_job_feed_url" | "telegram_channel_url";
type Settings = Partial<Record<SettingKey, string>>;

const defaults: Settings = {
  zeke_voice_default: "off",
  zeke_daily_quotes: "အလုပ်ကောင်းတစ်ခုဟာ အမြန်ဆုံးလုပ်တာမဟုတ်ဘဲ မှန်ကန်တဲ့အရာကို တည်ငြိမ်စွာလုပ်တာပါ။\nဒီနေ့ perfect ဖြစ်ဖို့မလိုပါဘူး။ မနေ့ကထက် တစ်ဆင့်ကောင်းရင် လုံလောက်ပါတယ်။",
  hr_game_cases: "",
  service_fee_note: "Service fee ကို payroll/tax/SSB ထဲ မရောပါ။ အမှန်အတိုင်း သီးခြားဖော်ပြပါသည်။",
  payroll_display_note: "ဒီ tool သည် လေ့လာရေးအတွက် ခန့်မှန်းချက်သာ ဖြစ်သည်။",
  linkedin_job_feed_url: "",
  jobnet_job_feed_url: "",
  telegram_channel_url: "https://t.me/thejournalopportunity",
};

async function settingsApi(path: string, body?: unknown) {
  const response = await fetch(path, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Settings request failed.");
  return result;
}

export default function AdminEverythingSettings() {
  const [values, setValues] = useState<Settings>(defaults);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { settingsApi("/api/admin/settings").then((result) => setValues({ ...defaults, ...Object.fromEntries(Object.entries(result.settings || {}).map(([key, item]) => [key, (item as { value: string }).value])) })).catch(() => undefined); }, []);
  const update = (key: SettingKey, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const save = async () => { setBusy(true); setMessage(""); try { for (const [key, value] of Object.entries(values)) await settingsApi("/api/admin/settings", { key, value }); setMessage("All settings saved."); } catch (error) { setMessage(error instanceof Error ? error.message : "Settings could not be saved."); } finally { setBusy(false); } };
  return <section className="admin-control-card admin-everything-card"><div className="admin-control-card-head"><div><p className="section-kicker"><Settings2 size={14} /> Everything control</p><h2>Website behavior settings</h2></div><span>Saved to protected admin settings</span></div><p className="admin-control-note">Zeke voice, daily Myanmar quotes, HR game cases, payroll fee messaging, LinkedIn/JobNet feed URLs, and Telegram source ကို ဒီနေရာကနေ ထိန်းချုပ်နိုင်ပါတယ်။ RSS/JSON URL များကိုသာ ထည့်ပါ။</p><div className="admin-everything-grid"><label><span>Zeke voice default</span><select value={values.zeke_voice_default} onChange={(event) => update("zeke_voice_default", event.target.value)}><option value="off">Off until user taps Voice on</option><option value="on">On after user interaction</option></select></label><label><span>Telegram channel URL</span><input value={values.telegram_channel_url} onChange={(event) => update("telegram_channel_url", event.target.value)} /></label><label><span>LinkedIn RSS / JSON feed URL</span><input value={values.linkedin_job_feed_url} onChange={(event) => update("linkedin_job_feed_url", event.target.value)} placeholder="https://…" /></label><label><span>JobNet RSS / JSON feed URL</span><input value={values.jobnet_job_feed_url} onChange={(event) => update("jobnet_job_feed_url", event.target.value)} placeholder="https://…" /></label><label className="admin-everything-wide"><span>Daily Myanmar quotes · one quote per line</span><textarea rows={5} value={values.zeke_daily_quotes} onChange={(event) => update("zeke_daily_quotes", event.target.value)} /></label><label className="admin-everything-wide"><span>HR game cases JSON override</span><textarea rows={5} value={values.hr_game_cases} onChange={(event) => update("hr_game_cases", event.target.value)} placeholder='Optional JSON: [{"title":"...","prompt":"...","options":["...","..."]}]' /></label><label className="admin-everything-wide"><span>Service fee display note</span><textarea rows={3} value={values.service_fee_note} onChange={(event) => update("service_fee_note", event.target.value)} /></label><label className="admin-everything-wide"><span>Payroll display / legal note</span><textarea rows={3} value={values.payroll_display_note} onChange={(event) => update("payroll_display_note", event.target.value)} /></label></div><div className="admin-everything-actions"><button className="button-primary" type="button" onClick={() => void save()} disabled={busy}>{busy ? <Loader2 className="spin" size={14} /> : <Save size={14} />} Save all settings</button>{message && <span role="status">{message}</span>}</div></section>;
}
