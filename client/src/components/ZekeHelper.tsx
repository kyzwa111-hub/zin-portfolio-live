import { useMemo, useState } from "react";
import { Gamepad2, HeartHandshake, MessageCircle, Quote, Send, Sparkles, X } from "lucide-react";

type Mood = "tired" | "stuck" | "proud" | "need";
type GameCase = { title: string; prompt: string; options: { label: string; outcome: string }[] };

const quotes = [
  "အလုပ်ကောင်းတစ်ခုဟာ အမြန်ဆုံးလုပ်တာမဟုတ်ဘဲ မှန်ကန်တဲ့အရာကို တည်ငြိမ်စွာလုပ်တာပါ။",
  "မင်းရဲ့ voice ကို လျှော့မတွက်ပါနဲ့။ Respectful clarity က leadership ရဲ့အစပါ။",
  "ဒီနေ့ perfect ဖြစ်ဖို့မလိုပါဘူး။ မနေ့ကထက် တစ်ဆင့်ကောင်းရင် လုံလောက်ပါတယ်။",
  "အလုပ်များတဲ့နေ့မှာ အရေးကြီးတာကို ရွေးနိုင်ခြင်းက productivity ထက် ပိုတန်ဖိုးရှိပါတယ်။",
  "နားယူတာဟာ အလုပ်ထွက်တာမဟုတ်ပါဘူး။ ကိုယ့် energy ကို ပြန်ဖြည့်တာပါ။",
  "လူတွေကို နားထောင်ပေးနိုင်တဲ့သူက team ကို ပိုကောင်းအောင် ဦးဆောင်နိုင်ပါတယ်။",
  "Small wins တွေကို မှတ်ထားပါ။ Career confidence က အဲ့ဒီအရာလေးတွေကနေ တည်ဆောက်ပါတယ်။",
];

const moodReplies: Record<Mood, string> = {
  tired: "အခု low battery ဖြစ်နေရင် ကိုယ့်ကို အပြစ်မတင်ပါနဲ့။ အရေးကြီးဆုံး task တစ်ခုကိုပဲ 15 မိနစ်စလုပ်ကြည့်ပါ။",
  stuck: "မရှင်းသေးတဲ့ကိစ္စကို facts, people, next step ဆိုပြီး သုံးပိုင်းခွဲကြည့်ပါ။",
  proud: "ဒီနေ့ကောင်းကောင်းလုပ်နိုင်ခဲ့တာကို မှတ်ထားပါ။ မင်းရဲ့ progress က တန်ဖိုးရှိပါတယ်။",
  need: "နားထောင်ပေးမယ်။ ပြဿနာကို တစ်ကြောင်းနဲ့ရေးပြီး နောက်တစ်ဆင့်သေးသေးလေးကို ရွေးကြည့်ရအောင်။",
};

const cases: Record<Mood, GameCase> = {
  tired: { title: "The overloaded teammate", prompt: "Team member တစ်ယောက်က workload များလွန်းလို့ deadline လွတ်တော့မယ်လို့ ပြောလာပါတယ်။ HR အနေနဲ့ ဘာစလုပ်မလဲ?", options: [{ label: "အရင်နားထောင်ပြီး priority ပြန်စီမယ်", outcome: "ကောင်းပါတယ်။ Psychological safety ရှိမှ real issue ကို သိနိုင်ပါတယ်။" }, { label: "ချက်ချင်း overtime တောင်းမယ်", outcome: "Risk ရှိပါတယ်။ Burnout ကို ပိုတိုးစေနိုင်လို့ facts နဲ့ capacity ကို အရင်စစ်ပါ။" }] },
  stuck: { title: "The unclear handover", prompt: "Handover မှာ owner မရှင်းလို့ task နှစ်ခုထပ်နေပါတယ်။ ဘာကိုရွေးမလဲ?", options: [{ label: "Owner, deadline, next action သုံးခုရေးမယ်", outcome: "မှန်ပါတယ်။ Clarity က conflict ကို လျှော့ချပေးပါတယ်။" }, { label: "ဘယ်သူ့အပြစ်လဲ အရင်ရှာမယ်", outcome: "အပြစ်ရှာတာထက် workflow ကို ပြန်ရှင်းတာက ပိုထိရောက်ပါတယ်။" }] },
  proud: { title: "The fair recognition", prompt: "Team member နှစ်ယောက်က project ကောင်းကောင်းလုပ်ထားပါတယ်။ Recognition ကို ဘယ်လိုပေးမလဲ?", options: [{ label: "Contribution တစ်ခုချင်းစီကို တိတိကျကျ အသိအမှတ်ပြုမယ်", outcome: "ကောင်းပါတယ်။ Fair recognition က trust ကို တည်ဆောက်ပါတယ်။" }, { label: "အကြီးဆုံးအသံရှိသူကိုပဲ ချီးကျူးမယ်", outcome: "မမျှတနိုင်ပါဘူး။ Evidence နဲ့ contribution ကို အခြေခံပါ။" }] },
  need: { title: "The difficult conversation", prompt: "Performance feedback ပေးရမယ့်သူက စိတ်မကောင်းဖြစ်လွယ်သူပါ။ ဘာကို အရင်လုပ်မလဲ?", options: [{ label: "Specific example + impact + support plan နဲ့ပြောမယ်", outcome: "အကောင်းဆုံးပါ။ Clear feedback နဲ့ support နှစ်ခုလုံးလိုပါတယ်။" }, { label: "မပြောဘဲ နောက်တစ်ခါစောင့်မယ်", outcome: "ကြာလေလေ issue ကြီးလေလေပါ။ Respectfully ပြောတာက ပိုကောင်းပါတယ်။" }] },
};

