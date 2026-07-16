import { StatusMaps } from '@/config';
import { StatusType } from '@/config/types';

export const BenchmarkStatusValueMap = {
  Pending: 'pending',
  QUEUED: 'queued',
  Running: 'running',
  Completed: 'completed',
  Error: 'error',
  Stopped: 'stopped',
  Unreachable: 'unreachable'
};

export const BenchmarkStatusLabelMap = {
  [BenchmarkStatusValueMap.Pending]: 'Pending',
  [BenchmarkStatusValueMap.QUEUED]: 'Queued',
  [BenchmarkStatusValueMap.Running]: 'Running',
  [BenchmarkStatusValueMap.Completed]: 'Completed',
  [BenchmarkStatusValueMap.Error]: 'Error',
  [BenchmarkStatusValueMap.Stopped]: 'Stopped',
  [BenchmarkStatusValueMap.Unreachable]: 'Unreachable'
};

export const BenchmarkStatus: Record<string, StatusType> = {
  [BenchmarkStatusValueMap.Pending]: StatusMaps.transitioning,
  [BenchmarkStatusValueMap.QUEUED]: StatusMaps.warning,
  [BenchmarkStatusValueMap.Running]: StatusMaps.success,
  [BenchmarkStatusValueMap.Completed]: StatusMaps.success,
  [BenchmarkStatusValueMap.Error]: StatusMaps.error,
  [BenchmarkStatusValueMap.Unreachable]: StatusMaps.error,
  [BenchmarkStatusValueMap.Stopped]: StatusMaps.warning
};

export const ProfileValueMap = {
  LatencyShort: 'Latency',
  ThroughputMedium: 'Throughput',
  LongContextStress: 'Long Context',
  GenerationHeavy: 'Generation Heavy',
  ShareGPT: 'ShareGPT',
  Custom: 'Custom'
};

export const ProfileLabelMap = {
  [ProfileValueMap.LatencyShort]: 'benchmark.form.profile.latency',
  [ProfileValueMap.ThroughputMedium]: 'benchmark.form.profile.throughput',
  [ProfileValueMap.LongContextStress]: 'benchmark.form.profile.longContext',
  [ProfileValueMap.GenerationHeavy]: 'benchmark.form.profile.heavy',
  [ProfileValueMap.ShareGPT]: 'benchmark.form.profile.ShareGPT',
  [ProfileValueMap.Custom]: 'benchmark.form.profile.custom'
};

export const profileOptions = [
  {
    label: 'benchmark.form.profile.latency',
    tips: 'benchmark.form.profile.latency.tips',
    value: ProfileValueMap.LatencyShort,
    locale: true
  },
  {
    label: 'benchmark.form.profile.throughput',
    tips: 'benchmark.form.profile.throughput.tips',
    value: ProfileValueMap.ThroughputMedium,
    locale: true
  },
  {
    label: 'benchmark.form.profile.longContext',
    tips: 'benchmark.form.profile.longContext.tips',
    value: ProfileValueMap.LongContextStress,
    locale: true
  },
  {
    label: 'benchmark.form.profile.heavy',
    tips: 'benchmark.form.profile.heavy.tips',
    value: ProfileValueMap.GenerationHeavy,
    locale: true
  },
  {
    label: 'benchmark.form.profile.ShareGPT',
    tips: 'benchmark.form.profile.ShareGPT.tips',
    value: ProfileValueMap.ShareGPT,
    locale: true
  }
];

// `load_type` is the load axis (fixed_rate / concurrency); `auto_tune` toggles
// the adaptive ramp engine. The latency-SLA scenario = concurrency + auto_tune +
// sla targets. The create form's top selector is the Preset (profile); choosing
// one fills load_type + auto_tune + sla + dataset defaults.
export const LoadTypeValueMap = {
  FixedRate: 'fixed_rate',
  Concurrency: 'concurrency'
};

// Auto-tune budget defaults, kept in sync with the benchmark-runner ramp engine
// (RampConfig). Prefilled into the form so the effective values are
// visible/editable instead of silently applied at runtime (e.g. a run stopping
// at Max Total Duration = 1800s). multiplier/min_requests stay internal (not
// surfaced in the UI).
export const AUTO_TUNE_DEFAULTS = {
  lower_bound: 1,
  upper_bound: 1024,
  max_points: 12,
  max_total_seconds: 1800
};

export const loadTypeOptions = [
  {
    label: 'benchmark.form.loadType.fixedRate',
    value: LoadTypeValueMap.FixedRate
  },
  {
    label: 'benchmark.form.loadType.concurrency',
    value: LoadTypeValueMap.Concurrency
  }
];

// The x-axis / first-column label: a concurrency-based load (stages or the
// concurrency load type) is measured in concurrent requests; a fixed-rate load
// is measured in request rate. Show only the relevant one instead of the
// ambiguous "Rate / Concurrency".
export const loadAxisLabelId = (d?: {
  load_type?: string;
  stages?: unknown[] | null;
}): string =>
  // `load_type` is authoritative. Only fall back to the "has stages" heuristic
  // for legacy records with no load_type — otherwise a fixed-rate sweep (which
  // also has stages) would be mislabeled as concurrency.
  d?.load_type === LoadTypeValueMap.Concurrency ||
  (d?.load_type == null && (d?.stages?.length ?? 0) > 0)
    ? 'benchmark.form.concurrency'
    : 'benchmark.table.requestRate';

// Concurrency is an integer (# of concurrent requests); request rate is a
// continuous req/s frequency, so show it with one decimal.
export const loadValueDecimals = (d?: {
  load_type?: string;
  stages?: unknown[] | null;
}): number => (loadAxisLabelId(d) === 'benchmark.form.concurrency' ? 0 : 1);

// Auto-generate a benchmark name: {model}-{profile}-{MMdd-HHmm}-{3 random}.
// Slugged + length-bounded so it always satisfies the name pattern
// (^[A-Za-z0-9][A-Za-z0-9._-]{0,61}[A-Za-z0-9]$).
export const genBenchmarkName = (model?: string, profile?: string): string => {
  const slug = (s: string | undefined, max: number) =>
    (s || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, max);
  const m = slug(model, 24) || 'benchmark';
  const p = slug(profile, 20) || 'custom';
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}`;
  const rand = (Math.random().toString(36) + '000').slice(2, 5);
  return `${m}-${p}-${ts}-${rand}`;
};

// Map backend validity warning `code` -> i18n key (backend emits codes + params;
// the UI localizes them). Used by the detail banner and the list Coverage column.
export const VALIDITY_MESSAGE_KEY: Record<string, string> = {
  sla_never_met: 'benchmark.detail.validity.slaNeverMet',
  not_saturated: 'benchmark.detail.validity.notSaturated',
  point_high_error: 'benchmark.detail.validity.pointHighError',
  few_points: 'benchmark.detail.validity.fewPoints'
};

export const DatasetValueMap = {
  ShareGPT: 'ShareGPT',
  Random: 'Random',
  // Custom dataset resource (a downloaded Dataset row). The type selector value
  // is the literal string "Dataset" (mirrors Random/ShareGPT using their name).
  Custom: 'Dataset'
};

export const datasetList = [
  {
    name: 'ShareGPT',
    label: 'ShareGPT',
    value: DatasetValueMap.ShareGPT
  },
  {
    name: 'Random',
    label: 'Random',
    value: DatasetValueMap.Random
  },
  {
    name: 'Dataset',
    label: 'Dataset',
    value: DatasetValueMap.Custom
  }
];
