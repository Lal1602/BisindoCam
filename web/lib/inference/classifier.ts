// ONNX Runtime Web wrapper. Models are tiny MLPs on landmark features, so a
// single-threaded WASM session on the main thread runs well under 1 ms.

import type { InferenceSession, Tensor } from "onnxruntime-web";

export type ModelMeta = {
  featureVersion: number;
  inputSize: number;
  /** Input shape without the batch axis, for sequence models (e.g. [32, 138]). */
  shape?: number[];
  labels: string[];
  /** English glosses, in label order (word model). */
  english?: string[];
};

export type Classifier = {
  meta: ModelMeta;
  /** Class probabilities, in `meta.labels` order. */
  predict(features: Float32Array): Promise<Float32Array>;
};

/** The model files are not deployed yet (e.g. still being trained). */
export class ModelMissingError extends Error {}

let runtime: Promise<typeof import("onnxruntime-web/wasm")> | null = null;

function loadRuntime() {
  runtime ??= import("onnxruntime-web/wasm").then((ort) => {
    ort.env.wasm.wasmPaths = "/ort/";
    ort.env.wasm.numThreads = 1; // threads would need cross-origin isolation headers
    return ort;
  });
  return runtime;
}

export async function loadClassifier(name: string, expectedFeatureVersion: number): Promise<Classifier> {
  const [ort, meta] = await Promise.all([
    loadRuntime(),
    fetch(`/models/${name}.json`).then((r) => {
      if (!r.ok) throw new ModelMissingError(`${name}: no model at /models/${name}.json`);
      return r.json() as Promise<ModelMeta>;
    }),
  ]);
  if (meta.featureVersion !== expectedFeatureVersion) {
    throw new Error(`${name}: model expects features v${meta.featureVersion}, app computes v${expectedFeatureVersion}`);
  }
  const session: InferenceSession = await ort.InferenceSession.create(`/models/${name}.onnx`, {
    executionProviders: ["wasm"],
  });
  const input = session.inputNames[0];
  // scikit-learn exports [label, probabilities]; torch exports [probabilities].
  const output = session.outputNames.find((n) => n.includes("prob")) ?? session.outputNames.at(-1)!;

  return {
    meta,
    async predict(features) {
      const tensor = new ort.Tensor("float32", features, [1, ...(meta.shape ?? [meta.inputSize])]);
      const result = await session.run({ [input]: tensor }, [output]);
      return (result[output] as Tensor).data as Float32Array;
    },
  };
}
