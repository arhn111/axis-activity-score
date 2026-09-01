"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  BarChart3,
  BadgeCheck,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  Gem,
  Link2,
  Loader2,
  Rocket,
  ShieldCheck,
  Sparkles,
  Timer,
  WalletCards,
  X,
  Zap
} from "lucide-react";

type RecordItem = {
  dataId: bigint | string;
  taskId: bigint | string;
  score: number;
  simulationTime: number;
  timestamp: number;
  invalidated: boolean;
};

type Data = {
  wallet: string;
  records: RecordItem[];
  metrics: {
    trajectories: number;
    verified: number;
    avgScore: number;
    quality: number;
    diversity: number;
    tasks: number;
    activeDays: number;
    bestStreak: number;
    fastest: number;
    slowest: number;
    totalTime: number;
    consistency: number;
    activityScore: number;
  };
};

const X_HANDLE = "@ArhnOne";
const X_URL = "https://x.com/ArhnOne";
const REFERRAL_URL =
  "https://hub.axisrobotics.ai/login?invite_code=4p1kx3bB";

const pct = (n: number) =>
  `${n.toFixed(n % 1 ? 1 : 0)}%`;

const fmtTime = (s: number) => {
  if (!s) return "—";

  if (s < 60) {
    return `${s.toFixed(1)}s`;
  }

  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);

  return `${m}m ${sec
    .toString()
    .padStart(2, "0")}s`;
};

const short = (n: number) =>
  n.toLocaleString();

/**
 * Rank based on Activity Score
 *
 * 0–30   Newbie
 * 31–50  Degen
 * 51–70  Alpha
 * 71–90  Legend
 * 91–100 Legend+
 */
function getRank(score: number) {
  if (score <= 30) return "NEWBIE";
  if (score <= 50) return "DEGEN";
  if (score <= 70) return "ALPHA";
  if (score <= 90) return "LEGEND";
  return "LEGEND+";
}

