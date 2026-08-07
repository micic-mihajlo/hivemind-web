import { useEffect, useMemo, useRef, useState } from "react";

const BOOKING_URL =
  "https://hivemindintelligence.zohobookings.com/4773814000000048056";
const LINKEDIN_URL = "https://www.linkedin.com/in/kevin-miller-19432b85/";

const quizQuestions = [
  {
    question: "What kind of practice do you run?",
    options: [
      ["Law firm or solo attorney", 2],
      ["Medical or dental practice", 2],
      ["Therapy or counseling practice", 2],
      ["Other licensed or regulated practice", 1],
      ["None of the above", 0],
    ],
  },
  {
    question:
      "How many hours a week does your highest-billing person spend on admin instead of client work?",
    options: [
      ["Under 3 hours", 0],
      ["3 to 8 hours", 1],
      ["More than 8 hours", 2],
    ],
  },
  {
    question: "Which best describes AI use in your practice right now?",
    options: [
      ["We have a written policy and approved tools", 0],
      ["We avoid AI entirely; no one uses it", 1],
      [
        "Some people use it, but there is no policy and I am not fully sure how",
        2,
      ],
    ],
  },
  {
    question: "Who decides how your practice adopts new tools or technology?",
    options: [
      ["Just me", 2],
      ["Me and one or two partners", 1],
      ["A larger group or committee", 0],
    ],
  },
  {
    question:
      "Roughly how many different cloud tools touch client or patient data?",
    options: [
      ["1 to 2", 0],
      ["3 to 5", 1],
      ["6 or more", 2],
    ],
  },
] as const;

const scoreTiers = [
  {
    max: 3,
    eyebrow: "Low exposure",
    title: "You are mostly frozen, not exposed.",
    copy: "Your practice probably is not leaking client data through shadow AI use. The cost you are paying right now is speed, not risk. A tight, reachable practice like yours can often move from audit to value quickly because there is little cleanup required.",
  },
  {
    max: 6,
    eyebrow: "Moderate exposure",
    title: "Somewhere between frozen and exposed.",
    copy: "A few signals stood out: possible unofficial AI use, a growing admin load, or client data spread across several tools. The audit is built to replace “probably fine” with a written answer.",
  },
  {
    max: 10,
    eyebrow: "High exposure",
    title: "This is the profile the audit was built for.",
    copy: "Administrative overload, unclear AI use, and client data scattered across cloud tools stack into meaningful exposure. The paid audit maps what is happening, where the risk sits, and what to fix first.",
  },
] as const;

function emitAnalytics(name: string, detail: Record<string, unknown> = {}) {
  window.dispatchEvent(
    new CustomEvent("hivemind:analytics", { detail: { name, ...detail } }),
  );
}

function useLandingEffects() {
  useEffect(() => {
    const revealItems = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.dataset.visible = "true");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.visible = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const bar = document.querySelector<HTMLElement>(".scroll-progress");
    if (!bar) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const distance = root.scrollHeight - root.clientHeight;
      const progress = distance > 0 ? root.scrollTop / distance : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}

function BookingLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <a
      className={className}
      href={BOOKING_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        emitAnalytics("booking_start", {
          label: typeof children === "string" ? children : "Book the audit",
        })
      }
    >
      {children}
    </a>
  );
}

