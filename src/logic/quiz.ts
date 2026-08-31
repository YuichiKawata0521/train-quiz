import type { Train, Mode, Notation } from './types';
import { displayName } from './settings';

export type Rng = () => number;

export interface Question {
  train: Train;
  choices: Train[];
  correctIndex: number;
}

export interface SessionState {
  questions: Question[];
  current: number;
  score: number;
  failedThisQuestion: boolean;
  notation: Notation;
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickQuestions(pool: Train[], count: number, rng: Rng): Train[] {
  return shuffle(pool, rng).slice(0, Math.min(count, pool.length));
}

function isLookalike(a: Train, b: Train): boolean {
  return (a.lookalikes ?? []).includes(b.id) || (b.lookalikes ?? []).includes(a.id);
}

export function buildChoices(
  correct: Train,
  pool: Train[],
  notation: Notation,
  rng: Rng,
): Train[] {
  const seen = new Set([displayName(correct, notation)]);
  const valid = (t: Train): boolean => {
    if (t.id === correct.id || isLookalike(t, correct)) return false;
    const name = displayName(t, notation);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  };
  const sameCat = shuffle(
    pool.filter((t) => t.category === correct.category),
    rng,
  ).filter(valid);
  const others = shuffle(
    pool.filter((t) => t.category !== correct.category),
    rng,
  ).filter(valid);
  const distractors = [...sameCat, ...others].slice(0, 3);
  return shuffle([correct, ...distractors], rng);
}

export function poolForMode(mode: Mode, trains: Train[]): Train[] {
  return trains.filter((t) => mode.categories.includes(t.category));
}

export function createSession(
  pool: Train[],
  count: number,
  notation: Notation,
  rng: Rng = Math.random,
): SessionState {
  const questions = pickQuestions(pool, count, rng).map((train) => {
    const choices = buildChoices(train, pool, notation, rng);
    return { train, choices, correctIndex: choices.findIndex((c) => c.id === train.id) };
  });
  return { questions, current: 0, score: 0, failedThisQuestion: false, notation };
}

export type AnswerResult = 'correct' | 'wrong';

export function answer(session: SessionState, choiceIndex: number): AnswerResult {
  const q = session.questions[session.current];
  if (q.choices[choiceIndex].id === q.train.id) {
    if (!session.failedThisQuestion) session.score++;
    session.current++;
    session.failedThisQuestion = false;
    return 'correct';
  }
  session.failedThisQuestion = true;
  return 'wrong';
}

export function isFinished(session: SessionState): boolean {
  return session.current >= session.questions.length;
}
