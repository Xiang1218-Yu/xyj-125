import { onCLS, onINP, onLCP, onFCP, onTTFB, Metric } from 'web-vitals';

export type PerformanceMetric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
};

export type CanvasRenderMetric = {
  timestamp: number;
  renderDuration: number;
  fps: number;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  pixelCount: number;
  layerCount: number;
};

type MetricCallback = (metric: PerformanceMetric) => void;
type CanvasMetricCallback = (metric: CanvasRenderMetric) => void;

class PerformanceMonitor {
  private webVitalCallbacks: MetricCallback[] = [];
  private canvasRenderCallbacks: CanvasMetricCallback[] = [];
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private currentFps = 0;
  private metricsBuffer: CanvasRenderMetric[] = [];
  private readonly maxBufferSize = 100;
  private isInitialized = false;

  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    const reportMetric = (metric: Metric) => {
      const rating = this.getRating(metric.name, metric.value);
      const performanceMetric: PerformanceMetric = {
        name: metric.name,
        value: metric.value,
        rating,
        delta: metric.delta,
        id: metric.id,
      };
      this.webVitalCallbacks.forEach((cb) => cb(performanceMetric));
      this.logWebVital(performanceMetric);
    };

    onCLS(reportMetric);
    onINP(reportMetric);
    onLCP(reportMetric);
    onFCP(reportMetric);
    onTTFB(reportMetric);
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds: Record<string, [number, number]> = {
      CLS: [0.1, 0.25],
      INP: [200, 500],
      LCP: [2500, 4000],
      FCP: [1800, 3000],
      TTFB: [800, 1800],
    };
    const [good, poor] = thresholds[name] || [100, 500];
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  private logWebVital(metric: PerformanceMetric) {
    const color =
      metric.rating === 'good'
        ? '#2ecc71'
        : metric.rating === 'needs-improvement'
        ? '#f39c12'
        : '#e74c3c';
    console.log(
      `%c[Perf] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    );
  }

  measureCanvasRender(
    renderFn: () => void,
    context: {
      canvasWidth: number;
      canvasHeight: number;
      gridSize: number;
      pixelCount: number;
      layerCount: number;
    }
  ): number {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    const start = performance.now();
    renderFn();
    const end = performance.now();
    const duration = end - start;

    const metric: CanvasRenderMetric = {
      timestamp: now,
      renderDuration: duration,
      fps: this.currentFps,
      canvasWidth: context.canvasWidth,
      canvasHeight: context.canvasHeight,
      gridSize: context.gridSize,
      pixelCount: context.pixelCount,
      layerCount: context.layerCount,
    };

    this.metricsBuffer.push(metric);
    if (this.metricsBuffer.length > this.maxBufferSize) {
      this.metricsBuffer.shift();
    }

    this.canvasRenderCallbacks.forEach((cb) => cb(metric));

    if (duration > 16) {
      console.warn(
        `%c[Canvas Perf] Render: ${duration.toFixed(2)}ms | FPS: ${this.currentFps} | Pixels: ${context.pixelCount} | Layers: ${context.layerCount}`,
        'color: #f39c12; font-weight: bold;'
      );
    }

    return duration;
  }

  getCanvasMetrics(): CanvasRenderMetric[] {
    return [...this.metricsBuffer];
  }

  getCanvasStats() {
    if (this.metricsBuffer.length === 0) {
      return { avgRender: 0, maxRender: 0, minRender: 0, avgFps: 0, sampleCount: 0 };
    }
    const durations = this.metricsBuffer.map((m) => m.renderDuration);
    const fpsValues = this.metricsBuffer.filter((m) => m.fps > 0).map((m) => m.fps);
    return {
      avgRender: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxRender: Math.max(...durations),
      minRender: Math.min(...durations),
      avgFps: fpsValues.length > 0 ? fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length : 0,
      sampleCount: this.metricsBuffer.length,
    };
  }

  onWebVital(callback: MetricCallback) {
    this.webVitalCallbacks.push(callback);
    return () => {
      this.webVitalCallbacks = this.webVitalCallbacks.filter((cb) => cb !== callback);
    };
  }

  onCanvasRender(callback: CanvasMetricCallback) {
    this.canvasRenderCallbacks.push(callback);
    return () => {
      this.canvasRenderCallbacks = this.canvasRenderCallbacks.filter((cb) => cb !== callback);
    };
  }

  clearCanvasMetrics() {
    this.metricsBuffer = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function initPerformanceMonitoring() {
  performanceMonitor.init();
}
