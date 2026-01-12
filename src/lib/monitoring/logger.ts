/**
 * Structured logging for monitoring
 */

type LogLevel = 'info' | 'warn' | 'error';
type LogContext = {
  [key: string]: unknown;
};

export function logEvent(
  level: LogLevel,
  event: string,
  context?: LogContext
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context
  };

  console.log(JSON.stringify(logEntry));
}

export function logRagQuery(context: LogContext) {
  logEvent('info', 'rag_query', {
    ...context,
    component: 'rag'
  });
}

export function logReranking(context: LogContext) {
  logEvent('info', 'reranking', {
    ...context,
    component: 'reranker'
  });
}


