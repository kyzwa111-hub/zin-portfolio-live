import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type ChatMessage = { role: "assistant" | "user"; content: string };

const welcomeMessage =
  "မင်္ဂလာပါ — Zeke ပါ။ HR, payroll, workplace process, career, event တွေနဲ့ ဒီ website ထဲက service တွေအကြောင်း မေးနိုင်ပါတယ်။ မေးခွန်းကို တိုက်ရိုက်ရေးပါ။";

const quickPrompts = [
  "Payroll calculator ကို ဘယ်လိုသုံးမလဲ?",
  "Attendance issue ကို ဘယ်လိုစီမံမလဲ?",
  "SSB နဲ့ PIT ဘာကွာလဲ?",
  "ဒီ website မှာ game နဲ့ events ဘယ်မှာလဲ?",
];

function fallbackAnswer(question: string): string {
  const text = question.toLowerCase();

  if (/^(hi|hello|hey|မင်္ဂလာ|မေးချင်)/i.test(question.trim())) {
    return "မင်္ဂလာပါ။ Zeke က နားထောင်ဖို့ ready ပါ။ Payroll, HR service, workplace issue, career, event ဒါမှမဟုတ် ဒီ website ကို ဘယ်လိုသုံးရမလဲဆိုတာ မေးနိုင်ပါတယ်။";
  }
  if (
    /(payroll|လစာ|salary|ဝင်ငွေ|ssb|ပင်စင်|tax|အခွန်|paye|တွက်)/i.test(text)
  ) {
    return "Payroll အတွက် Services ထဲက protected Payroll testing workspace ကိုဖွင့်ပါ။ Monthly salary ထည့်ပြီး PAYE/SSB estimate နဲ့ result ကို စမ်းနိုင်ပါတယ်။ Official filing မလုပ်ခင် IRD/SSB ရဲ့ လက်ရှိ official guidance ကို သီးခြားစစ်ပါ။ မင်းရဲ့မေးခွန်းက salary calculation အကြောင်းဆိုရင် amount နဲ့ pay period ကို ရေးပေးပါ။";
  }
  if (
    /(service|ဝန်ဆောင်|hr|human resource|recruit|recruitment|employee|ဝန်ထမ်း|policy|လုပ်ငန်း)/i.test(
      text
    )
  ) {
    return "ဒီ toolkit ရဲ့ HR operations service တွေမှာ people operations, employee experience, HR process, compensation & benefits နဲ့ practical workplace support ပါဝင်ပါတယ်။ Services section မှာ သက်ဆိုင်ရာ workspace ကိုရွေးပြီး protected tools တွေကို ဆက်သုံးနိုင်ပါတယ်။";
  }
  if (/(event|events|webinar|သင်တန်း|ပွဲ|video|ဗီဒီယို|learning)/i.test(text)) {
    return "HR event feed ကို Events menu ကနေဖွင့်နိုင်ပါတယ်။ အဲဒီမှာ HR နဲ့ workplace learning အတွက် curated public links တွေကို မူရင်း source ဆီသွားကြည့်နိုင်အောင် စုစည်းထားပါတယ်။";
  }
  if (
    /(zin|min htet|profile|portfolio|contact|ဆက်သွယ်|linkedin|telegram)/i.test(
      text
    )
  ) {
    return "HR operations, payroll, workplace process, and public resources အကြောင်း မေးမြန်းနိုင်ပါတယ်။";
  }
  if (/(game|ဂိမ်း|zeke|scenario|practice|လေ့ကျင့်)/i.test(text)) {
    return "Zeke ကို အခု mood/game helper မဟုတ်တော့ဘဲ မေးခွန်းဖြေတဲ့ HR assistant အဖြစ် ပြောင်းထားပါတယ်။ Workplace scenario တစ်ခုအကြောင်း အကြံလိုရင် အခြေအနေကို ရေးပေးပါ—facts, people, next step ဆိုပြီး ခွဲပြီး စဉ်းစားပေးမယ်။";
  }
  if (/(မသိ|မရှင်း|stuck|help|အကူအညီ|ဘယ်လိုစ|what should|how do)/i.test(text)) {
    return "အရင်ဆုံး ပြဿနာကို facts, people, next step သုံးပိုင်းခွဲကြည့်ပါ။ ဘာဖြစ်နေတယ်၊ ဘယ်သူတွေပါဝင်တယ်၊ ဒီနေ့လုပ်နိုင်တဲ့ next small step ကဘာလဲဆိုတာ ရေးပေးရင် Zeke က ပိုတိကျတဲ့လမ်းညွှန်ပေးမယ်။";
  }

  return `Zeke ကြားပါတယ် — “${question.trim().slice(0, 140)}${question.trim().length > 140 ? "…" : ""}”။ ဒီမေးခွန်းကို ဖြေဖို့ context နည်းနည်းထပ်ပေးပါ။ ဘာဖြစ်နေတယ်၊ ဘာကိုအောင်မြင်ချင်တယ်၊ ဘယ်အချိန်အတွင်း လုပ်ရမလဲဆိုတာ ရေးပေးရင် practical next step တစ်ခုနဲ့ ပြန်ညွှန်ပေးမယ်။`;
}

