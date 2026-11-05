import type { Metadata } from "next";
import { AccuracyBars } from "@/components/lab/accuracy-bars";
import report from "@/content/model-report.json";
import { getDictionary } from "../dictionaries";

type LetterReport = {
  samples: number;
  sources: Record<string, number>;
  heldOutBySource: Record<string, number>;
  heldOutMeanOverSources: number;
  perLetter: Record<string, number | null>;
  onnxKB: number;
};

type WordReport = {
  clips: number;
  glosses: number;
  folds: { heldOut: string[]; clips: number; accuracy: number; top3: number }[];
  meanAccuracy: number;
  meanTop3: number;
  perWord: Record<string, number | null>;
  onnxKB: number;
};

const pct = (v: number) => `${Math.round(v * 100)}%`;
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export async function generateMetadata(): Promise<Metadata> {
  const { lab } = await getDictionary();
  return { title: lab.metaTitle, description: lab.lede };
}

export default async function LabPage() {
  const { lab: t } = await getDictionary();
  const letters = (report as { letters?: LetterReport }).letters;
  const words = (report as { words?: WordReport }).words;
  const sourceName = (id: string) => (t.sourceNames as Record<string, string>)[id] ?? id;

  return (
    <article className="page-gutter pb-24">
      <header className="grid gap-8 border-b hairline py-14 lg:grid-cols-12 lg:gap-x-10 lg:py-20">
        <p className="label lg:col-span-12">{t.eyebrow}</p>
        <h1 className="font-display text-(length:--text-giant) leading-[0.85] lg:col-span-8">{t.title}</h1>
        <p className="max-w-[46ch] text-(length:--text-lede) leading-snug text-ink-muted lg:col-span-4 lg:col-start-9 lg:self-end">{t.lede}</p>
      </header>

      <section className="border-b hairline py-16">
        <h2 className="label mb-10">{t.pipelineLabel}</h2>
        <ol className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {t.pipeline.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-4 bg-paper p-6 pt-5">
              <span className="label tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display text-[1.6rem] leading-tight">{step.title}</h3>
              <p className="text-[0.95rem] text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {letters && (
        <section className="grid gap-12 border-b hairline py-16 lg:grid-cols-12 lg:gap-x-10">
          <div className="lg:col-span-5">
            <h2 className="label">{t.resultsLabel}</h2>
            <p className="mt-4 max-w-[48ch] text-ink-muted">{t.resultsIntro}</p>

            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8">
              <div className="col-span-2">
                <dd className="font-display text-[clamp(4rem,3rem+4vw,7rem)] leading-none">{pct(letters.heldOutMeanOverSources)}</dd>
                <dt className="label mt-2">{t.meanLabel}</dt>
              </div>
              <div>
                <dd className="font-display text-4xl leading-none">{letters.samples.toLocaleString()}</dd>
                <dt className="label mt-2">{t.samplesLabel}</dt>
              </div>
              <div>
                <dd className="font-display text-4xl leading-none">{letters.onnxKB} KB</dd>
                <dt className="label mt-2">{t.sizeLabel}</dt>
              </div>
            </dl>

            <h3 className="label mt-12 mb-4">{t.bySourceLabel}</h3>
            <table className="w-full border-collapse text-left">
              <tbody>
                {Object.entries(letters.heldOutBySource).map(([id, acc]) => (
                  <tr key={id} className="border-b hairline">
                    <th scope="row" className="py-3 pr-4 font-normal">
                      {sourceName(id)}
                      <span className="label ml-2">n={letters.sources[id]?.toLocaleString()}</span>
                    </th>
                    <td className="font-display py-3 text-right text-2xl tabular-nums">{pct(acc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <h3 className="label mb-6">{t.perLetterLabel}</h3>
            <AccuracyBars
              caption={t.perLetterLabel}
              unit={t.tooltip}
              data={Object.entries(letters.perLetter).map(([label, value]) => ({ label, value }))}
            />
            <p className="mt-6 max-w-[52ch] text-[0.95rem] text-ink-muted">{t.perLetterNote}</p>
          </div>
        </section>
      )}

      {words ? (
        <section className="grid gap-12 border-b hairline py-16 lg:grid-cols-12 lg:gap-x-10">
          <div className="lg:col-span-5">
            <h2 className="label">{t.wordsLabel}</h2>
            <p className="mt-4 max-w-[48ch] text-ink-muted">{t.wordsIntro}</p>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8">
              <div className="col-span-2">
                <dd className="font-display text-[clamp(4rem,3rem+4vw,7rem)] leading-none">{pct(words.meanAccuracy)}</dd>
                <dt className="label mt-2">{t.wordsMeanLabel}</dt>
              </div>
              <div>
                <dd className="font-display text-4xl leading-none">{pct(words.meanTop3)}</dd>
                <dt className="label mt-2">{t.wordsTop3Label}</dt>
              </div>
              <div>
                <dd className="font-display text-4xl leading-none">{words.glosses}</dd>
                <dt className="label mt-2">{t.wordsCountLabel}</dt>
              </div>
              <div>
                <dd className="font-display text-4xl leading-none">{words.clips.toLocaleString()}</dd>
                <dt className="label mt-2">{t.wordsClipsLabel}</dt>
              </div>
              <div>
                <dd className="font-display text-4xl leading-none">{words.onnxKB} KB</dd>
                <dt className="label mt-2">{t.sizeLabel}</dt>
              </div>
            </dl>
            <h3 className="label mt-12 mb-4">{t.foldsLabel}</h3>
            <table className="w-full border-collapse text-left">
              <tbody>
                {words.folds.map((f, i) => (
                  <tr key={i} className="border-b hairline">
                    <th scope="row" className="label py-3 pr-4 font-normal normal-case">
                      {f.heldOut.join(" · ")}
                    </th>
                    <td className="font-display py-3 text-right text-2xl tabular-nums">{pct(f.accuracy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <h3 className="label mb-6">{t.perWordLabel}</h3>
            <AccuracyBars
              caption={t.perWordLabel}
              unit={t.tooltip}
              labelWidth="7.5rem"
              data={Object.entries(words.perWord)
                .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                .map(([label, value]) => ({ label: capitalise(label), value }))}
            />
            <p className="mt-6 max-w-[52ch] text-[0.95rem] text-ink-muted">{t.perWordNote}</p>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 border-b hairline py-16 lg:grid-cols-12 lg:gap-x-10">
          <h2 className="label lg:col-span-3">{t.wordsLabel}</h2>
          <p className="max-w-[56ch] text-(length:--text-lede) leading-snug lg:col-span-8">{t.wordsPending}</p>
        </section>
      )}

      <section className="grid gap-8 border-b hairline py-16 lg:grid-cols-12 lg:gap-x-10">
        <h2 className="label lg:col-span-3">{t.limitsLabel}</h2>
        <ul className="grid gap-4 lg:col-span-8">
          {t.limits.map((l) => (
            <li key={l} className="flex gap-4">
              <span aria-hidden className="mt-[0.7em] h-px w-6 shrink-0 bg-clay" />
              <span className="text-[1.05rem]">{l}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-12 py-16 lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-6">
          <h2 className="label mb-4">{t.privacyLabel}</h2>
          <p className="font-display max-w-[30ch] text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] leading-snug">{t.privacy}</p>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <h2 className="label mb-4">{t.stackLabel}</h2>
          <ul className="grid gap-2">
            {t.stack.map((s) => (
              <li key={s} className="border-b hairline pb-2">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </article>
  );
}
