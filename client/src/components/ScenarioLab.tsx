import { useState } from "react";
import { ArrowRight, Check, RotateCcw } from "lucide-react";

type Scenario = {
  title: string;
  context: string;
  options: { label: string; feedback: string; best: boolean }[];
};

const scenarios: Scenario[] = [
  {
    title: "Attendance pattern",
    context:
      "An employee has repeated late arrivals, but the reason has not been documented yet. What is the best first move?",
    options: [
      {
        label: "Ask privately, listen, and document the facts.",
        feedback:
          "Good first step: establish facts and context before deciding on action.",
        best: true,
      },
      {
        label: "Announce a warning in the team chat.",
        feedback:
          "Public correction can damage trust. Start with a private fact-finding conversation.",
        best: false,
      },
      {
        label: "Remove the employee from the schedule immediately.",
        feedback:
          "That may be disproportionate before the facts and policy context are clear.",
        best: false,
      },
    ],
  },
  {
    title: "Payroll variance",
    context:
      "A net-pay result is different from last month. Which check should come first?",
    options: [
      {
        label: "Compare inputs, attendance, allowances, and deductions.",
        feedback:
          "Exactly: reconcile the source inputs before changing a calculation.",
        best: true,
      },
      {
        label: "Change the tax rate until the net pay matches.",
        feedback:
          "Do not force an output. Verify the inputs and current rules first.",
        best: false,
      },
      {
        label: "Ignore it if the difference is small.",
        feedback:
          "Small differences can still reveal an input or policy issue. Record and check them.",
        best: false,
      },
    ],
  },
  {
    title: "Employee concern",
    context:
      "A colleague raises a sensitive workplace concern. What creates the safest next step?",
    options: [
      {
        label:
          "Acknowledge it, protect confidentiality, and agree a next step.",
        feedback:
          "Strong response: listen carefully, limit disclosure, and clarify the process.",
        best: true,
      },
      {
        label: "Ask several coworkers what they think first.",
        feedback:
          "That can spread confidential information. Keep the initial conversation private.",
        best: false,
      },
      {
        label: "Promise a specific outcome immediately.",
        feedback:
          "Avoid promises before reviewing facts, policy, and the right decision-maker.",
        best: false,
      },
    ],
  },
];

export default function ScenarioLab() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const scenario = scenarios[scenarioIndex];
  const next = () => {
    setScenarioIndex(index => (index + 1) % scenarios.length);
    setSelected(null);
  };

  return (
    <section
      className="scenario-lab section-pad"
      id="game"
      aria-labelledby="scenario-lab-title"
    >
      <div className="scenario-lab-heading">
        <div>
          <p className="section-kicker">
            <span className="eyebrow-dot" /> Workplace practice
          </p>
          <h2 id="scenario-lab-title">
            Think clearly,
            <br />
            <i>then act.</i>
          </h2>
        </div>
        <p className="section-description">
          A short HR scenario game for practising facts, people, policy, and the
          next practical step. It is educational—not a formal HR decision.
        </p>
      </div>
      <div className="scenario-lab-card">
        <div className="scenario-lab-meta">
          <span>
            CASE 0{scenarioIndex + 1} / 0{scenarios.length}
          </span>
          <span>{scenario.title}</span>
        </div>
        <h3>{scenario.context}</h3>
        <div className="scenario-options">
          {scenario.options.map((option, index) => (
            <button
              key={option.label}
              type="button"
              className={selected === index ? "chosen" : ""}
              onClick={() => setSelected(index)}
            >
              <span>{String.fromCharCode(65 + index)}</span>
              <strong>{option.label}</strong>
              <ArrowRight size={15} />
            </button>
          ))}
        </div>
        {selected !== null && (
          <div
            className={
              scenario.options[selected].best
                ? "scenario-feedback good"
                : "scenario-feedback"
            }
          >
            <Check size={16} />
            <p>{scenario.options[selected].feedback}</p>
            <button type="button" onClick={next}>
              {scenarioIndex === scenarios.length - 1
                ? "Try again"
                : "Next case"}{" "}
              <ArrowRight size={14} />
            </button>
          </div>
        )}
        {selected === null && (
          <p className="scenario-hint">
            <RotateCcw size={13} /> Choose the response that protects facts,
            people, and process.
          </p>
        )}
      </div>
    </section>
  );
}
