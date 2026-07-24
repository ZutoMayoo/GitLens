/**
 * Interactive timeline visualization using D3.js.
 * Renders commit clusters along a horizontal time axis.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { AnalysisResult, CommitGroup } from '@gitlens/engine';
import ClusterCard from './ClusterCard';

interface TimelineProps {
  result: AnalysisResult;
  nowLabel?: string;
}

interface TimelineNode {
  group: CommitGroup;
  x: number;
  y: number;
  radius: number;
  color: string;
}

export default function Timeline({ result, nowLabel = 'NOW' }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<CommitGroup | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  const groups = result.groups || [];
  const commits = result.commits || [];

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || groups.length === 0) return;

    const container = containerRef.current;
    const width = Math.max(container.clientWidth, groups.length * 100);
    const height = 280;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Scales
    const timeExtent = d3.extent(groups, (g) => g.startDate) as [Date, Date];
    const xScale = d3
      .scaleTime()
      .domain(timeExtent)
      .range([80, width - 40]);

    // Color scale based on group size
    const maxCommits = d3.max(groups, (g) => g.commitHashes.length) || 1;
    const radiusScale = d3
      .scaleSqrt()
      .domain([1, maxCommits])
      .range([6, 32]);

    const colorScale = d3
      .scaleSequential(d3.interpolateViridis)
      .domain([0, maxCommits]);

    // Reserve top 55px for the time axis to avoid overlapping with nodes
    const axisY = 45;

    const axisGroup = svg.append('g').attr('class', 'time-axis');

    const xAxis = d3.axisTop(xScale)
      .ticks(Math.min(groups.length, 20))
      .tickFormat(d3.timeFormat('%b %d, %Y') as any);

    axisGroup
      .attr('transform', `translate(0, ${axisY})`)
      .call(xAxis)
      .call((g) => {
        g.selectAll('.tick text')
          .attr('fill', '#6b7280')
          .attr('font-size', '11px')
          .attr('font-family', 'Inter, system-ui, sans-serif');
        g.selectAll('.tick line').attr('stroke', '#374151');
        g.select('.domain').attr('stroke', '#374151');
      });

    // Draw axis line (center timeline)
    const centerY = (height - axisY) / 2 + axisY;
    svg
      .append('line')
      .attr('x1', 60)
      .attr('x2', width - 20)
      .attr('y1', centerY)
      .attr('y2', centerY)
      .attr('stroke', '#374151')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4 4');

    // Draw group nodes
    const nodes: TimelineNode[] = groups.map((group, i) => ({
      group,
      x: xScale(group.startDate),
      y: centerY + (i % 2 === 0 ? -50 : 50) - (i % 3) * 8,
      radius: radiusScale(group.commitHashes.length),
      color: colorScale(group.commitHashes.length),
    }));

    // Connector lines
    nodes.forEach((node) => {
      svg
        .append('line')
        .attr('x1', node.x)
        .attr('y1', centerY)
        .attr('x2', node.x)
        .attr('y2', node.y)
        .attr('stroke', '#374151')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3 2')
        .attr('opacity', 0.5);
    });

    // Circles
    const nodeGroup = svg
      .selectAll('.group-node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'group-node')
      .style('cursor', 'pointer');

    nodeGroup
      .append('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#1f2937')
      .attr('stroke-width', 2)
      .attr('opacity', 0.85)
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 1)
          .attr('stroke', '#818cf8')
          .attr('stroke-width', 3);

        const rect = container.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          content: `${d.group.label}\n${d.group.commitHashes.length} commits`,
        });
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', 0.85)
          .attr('stroke', '#1f2937')
          .attr('stroke-width', 2);
        setTooltip((prev) => ({ ...prev, visible: false }));
      })
      .on('click', (_event, d) => {
        setSelectedGroup(d.group);
      });

    // Labels for larger groups
    nodeGroup
      .filter((d) => d.group.commitHashes.length >= 3)
      .append('text')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y - (d.radius + 14))
      .attr('text-anchor', 'middle')
      .attr('fill', '#9ca3af')
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .text((d) => {
        const label = d.group.keywords.slice(0, 2).join('·');
        return label.length > 20 ? label.slice(0, 20) + '…' : label;
      });

    // Now marker — placed above the axis labels to avoid overlap
    const nowX = xScale(new Date());
    if (nowX < width - 40 && nowX > 80) {
      // Vertical dashed line
      svg
        .append('line')
        .attr('x1', nowX)
        .attr('x2', nowX)
        .attr('y1', axisY + 10)
        .attr('y2', height - 5)
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6 3')
        .attr('opacity', 0.6);

      // NOW label — above the axis, in the top margin
      // Add a small background rect to ensure it's readable over grid lines
      svg
        .append('rect')
        .attr('x', nowX - 18)
        .attr('y', 1)
        .attr('width', 36)
        .attr('height', 18)
        .attr('rx', 4)
        .attr('fill', '#1f2937')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1)
        .attr('opacity', 0.9);

      svg
        .append('text')
        .attr('x', nowX)
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f59e0b')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .text(nowLabel);
    }
  }, [groups, nowLabel]);

  if (groups.length === 0) {
    return (
      <div className="glass-panel p-8 text-center text-gray-500">
        No commit groups to display
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="timeline-scroll overflow-x-auto">
        <svg ref={svgRef} className="min-w-full" />
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="tooltip visible"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* Selected group detail card */}
      {selectedGroup && (
        <ClusterCard
          group={selectedGroup}
          commits={commits}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  );
}
