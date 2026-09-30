import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, RotateCcw, ShieldCheck, Trophy } from "lucide-react";

type Option = { label: string; feedback: string; best: boolean };
type Scenario = { title: string; skill: string; context: string; options: Option[] };
type GameProgress = { level: number; score: number; streak: number; bestStreak: number; checkpointLevel: number };

const MAX_LEVEL = 1000;
const CHECKPOINT_INTERVAL = 10;
const STORAGE_KEY = "zin-workplace-practice-progress";

const scenarios: Scenario[] = [
  { title: "Attendance pattern", skill: "Fact-finding", context: "An employee has repeated late arrivals, but the reason has not been documented yet. What is the best first move?", options: [
    { label: "Ask privately, listen, and document the facts.", feedback: "Good first step: establish facts and context before deciding on action.", best: true },
    { label: "Announce a warning in the team chat.", feedback: "Public correction can damage trust. Start with a private fact-finding conversation.", best: false },
    { label: "Remove the employee from the schedule immediately.", feedback: "That may be disproportionate before the facts and policy context are clear.", best: false },
  ] },
  { title: "Payroll variance", skill: "Reconciliation", context: "A net-pay result is different from last month. Which check should come first?", options: [
    { label: "Compare inputs, attendance, allowances, and deductions.", feedback: "Exactly: reconcile the source inputs before changing a calculation.", best: true },
    { label: "Change the tax rate until the net pay matches.", feedback: "Do not force an output. Verify the inputs and current rules first.", best: false },
    { label: "Ignore it if the difference is small.", feedback: "Small differences can still reveal an input or policy issue. Record and check them.", best: false },
  ] },
  { title: "Employee concern", skill: "Confidentiality", context: "A colleague raises a sensitive workplace concern. What creates the safest next step?", options: [
    { label: "Acknowledge it, protect confidentiality, and agree a next step.", feedback: "Strong response: listen carefully, limit disclosure, and clarify the process.", best: true },
    { label: "Ask several coworkers what they think first.", feedback: "That can spread confidential information. Keep the initial conversation private.", best: false },
    { label: "Promise a specific outcome immediately.", feedback: "Avoid promises before reviewing facts, policy, and the right decision-maker.", best: false },
  ] },
];

const emptyProgress: GameProgress = { level: 1, score: 0, streak: 0, bestStreak: 0, checkpointLevel: 1 };
function loadProgress(): GameProgress {
  if (typeof window === "undefined") return emptyProgress;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<GameProgress> | null;
    if (!saved) return emptyProgress;
    return { level: Math.min(MAX_LEVEL, Math.max(1, Number(saved.level) || 1)), score: Math.max(0, Number(saved.score) || 0), streak: Math.max(0, Number(saved.streak) || 0), bestStreak: Math.max(0, Number(saved.bestStreak) || 0), checkpointLevel: Math.min(MAX_LEVEL, Math.max(1, Number(saved.checkpointLevel) || 1)) };
  } catch { return emptyProgress; }
}
function stageFor(level: number): Scenario {
  const base = scenarios[(level - 1) % scenarios.length];
  const rotation = Math.floor((level - 1) / scenarios.length) % base.options.length;
  return { ...base, options: base.options.map((_, index) => base.options[(index + rotation) % base.options.length]) };
}
function padLevel(value: number) { return String(value).padStart(4, "0"); }

