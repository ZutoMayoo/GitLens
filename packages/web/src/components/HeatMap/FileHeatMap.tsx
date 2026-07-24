/**
 * File change heatmap — D3 treemap showing which files/modules
 * change most frequently across the repository's history.
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { HeatmapEntry } from '@gitlens/engine';
import { useT } from '../../hooks/useLanguage';

interface FileHeatMapProps {
  entries: HeatmapEntry[];
}

export default function FileHeatMap({ entries }: FileHeatMapProps) {
  const t = useT();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<HeatmapEntry | null>(null);

  useEffect(() => {
    if (!svgRef.current || entries.length === 0) return;

    const width = containerRef.current?.clientWidth || 700;
    const height = 400;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Prepare hierarchical data
    const rootData: any = {
      name: 'root',
      children: entries.map((e) => ({
        name: e.path,
        value: e.changeCount,
        additions: e.additions,
        deletions: e.deletions,
        original: e,
      })),
    };

    const root = d3
      .hierarchy(rootData)
      .sum((d: any) => d.value || 0)
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

    d3.treemap<any>().size([width, height]).padding(3).round(true)(root);

    // Color scale
    const maxVal = d3.max(root.leaves(), (d: any) => d.data.value) || 1;
    const colorScale = d3
      .scaleSequential(d3.interpolateYlOrRd)
      .domain([0, maxVal]);

    // Draw cells
    const cell = svg
      .selectAll('g')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr(
        'transform',
        (d: any) => `translate(${d.x0},${d.y0})`
      );

    cell
      .append('rect')
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('fill', (d: any) => colorScale(d.data.value))
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .attr('opacity', 0.85)
      .on('mouseenter', function (_event, d: any) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('opacity', 1)
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 2);
        setHoveredCell(d.data.original);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(100)
          .attr('opacity', 0.85)
          .attr('stroke', '#1f2937')
          .attr('stroke-width', 1);
        setHoveredCell(null);
      });

    // Labels for cells with enough space
    cell
      .filter((d: any) => d.x1 - d.x0 > 60 && d.y1 - d.y0 > 20)
      .append('text')
      .attr('x', 4)
      .attr('y', 14)
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('opacity', 0.9)
      .text((d: any) => {
        const name = d.data.name.split('/').pop() || d.data.name;
        return name.length > 20 ? name.slice(0, 18) + '…' : name;
      });

    // Change count labels
    cell
      .filter((d: any) => d.x1 - d.x0 > 40 && d.y1 - d.y0 > 30)
      .append('text')
      .attr('x', 4)
      .attr('y', 28)
      .attr('fill', 'rgba(255,255,255,0.6)')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text((d: any) => `${d.data.value}×`);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="glass-panel p-8 text-center text-gray-500">
        {t('heatmap.noData')}
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef}>
        <svg ref={svgRef} className="w-full" />
      </div>

      {/* Hover tooltip */}
      {hoveredCell && (
        <div className="absolute bottom-4 left-4 glass-card text-xs space-y-1 max-w-xs">
          <div className="font-mono text-gray-300 font-medium truncate">
            {hoveredCell.path}
          </div>
          <div className="flex gap-3 text-gray-500">
            <span>{hoveredCell.changeCount} changes</span>
            <span className="text-green-400">+{hoveredCell.additions}</span>
            <span className="text-red-400">-{hoveredCell.deletions}</span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end text-xs text-gray-500 dark:text-gray-600">
        <span>{t('heatmap.low')}</span>
        <div className="flex h-3 rounded overflow-hidden">
          {d3.range(10).map((i) => (
            <div
              key={i}
              className="w-4 h-3"
              style={{
                backgroundColor: d3.interpolateYlOrRd(i / 9),
              }}
            />
          ))}
        </div>
        <span>{t('heatmap.high')}</span>
      </div>
    </div>
  );
}
