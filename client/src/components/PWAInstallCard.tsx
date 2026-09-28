import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

type InstallChoice = { outcome: "accepted" | "dismissed" };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export default function PWAInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAppleMobile, setIsAppleMobile] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" }).catch(() => undefined);
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as NavigatorWithStandalone).standalone);
    setIsInstalled(standalone);
    setIsAppleMobile(/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const install = async () => {
    if (!installPrompt) {
      setShowInstructions((visible) => !visible);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "dismissed") setShowInstructions(true);
  };

  return (
    <section className="admin-install-card" aria-label="Install mobile admin app">
      <div className="admin-install-icon"><Smartphone size={22} /></div>
      <div className="admin-install-copy">
        <p className="section-kicker">Admin mobile app</p>
        <h2>ဖုန်းထဲမှာ Admin Panel ကို ထည့်သွင်းပါ</h2>
        <p>ဒီလင့်ခ်ကို home screen မှာ app လို သိမ်းထားနိုင်ပါတယ်။ လုံခြုံရေးအတွက် admin data ကို offline မသိမ်းပါ။</p>
        {showInstructions && (
          <p className="admin-install-help" role="status">
            {isAppleMobile
              ? "iPhone/iPad: Safari မှ Share ခလုတ်ကိုနှိပ်ပြီး “Add to Home Screen” ကိုရွေးပါ။"
              : "Android: Chrome menu (⋮) ကိုဖွင့်ပြီး “Install app” သို့မဟုတ် “Add to Home screen” ကိုရွေးပါ။"}
          </p>
        )}
      </div>
      <button className="admin-install-button" type="button" onClick={() => void install()}>
        <Download size={15} /> {installPrompt ? "Install app" : "Install steps"}
      </button>
    </section>
  );
}
