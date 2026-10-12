import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const EXAM_ID = __ENV.EXAM_ID;
const PASSWORD = __ENV.TEST_PASSWORD || "LoadTest@123";
const THINK_MIN = Number(__ENV.THINK_MIN || 40);
const THINK_MAX = Number(__ENV.THINK_MAX || 80);
const MAX_VUS = Number(__ENV.MAX_VUS || 1000);
const JSON_HEADERS = { "Content-Type": "application/json" };

const businessErrors = new Rate("business_errors");
const saveLatency = new Trend("answer_save_latency", true);
const submitLatency = new Trend("submit_latency", true);
const questionsAnswered = new Counter("questions_answered");
const attemptsSubmitted = new Counter("attempts_submitted");

const stage = (fraction, duration) => ({ duration, target: Math.max(1, Math.round(MAX_VUS * fraction)) });

export const options = {
  scenarios: {
    exam_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        stage(0.1, "3m"),
        stage(0.3, "3m"),
        stage(0.5, "3m"),
        stage(0.8, "3m"),
        stage(1, "3m"),
        stage(1, __ENV.STEADY || "30m"),
        { duration: "3m", target: 0 },
      ],
      gracefulRampDown: "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.001"],
    "http_req_duration{step:login}": ["p(95)<2000"],
    "http_req_duration{step:available_exams}": ["p(95)<2000"],
    "http_req_duration{step:start_attempt}": ["p(95)<2000"],
    "http_req_duration{step:get_attempt}": ["p(95)<2000"],
    "http_req_duration{step:result}": ["p(95)<2000"],
    answer_save_latency: ["p(95)<1000"],
    submit_latency: ["p(95)<3000"],
    business_errors: ["rate<0.001"],
  },
};

function think() {
  sleep(THINK_MIN + Math.random() * (THINK_MAX - THINK_MIN));
}

function login(email) {
  const csrf = http.get(`${BASE_URL}/api/auth/csrf`, { tags: { step: "login" } });
  const csrfToken = csrf.status === 200 ? csrf.json("csrfToken") : null;
  if (!csrfToken) {
    businessErrors.add(true);
    return false;
  }
  http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    { email, password: PASSWORD, csrfToken, json: "true" },
    { redirects: 0, tags: { step: "login" } }
  );
  const cookies = http.cookieJar().cookiesForURL(BASE_URL);
  const ok = Boolean(cookies["__Secure-authjs.session-token"] || cookies["authjs.session-token"]);
  check(null, { "login ok": () => ok });
  businessErrors.add(!ok);
  return ok;
}

export default function () {
  if (__ITER > 0) {
    sleep(60);
    return;
  }
  if (!login(`loadtest-${__VU}@example.test`)) return;

  const available = http.get(`${BASE_URL}/api/exams/available`, { tags: { step: "available_exams" } });
  businessErrors.add(!check(available, { "available ok": (r) => r.status === 200 }));

  sleep(5 + Math.random() * 10);

  const start = http.post(`${BASE_URL}/api/exams/${EXAM_ID}/attempts`, null, { tags: { step: "start_attempt" } });
  const started = check(start, {
    "attempt started": (r) => r.status === 200 || r.status === 201,
    "no answer key leaked": (r) => !/isCorrect|correctOptionId|explanation/i.test(r.body),
  });
  businessErrors.add(!started);
  if (!started) return;

  const attemptUrl = `${BASE_URL}/api/attempts/${start.json("attemptId")}`;
  const read = http.get(attemptUrl, { tags: { step: "get_attempt" } });
  const readOk = check(read, {
    "attempt loaded": (r) => r.status === 200,
    "has questions": (r) => (r.json("questions") || []).length > 0,
  });
  businessErrors.add(!readOk);
  if (!readOk) return;

  const questions = read.json("questions");
  let seq = questions.reduce((m, q) => Math.max(m, q.version || 0), 0);

  for (const q of questions) {
    think();
    const times = Math.random() < 0.2 ? 2 : 1;
    for (let i = 0; i < times; i++) {
      const opt = q.options[Math.floor(Math.random() * q.options.length)];
      seq += 1;
      const save = http.put(
        `${attemptUrl}/answers/${q.attemptQuestionId}`,
        JSON.stringify({ selectedOptionId: opt.optionId, clientSeq: seq }),
        { headers: JSON_HEADERS, tags: { step: "save_answer" } }
      );
      saveLatency.add(save.timings.duration);
      const saved = check(save, { "answer saved": (r) => r.status === 200 && r.json("version") === seq });
      businessErrors.add(!saved);
      if (saved && i === 0) questionsAnswered.add(1);
    }
  }

  const submit = http.post(`${attemptUrl}/submit`, null, { tags: { step: "submit" } });
  submitLatency.add(submit.timings.duration);
  const submitted = check(submit, { submitted: (r) => r.status === 200 && r.json("status") === "Submitted" });
  businessErrors.add(!submitted);
  if (submitted) attemptsSubmitted.add(1);

  const result = http.get(`${attemptUrl}/result`, { tags: { step: "result" } });
  businessErrors.add(!check(result, { "result ok": (r) => r.status === 200 }));
}
