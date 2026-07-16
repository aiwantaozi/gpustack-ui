import * as echarts from 'echarts';
import _ from 'lodash';
import React, { useEffect, useRef } from 'react';
import { BenchmarkResultItem } from '../../config/types';
import { STATUS_HEX, StageStatusKind } from './ui';

export type ChartType =
  | 'throughput'
  | 'latency'
  | 'knee'
  | 'percentile'
  | 'tput_ttft'
  | 'tput_itl'
  | 'tput_tpot'
  | 'tput_conc'
  | 'success';

interface OverviewChartProps {
  type: ChartType;
  sorted: BenchmarkResultItem[];
  rates: string[];
  rateAxisName: string;
  slaTtft?: number | null;
  slaTpot?: number | null;
  recommendedRate?: number | null;
  kneeRate?: number | null;
  peakRate?: number | null;
  height?: number;
  // Decimals for rate labels (0 for integer concurrency, 1 for req/s rate).
  rateDecimals?: number;
  // Short load-axis unit (e.g. "req/s" / "conc.") for the recommended marker.
  rateUnit?: string;
  // Fill the parent's height instead of a fixed px (for the flex hero column).
  fill?: boolean;
}

// Percentile from a stage's raw_metrics dump (bm.model_dump() => has .metrics).
const getPct = (r: BenchmarkResultItem, field: string, key: string): number =>
  _.get(r.raw_metrics, ['metrics', field, 'successful', 'percentiles', key]) ??
  0;