function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(max-width: 600px)").matches) {
      canvas.dataset.fieldMode = "fallback";
      return;
    }
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: true,
    });
    if (!gl) {
      canvas.dataset.fieldMode = "fallback";
      return;
    }
    canvas.dataset.fieldMode = "webgl";

    const vertexSource = `#version 300 es
      in vec2 p;
      void main(){ gl_Position = vec4(p, 0., 1.); }
    `;

    const fragmentSource = `#version 300 es
      precision highp float;
      uniform vec2 R;
      uniform float T;
      uniform vec2 M;
      out vec4 O;

      float hash(vec2 p){
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float segmentDistance(vec2 p, vec2 a, vec2 b, float aspect){
        p.x *= aspect;
        a.x *= aspect;
        b.x *= aspect;
        vec2 pa = p - a;
        vec2 ba = b - a;
        float projection = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
        return length(pa - ba * projection);
      }

      float trace(vec2 p, vec2 a, vec2 b, float aspect){
        float distanceToTrace = segmentDistance(p, a, b, aspect);
        float core = smoothstep(.0018, .00035, distanceToTrace);
        float glow = exp(-distanceToTrace * 240.) * .3;
        return core + glow;
      }

      float node(vec2 p, vec2 position, float aspect){
        float distanceToNode = length((p - position) * vec2(aspect, 1.));
        float core = smoothstep(.0055, .0026, distanceToNode);
        float halo = exp(-distanceToNode * 125.) * .65;
        return core + halo;
      }

      float signal(vec2 p, vec2 a, vec2 b, float phase, float aspect){
        float progress = fract(T * .095 + phase);
        vec2 position = mix(a, b, smoothstep(0., 1., progress));
        float distanceToSignal = length((p - position) * vec2(aspect, 1.));
        return exp(-distanceToSignal * 310.);
      }

      void main(){
        vec2 p = gl_FragCoord.xy / R;
        float aspect = R.x / R.y;
        float vy = gl_FragCoord.y / R.y;
        float vx = gl_FragCoord.x / R.x;
        p += (M - .5) * .004;

        float traces = 0.;
        traces += trace(p, vec2(0., .82), vec2(.10, .82), aspect);
        traces += trace(p, vec2(.10, .82), vec2(.10, .72), aspect);
        traces += trace(p, vec2(.10, .72), vec2(.30, .72), aspect);
        traces += trace(p, vec2(.30, .72), vec2(.30, .64), aspect);
        traces += trace(p, vec2(.30, .64), vec2(.41, .64), aspect);

        traces += trace(p, vec2(0., .53), vec2(.07, .53), aspect);
        traces += trace(p, vec2(.07, .53), vec2(.07, .45), aspect);
        traces += trace(p, vec2(.07, .45), vec2(.24, .45), aspect);
        traces += trace(p, vec2(.24, .45), vec2(.24, .37), aspect);
        traces += trace(p, vec2(.24, .37), vec2(.39, .37), aspect);

        traces += trace(p, vec2(0., .17), vec2(.15, .17), aspect);
        traces += trace(p, vec2(.15, .17), vec2(.15, .26), aspect);
        traces += trace(p, vec2(.15, .26), vec2(.34, .26), aspect);

        traces += trace(p, vec2(1., .88), vec2(.90, .88), aspect);
        traces += trace(p, vec2(.90, .88), vec2(.90, .77), aspect);
        traces += trace(p, vec2(.90, .77), vec2(.82, .77), aspect);

        traces += trace(p, vec2(1., .57), vec2(.92, .57), aspect);
        traces += trace(p, vec2(.92, .57), vec2(.92, .64), aspect);
        traces += trace(p, vec2(.92, .64), vec2(.84, .64), aspect);

        traces += trace(p, vec2(1., .25), vec2(.91, .25), aspect);
        traces += trace(p, vec2(.91, .25), vec2(.91, .35), aspect);
        traces += trace(p, vec2(.91, .35), vec2(.81, .35), aspect);

        traces += trace(p, vec2(.48, 1.), vec2(.48, .91), aspect);
        traces += trace(p, vec2(.48, .91), vec2(.57, .91), aspect);
        traces += trace(p, vec2(.67, 1.), vec2(.67, .91), aspect);
        traces += trace(p, vec2(.67, .91), vec2(.77, .91), aspect);
        traces += trace(p, vec2(.53, 0.), vec2(.53, .08), aspect);
        traces += trace(p, vec2(.53, .08), vec2(.63, .08), aspect);
        traces += trace(p, vec2(.74, 0.), vec2(.74, .11), aspect);
        traces += trace(p, vec2(.74, .11), vec2(.84, .11), aspect);

        float nodes = 0.;
        nodes += node(p, vec2(.41, .64), aspect);
        nodes += node(p, vec2(.39, .37), aspect);
        nodes += node(p, vec2(.34, .26), aspect);
        nodes += node(p, vec2(.82, .77), aspect);
        nodes += node(p, vec2(.84, .64), aspect);
        nodes += node(p, vec2(.81, .35), aspect);
        nodes += node(p, vec2(.57, .91), aspect);
        nodes += node(p, vec2(.63, .08), aspect);

        float pulses = 0.;
        pulses += signal(p, vec2(.10, .72), vec2(.30, .72), .05, aspect);
        pulses += signal(p, vec2(.07, .45), vec2(.24, .45), .42, aspect);
        pulses += signal(p, vec2(.91, .35), vec2(.81, .35), .72, aspect);
        pulses += signal(p, vec2(.90, .77), vec2(.82, .77), .25, aspect);
        pulses += signal(p, vec2(.48, .91), vec2(.57, .91), .58, aspect);

        float boundary = .085;
        float contain = smoothstep(boundary, boundary + .16, vy);
        float lineGlow = exp(-abs(vy - boundary) * 90.)
          * (.28 + .22 * sin(vx * 22. - T * .9));

        vec3 ink = vec3(.045, .078, .108);
        vec3 brass = vec3(.78, .58, .30);
        vec3 blue = vec3(.13, .23, .34);

        vec3 color = ink;
        color += blue * (.08 + .12 * (1. - distance(p, vec2(.62, .52))));
        color += brass * min(traces, 1.4) * .24 * contain;
        color += brass * nodes * .52 * contain;
        color += brass * pulses * 1.15 * contain;
        color += brass * lineGlow;
        color *= .94 + .06 * smoothstep(0., .7, 1. - distance(p, vec2(.5)));
        color += (hash(gl_FragCoord.xy + T) - .5) * .012;

        O = vec4(color, 1.);
      }
    `;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    if (!program || !buffer) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolution = gl.getUniformLocation(program, "R");
    const time = gl.getUniformLocation(program, "T");
    const pointer = gl.getUniformLocation(program, "M");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    let frame = 0;
    let visible = true;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let smoothX = 0.5;
    let smoothY = 0.5;
    const startedAt = performance.now();

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (now: number) => {
      if (visible && !document.hidden) {
        smoothX += (pointerX - smoothX) * 0.04;
        smoothY += (pointerY - smoothY) * 0.04;
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform1f(time, (now - startedAt) / 1000);
        gl.uniform2f(pointer, smoothX, smoothY);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth;
      pointerY = 1 - event.clientY / window.innerHeight;
    };

    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });

    resize();
    visibilityObserver.observe(canvas);
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    if (!coarsePointer) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    return () => {
      cancelAnimationFrame(frame);
      visibilityObserver.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-field" aria-hidden="true" />;
}

