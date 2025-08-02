import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';

export function AnalyticsChart({ data, type = 'line', title, height = 300 }) {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!canvasRef.current || !data?.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size for high DPI displays
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Chart dimensions
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;

    if (type === 'line') {
      drawLineChart(ctx, data, padding, chartWidth, chartHeight);
    } else if (type === 'bar') {
      drawBarChart(ctx, data, padding, chartWidth, chartHeight);
    } else if (type === 'pie') {
      drawPieChart(ctx, data, padding, Math.min(chartWidth, chartHeight));
    }
  }, [data, type]);

  const drawLineChart = (ctx, data, padding, width, height) => {
    if (!data.length) return;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= data.length - 1; i++) {
      const x = padding + (width / (data.length - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + height);
      ctx.stroke();
    }

    // Draw line
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (width / (data.length - 1)) * index;
      const y = padding + height - ((point.value - minValue) / range) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = '#2563eb';
    data.forEach((point, index) => {
      const x = padding + (width / (data.length - 1)) * index;
      const y = padding + height - ((point.value - minValue) / range) * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    
    data.forEach((point, index) => {
      const x = padding + (width / (data.length - 1)) * index;
      const label = formatLabel(point.label);
      ctx.fillText(label, x, padding + height + 20);
    });
  };

  const drawBarChart = (ctx, data, padding, width, height) => {
    if (!data.length) return;

    const maxValue = Math.max(...data.map(d => d.value));
    const barWidth = width / data.length * 0.8;
    const barSpacing = width / data.length * 0.2;

    data.forEach((point, index) => {
      const x = padding + index * (width / data.length) + barSpacing / 2;
      const barHeight = (point.value / maxValue) * height;
      const y = padding + height - barHeight;

      // Draw bar
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(x, y, barWidth, barHeight);

      // Draw label
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(formatLabel(point.label), x + barWidth / 2, padding + height + 20);

      // Draw value
      ctx.fillStyle = '#374151';
      ctx.fillText(point.value.toString(), x + barWidth / 2, y - 5);
    });
  };

  const drawPieChart = (ctx, data, padding, size) => {
    if (!data.length) return;

    const centerX = padding + size / 2;
    const centerY = padding + size / 2;
    const radius = size / 2 - 20;
    const total = data.reduce((sum, d) => sum + d.value, 0);

    let currentAngle = -Math.PI / 2;
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    data.forEach((point, index) => {
      const angle = (point.value / total) * 2 * Math.PI;
      
      // Draw slice
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle);
      ctx.closePath();
      ctx.fill();

      // Draw label
      const labelAngle = currentAngle + angle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
      const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
      
      ctx.fillStyle = '#374151';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(point.label, labelX, labelY);

      currentAngle += angle;
    });
  };

  const formatLabel = (label) => {
    if (typeof label === 'string') return label;
    if (label instanceof Date) {
      return label.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return label.toString();
  };

  const handleMouseMove = (e) => {
    if (!data?.length || type === 'pie') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find nearest data point
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const pointSpacing = chartWidth / (data.length - 1);
    const pointIndex = Math.round((x - padding) / pointSpacing);

    if (pointIndex >= 0 && pointIndex < data.length) {
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        data: data[pointIndex]
      });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div class="analytics-chart">
      {title && <h3 class="chart-title">{title}</h3>}
      <div class="chart-container" style={{ height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ width: '100%', height: '100%' }}
        />
        {tooltip && (
          <div 
            class="chart-tooltip"
            style={{
              position: 'fixed',
              left: `${tooltip.x + 10}px`,
              top: `${tooltip.y - 10}px`,
              pointerEvents: 'none'
            }}
          >
            <div class="tooltip-content">
              <div class="tooltip-label">{formatLabel(tooltip.data.label)}</div>
              <div class="tooltip-value">{tooltip.data.value.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .analytics-chart {
          background: var(--surface);
          border-radius: 12px;
          padding: var(--space-lg);
          border: 1px solid var(--border);
        }

        .chart-title {
          margin: 0 0 var(--space-md) 0;
          color: var(--text-primary);
          font-size: 1.125rem;
          font-weight: 600;
        }

        .chart-container {
          position: relative;
          width: 100%;
        }

        .chart-tooltip {
          z-index: 1000;
        }

        .tooltip-content {
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: var(--space-sm);
          border-radius: 6px;
          font-size: 0.875rem;
          box-shadow: var(--shadow-lg);
        }

        .tooltip-label {
          font-weight: 500;
          margin-bottom: 2px;
        }

        .tooltip-value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--primary);
        }
      `}</style>
    </div>
  );
}