export default function ScenarioLab() {
  const [progress, setProgress] = useState<GameProgress>(loadProgress);
  const [selected, setSelected] = useState<number | null>(null);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const scenario = useMemo(() => stageFor(progress.level), [progress.level]);
  const selectedOption = selected === null ? null : scenario.options[selected];
  const isComplete = progress.level === MAX_LEVEL && selected !== null;
  const checkpointStart = Math.floor((progress.level - 1) / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL + 1;
  const checkpointProgress = progress.level - checkpointStart;
  const answered = progress.level - 1;
  const accuracy = answered ? Math.round((progress.score / answered) * 100) : 0;

  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }, [progress]);
  const choose = (index: number) => { if (selected === null) setSelected(index); };
  const next = () => {
    if (selectedOption === null) return;
    if (isComplete) {
      setProgress(emptyProgress);
      setSelected(null);
      setShowCheckpoint(false);
      return;
    }
    const correct = selectedOption.best;
    const nextLevel = Math.min(MAX_LEVEL, progress.level + 1);
    const crossedCheckpoint = nextLevel !== progress.level && (nextLevel - 1) % CHECKPOINT_INTERVAL === 0;
    setProgress(current => ({ level: nextLevel, score: current.score + (correct ? 1 : 0), streak: correct ? current.streak + 1 : 0, bestStreak: correct ? Math.max(current.bestStreak, current.streak + 1) : current.bestStreak, checkpointLevel: crossedCheckpoint ? nextLevel : current.checkpointLevel }));
    setSelected(null);
    setShowCheckpoint(crossedCheckpoint);
  };
  const resetToCheckpoint = () => { setProgress(current => ({ ...emptyProgress, level: current.checkpointLevel, checkpointLevel: current.checkpointLevel })); setSelected(null); setShowCheckpoint(false); };
  const resetGame = () => { setProgress(emptyProgress); setSelected(null); setShowCheckpoint(false); };

  return (
    <section className="scenario-lab section-pad" id="game" aria-labelledby="scenario-lab-title">
      <div className="scenario-lab-heading"><div><p className="section-kicker"><span className="eyebrow-dot" /> Workplace practice</p><h2 id="scenario-lab-title">Think clearly,<br /><i>then act.</i></h2></div><p className="section-description">A quick HR decision game for practising facts, people, policy, and the next practical step. Choose once, learn from the feedback, and build your judgement streak.</p></div>
      <div className="scenario-lab-card">
        <div className="scenario-lab-meta"><span>STAGE {padLevel(progress.level)} / {MAX_LEVEL}</span><span>CASE 0{((progress.level - 1) % scenarios.length) + 1} / 0{scenarios.length} · {scenario.title}</span></div>
        <div className="scenario-progress" aria-label={`Stage ${progress.level} of ${MAX_LEVEL}`}><span style={{ width: `${(progress.level / MAX_LEVEL) * 100}%` }} /></div>
        <div className="scenario-stats" aria-label="Game progress"><span><strong>{progress.score}</strong> correct</span><span><strong>{progress.streak}</strong> streak</span><span><strong>{progress.bestStreak}</strong> best</span><span><strong>{accuracy}%</strong> accuracy</span><span className="scenario-checkpoint"><Trophy size={13} /> CP {padLevel(progress.checkpointLevel)}</span></div>
        <div className="scenario-skill"><ShieldCheck size={14} /> Skill focus · {scenario.skill}</div>
        <h3>{scenario.context}</h3>
        <div className="scenario-options">{scenario.options.map((option, index) => <button key={option.label} type="button" className={selected === index ? (option.best ? "chosen correct" : "chosen") : ""} onClick={() => choose(index)} disabled={selected !== null}><span>{String.fromCharCode(65 + index)}</span><strong>{option.label}</strong><ArrowRight size={15} /></button>)}</div>
        {selectedOption && <div className={selectedOption.best ? "scenario-feedback good" : "scenario-feedback"}><Check size={16} /><p><strong>{selectedOption.best ? "Good judgement." : "Keep learning."}</strong> {selectedOption.feedback}</p><button type="button" onClick={next}>{isComplete ? "Play from start" : "Next stage"} <ArrowRight size={14} /></button></div>}
        {showCheckpoint && selected === null && <div className="scenario-checkpoint-banner" role="status"><Trophy size={16} /><p>Checkpoint saved. You can resume from stage {padLevel(progress.checkpointLevel)}.</p></div>}
        {selected === null && !showCheckpoint && <p className="scenario-hint"><RotateCcw size={13} /> Choose the response that protects facts, people, and process.</p>}
        <div className="scenario-footer-actions"><span>Checkpoint {checkpointProgress}/{CHECKPOINT_INTERVAL - 1}</span><button type="button" onClick={resetToCheckpoint} disabled={progress.checkpointLevel === progress.level}>Restore checkpoint</button><button type="button" onClick={resetGame}>Reset game</button></div>
      </div>
    </section>
  );
}