export default function ZekeHelper() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: welcomeMessage },
  ]);
  const dailyLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()),
    []
  );

  const speak = (text: string) => {
    if (
      !voiceEnabled ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    )
      return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "my-MM";
    utterance.rate = 0.88;
    utterance.pitch = 1.02;
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (value = message) => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    const conversation = [
      ...messages,
      { role: "user" as const, content: trimmed },
    ];
    setMessages(conversation);
    setMessage("");
    setIsLoading(true);
    let reply = fallbackAnswer(trimmed);
    try {
      const apiOrigin = window.location.hostname.endsWith("workers.dev") ? "https://zin-portfolio-live.pages.dev" : "";
      const response = await fetch(`${apiOrigin}/api/zeke/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: conversation.slice(-12) }),
      });
      const data = (await response.json()) as { reply?: string };
      if (response.ok && data.reply?.trim()) reply = data.reply.trim();
    } catch {
      // Keep Zeke useful if the AI binding or network is temporarily unavailable.
    } finally {
      setMessages(current => [
        ...current,
        { role: "assistant", content: reply },
      ]);
      setIsLoading(false);
    }
    window.setTimeout(() => speak(reply), 50);
  };

  return (
    <>
      <button
        className="zeke-launcher"
        type="button"
        aria-label="Open Zeke HR assistant"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span className="zeke-avatar" aria-hidden="true">
          <img className="zeke-mascot" src="/images/zeke-mascot.png" alt="" />
          <span className="zeke-live-spark" />
          <i />
        </span>
        <span className="zeke-launcher-copy">
          <strong>Zeke</strong>
          <small>ask anything</small>
        </span>
      </button>
      {open && (
        <aside className="zeke-panel" aria-label="Zeke HR assistant">
          <header className="zeke-panel-head">
            <div className="zeke-signature">
              <span className="zeke-avatar small">
                <img className="zeke-mascot" src="/images/zeke-mascot.png" alt="" />
                <span className="zeke-live-spark" />
                <i />
              </span>
              <div>
                <strong>zeke</strong>
                <small>HR &amp; workplace assistant</small>
              </div>
            </div>
            <button
              type="button"
              className="zeke-close"
              aria-label="Close Zeke"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </header>
          <div className="zeke-panel-body">
            <div className="zeke-assistant-status">
              <span className="zeke-status-dot" /> Available now <span>·</span>{" "}
              {dailyLabel}
            </div>
            <div className="zeke-chat-list" aria-live="polite">
              {messages.map((item, index) => (
                <div
                  className={`zeke-message zeke-message-${item.role}`}
                  key={`${item.role}-${index}`}
                >
                  <span className="zeke-message-icon">
                    {item.role === "assistant" ? (
                      <Bot size={13} />
                    ) : (
                      <span>You</span>
                    )}
                  </span>
                  <p>{item.content}</p>
                </div>
              ))}
              {isLoading && (
                <div className="zeke-message zeke-message-assistant">
                  <span className="zeke-message-icon">
                    <Bot size={13} />
                  </span>
                  <p className="zeke-typing">
                    <i />
                    <i />
                    <i />
                  </p>
                </div>
              )}
            </div>
            <div className="zeke-quick-prompts">
              <span>Try asking</span>
              {quickPrompts.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                >
                  {prompt}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
            <div className="zeke-input">
              <input
                value={message}
                onChange={event => setMessage(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter") void sendMessage();
                }}
                placeholder="Ask Zeke anything…"
                aria-label="Message Zeke"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
            <div className="zeke-links">
              <button
                type="button"
                className="zeke-voice-toggle"
                onClick={() => {
                  setVoiceEnabled(value => !value);
                  if (voiceEnabled) window.speechSynthesis?.cancel();
                }}
                aria-pressed={voiceEnabled}
              >
                {voiceEnabled ? (
                  <>
                    <Volume2 size={12} /> Voice on
                  </>
                ) : (
                  <>
                    <VolumeX size={12} /> Voice off
                  </>
                )}
              </button>
              <span>
                <Sparkles size={12} /> Cloudflare AI · no account required
              </span>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