export default function Home() {
  const [wallet, setWallet] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function check() {
    setError("");
    setData(null);
    setShowAll(false);

    const w = wallet.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(w)) {
      setError(
        "Please paste a valid Axis Robotics wallet address."
      );
      return;
    }

    setLoading(true);

    try {
      const r = await fetch(
        `/api/check?wallet=${encodeURIComponent(w)}`
      );

      const j = await r.json();

      if (!r.ok) {
        throw new Error(j.error || "Lookup failed");
      }

      setData(j);
      setShowModal(true);
    } catch (e: any) {
      setError(e.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!data) return;

    await navigator.clipboard.writeText(
      `My Axis Robotics Activity Score: ${data.metrics.activityScore}/100\n` +
        `Rank: ${getRank(data.metrics.activityScore)}\n` +
        `Trajectories: ${data.metrics.trajectories} | Verified: ${pct(
          data.metrics.verified
        )} | Avg Score: ${data.metrics.avgScore.toFixed(1)}`
    );

    setCopied(true);

    setTimeout(() => setCopied(false), 1400);
  }

  const m = data?.metrics;
  const records = data?.records || [];
  const visible = showAll
    ? records
    : records.slice(0, 9);

  return (
    <main>
      <div className="grid-bg" />

      <header className="topbar">
        <div className="brand">
          <div className="brandIcon">✦</div>
          <b>AXIS ROBOTICS</b>
          <span>|</span>
          <span>ACTIVITY SCORE</span>
        </div>

        <a
          className="built"
          href={X_URL}
          target="_blank"
          rel="noreferrer"
        >
          Built by <strong>{X_HANDLE}</strong>
          <ExternalLink size={14} />
        </a>
      </header>

      <section className="hero">
        <div className="eyebrow">
          <Sparkles size={14} />
          ON-CHAIN ACTIVITY
        </div>

        <h1>
          Your Axis Robotics
          <br />
          <em>Activity Score</em>
        </h1>

        <p className="lead">
          Your Axis Robotics score based on your{" "}
          <b>on-chain activity</b> like signed
          trajectories, verified runs, average score,
          quality and diversity.
        </p>

        <div className="search">
          <WalletCards size={21} />

          <input
            value={wallet}
            onChange={(e) =>
              setWallet(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                check();
              }
            }}
            placeholder="Paste your Axis Robotics wallet address"
          />

          <button
            onClick={check}
            disabled={loading}
          >
            {loading ? (
              <Loader2
                className="spin"
                size={19}
              />
            ) : (
              <>
                Check Score
                <ArrowUpRight size={19} />
              </>
            )}
          </button>
        </div>

        <div className="notice">
          <ShieldCheck size={20} />

          <div>
            <b>No wallet connection needed.</b>

            <span>
              Just paste your Axis Robotics wallet
              address. You’ll find it in your Portfolio
              section.
            </span>
          </div>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}
      </section>

      {/* JOIN SECTION — shown BEFORE score is checked */}
      {!data && (
        <section className="join">
          <div className="rocket">
            <Rocket size={28} />
          </div>

          <div>
            <h3>
              If you have not joined yet
            </h3>

            <p>
              Start contributing on Axis Robotics
              and build your score.
            </p>
          </div>

          <a
            href={REFERRAL_URL}
            target="_blank"
            rel="noreferrer"
          >
            Start on Axis Robotics
            <ArrowUpRight size={19} />
          </a>
        </section>
      )}

      {/* RESULT DASHBOARD */}
      {data && m && (
        <section
          id="result"
          className="result"
        >
          <div className="scoreHead">
            <div>
              <div className="sectionTag">
                <Zap size={15} />
                YOUR ACTIVITY BREAKDOWN
              </div>

              <h2>
                Score <em>{m.activityScore}</em>{" "}
                / 100
              </h2>

              <p>
                Calculated from available on-chain
                Axis activity.
              </p>
            </div>

            <ScoreRing
              score={m.activityScore}
            />
          </div>

          <div className="cards">
            <Metric
              icon={<Link2 />}
              title="Trajectories"
              value={short(m.trajectories)}
              sub="Signed on Base"
            />

            <Metric
              icon={<BadgeCheck />}
              title="Verified"
              value={pct(m.verified)}
              sub="Valid signed runs"
            />

            <Metric
              icon={<BarChart3 />}
              title="Avg Score"
              value={m.avgScore.toFixed(1)}
              sub="Average run score"
            />

            <Metric
              icon={<Gem />}
              title="Quality"
              value={pct(m.quality)}
              sub="Score performance"
            />

            <Metric
              icon={<Sparkles />}
              title="Diversity"
              value={pct(m.diversity)}
              sub={`${m.tasks} unique tasks`}
            />
          </div>

          <div className="analytics">
            <TimeCard m={m} />
            <SigningCard records={records} />
            <Distribution records={records} />
          </div>

          <section className="runSection">
            <div className="sectionTitle">
              <div>
                <div className="sectionTag">
                  <ShieldCheck size={15} />
                  EVERY SIGNED RUN
                </div>

                <h3>
                  {records.length} records{" "}
                  <small>
                    · each row opens its transaction
                  </small>
                </h3>
              </div>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>RUN</th>
                    <th>TASK</th>
                    <th>SCORE</th>
                    <th>TIME</th>
                    <th>SIGNED</th>
                    <th>PROOF</th>
                  </tr>
                </thead>

                <tbody>
                  {visible.map((r, i) => (
                    <tr
                      key={
                        String(r.dataId) + i
                      }
                    >
                      <td>
                        {String(r.dataId)}
                      </td>

                      <td>
                        #{String(r.taskId)}
                      </td>

                      <td
                        className={
                          r.score >= 70
                            ? "good"
                            : r.score < 40
                            ? "bad"
                            : ""
                        }
                      >
                        {r.score}
                      </td>

                      <td>
                        {fmtTime(
                          r.simulationTime / 1000
                        )}
                      </td>

                      <td>
                        {new Date(
                          r.timestamp * 1000
                        )
                          .toISOString()
                          .slice(0, 10)}
                      </td>

                      <td>
                        <a
                          href={`https://basescan.org/tx/${String(
                            r.dataId
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          tx ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {records.length > 9 && (
              <button
                className="outlineBtn"
                onClick={() =>
                  setShowAll((v) => !v)
                }
              >
                {showAll
                  ? "Show fewer"
                  : `View all ${records.length} records`}
                <ArrowDown size={15} />
              </button>
            )}
          </section>

          <div className="bottomBar">
            <div className="proof">
              <ShieldCheck size={21} />

              <div>
                <b>
                  Provable by anyone.
                </b>

                <span>
                  Data is read directly from the
                  Axis Robotics contract on Base.
                </span>
              </div>
            </div>

            <a
              className="share"
              href={`${X_URL}/intent/post?text=${encodeURIComponent(
                `My Axis Robotics Activity Score is ${m.activityScore}/100 ⚡\n\n` +
                  `Rank: ${getRank(
                    m.activityScore
                  )}\n` +
                  `Trajectories: ${m.trajectories}\n` +
                  `Verified: ${pct(
                    m.verified
                  )}\n` +
                  `Avg Score: ${m.avgScore.toFixed(
                    1
                  )}\n` +
                  `Quality: ${pct(
                    m.quality
                  )}\n` +
                  `Diversity: ${pct(
                    m.diversity
                  )}`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              𝕏 Share on X
            </a>

            <button
              className="copy"
              onClick={copy}
            >
              <Copy size={16} />
              {copied
                ? "Copied"
                : "Copy Result"}
            </button>
          </div>
        </section>
      )}

      {!data && (
        <div className="emptyHint">
          <span>BASE</span> On-chain · No wallet
          connection · One score out of 100
        </div>
      )}

      <footer>
        <span>
          AXIS ROBOTICS · ACTIVITY SCORE
        </span>

        <a
          href={X_URL}
          target="_blank"
          rel="noreferrer"
        >
          Built by <b>{X_HANDLE}</b> ↗
        </a>
      </footer>

      {/* SCORE SUCCESS MODAL */}
      {showModal && m && (
        <div
          className="modalOverlay"
          onClick={() =>
            setShowModal(false)
          }
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="modalClose"
              onClick={() =>
                setShowModal(false)
              }
            >
              <X size={18} />
            </button>

            <div className="success">
              <Check size={34} />
            </div>

            <div className="confetti c1">
              ✦
            </div>

            <div className="confetti c2">
              ◆
            </div>

            <div className="confetti c3">
              ✦
            </div>

            <h2>
              Score fetched successfully!
            </h2>

            <p>
              Here’s your Axis Robotics
              Activity Score
            </p>

            <div className="modalScore">
              <strong>
                {m.activityScore}
              </strong>

              <span>/100</span>
            </div>

            <div className="modalRole">
              {getRank(m.activityScore)}
            </div>

            <button
              className="modalBtn"
              onClick={() => {
                setShowModal(false);

                setTimeout(() => {
                  document
                    .getElementById(
                      "result"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth"
                    });
                }, 50);
              }}
            >
              View Full Dashboard
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function ScoreRing({
  score
}: {
  score: number;
}) {
  const radius = 90;
  const c = 2 * Math.PI * radius;
  const offset = c * (1 - score / 100);

  return (
    <div className="ring">
      <svg viewBox="0 0 220 220">
        <circle
          className="track"
          cx="110"
          cy="110"
          r={radius}
        />

        <circle
          className="progress"
          cx="110"
          cy="110"
          r={radius}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="ringText">
        <small>YOUR SCORE</small>
        <strong>{score}</strong>
        <span>/100</span>
      </div>

      <div className="role">
        {getRank(score)}
      </div>
    </div>
  );
}

function Metric({
  icon,
  title,
  value,
  sub
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="metric">
      <div className="metricIcon">
        {icon}
      </div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </div>
  );
}

function TimeCard({
  m
}: {
  m: Data["metrics"];
}) {
  return (
    <div className="chartCard">
      <h3>
        <Timer size={18} />
        How long runs take
      </h3>

      <p>
        Your spread against your own run history
      </p>

      <div className="timeLine">
        <i
          style={{
            left: `${Math.min(
              94,
              Math.max(
                6,
                (m.fastest /
                  (m.slowest || 1)) *
                  100
              )
            )}%`
          }}
        />

        <b>{fmtTime(m.fastest)}</b>
        <span>fastest</span>
      </div>

      <div className="miniStats">
        <div>
          <small>FASTEST</small>
          <b>{fmtTime(m.fastest)}</b>
        </div>

        <div>
          <small>SLOWEST</small>
          <b>{fmtTime(m.slowest)}</b>
        </div>

        <div>
          <small>TOTAL TIME</small>
          <b>{fmtTime(m.totalTime)}</b>
        </div>
      </div>
    </div>
  );
}

function SigningCard({
  records
}: {
  records: RecordItem[];
}) {
  const days = new Map<
    string,
    number
  >();

  records.forEach((r) => {
    const d = new Date(
      r.timestamp * 1000
    )
      .toISOString()
      .slice(0, 10);

    days.set(
      d,
      (days.get(d) || 0) + 1
    );
  });

  const vals = [...days.values()].slice(
    -8
  );

  const max = Math.max(1, ...vals);

  return (
    <div className="chartCard">
      <h3>
        <CalendarDays size={18} />
        Signing activity
      </h3>

      <p>
        Dates when runs were signed on Base
      </p>

      <div className="bars">
        {vals.map((v, i) => (
          <i
            key={i}
            style={{
              height: `${Math.max(
                6,
                (v / max) * 100
              )}%`
            }}
          />
        ))}
      </div>

      <small>
        {vals.length} active signing days
      </small>
    </div>
  );
}

function Distribution({
  records
}: {
  records: RecordItem[];
}) {
  const bins = [
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0
  ];

  records.forEach((r) => {
    bins[
      Math.min(
        9,
        Math.floor(r.score / 10)
      )
    ]++;
  });

  const max = Math.max(
    1,
    ...bins
  );

  return (
    <div className="chartCard">
      <h3>
        <BarChart3 size={18} />
        Score distribution
      </h3>

      <p>
        Your signed-run scores
      </p>

      <div className="dist">
        {bins.map((v, i) => (
          <div key={i}>
            <i
              style={{
                height: `${Math.max(
                  v ? 8 : 1,
                  (v / max) * 100
                )}%`
              }}
            />

            <small>
              {i === 9
                ? "90+"
                : i * 10}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
