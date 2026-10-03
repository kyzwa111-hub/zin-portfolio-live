import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Check, RotateCcw, ShieldCheck, Trophy } from "lucide-react";

type Option = { label: string; feedback: string; best: boolean };
type Scenario = { title: string; skill: string; law: string; context: string; options: Option[] };
type GameProgress = { level: number; score: number; streak: number; bestStreak: number; checkpointLevel: number };
type LeaderboardEntry = { id: string; nickname: string; score: number; level: number; streak: number; bestStreak: number; createdAt: string };

const MAX_LEVEL = 1000;
const CHECKPOINT_INTERVAL = 10;
const STORAGE_KEY = "zin-workplace-practice-progress";

// These cases teach process and minimum-protection thinking, not legal advice.
// Coverage, sector rules, notifications and effective dates must be checked before action.
export const scenarios: Scenario[] = [
  { title: "Employment terms", skill: "Contract completeness", law: "Employment and Skills Development Law · official contract template", context: "A new hire has only a chat message saying “salary and start date”. What should HR do before onboarding?", options: [
    { label: "Prepare a written agreement covering role, workplace, pay, hours, leave, discipline, resignation and termination terms.", feedback: "Good process: the contract should make the employment terms clear and cannot reduce statutory minimum protections.", best: true },
    { label: "Start work first and decide the terms after the first payroll.", feedback: "Unclear terms create avoidable disputes. Confirm the required contract details before or at onboarding.", best: false },
    { label: "Use a blank one-line salary promise because all other terms are implied.", feedback: "A salary line alone does not explain working time, leave, responsibilities or ending the relationship.", best: false },
  ] },
  { title: "Probation", skill: "Fair onboarding", law: "Employment and Skills Development Law · contract guidance", context: "A manager wants a six-month probation period with no written terms. What is the safer HR response?", options: [
    { label: "Check the applicable contract framework, document the period and keep statutory protections in place.", feedback: "Probation does not make wage, safety, working-time or fair-process obligations disappear.", best: true },
    { label: "Approve six months automatically because probation has no limits.", feedback: "Do not assume an unlimited probation period. Verify the applicable rule and contract practice.", best: false },
    { label: "Pay nothing until probation is passed.", feedback: "Work performed still needs lawful, documented compensation.", best: false },
  ] },
  { title: "Minimum wage", skill: "Coverage check", law: "Minimum Wage Law 2013 · current notifications", context: "A covered worker is paid below the current eight-hour daily minimum. What should HR check first?", options: [
    { label: "Confirm coverage and the current notification, then correct the wage record and escalate any shortfall.", feedback: "Minimum-wage coverage and current notifications matter; a contract cannot simply waive a statutory minimum.", best: true },
    { label: "Keep the rate because the worker signed the offer.", feedback: "A signed term does not automatically make a below-minimum payment lawful.", best: false },
    { label: "Rename part of the wage so the total looks higher without changing pay.", feedback: "Do not relabel compensation to hide a shortfall. Keep components transparent and verifiable.", best: false },
  ] },
  { title: "Wage components", skill: "Payroll transparency", law: "Minimum Wage Law · Payment of Wages Law", context: "Payroll combines base wage, daily allowances and overtime into one unexplained number. What is the best fix?", options: [
    { label: "Show each component, the pay period, lawful deductions and the calculation basis on the payroll record.", feedback: "Transparent records help employees and auditors verify the correct wage treatment.", best: true },
    { label: "Hide the breakdown so employees cannot challenge it.", feedback: "Opaque payroll increases risk and makes errors harder to correct.", best: false },
    { label: "Treat every allowance as overtime.", feedback: "Different compensation components should not be relabelled without a lawful basis.", best: false },
  ] },
  { title: "Pay day", skill: "Payment controls", law: "Payment of Wages Law 2016 · Shops and Establishments Law", context: "Finance asks to delay monthly wages for convenience. What should HR do?", options: [
    { label: "Check the applicable sector deadline, communicate early, and use the lawful exception process if one applies.", feedback: "Payment timing depends on the applicable law and establishment; do not delay casually.", best: true },
    { label: "Delay all wages until cash flow improves with no notice.", feedback: "Unannounced delay can breach payment obligations and damage trust.", best: false },
    { label: "Ask only the newest employees to accept late payment.", feedback: "Selective delay is not a substitute for a lawful, documented process.", best: false },
  ] },
  { title: "Working time", skill: "Time records", law: "Factories Act · Shops and Establishments Law", context: "A supervisor approves overtime from memory and there are no attendance records. What comes first?", options: [
    { label: "Record actual hours, rest days and approvals, then check the sector rule and overtime calculation.", feedback: "Accurate time records are the foundation for lawful working-time and overtime decisions.", best: true },
    { label: "Pay a flat overtime amount without checking hours.", feedback: "A flat amount can hide missing or incorrect overtime records.", best: false },
    { label: "Delete the attendance sheet after payroll closes.", feedback: "Keep required records so the decision can be explained later.", best: false },
  ] },
  { title: "Overtime", skill: "Approval discipline", law: "Factories Act / Shops and Establishments Law · sector rules", context: "A team is working late every night to hit a target. What should the HR partner recommend?", options: [
    { label: "Review hours, approvals, rest and sector limits; correct pay and address the workload plan.", feedback: "Overtime is a compliance and wellbeing issue, not only a payroll line.", best: true },
    { label: "Tell employees that unapproved overtime is always free.", feedback: "Do not use an approval process to erase hours actually worked.", best: false },
    { label: "Stop recording overtime to keep the report clean.", feedback: "Removing records increases legal and safety risk.", best: false },
  ] },
  { title: "Weekly rest", skill: "Roster fairness", law: "Leave and Holidays Act · sector working-time rules", context: "A roster gives an employee no weekly rest day for three consecutive weeks. What is the right next step?", options: [
    { label: "Review the roster against the applicable sector rule and schedule the required rest or lawful alternative.", feedback: "Rest-day requirements vary by establishment, so verify the applicable rule and document the roster.", best: true },
    { label: "Assume a higher salary removes every rest requirement.", feedback: "Pay does not automatically cancel statutory rest protections.", best: false },
    { label: "Tell the employee to take unpaid leave instead.", feedback: "Do not disguise a roster problem as employee leave.", best: false },
  ] },
  { title: "Earned leave", skill: "Leave records", law: "Leave and Holidays Act 1951 · Rules 2018", context: "An employee completes 12 months of qualifying service. What should HR check?", options: [
    { label: "Check qualifying days and record the employee’s earned-leave entitlement and scheduling plan.", feedback: "The Act provides a minimum earned-leave framework; keep the service and leave record clear.", best: true },
    { label: "Delete the leave balance because the employee did not request it earlier.", feedback: "Minimum leave rights should not be silently removed.", best: false },
    { label: "Require the employee to work through every leave day.", feedback: "Operational pressure is not a reason to ignore statutory leave.", best: false },
  ] },
  { title: "Casual leave", skill: "Practical support", law: "Leave and Holidays Act · standard employment contract guidance", context: "An employee needs a short absence for an urgent family matter. What is the most responsible response?", options: [
    { label: "Check the leave policy and statutory casual-leave framework, then record the approved request.", feedback: "Use the correct leave category and keep a consistent record rather than making an arbitrary decision.", best: true },
    { label: "Mark the employee absent without asking for context.", feedback: "First understand the request and apply the documented rule consistently.", best: false },
    { label: "Promise unlimited paid leave immediately.", feedback: "Do not promise an entitlement before checking the law, policy and facts.", best: false },
  ] },
  { title: "Medical leave", skill: "Evidence handling", law: "Leave and Holidays Act · Rules 2018", context: "A worker with more than six months’ service submits a medical certificate. What should HR do?", options: [
    { label: "Validate the document through the normal process and apply the eligible sick-leave rule without exposing medical details.", feedback: "Use the medical evidence only for the leave decision and protect health information.", best: true },
    { label: "Post the diagnosis in the team channel.", feedback: "Medical information is sensitive and should remain restricted.", best: false },
    { label: "Reject every sick-leave request during a busy month.", feedback: "Workload does not erase eligible leave rights.", best: false },
  ] },
  { title: "Public holiday", skill: "Calendar controls", law: "Leave and Holidays Act 1951 · Rules 2018", context: "A manager says a public holiday can be removed from the roster whenever targets are tight. What is the HR answer?", options: [
    { label: "Check the official holiday calendar and the applicable paid-holiday or substitute-rest rule before changing the roster.", feedback: "Public-holiday minimums cannot be casually withdrawn; keep the calendar and pay treatment aligned.", best: true },
    { label: "Remove it because the employment contract is silent.", feedback: "Silence in a contract does not automatically remove a statutory minimum.", best: false },
    { label: "Count it as an employee’s annual leave without agreement.", feedback: "Do not shift a public holiday into another leave category without a lawful basis.", best: false },
  ] },
  { title: "Maternity protection", skill: "Non-discrimination", law: "Social Security Law · leave and maternity provisions", context: "A supervisor wants to reject a promotion because an employee is pregnant. What should HR do?", options: [
    { label: "Stop the discriminatory proposal, assess the promotion on job-related criteria and explain the applicable maternity process.", feedback: "Pregnancy and maternity must not be used as a shortcut to deny fair employment treatment.", best: true },
    { label: "Approve the rejection because leave is inconvenient.", feedback: "Operational inconvenience is not a fair selection criterion.", best: false },
    { label: "Ask coworkers to vote on the employee’s promotion.", feedback: "Confidential employment decisions need a fair, documented process.", best: false },
  ] },
  { title: "SSB setup", skill: "Benefits readiness", law: "Social Security Law 2012 · SSB rules", context: "A covered employee is missing from the SSB contribution file. What is HR’s best move?", options: [
    { label: "Verify coverage, registration, contribution base and employee record, then correct the filing path.", feedback: "SSB compliance needs accurate worker records and the applicable contribution rule.", best: true },
    { label: "Deduct the employee share but never submit the employer record.", feedback: "Withholding without the required record or remittance creates risk.", best: false },
    { label: "Tell the employee to register personally and close the case.", feedback: "Employer responsibilities cannot simply be passed to the employee.", best: false },
  ] },
  { title: "Workplace safety", skill: "Risk prevention", law: "Factories Act · occupational safety requirements", context: "A machine guard is broken but production is behind. What should the supervisor do?", options: [
    { label: "Control the hazard, stop unsafe work where necessary, report it and fix the guard before resuming.", feedback: "Safety controls come before production targets; document the corrective action.", best: true },
    { label: "Ask the fastest worker to use the machine carefully.", feedback: "Individual caution cannot replace an engineering safety control.", best: false },
    { label: "Hide the damage before an inspection.", feedback: "Concealing a hazard puts people at risk and worsens the compliance failure.", best: false },
  ] },
  { title: "Work injury", skill: "Incident response", law: "Factories Act · Social Security Law", context: "A worker is injured and the manager wants to handle it quietly. What should HR do?", options: [
    { label: "Provide immediate care, preserve facts, report through the applicable process and protect the worker from retaliation.", feedback: "A documented, humane response supports safety, benefits and dispute prevention.", best: true },
    { label: "Delete the incident log after the worker returns.", feedback: "Incident records should be preserved according to the applicable retention process.", best: false },
    { label: "Make the worker sign that the injury never happened.", feedback: "A waiver cannot replace required safety and reporting duties.", best: false },
  ] },
  { title: "Confidential concern", skill: "Grievance handling", law: "Settlement of Labour Disputes Law", context: "An employee reports harassment and asks HR not to tell the whole office. What is the best first step?", options: [
    { label: "Listen privately, explain confidentiality limits, record the facts and agree a safe next step.", feedback: "Good handling protects the person, preserves evidence and avoids spreading the allegation.", best: true },
    { label: "Ask the whole team who is at fault.", feedback: "Public speculation can harm everyone and compromise the process.", best: false },
    { label: "Promise termination before any fact-finding.", feedback: "Do not promise an outcome before a fair review.", best: false },
  ] },
  { title: "Workplace committee", skill: "Early resolution", law: "Settlement of Labour Disputes Law", context: "A workplace grievance is escalating. What should HR check before sending it straight to social media?", options: [
    { label: "Use the workplace grievance and conciliation path that applies, while protecting against retaliation.", feedback: "The dispute-resolution framework is designed to address workplace issues through structured steps.", best: true },
    { label: "Tell the complainant there is no internal process.", feedback: "Employees should be told the available, lawful route rather than shut out.", best: false },
    { label: "Publish names to pressure a quick settlement.", feedback: "Public exposure is not a safe or fair dispute-resolution method.", best: false },
  ] },
  { title: "Termination reason", skill: "Fair process", law: "Employment and Skills Development Law · Labour Organization Law", context: "A manager wants to dismiss a worker for joining a lawful labour organisation. What should HR do?", options: [
    { label: "Reject the prohibited reason and require a documented, lawful, non-retaliatory process.", feedback: "Lawful labour-organisation activity must not be used as a dismissal shortcut.", best: true },
    { label: "Approve it if the manager calls the reason ‘culture fit’.", feedback: "Changing the label does not cure a prohibited motive.", best: false },
    { label: "Ask the worker to resign immediately.", feedback: "Pressure to resign can still create a coercive and unlawful outcome.", best: false },
  ] },
  { title: "Notice and records", skill: "Exit controls", law: "Employment and Skills Development Law · contract terms", context: "A company plans an immediate termination but has no written reason or notice record. What should HR do?", options: [
    { label: "Check the contract and applicable law, document the reason, notice or lawful exception, and final-pay steps.", feedback: "Termination should be reasoned, documented and followed by a correct final settlement.", best: true },
    { label: "Backdate a reason after the employee leaves.", feedback: "Backdating undermines a fair process and record integrity.", best: false },
    { label: "Withhold all final wages until the employee stops asking questions.", feedback: "Final wages and lawful deductions need their own documented process.", best: false },
  ] },
  { title: "Final settlement", skill: "Exit accuracy", law: "Employment and Skills Development Law · Leave and Holidays Act", context: "An employee leaves with unused earned leave and the payroll team wants to erase the balance. What should HR do?", options: [
    { label: "Calculate the unused-leave payment and any applicable final entitlements using the correct records.", feedback: "Unused earned leave may need to be paid on exit; verify the current rule and calculation basis.", best: true },
    { label: "Erase the balance because the employee resigned.", feedback: "Resignation does not automatically cancel accrued statutory leave.", best: false },
    { label: "Replace the leave with an unrecorded cash gift.", feedback: "Use a transparent, lawful payroll record rather than an off-book payment.", best: false },
  ] },
  { title: "Records and audit", skill: "Evidence quality", law: "Payment of Wages Law · labour inspection requirements", context: "An inspector asks for attendance, leave and payroll evidence, but each file shows a different salary. What should HR do?", options: [
    { label: "Reconcile the records, preserve the source evidence, disclose the discrepancy and correct the process.", feedback: "A reliable audit trail is more valuable than trying to make inconsistent files look identical.", best: true },
    { label: "Delete the older files and keep only the cleanest version.", feedback: "Deleting evidence can make the issue much more serious.", best: false },
    { label: "Ask employees to sign blank backdated forms.", feedback: "Backdating and blank signatures are not credible controls.", best: false },
  ] },
  { title: "Recruitment fairness", skill: "Job-related selection", law: "Employment contract principles · non-discrimination good practice", context: "A hiring panel wants to reject every applicant over 35 without checking the role requirements. What should HR do?", options: [
    { label: "Use documented, job-related criteria and review whether the age rule is necessary and lawful.", feedback: "Selection should be based on capability and genuine role requirements, not a blanket assumption.", best: true },
    { label: "Approve it because age is easy to screen.", feedback: "Convenience is not a defensible reason for a broad exclusion.", best: false },
    { label: "Hide the rule from applicants and apply it privately.", feedback: "Secret criteria reduce fairness and make the process difficult to defend.", best: false },
  ] },
  { title: "Personnel file access", skill: "Privacy discipline", law: "Employment records · privacy-aware HR practice", context: "A manager asks HR to send an employee’s full medical and identity file to a group chat. What should HR do?", options: [
    { label: "Share only the minimum information with authorized people through a secure channel and record the reason.", feedback: "Need-to-know access protects the employee and reduces accidental disclosure.", best: true },
    { label: "Send everything because the manager is senior.", feedback: "Seniority alone does not justify unrestricted access to sensitive records.", best: false },
    { label: "Print the file and leave it in the reception area.", feedback: "Physical exposure is still a confidentiality failure.", best: false },
  ] },
  { title: "Performance support", skill: "Documented coaching", law: "Employment contract and fair-process principles", context: "A worker misses targets for the first time. The manager wants an immediate dismissal with no conversation. What is the better HR step?", options: [
    { label: "Clarify the expectation, hear context, offer a reasonable improvement plan and document the review.", feedback: "A clear, proportionate process gives the worker a fair chance and gives HR reliable evidence.", best: true },
    { label: "Invent earlier warnings to strengthen the file.", feedback: "Backfilling warnings damages record integrity and trust.", best: false },
    { label: "Announce the performance issue to the whole department.", feedback: "Public embarrassment is not a fair performance-management tool.", best: false },
  ] },
  { title: "Equal pay check", skill: "Compensation review", law: "Minimum Wage Law · Payment of Wages Law", context: "Two people perform substantially similar work but their pay records use different unexplained allowances. What should HR do?", options: [
    { label: "Compare role scope, tenure, lawful pay factors and payroll components, then document any correction.", feedback: "A structured pay review can identify unexplained differences without assuming every difference is unlawful.", best: true },
    { label: "Tell the lower-paid worker not to ask questions.", feedback: "Silencing a concern does not resolve the underlying pay-control issue.", best: false },
    { label: "Rename both allowances as bonuses and close the review.", feedback: "Relabelling compensation without analysis hides rather than fixes the record.", best: false },
  ] },
  { title: "Disciplinary meeting", skill: "Procedural fairness", law: "Employment and Skills Development Law · workplace rules", context: "A disciplinary meeting is scheduled, but the employee receives no allegation or time to prepare. What should HR change?", options: [
    { label: "Explain the concern, give reasonable notice, allow a response and keep a balanced record of the outcome.", feedback: "A fair process is clearer, more defensible and less likely to create an avoidable dispute.", best: true },
    { label: "Keep the allegation secret until the meeting ends.", feedback: "A person cannot meaningfully respond to an undisclosed concern.", best: false },
    { label: "Require a resignation before hearing the response.", feedback: "Pressure to resign is not a substitute for fair fact-finding.", best: false },
  ] },
  { title: "Recruitment data", skill: "Consent and retention", law: "Employment records · privacy-aware HR practice", context: "A recruiter wants to keep every applicant’s ID photo forever in a personal cloud folder. What should HR do?", options: [
    { label: "Set a purpose, access rule and retention period, then store only what the hiring process needs.", feedback: "Purpose-limited collection and controlled retention reduce privacy and security risk.", best: true },
    { label: "Allow it because rejected applicants are no longer relevant.", feedback: "Rejected applicants’ personal data still needs responsible handling.", best: false },
    { label: "Ask the recruiter to forward the folder to friends for backup.", feedback: "Uncontrolled copying multiplies the exposure risk.", best: false },
  ] },
  { title: "Business continuity", skill: "People-first planning", law: "Occupational safety · workplace emergency practice", context: "Flooding makes the normal worksite unsafe, but a manager says everyone must report or lose pay. What should HR do?", options: [
    { label: "Activate the safety plan, communicate a safe alternative and check the lawful pay and attendance treatment.", feedback: "Protecting people comes first; the pay and leave treatment should then be documented against the applicable rule.", best: true },
    { label: "Ignore the hazard because the office is still technically open.", feedback: "A physical opening does not make an unsafe journey or workplace acceptable.", best: false },
    { label: "Delete the emergency messages so the decision cannot be reviewed.", feedback: "Keep the incident trail and use it to improve the response.", best: false },
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
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [nickname, setNickname] = useState(() => typeof window === "undefined" ? "" : window.localStorage.getItem("zeke-game-nickname") || "");
  const [leaderboardStatus, setLeaderboardStatus] = useState("");
  const scenario = useMemo(() => stageFor(progress.level), [progress.level]);
  const selectedOption = selected === null ? null : scenario.options[selected];
  const isComplete = progress.level === MAX_LEVEL && selected !== null;
  const checkpointStart = Math.floor((progress.level - 1) / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL + 1;
  const checkpointProgress = progress.level - checkpointStart;
  const answered = progress.level - 1;
  const accuracy = answered ? Math.round((progress.score / answered) * 100) : 0;
  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }, [progress]);
  useEffect(() => {
    fetch("/api/game/leaderboard").then(response => response.ok ? response.json() : Promise.reject(new Error("unavailable"))).then((data: { entries?: LeaderboardEntry[] }) => setLeaderboard(data.entries || [])).catch(() => setLeaderboardStatus("Leaderboard will appear when the game service is ready."));
  }, []);
  const choose = (index: number) => { if (selected === null) setSelected(index); };
  const next = () => {
    if (selectedOption === null) return;
    if (isComplete) { setProgress(emptyProgress); setSelected(null); setShowCheckpoint(false); return; }
    const correct = selectedOption.best;
    const nextLevel = Math.min(MAX_LEVEL, progress.level + 1);
    const crossedCheckpoint = nextLevel !== progress.level && (nextLevel - 1) % CHECKPOINT_INTERVAL === 0;
    setProgress(current => ({ level: nextLevel, score: current.score + (correct ? 1 : 0), streak: correct ? current.streak + 1 : 0, bestStreak: correct ? Math.max(current.bestStreak, current.streak + 1) : current.bestStreak, checkpointLevel: crossedCheckpoint ? nextLevel : current.checkpointLevel }));
    setSelected(null);
    setShowCheckpoint(crossedCheckpoint);
  };
  const resetToCheckpoint = () => { setProgress(current => ({ ...emptyProgress, level: current.checkpointLevel, checkpointLevel: current.checkpointLevel })); setSelected(null); setShowCheckpoint(false); };
  const resetGame = () => { setProgress(emptyProgress); setSelected(null); setShowCheckpoint(false); };
  const submitScore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = nickname.trim();
    if (cleanName.length < 2) { setLeaderboardStatus("Enter at least 2 characters for your player name."); return; }
    setLeaderboardStatus("Saving score…");
    try {
      const response = await fetch("/api/game/leaderboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname: cleanName, score: progress.score, level: progress.level, streak: progress.streak, bestStreak: progress.bestStreak }) });
      const data = await response.json() as { entries?: LeaderboardEntry[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save score.");
      setLeaderboard(data.entries || []);
      setLeaderboardStatus("Score saved to the board.");
      if (typeof window !== "undefined") window.localStorage.setItem("zeke-game-nickname", cleanName);
    } catch (error) { setLeaderboardStatus(error instanceof Error ? error.message : "Unable to save score."); }
  };
  return (
    <section className="scenario-lab section-pad" id="game" aria-labelledby="scenario-lab-title">
      <div className="scenario-lab-heading"><div><p className="section-kicker"><span className="eyebrow-dot" /> Myanmar HR practice game</p><h2 id="scenario-lab-title">Think clearly,<br /><i>then act.</i></h2></div><p className="section-description">A 1,000-level HR decision game built around Myanmar employment, leave, wage, SSB, safety and dispute-process topics. Learn the minimum-protection mindset; verify the current official rule before taking real action.</p></div>
      <div className="scenario-lab-card">
        <div className="scenario-lab-meta"><span>LEVEL {padLevel(progress.level)} / {MAX_LEVEL}</span><span>CASE 0{((progress.level - 1) % scenarios.length) + 1} / {scenarios.length} · {scenario.title}</span></div>
        <div className="scenario-progress" aria-label={`Level ${progress.level} of ${MAX_LEVEL}`}><span style={{ width: `${(progress.level / MAX_LEVEL) * 100}%` }} /></div>
        <div className="scenario-stats" aria-label="Game progress"><span><strong>{progress.score}</strong> correct</span><span><strong>{progress.streak}</strong> streak</span><span><strong>{progress.bestStreak}</strong> best</span><span><strong>{accuracy}%</strong> accuracy</span><span className="scenario-checkpoint"><Trophy size={13} /> CP {padLevel(progress.checkpointLevel)}</span></div>
        <div className="scenario-skill"><ShieldCheck size={14} /> Skill focus · {scenario.skill}</div>
        <div className="scenario-law-note"><strong>Myanmar law lens</strong><span>{scenario.law}</span></div>
        <h3>{scenario.context}</h3>
        <div className="scenario-options">{scenario.options.map((option, index) => <button key={option.label} type="button" className={selected === index ? (option.best ? "chosen correct" : "chosen") : ""} onClick={() => choose(index)} disabled={selected !== null}><span>{String.fromCharCode(65 + index)}</span><strong>{option.label}</strong><ArrowRight size={15} /></button>)}</div>
        {selectedOption && <div className={selectedOption.best ? "scenario-feedback good" : "scenario-feedback"}><Check size={16} /><p><strong>{selectedOption.best ? "Good judgement." : "Keep learning."}</strong> {selectedOption.feedback}</p><button type="button" onClick={next}>{isComplete ? "Play from start" : "Next level"} <ArrowRight size={14} /></button></div>}
        {showCheckpoint && selected === null && <div className="scenario-checkpoint-banner" role="status"><Trophy size={16} /><p>Checkpoint saved. You can resume from level {padLevel(progress.checkpointLevel)}.</p></div>}
        {selected === null && !showCheckpoint && <p className="scenario-hint"><RotateCcw size={13} /> Choose the response that protects facts, people, and process.</p>}
        <div className="scenario-footer-actions"><span>Checkpoint {checkpointProgress}/{CHECKPOINT_INTERVAL - 1}</span><button type="button" onClick={resetToCheckpoint} disabled={progress.checkpointLevel === progress.level}>Restore checkpoint</button><button type="button" onClick={resetGame}>Reset game</button></div>
        <p className="scenario-disclaimer">Educational practice only — not legal advice. Myanmar labour requirements vary by sector, coverage, contract, notification and effective date. Confirm with current Ministry of Labour, SSB, IRD or qualified counsel guidance.</p>
        <p className="scenario-source-links">Reference reading: <a href="https://www.dol.gov/sites/dolgov/files/Hachemian.Sara.C%40dol.gov/ILOGUI~1.PDF" target="_blank" rel="noreferrer">ILO Myanmar Labour Law guide</a> · <a href="https://tradefordecentwork.ilo.org/wp-content/uploads/2024/09/Myanmar-Labour-Laws-and-COVID-19-FAQ.pdf" target="_blank" rel="noreferrer">ILO Myanmar labour-law FAQ</a></p>
      </div>
      <div className="scenario-leaderboard">
        <div className="scenario-leaderboard-heading"><div><p className="section-kicker"><Trophy size={14} /> Global board</p><h3>Play smart.<br /><i>Leave a mark.</i></h3></div><p>Share a player name and submit your current score. The board stores only the nickname and game result; scores are self-reported practice results, not verified employment credentials.</p></div>
        <form className="scenario-score-form" onSubmit={submitScore}><label><span>Player name</span><input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={24} placeholder="e.g. People Ops" /></label><button type="submit"><Trophy size={14} /> Submit score</button>{leaderboardStatus && <small role="status">{leaderboardStatus}</small>}</form>
        <div className="scenario-leaderboard-list" aria-label="Top ten player scores">{leaderboard.length ? leaderboard.map((entry, index) => <div className="scenario-leaderboard-row" key={entry.id}><span className={`scenario-rank rank-${index + 1}`}>{String(index + 1).padStart(2, "0")}</span><strong>{entry.nickname}</strong><span>Lv {padLevel(entry.level)}</span><b>{entry.score} pts</b></div>) : <p className="scenario-empty-board">Be the first player on the board.</p>}</div>
      </div>
    </section>
  );
}
