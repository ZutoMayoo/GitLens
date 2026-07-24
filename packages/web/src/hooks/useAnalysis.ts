/**
 * Hook for managing the analysis workflow state.
 */

import { useState, useEffect, useCallback } from 'react';
import { triggerAnalysis, type AnalysisRequest, type AnalysisResponse } from '../lib/api';
import { connectWebSocket, onMessage, type WsMessage } from '../lib/ws';

export interface ProgressState {
  phase: string;
  message: string;
  progress: number;
}

export interface AnalysisState {
  status: 'idle' | 'running' | 'done' | 'error';
  progress: ProgressState | null;
  result: any | null;
  error: string | null;
  analysisId: string | null;
}

/**
 * Revive ISO date strings back to Date objects in the analysis result.
 * JSON serialization turns Date objects into strings — we need to reverse that.
 */
function reviveDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;

  if (Array.isArray(obj)) {
    return obj.map(reviveDates);
  }

  const revived: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Heuristic: fields named "date" or ending with "Date"/"Commit" are likely dates
    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    ) {
      revived[key] = new Date(value);
    } else if (typeof value === 'object') {
      revived[key] = reviveDates(value);
    } else {
      revived[key] = value;
    }
  }
  return revived;
}

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    status: 'idle',
    progress: null,
    result: null,
    error: null,
    analysisId: null,
  });

  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket();
    const unsub = onMessage(handleWsMessage);
    return unsub;
  }, []);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case 'progress':
        setState((prev) => ({
          ...prev,
          status: 'running',
          progress: {
            phase: msg.phase,
            message: msg.message,
            progress: msg.progress,
          },
          analysisId: msg.analysisId,
        }));
        break;

      case 'complete':
        // Only update progress, don't flip status to 'done' —
        // the HTTP response handler owns the status transition
        // to avoid a blank flash when result isn't set yet.
        setState((prev) => ({
          ...prev,
          progress: { phase: 'done', message: 'Analysis complete', progress: 1 },
        }));
        break;

      case 'error':
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: msg.message,
          progress: null,
        }));
        break;
    }
  }, []);

  const startAnalysis = useCallback(async (request: AnalysisRequest) => {
    setState({
      status: 'running',
      progress: { phase: 'starting', message: 'Starting analysis...', progress: 0 },
      result: null,
      error: null,
      analysisId: null,
    });

    try {
      const response: AnalysisResponse = await triggerAnalysis(request);

      // Revive date strings → Date objects before storing
      const revivedResult = response.result ? reviveDates(response.result) : null;

      setState({
        status: 'done',
        progress: { phase: 'done', message: 'Analysis complete', progress: 1 },
        result: revivedResult,
        error: null,
        analysisId: response.analysisId || null,
      });
      return response;
    } catch (err: any) {
      setState({
        status: 'error',
        progress: null,
        result: null,
        error: err.message || 'Unknown error',
        analysisId: null,
      });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      progress: null,
      result: null,
      error: null,
      analysisId: null,
    });
  }, []);

  return { ...state, startAnalysis, reset };
}