function TrustStrip() {
  const badges = [
    ["shield", "Secure"],
    ["lock", "Private"],
    ["server", "On-premise"],
    ["person", "Human approval"],
    ["check", "Verified"],
  ] as const;

  return (
    <div className="trust-strip" aria-label="Infrastructure principles">
      <div className="site-wrap trust-row">
        {badges.map(([icon, label]) => (
          <div className="trust-badge" key={label}>
            <span className={`trust-icon trust-icon-${icon}`} aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeStatus() {
  const [documents, setDocuments] = useState(1248);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setDocuments((value) => value + 1),
      2600,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="node-panel" aria-label="Live status of a Hivemind node">
      <div className="node-head">
        <span>HIVEMIND NODE 01</span>
        <span className="node-live" aria-label="Working normally" />
      </div>
      {[
        ["inference", "local", ""],
        ["model weights", "on premises", ""],
        ["network", "unplugged", "brass"],
        ["documents processed", documents.toLocaleString("en-US"), "good"],
        ["data sent to cloud", "0 bytes", "brass"],
        ["location", "your office", ""],
      ].map(([label, value, tone]) => (
        <div className="node-row" key={label}>
          <span>{label}</span>
          <strong className={tone}>{value}</strong>
        </div>
      ))}
      <div className="node-foot">
        status: working normally <span className="node-cursor" aria-hidden="true" />
      </div>
    </div>
  );
}

function OfflineDemo() {
  return (
    <div
      className="offline-demo"
      data-reveal
      role="img"
      aria-label="A Hivemind node processes a document after disconnecting from the cloud"
    >
      <svg viewBox="0 0 400 190" aria-hidden="true">
        <line x1="132" y1="95" x2="252" y2="95" className="cable-line" />
        <path
          className="cloud-shape"
          d="M310 100a18 18 0 0 1 0-36 22 22 0 0 1 42-8 16 16 0 0 1 8 31Z"
        />
        <text x="330" y="140" className="cloud-x">×</text>
        <rect x="18" y="65" width="114" height="62" rx="8" className="node-box" />
        <text x="75" y="52" textAnchor="middle" className="diagram-label">
          YOUR OFFICE
        </text>
        <g className="doc" transform="translate(60 84)">
          <rect width="30" height="38" rx="3" className="doc-page" />
          <path d="M6 10h18M6 17h18M6 24h12" className="doc-lines" />
          <path d="m4 30 6 6 14-14" className="doc-check" />
        </g>
      </svg>
      <p>Network disconnected · Data sent to cloud: 0 bytes</p>
      <BookingLink className="button button-primary">
        Schedule your live demo
      </BookingLink>
    </div>
  );
}

function Scorecard() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const complete = Object.keys(answers).length === quizQuestions.length;
  const score = Object.values(answers).reduce((sum, value) => sum + value, 0);
  const tier = useMemo(
    () => scoreTiers.find((item) => score <= item.max) ?? scoreTiers[2],
    [score],
  );

  const submit = () => {
    if (!complete) return;
    setSubmitted(true);
    emitAnalytics("scorecard_complete", { score });
    window.requestAnimationFrame(() => {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
    });
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setCopyStatus("");
    document.querySelector("#scorecard")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  const copyResult = async () => {
    const text = [
      "Hivemind AI Exposure Scorecard",
      tier.eyebrow,
      tier.title,
      `Score: ${score}/10`,
      tier.copy,
    ].join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied to your clipboard.");
    } catch {
      setCopyStatus(
        "Copy was blocked. Select the result text above and copy it manually.",
      );
    }
  };

  return (
    <section className="scorecard-section" id="scorecard">
      <div className="site-wrap narrow">
        <span className="eyebrow">Free scorecard</span>
        <h2>The Shadow AI Scorecard</h2>
        <p className="section-intro">
          Five questions. Two minutes. See where your practice sits before you
          book anything.
        </p>

        {!submitted ? (
          <div className="quiz">
            {quizQuestions.map((item, questionIndex) => (
              <fieldset className="question" key={item.question}>
                <legend>
                  <span>Question {questionIndex + 1} of 5</span>
                  {item.question}
                </legend>
                <div className="options">
                  {item.options.map(([label, value]) => {
                    const selected = answers[questionIndex] === value;
                    return (
                      <button
                        className="option"
                        data-selected={selected ? "true" : undefined}
                        type="button"
                        aria-pressed={selected}
                        key={label}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            [questionIndex]: value,
                          }))
                        }
                      >
                        <span>{label}</span>
                        <span className="option-check" aria-hidden="true">✓</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <button
              className="button button-primary quiz-submit"
              type="button"
              disabled={!complete}
              onClick={submit}
            >
              See my score
            </button>
          </div>
        ) : (
          <div
            className="score-result"
            ref={resultRef}
            tabIndex={-1}
            role="region"
            aria-live="polite"
            aria-label="Scorecard result"
          >
            <span className="eyebrow">{tier.eyebrow}</span>
            <h3>{tier.title}</h3>
            <div className="score-meter" aria-hidden="true">
              <span style={{ transform: `scaleX(${score / 10})` }} />
            </div>
            <p className="score-number">{score}/10</p>
            <p>{tier.copy}</p>
            <p className="result-note">
              This is a directional read from five questions, not a full risk
              assessment. The audit produces the written findings.
            </p>
            <div className="button-row">
              <BookingLink className="button button-primary">
                Book the audit
              </BookingLink>
              <button
                className="button button-secondary"
                type="button"
                onClick={reset}
              >
                Retake the scorecard
              </button>
            </div>
            <div className="copy-result">
              <p>Save the result for your notes or share it with a partner.</p>
              <button
                className="button button-secondary"
                type="button"
                onClick={copyResult}
              >
                Copy my result
              </button>
              <p className="copy-status" role="status">{copyStatus}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const faqItems = [
  [
    "What hardware is required?",
    "A dedicated machine that fits in your office, roughly the size of a small desktop unit. I handle procurement, configuration, and setup. You need an ethernet port and a power outlet.",
  ],
  [
    "How long does installation take?",
    "Most practices are fully live within two to three weeks from the day the hardware arrives. The first week is setup and configuration. The second is workflow training and staff onboarding.",
  ],
  [
    "Why not just use Copilot or Gemini with enterprise privacy settings?",
    "Enterprise tiers give you a contract, not an architecture. Your data still leaves the premises and vendor logs can still exist. On-premise removes that trust requirement: the data can remain inside infrastructure you control.",
  ],
  [
    "What about my existing tools like Clio, Dentrix, or Eaglesoft?",
    "Keep them. The point is not to replace your system of record. We map integration points during the audit and tell you which systems can connect and which workflows need a different path.",
  ],
  [
    "Is this HIPAA-compliant?",
    "The architecture is designed for practices governed by HIPAA and professional confidentiality duties. Final compliance depends on configuration, access controls, written policies, connected tools, and staff behavior—which is why the engagement starts with an audit.",
  ],
  [
    "What if the audit findings do not justify moving forward?",
    "Then you will get that answer in writing. The audit has standalone value: a clear map of your admin leaks and exposure points whether or not you hire Hivemind afterward.",
  ],
] as const;

export function PublicLanding() {
  useLandingEffects();

  return (
    <div className="landing">
      <div className="scroll-progress" aria-hidden="true" />
      <nav className="site-nav">
        <div className="nav-inner">
          <a className="brand" href="#top" aria-label="Hivemind Intelligence home">
            <img
              className="brand-logo"
              src="/brand/hivemind-horizontal-dark.svg"
              alt=""
              width="561"
              height="164"
            />
          </a>
          <BookingLink className="nav-button">Book the audit</BookingLink>
        </div>
      </nav>

      <main>
        <header className="hero" id="top">
          <HeroField />
          <div className="hero-shade" aria-hidden="true" />
          <div className="site-wrap hero-inner">
            <div className="hero-copy">
              <span className="eyebrow">For 1–10 person licensed practices</span>
              <h1>
                Use AI on client work{" "}
                <em>without risking your practice on it.</em>
              </h1>
              <p>
                Hivemind installs private AI infrastructure inside law and
                medical practices. Your documents, your hardware, your office.
                Core client-work workflows can run locally without sending
                document content to consumer AI services.
              </p>
              <div className="button-row">
                <BookingLink className="button button-primary">
                  Book the audit
                </BookingLink>
                <a
                  className="button button-ghost"
                  href="#scorecard"
                  onClick={() => emitAnalytics("scorecard_start")}
                >
                  Check your AI exposure
                </a>
              </div>
            </div>
            <NodeStatus />
          </div>
        </header>

        <TrustStrip />

        <section className="dark-section problem-section">
          <div className="circuit-pattern" aria-hidden="true" />
          <div className="site-wrap">
            <span className="eyebrow" data-reveal>The problem</span>
            <h2 data-reveal>The ban and the breach are the same problem.</h2>
            <p className="section-intro" data-reveal>
              Every licensed practice has picked one of two bad options with
              AI. Neither of them is safety.
            </p>
            <div className="two-column">
              <article className="dark-panel" data-reveal>
                <span className="panel-label">Practice A banned it</span>
                <p>
                  No AI touches client work. The owner still does document
                  assembly, intake, and follow-up by hand—at a $300 an hour
                  opportunity cost while competitors move faster.
                </p>
              </article>
              <article className="dark-panel" data-reveal>
                <span className="panel-label">Practice B ignored it</span>
                <p>
                  No policy, no visibility. Staff quietly paste privileged files
                  and patient information into consumer AI tools, creating
                  avoidable retention and confidentiality risk.
                </p>
              </article>
            </div>
            <blockquote data-reveal>
              Different symptoms. One disease: no sanctioned path. Make the safe
              way the easy way.
            </blockquote>
          </div>
        </section>

        <section>
          <div className="site-wrap narrow align-left">
            <span className="eyebrow" data-reveal>What changed</span>
            <h2 data-reveal>AI no longer requires the cloud.</h2>
            <p data-reveal>
              Modern local models can handle practical workflows such as
              document drafting, intake summarization, internal search, and
              follow-up assistance on hardware inside your office.
            </p>
            <p data-reveal>
              <strong>
                The problem was never AI. The problem was where your data had to
                go to use it.
              </strong>{" "}
              Properly configured on-premise systems can sharply reduce
              third-party exposure because processing stays on hardware your
              practice controls.
            </p>
          </div>
        </section>

        <section className="muted-section" id="how">
          <div className="site-wrap">
            <span className="eyebrow" data-reveal>How it works</span>
            <h2 data-reveal>Three steps. Always in this order.</h2>
            <div className="three-column steps">
              {[
                [
                  "01",
                  "Audit",
                  "Map where admin hours leak and exposure hides. Written findings arrive in one week, whether or not you hire Hivemind afterward.",
                  "$1,500",
                  "Fixed fee. Standalone value.",
                ],
                [
                  "02",
                  "Install",
                  "Hardware in your office, private models, your top workflows, a written AI usage policy, and staff training.",
                  "From $4,000",
                  "Fixed scope. Live in weeks.",
                ],
                [
                  "03",
                  "Manage",
                  "Monitoring, hardware refresh, model updates, and one new workflow every quarter. The system improves while your data stays home.",
                  "From $2,000/mo",
                  "Monthly. Cancel anytime.",
                ],
              ].map(([number, title, copy, price, note]) => (
                <article className="step" data-reveal key={number}>
                  <span className="step-number">STEP {number}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <strong>{price}</strong>
                  <small>{note}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="audit-section">
          <div className="site-wrap split-layout">
            <div>
              <span className="eyebrow" data-reveal>
                What the $1,500 audit delivers
              </span>
              <h2 data-reveal>
                A written decision document, not a sales conversation.
              </h2>
              <p data-reveal>
                Within one week, receive a prioritized map of where AI can save
                time, where sensitive information may be exposed, and which
                controls should come first.
              </p>
              <ul className="check-list" data-reveal>
                <li>Current-state AI and cloud-tool exposure map</li>
                <li>Workflow opportunities ranked by value and difficulty</li>
                <li>Recommended safeguards, owners, and next actions</li>
                <li>A clear install recommendation—even if it is “not yet”</li>
              </ul>
            </div>
            <div className="audit-sheet" data-reveal>
              <div className="audit-head">
                <strong>AI Practice Audit</strong>
                <span>Sample excerpt</span>
              </div>
              {[
                [
                  "Finding 01",
                  "Unapproved consumer AI use is possible, but ownership and review procedures are not documented.",
                ],
                [
                  "Opportunity",
                  "Local drafting with required human review can reduce repetitive work without authorizing autonomous sends.",
                ],
                [
                  "First control",
                  "Publish an approved-tools policy and route external communication through draft → review → approve → send.",
                ],
                [
                  "Decision",
                  "Pilot one bounded workflow before expanding access or connecting more data sources.",
                ],
              ].map(([label, copy], index) => (
                <div className="audit-row" key={label}>
                  <strong>{label}</strong>
                  <div>
                    {index === 0 && <span className="risk-pill">Priority: High</span>}
                    <p>{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="site-wrap split-layout demo-layout">
            <div>
              <span className="eyebrow" data-reveal>The proof</span>
              <h2 data-reveal>
                I do not ask you to trust me. I unplug the internet.
              </h2>
              <p data-reveal>
                Hivemind brings the machine to your conference room, pulls the
                network cable, and processes a sample document in front of you.
                You watch AI work while knowing—not hoping—that the data went
                nowhere.
              </p>
              <p className="compliance-note" data-reveal>
                Designed for practices governed by HIPAA and professional
                confidentiality duties. Final compliance depends on
                configuration, access controls, policies, staff behavior, and
                connected tools.
              </p>
            </div>
            <OfflineDemo />
          </div>
        </section>

        <section className="controls-section">
          <div className="site-wrap">
            <span className="eyebrow" data-reveal>How risk is controlled</span>
            <h2 data-reveal>
              Privacy, security, and compliance are different jobs.
            </h2>
            <div className="three-column controls-grid">
              {[
                [
                  "Privacy",
                  "Defines where documents are stored, where models process them, and which outside services receive data.",
                ],
                [
                  "Security",
                  "Uses access controls, encryption, backups, logging, patching, and recovery procedures.",
                ],
                [
                  "Compliance",
                  "Connects technology to written policies, workforce training, approvals, documentation, and professional duties.",
                ],
              ].map(([title, copy]) => (
                <article className="control" data-reveal key={title}>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
            <div className="approval-flow" data-reveal>
              {[
                ["01 · Draft", "AI prepares a bounded first draft."],
                ["02 · Review", "A qualified person checks facts and context."],
                ["03 · Approve", "An authorized user accepts or edits it."],
                ["04 · Send", "The human—not the model—releases it."],
              ].map(([title, copy]) => (
                <div className="approval-step" key={title}>
                  <strong>{title}</strong>
                  <span>{copy}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="site-wrap">
            <span className="eyebrow" data-reveal>Who this is for</span>
            <h2 data-reveal>You will know in three lines if we should talk.</h2>
            <ul className="fit-list">
              {[
                [
                  "You run a licensed practice with 1 to 10 people.",
                  "Attorney, physician, dentist, therapist, or another profession governed by a board or bar.",
                ],
                [
                  "Admin is eating your billable hours.",
                  "You are doing $50-an-hour work at your $300-an-hour rate because there is nobody to hand it to.",
                ],
                [
                  "You stayed off AI because of the risk—or suspect your staff did not.",
                  "Both count. Both are fixable with the same infrastructure.",
                ],
              ].map(([title, copy]) => (
                <li data-reveal key={title}>
                  <strong>{title}</strong>
                  <span>{copy}</span>
                </li>
              ))}
            </ul>
            <div className="not-fit" data-reveal>
              <strong>Not the right fit if</strong>
              <p>
                You want a website chatbot, are comfortable putting client data
                in the cloud, or are looking for the cheapest option. This is
                owned infrastructure for practices that treat client data like
                the liability it is.
              </p>
            </div>
          </div>
        </section>

        <section className="dark-section proof-section">
          <div className="circuit-pattern" aria-hidden="true" />
          <div className="site-wrap">
            <span className="eyebrow" data-reveal>Proof</span>
            <h2 data-reveal>No rented logos. No purchased reviews.</h2>
            <p className="section-intro" data-reveal>
              Hivemind is early. Real demonstrations are more useful than fake
              social proof.
            </p>
            <div className="three-column proof-grid">
              {[
                [
                  "Client Zero: my own practice",
                  "Every workflow is first tested in Kevin’s own operating environment, with human approval on every send.",
                  "workflows live: 6\nhuman approval: every send\ncloud egress: 0 bytes",
                ],
                [
                  "The live demo",
                  "The machine comes to your office and the internet is unplugged in front of you. The proof is something you watch.",
                  "format: in person\nduration: 30 minutes\ntrust required: none",
                ],
                [
                  "Founding practices",
                  "A limited cohort receives the full build and a direct line to Kevin at founding pricing in exchange for a named reference.",
                  "cohort: limited\npricing: founding\nyour role: named reference",
                ],
              ].map(([title, copy, stats]) => (
                <article className="proof-card" data-reveal key={title}>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <pre>{stats}</pre>
                </article>
              ))}
            </div>
            <blockquote data-reveal>
              When testimonials appear here, they will have full names and
              practices attached. If they do not, do not trust them.
            </blockquote>
          </div>
        </section>

        <section>
          <div className="site-wrap founder-layout">
            <figure className="founder-portrait" data-reveal>
              <img
                src="/kevin-miller.jpg"
                alt="Kevin Miller, founder of Hivemind Intelligence"
                width="640"
                height="800"
                loading="lazy"
              />
            </figure>
            <div>
              <span className="eyebrow" data-reveal>Who is behind this</span>
              <h2 data-reveal>I built it for my own practice first.</h2>
              <p data-reveal>
                I am Kevin Miller—a credentialed health practitioner who ran a
                high-ticket coaching practice for over a decade. Client records,
                scope-of-practice rules, and professional liability are my daily
                reality.
              </p>
              <p data-reveal>
                When AI arrived, I could not paste client information into a
                consumer tool and hope. <strong>So I built the alternative:</strong>{" "}
                local hardware, private models, and a human hand on every send.
              </p>
              <p className="credentials" data-reveal>
                MS · CSCS · NBC-HWC · 10+ years in practice · Coral Gables, FL
              </p>
            </div>
          </div>
        </section>

        <section className="muted-section faq-section">
          <div className="site-wrap narrow align-left">
            <span className="eyebrow" data-reveal>Common questions</span>
            <h2 data-reveal>Before you book.</h2>
            <div className="faq-list" data-reveal>
              {faqItems.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="dark-section final-section" id="book">
          <div className="site-wrap narrow">
            <span className="eyebrow" data-reveal>Next step</span>
            <h2 data-reveal>Find out where you stand.</h2>
            <p data-reveal>
              The audit takes one week and produces written findings you keep:
              where your hours leak, where your exposure hides, and what to
              automate first.
            </p>
            <p className="pricing-line" data-reveal>
              AI Practice Audit: $1,500 flat · Installations $4,000–$30,000 by
              scope · Management from $2,000/mo
            </p>
            <BookingLink className="button button-primary">
              Book the audit
            </BookingLink>
            <p className="honesty" data-reveal>
              If the math does not justify hiring me, I will tell you in writing.
            </p>
          </div>
        </section>

        <Scorecard />
      </main>

      <footer>
        <div className="site-wrap footer-inner">
          <span>© 2026 Hivemind Intelligence · Coral Gables, Florida</span>
          <span>
            <a href="mailto:kevin@hivemindintelligence.com">
              kevin@hivemindintelligence.com
            </a>
            <span aria-hidden="true"> · </span>
            <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
