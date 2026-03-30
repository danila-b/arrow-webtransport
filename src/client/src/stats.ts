export interface QueryStats {
  workloadId: string | null;
  transportId: string | null;
  connectionSetupMs: number;
  ttfbMs: number | null;
  totalTimeMs: number;
  totalRows: number;
  totalBytes: number;
  connectionRestarts: number;
  throughputRowsPerSec: number | null;
  throughputMBPerSec: number | null;
  cancelLatencyMs: number | null;
  longTaskCount: number;
  longTaskTotalMs: number;
}

export class StatsCollector {
  private connectStart = 0;
  private connectEnd = 0;
  private queryStart = 0;
  private firstByteTime: number | null = null;
  private cancelRequestedAt: number | null = null;
  private cancelAckAt: number | null = null;
  private doneAt = 0;

  private _totalBytes = 0;
  private _totalRows = 0;
  private _restarts = 0;

  private _workloadId: string | null = null;
  private _transportId: string | null = null;

  private _longTaskCount = 0;
  private _longTaskTotalMs = 0;
  private observer: PerformanceObserver | null = null;

  markConnectStart(): void {
    this.connectStart = performance.now();
  }

  markConnectEnd(): void {
    this.connectEnd = performance.now();
  }

  markQueryStart(): void {
    this.queryStart = performance.now();
  }

  markFirstByte(time: number): void {
    if (this.firstByteTime === null) {
      this.firstByteTime = time;
    }
  }

  markCancelRequested(): void {
    this.cancelRequestedAt = performance.now();
  }

  markCancelAck(): void {
    this.cancelAckAt = performance.now();
  }

  markDone(): void {
    this.doneAt = performance.now();
  }

  addBytes(n: number): void {
    this._totalBytes += n;
  }

  addRows(n: number): void {
    this._totalRows += n;
  }

  addRestart(): void {
    this._restarts++;
  }

  setWorkloadId(id: string): void {
    this._workloadId = id;
  }

  setTransportId(id: string): void {
    this._transportId = id;
  }

  startLongTaskObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this._longTaskCount++;
          this._longTaskTotalMs += entry.duration;
        }
      });
      this.observer.observe({ type: 'longtask', buffered: true });
    } catch {
      // Long Task API not supported in this environment
      this.observer = null;
    }
  }

  stopLongTaskObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  snapshot(): QueryStats {
    const connectionSetupMs = this.connectEnd - this.connectStart;
    const ttfbMs = this.firstByteTime !== null ? this.firstByteTime - this.queryStart : null;
    const totalTimeMs = this.doneAt - this.queryStart;

    const totalTimeSec = totalTimeMs / 1000;
    const hasThroughput = totalTimeSec > 0 && this._totalRows > 0;

    let cancelLatencyMs: number | null = null;
    if (this.cancelRequestedAt !== null) {
      const cancelEnd = this.cancelAckAt ?? this.doneAt;
      cancelLatencyMs = cancelEnd - this.cancelRequestedAt;
    }

    return {
      workloadId: this._workloadId,
      transportId: this._transportId,
      connectionSetupMs,
      ttfbMs,
      totalTimeMs,
      totalRows: this._totalRows,
      totalBytes: this._totalBytes,
      connectionRestarts: this._restarts,
      throughputRowsPerSec: hasThroughput ? this._totalRows / totalTimeSec : null,
      throughputMBPerSec: hasThroughput ? this._totalBytes / totalTimeSec / 1e6 : null,
      cancelLatencyMs,
      longTaskCount: this._longTaskCount,
      longTaskTotalMs: this._longTaskTotalMs,
    };
  }
}