const buildOption = ({
  type,
  sorted,
  rates,
  rateAxisName,
  slaTtft,
  slaTpot,
  recommendedRate,
  kneeRate,
  peakRate,
  rateDecimals,
  rateUnit,
  height
}: OverviewChartProps): echarts.EChartsCoreOption => {
  // Compact = a small supporting chart; drop extras that crowd a short canvas.
  const compact = (height ?? 260) <= 220;
  // Shared layout so every chart reads the same way: legend across the top,
  // the y-axis name written vertically down the left, the x-axis name centered
  // underneath. Axes + units are always legible and never collide with the
  // legend.
  const grid = { left: 64, right: 24, top: 34, bottom: 48 };
  const SPLIT = '#f0f0f0';
  const AXIS = '#e8e8e8';
  const NAME = '#595959';
  const catX = (name: string) => ({
    type: 'category' as const,
    data: rates,
    name,
    nameLocation: 'middle' as const,
    nameGap: 28,
    nameTextStyle: { color: NAME, fontSize: 12 },
    axisTick: { show: false },
    axisLabel: { color: NAME },
    axisLine: { lineStyle: { color: AXIS } }
  });
  const valY = (name: string, extra?: Record<string, unknown>) => ({
    type: 'value' as const,
    name,
    nameLocation: 'middle' as const,
    nameGap: 48,
    nameTextStyle: { color: NAME, fontSize: 12 },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: SPLIT } },
    ...extra
  });
  // Legend top-right with the y-axis name written down the left → no collision.
  const legendTop = (data: string[]) => ({
    data,
    top: 0,
    right: 0,
    icon: 'circle' as const,
    itemWidth: 8,
    itemHeight: 8
  });

  if (type === 'throughput') {
    return {
      tooltip: { trigger: 'axis' },
      legend: legendTop(['Total', 'Input', 'Output']),
      grid,
      xAxis: catX(rateAxisName),
      yAxis: valY('Tokens/s'),
      series: [
        {
          name: 'Total',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          markPoint: compact ? undefined : { data: [{ type: 'max' }] },
          data: sorted.map((r) => _.round(r.tokens_per_second_mean ?? 0, 1))
        },
        {
          name: 'Input',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: sorted.map((r) =>
            _.round(r.input_tokens_per_second_mean ?? 0, 1)
          )
        },
        {
          name: 'Output',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: sorted.map((r) =>
            _.round(r.output_tokens_per_second_mean ?? 0, 1)
          )
        }
      ]
    };
  }
  if (type === 'latency') {
    const markLines: any[] = [];
    if (slaTtft) {
      markLines.push({
        yAxis: slaTtft,
        label: { formatter: `TTFT ≤ ${slaTtft}` }
      });
    }
    if (slaTpot) {
      markLines.push({
        yAxis: slaTpot,
        label: { formatter: `TPOT ≤ ${slaTpot}` }
      });
    }
    return {
      tooltip: { trigger: 'axis' },
      legend: legendTop(['TTFT Avg', 'TPOT Avg', 'ITL Avg']),
      grid,
      xAxis: catX(rateAxisName),
      yAxis: valY('Latency (ms)'),
      series: [
        {
          name: 'TTFT Avg',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: sorted.map((r) => _.round(r.time_to_first_token_mean ?? 0, 1)),
          markLine: markLines.length
            ? { silent: true, symbol: 'none', data: markLines }
            : undefined
        },
        {
          name: 'TPOT Avg',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: sorted.map((r) => _.round(r.time_per_output_token_mean ?? 0, 1))
        },
        {
          name: 'ITL Avg',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: sorted.map((r) => _.round(r.inter_token_latency_mean ?? 0, 1))
        }
      ]
    };
  }
  if (type === 'knee') {
    // Verdict for the recommended point: it is always the "Best" operating
    // point; when best coincides with the peak (a max-throughput run) call it
    // "Max" to signal there is no higher sustained throughput.
    const isPeakRec = peakRate != null && recommendedRate === peakRate;
    const recVerdict = isPeakRec ? 'Max' : 'Best';
    const rateSuffix = rateUnit ? ` ${rateUnit}` : '';
    return {
      tooltip: {
        trigger: 'item',
        // Data points are objects ({ value: [tpot, tps, rate], ... }), so read
        // p.value, not p.data (which is the whole object).
        formatter: (p: any) =>
          `${rateAxisName} ${_.round(p.value[2] ?? 0, rateDecimals ?? 0)}<br/>TPOT Avg ${p.value[0]} ms<br/>${p.value[1]} Tokens/s`
      },
      // Extra top room so the "Recommended" pin (placed at the top-most point)
      // and its now two-line label stay inside the canvas.
      grid: { left: 70, right: 50, top: 84, bottom: 48 },
      // scale: don't force the axes to start at 0 — a few points (e.g. TTFT
      // 50–93) should spread across the plot, not cluster in one corner.
      xAxis: {
        type: 'value',
        name: 'TPOT Avg (ms/token)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#595959', fontSize: 12 },
        scale: true,
        axisTick: { show: false },
        axisLabel: { color: '#595959' },
        axisLine: { lineStyle: { color: AXIS } },
        splitLine: { lineStyle: { color: SPLIT } }
      },
      yAxis: {
        type: 'value',
        name: 'Total Tokens/s',
        nameLocation: 'middle',
        nameGap: 52,
        nameTextStyle: { color: '#595959', fontSize: 12 },
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: SPLIT } }
      },
      series: [
        {
          type: 'line',
          // Neutral connecting line so the per-point status colors carry the
          // meaning, not the line.
          lineStyle: { color: '#bfbfbf', width: 2 },
          data: sorted.map((r) => {
            const status: StageStatusKind =
              recommendedRate != null && r.rate === recommendedRate
                ? 'recommended'
                : peakRate != null && r.rate === peakRate
                  ? 'peak'
                  : kneeRate != null && r.rate === kneeRate
                    ? 'balanced'
                    : peakRate != null && (r.rate ?? 0) > peakRate
                      ? 'overloaded'
                      : 'ok';
            const isRec = status === 'recommended';
            const rateNum = _.round(r.rate ?? 0, rateDecimals ?? 0);
            const recTps = _.round(r.tokens_per_second_mean ?? 0, 0);
            // Every point labels its own rate + verdict, so the chart explains
            // itself without the reader cross-referencing the table. The
            // recommended point leads with the payoff metric (throughput) and
            // keeps the verdict + operating point as a secondary line.
            const labelText = isRec
              ? `{primary|${recTps} tok/s}\n{secondary|⭐ ${recVerdict} @ ${rateNum}${rateSuffix}}`
              : status === 'peak'
                ? `▲ ${rateNum} Peak`
                : status === 'balanced'
                  ? `◆ ${rateNum} Balanced`
                  : status === 'overloaded'
                    ? `✕ ${rateNum}`
                    : `${rateNum}`;
            return {
              // X = TPOT (normalized time per output token), matching guidellm's
              // "Throughput vs. Norm. Time per Output Token" decision chart;
              // Y = total (input + output) tokens/s, the headline throughput.
              value: [
                _.round(r.time_per_output_token_mean ?? 0, 1),
                _.round(r.tokens_per_second_mean ?? 0, 1),
                r.rate
              ],
              // ★ recommended (pin) · ▲ peak · ◆ balanced/knee · ✕-like red dot
              // overloaded.
              symbol:
                status === 'recommended'
                  ? 'pin'
                  : status === 'peak'
                    ? 'triangle'
                    : status === 'balanced'
                      ? 'diamond'
                      : 'circle',
              symbolSize: isRec
                ? 42
                : status === 'peak'
                  ? 16
                  : status === 'balanced'
                    ? 14
                    : 10,
              itemStyle: { color: STATUS_HEX[status] },
              label: {
                show: true,
                formatter: labelText,
                position: 'top',
                distance: isRec ? 10 : 8,
                color: STATUS_HEX[status],
                fontSize: status === 'ok' ? 11 : 12,
                fontWeight: status === 'ok' ? 'normal' : 'bold',
                // Two-line recommended label: bold throughput headline + a
                // muted verdict/operating-point line beneath it.
                lineHeight: isRec ? 16 : undefined,
                rich: isRec
                  ? {
                      primary: {
                        fontSize: 14,
                        fontWeight: 'bold',
                        color: STATUS_HEX.recommended
                      },
                      secondary: {
                        fontSize: 11,
                        fontWeight: 'normal',
                        color: '#8c8c8c'
                      }
                    }
                  : undefined
              }
            };
          })
        }
      ]
    };
  }
  if (type === 'percentile') {
    return {
      tooltip: { trigger: 'axis' },
      legend: legendTop(['TTFT p50', 'TTFT p90', 'TTFT p99']),
      grid,
      xAxis: catX(rateAxisName),
      yAxis: valY('TTFT (ms)'),
      series: [
        {
          name: 'TTFT p50',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: sorted.map((r) =>
            _.round(getPct(r, 'time_to_first_token_ms', 'p50'), 1)
          )
        },
        {
          name: 'TTFT p90',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: sorted.map((r) =>
            _.round(getPct(r, 'time_to_first_token_ms', 'p90'), 1)
          )
        },
        {
          name: 'TTFT p99',
          type: 'line',
          smooth: true,
          symbolSize: 7,
          data: sorted.map((r) =>
            _.round(getPct(r, 'time_to_first_token_ms', 'p99'), 1)
          )
        }
      ]
    };
  }
  if (
    type === 'tput_ttft' ||
    type === 'tput_itl' ||
    type === 'tput_tpot' ||
    type === 'tput_conc'
  ) {
    const xField =
      type === 'tput_ttft'
        ? 'time_to_first_token_mean'
        : type === 'tput_itl'
          ? 'inter_token_latency_mean'
          : type === 'tput_tpot'
            ? 'time_per_output_token_mean'
            : 'request_concurrency_mean';
    const xName =
      type === 'tput_ttft'
        ? 'TTFT Avg (ms)'
        : type === 'tput_itl'
          ? 'ITL Avg (ms)'
          : type === 'tput_tpot'
            ? 'TPOT Avg (ms/token)'
            : 'Concurrency Avg';
    // Total / Input / Output throughput vs the chosen latency (or concurrency)
    // axis, so each view shows the full token breakdown, not just output.
    const tputSeries = (name: string, yField: keyof BenchmarkResultItem) => ({
      name,
      type: 'line' as const,
      smooth: true,
      symbolSize: 7,
      data: sorted.map((r) => [
        _.round((r as any)[xField] ?? 0, 1),
        _.round((r as any)[yField] ?? 0, 1)
      ])
    });
    return {
      tooltip: { trigger: 'axis' },
      legend: legendTop(['Total', 'Input', 'Output']),
      grid: { left: 64, right: 24, top: 34, bottom: 48 },
      xAxis: {
        type: 'value',
        name: xName,
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: NAME, fontSize: 12 },
        scale: true,
        axisTick: { show: false },
        axisLabel: { color: NAME },
        axisLine: { lineStyle: { color: AXIS } },
        splitLine: { lineStyle: { color: SPLIT } }
      },
      yAxis: valY('Tokens/s', { scale: true }),
      series: [
        tputSeries('Total', 'tokens_per_second_mean'),
        tputSeries('Input', 'input_tokens_per_second_mean'),
        tputSeries('Output', 'output_tokens_per_second_mean')
      ]
    };
  }
  // success rate (default)
  return {
    tooltip: { trigger: 'axis' },
    grid,
    xAxis: catX(rateAxisName),
    yAxis: valY('Success rate (%)', { max: 100 }),
    series: [
      {
        name: 'Success',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        data: sorted.map((r) =>
          _.round(
            ((r.request_successful ?? 0) / (r.request_total || 1)) * 100,
            1
          )
        )
      }
    ]
  };
};

// One self-contained echarts chart. Several are stacked in the Overview so all
// views are visible at once (no tab switching).
const OverviewChart: React.FC<OverviewChartProps> = (props) => {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    if (!inst.current) {
      inst.current = echarts.init(ref.current);
    }
    inst.current.setOption(buildOption(props), true);
    inst.current.resize();
  }, [props]);

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      inst.current?.dispose();
      inst.current = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: props.fill ? '100%' : (props.height ?? 260)
      }}
    />
  );
};

export default OverviewChart;
