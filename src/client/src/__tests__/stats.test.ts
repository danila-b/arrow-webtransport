import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatsCollector } from '../stats.ts';

describe('StatsCollector', () => {
  let collector: StatsCollector;

  beforeEach(() => {
    collector = new StatsCollector();
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  function setNow(ms: number) {
    vi.spyOn(performance, 'now').mockReturnValue(ms);
  }

  it('computes connection setup time', () => {
    setNow(100);
    collector.markConnectStart();
    setNow(142);
    collector.markConnectEnd();
    collector.markQueryStart();
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.connectionSetupMs).toBe(42);
  });

  it('computes TTFB from query start', () => {
    setNow(0);
    collector.markConnectStart();
    collector.markConnectEnd();
    setNow(100);
    collector.markQueryStart();
    collector.markFirstByte(118);
    setNow(200);
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.ttfbMs).toBe(18);
  });

  it('returns null TTFB when no data received', () => {
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.ttfbMs).toBeNull();
  });

  it('markFirstByte is idempotent — only records first call', () => {
    setNow(100);
    collector.markQueryStart();
    collector.markFirstByte(110);
    collector.markFirstByte(999);
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.ttfbMs).toBe(10);
  });

  it('computes total time from queryStart to done', () => {
    setNow(0);
    collector.markConnectStart();
    collector.markConnectEnd();
    setNow(50);
    collector.markQueryStart();
    setNow(1250);
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.totalTimeMs).toBe(1200);
  });

  it('accumulates bytes via addBytes', () => {
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    collector.addBytes(1024);
    collector.addBytes(2048);
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.totalBytes).toBe(3072);
  });

  it('accumulates rows via addRows', () => {
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    collector.addRows(500);
    collector.addRows(300);
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.totalRows).toBe(800);
  });

  it('tracks connection restarts', () => {
    collector.addRestart();
    collector.addRestart();
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.connectionRestarts).toBe(2);
  });

  it('computes throughput rows/sec and MB/sec', () => {
    setNow(0);
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    collector.addRows(10000);
    collector.addBytes(5_000_000);
    setNow(2000);
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.throughputRowsPerSec).toBe(5000);
    expect(stats.throughputMBPerSec).toBe(2.5);
  });

  it('returns null throughput when no rows received', () => {
    setNow(0);
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    setNow(1000);
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.throughputRowsPerSec).toBeNull();
    expect(stats.throughputMBPerSec).toBeNull();
  });

  it('computes cancellation latency using cancelAck when available', () => {
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    setNow(500);
    collector.markCancelRequested();
    setNow(523);
    collector.markCancelAck();
    setNow(600);
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.cancelLatencyMs).toBe(23);
  });

  it('computes cancellation latency using done time when no ack', () => {
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    setNow(500);
    collector.markCancelRequested();
    setNow(550);
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.cancelLatencyMs).toBe(50);
  });

  it('returns null cancellation latency when not cancelled', () => {
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.cancelLatencyMs).toBeNull();
  });

  it('workloadId and transportId default to null', () => {
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.workloadId).toBeNull();
    expect(stats.transportId).toBeNull();
  });

  it('records workloadId and transportId when set', () => {
    collector.setWorkloadId('taxi_8c_0200k');
    collector.setTransportId('webtransport');
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    collector.markDone();

    const stats = collector.snapshot();
    expect(stats.workloadId).toBe('taxi_8c_0200k');
    expect(stats.transportId).toBe('webtransport');
  });

  it('long task counts default to zero in jsdom (no Long Task API)', () => {
    collector.startLongTaskObserver();
    collector.markConnectStart();
    collector.markConnectEnd();
    collector.markQueryStart();
    collector.markDone();
    collector.stopLongTaskObserver();

    const stats = collector.snapshot();
    expect(stats.longTaskCount).toBe(0);
    expect(stats.longTaskTotalMs).toBe(0);
  });

  it('stopLongTaskObserver is safe to call without start', () => {
    expect(() => collector.stopLongTaskObserver()).not.toThrow();
  });
});
