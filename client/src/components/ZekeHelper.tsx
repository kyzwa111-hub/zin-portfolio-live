import { useState } from "react";
import { HeartHandshake, MessageCircle, Send, Sparkles, X } from "lucide-react";

const replies: Record<string, string> = {
  tired: "ဒီနေ့အလုပ်များနေရင် task တစ်ခုကိုပဲ ရွေးပြီး 15 မိနစ်အာရုံစိုက်ကြည့်ပါ။ မင်းရဲ့ progress က အရေးကြီးပါတယ်။",
  stuck: "မရှင်းသေးတဲ့ကိစ္စကို facts, people, next step ဆိုပြီး သုံးပိုင်းခွဲကြည့်ပါ။ Zeke က မင်းဘက်မှာရှိတယ်။",
  proud: "ဒီနေ့ကောင်းကောင်းလုပ်နိုင်ခဲ့တာကို မှတ်ထားပါ။ Small wins တွေက career confidence ကို တည်ဆောက်ပါတယ်။",
  need: "နားထောင်ပေးမယ်။ အခုမင်းအတွက် အရေးကြီးဆုံးအရာကို စာတစ်ကြောင်းနဲ့ ရေးပြလို့ရပါတယ်။",
};

export default function ZekeHelper() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("မင်းရဲ့ corporate life ကို နားထောင်ပေးဖို့ Zeke ရှိနေတယ်။ ဘယ်လိုခံစားနေရလဲ?");

  const chooseMood = (key: string) => setReply(replies[key] || replies.need);
  const sendMessage = () => {
    if (!message.trim()) return;
    setReply(`Zeke ကြားပါတယ် — “${message.trim().slice(0, 90)}${message.trim().length > 90 ? "…" : ""}”။ အခုချက်ချင်းလုပ်နိုင်တဲ့ next small step တစ်ခုကို ရွေးလိုက်ရအောင်။`);
    setMessage("");
  };

  return <>
    <button className="zeke-launcher" type="button" aria-label="Open Zeke corporate-life helper" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className="zeke-avatar" aria-hidden="true"><span>Z</span><i /></span>
      <span className="zeke-launcher-copy"><strong>Zeke</strong><small>here to listen</small></span>
    </button>
    {open && <aside className="zeke-panel" aria-label="Zeke corporate-life helper">
      <header className="zeke-panel-head"><div className="zeke-signature"><span className="zeke-avatar small"><span>Z</span><i /></span><div><strong>zeke</strong><small>your corporate-life companion</small></div></div><button type="button" className="zeke-close" aria-label="Close Zeke" onClick={() => setOpen(false)}><X size={17} /></button></header>
      <div className="zeke-panel-body"><div className="zeke-welcome"><Sparkles size={15} /><p>{reply}</p></div><p className="zeke-prompt">Quick check-in</p><div className="zeke-moods"><button type="button" onClick={() => chooseMood("tired")}><span>Low battery</span><small>ပင်ပန်းနေတယ်</small></button><button type="button" onClick={() => chooseMood("stuck")}><span>Need clarity</span><small>မရှင်းသေးဘူး</small></button><button type="button" onClick={() => chooseMood("proud")}><span>Good day</span><small>ဂုဏ်ယူတယ်</small></button></div><div className="zeke-input"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder="Tell Zeke what is on your mind…" aria-label="Message Zeke" /><button type="button" onClick={sendMessage} aria-label="Send message"><Send size={15} /></button></div><div className="zeke-links"><span><HeartHandshake size={13} /> listen · motivate · guide</span><span><MessageCircle size={13} /> private in this browser</span></div></div>
    </aside>}
  </>;
}