export default function ZekeHelper() {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<Mood>("need");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState(moodReplies.need);
  const [gameReply, setGameReply] = useState("");
  const [showGame, setShowGame] = useState(false);
  const dailyQuote = useMemo(() => quotes[new Date().getDate() % quotes.length], []);
  const game = cases[mood];

  const chooseMood = (value: Mood) => { setMood(value); setReply(moodReplies[value]); setGameReply(""); setShowGame(true); };
  const sendMessage = () => { if (!message.trim()) return; setReply(`Zeke ကြားပါတယ် — “${message.trim().slice(0, 90)}${message.trim().length > 90 ? "…" : ""}”။ အခုချက်ချင်းလုပ်နိုင်တဲ့ next small step တစ်ခုကို ရွေးလိုက်ရအောင်။`); setMessage(""); };

  return <>
    <button className="zeke-launcher" type="button" aria-label="Open Zeke corporate-life helper" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span className="zeke-avatar" aria-hidden="true"><span>Z</span><i /></span><span className="zeke-launcher-copy"><strong>Zeke</strong><small>here to listen</small></span></button>
    {open && <aside className="zeke-panel" aria-label="Zeke corporate-life helper"><header className="zeke-panel-head"><div className="zeke-signature"><span className="zeke-avatar small"><span>Z</span><i /></span><div><strong>zeke</strong><small>your corporate-life companion</small></div></div><button type="button" className="zeke-close" aria-label="Close Zeke" onClick={() => setOpen(false)}><X size={17} /></button></header>
      <div className="zeke-panel-body"><div className="zeke-quote"><Quote size={14} /><div><strong>Daily note</strong><p>{dailyQuote}</p></div></div><div className="zeke-welcome"><Sparkles size={15} /><p>{reply}</p></div><p className="zeke-prompt">How are you arriving at work today?</p><div className="zeke-moods"><button type="button" onClick={() => chooseMood("tired")}><span>Low battery</span><small>ပင်ပန်းနေတယ်</small></button><button type="button" onClick={() => chooseMood("stuck")}><span>Need clarity</span><small>မရှင်းသေးဘူး</small></button><button type="button" onClick={() => chooseMood("proud")}><span>Good day</span><small>ဂုဏ်ယူတယ်</small></button></div>
        {showGame && <div className="zeke-game"><div className="zeke-game-head"><Gamepad2 size={15} /><strong>{game.title}</strong></div><p>{game.prompt}</p>{gameReply ? <div className="zeke-game-result">{gameReply}</div> : <div className="zeke-game-options">{game.options.map((option) => <button key={option.label} type="button" onClick={() => setGameReply(option.outcome)}>{option.label}</button>)}</div>}</div>}
        <div className="zeke-input"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder="Tell Zeke what is on your mind…" aria-label="Message Zeke" /><button type="button" onClick={sendMessage} aria-label="Send message"><Send size={15} /></button></div><div className="zeke-links"><span><HeartHandshake size={13} /> listen · motivate · guide</span><span><MessageCircle size={13} /> private in this browser</span></div></div>
    </aside>}
  </>;
}
