import { useNavigate } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { useUploadDocument } from '../api';
import type { SessionUser } from '../types';

/**
 * Onboarding, rebuilt rather than ported.
 *
 * The original flow was lifestage → intent → **pricing** → done. The pricing step
 * is gone with payments, and its other two steps fed features that no longer
 * exist (practice tests, SAT prep). What is left is the part that is still true:
 * who the learner is, what they want, and getting a first document in.
 */

const LIFESTAGES = [
  { id: 'school', label: 'School' },
  { id: 'university', label: 'University' },
  { id: 'professional', label: 'Working' },
  { id: 'curious', label: 'Just curious' },
];

const INTENTS = [
  { id: 'understand', label: 'Understand my notes' },
  { id: 'revise', label: 'Revise for exams' },
  { id: 'ask', label: 'Ask questions about PDFs' },
  { id: 'summarise', label: 'Summarise long documents' },
];

const chip =
  'rounded-full border px-4 py-2 text-sm transition-colors';
const chipOn = 'border-curio-green bg-curio-green/10 text-foreground';
const chipOff = 'border-black/10 bg-white text-paragraphs hover:border-curio-green/40';

export function Welcome({
  user,
  firstName,
}: {
  user: SessionUser;
  firstName: string | null;
}) {
  const navigate = useNavigate();
  const upload = useUploadDocument(user.sub);
  const [step, setStep] = useState(0);
  const [lifestage, setLifestage] = useState<string | null>(null);
  const [intents, setIntents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const save = async (extra: Record<string, unknown>) => {
    await fetch('/api/account/onboarding', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(lifestage ? { lifestage } : {}),
        ...(intents.length ? { intents } : {}),
        ...extra,
      }),
    });
  };

  const finish = async (skipped = false) => {
    setBusy(true);
    await save(skipped ? { skipped: true } : { completed: true });
    setBusy(false);
    await navigate({ to: '/', search: { chat: undefined } });
  };

  const toggleIntent = (id: string) =>
    setIntents((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

  return (
    <div className="flex min-h-dvh flex-col bg-focus">
      <div className="flex items-center justify-between px-6 py-5">
        <span className="font-roca text-2xl leading-none text-foreground">curio.</span>
        <button
          onClick={() => void finish(true)}
          disabled={busy}
          className="text-sm text-headers underline"
        >
          Skip for now
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 pb-24">
        <p className="text-xs uppercase tracking-wide text-headers">
          Step {step + 1} of 3
        </p>

        {step === 0 && (
          <>
            <h1 className="mt-2 font-roca text-3xl text-foreground">
              Hi {firstName ?? 'there'} 👋
            </h1>
            <p className="mt-4 text-lg text-paragraphs">What brings you to Curio?</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {LIFESTAGES.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setLifestage(option.id);
                    setStep(1);
                  }}
                  className={`${chip} ${lifestage === option.id ? chipOn : chipOff}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="mt-2 font-roca text-3xl text-foreground">
              What do you want to do first?
            </h1>
            <p className="mt-4 text-lg text-paragraphs">Pick as many as you like.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {INTENTS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => toggleIntent(option.id)}
                  className={`${chip} ${intents.includes(option.id) ? chipOn : chipOff}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => setStep(2)}
                className="rounded-xl bg-curio-green px-5 py-2 text-sm font-medium text-white"
              >
                Continue
              </button>
              <button onClick={() => setStep(0)} className="text-sm text-headers underline">
                Back
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mt-2 font-roca text-3xl text-foreground">Add your first document</h1>
            <p className="mt-4 text-lg text-paragraphs">
              A PDF, or skip and upload later from your library. Curio reads the text and writes
              a summary you can ask questions about.
            </p>

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-white px-6 py-10 text-center hover:border-curio-green/50">
              <span className="text-sm font-medium text-foreground">
                {upload.isPending ? 'Uploading…' : 'Choose a file'}
              </span>
              <span className="text-xs text-headers">PDF, text — scans need OCR later</span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload.mutate(file);
                  e.target.value = '';
                }}
              />
            </label>

            {upload.isSuccess && (
              <p className="mt-3 text-sm text-headers">
                Uploaded — the summary will appear in a few seconds. You can ask questions right
                away.
              </p>
            )}
            {upload.error && (
              <p className="mt-3 text-sm text-red-600">{(upload.error as Error).message}</p>
            )}

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => void finish()}
                disabled={busy}
                className="rounded-xl bg-curio-green px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? 'Finishing…' : 'Start using Curio'}
              </button>
              <Link to="/" search={{ chat: undefined }} className="text-sm text-headers underline">
                I'll explore first
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
