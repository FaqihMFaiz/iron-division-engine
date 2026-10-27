/* ==========================================================================
   IRON DIVISION ENGINE — SYSTEM ERROR LOGGING & DIAGNOSTICS
   File: js/diagnostics.js
   ========================================================================== */

/**
 * Logs a system-level error to console, combat log, and runtime diagnostic history.
 * @param {string} context - The operational subsystem where the error occurred
 * @param {Error|string} error - The caught exception or error message
 */
function logSystemError(context, error) {
  console.error(`[Iron Division Diagnostic: ${context}]`, error);
  const errMsg = error ? (error.message || String(error)) : 'Unknown exception';
  const logText = `🚨 [CRITICAL ERROR: ${context}] ${errMsg} (Check Developer Console for full stack trace)`;

  // Add to active combat log if logger exists
  if (typeof addLog === 'function') {
    addLog('error', logText);
  }

  // Display user-facing notification if toast engine is loaded
  if (typeof showToast === 'function') {
    showToast(`🚨 System Error: ${errMsg}`, 'danger');
  }

  // Append to persistent runtime diagnostic registry
  if (typeof state !== 'undefined') {
    if (!state.systemErrors) state.systemErrors = [];
    state.systemErrors.push({
      time: new Date().toLocaleTimeString(),
      round: state.battle ? state.battle.round : 0,
      context: context,
      message: errMsg,
      stack: error?.stack || 'No stack trace available'
    });
  }
}

// Global uncaught exception listener (catches syntax/runtime crashes in browser)
window.onerror = function (msg, url, lineNo, columnNo, error) {
  logSystemError(`Uncaught Script Error (Line ${lineNo}:${columnNo})`, error || msg);
  if (typeof renderCombatLog === 'function') {
    renderCombatLog();
  }
  return false;
};

// Global unhandled promise rejection listener
window.addEventListener('unhandledrejection', function (event) {
  logSystemError('Unhandled Promise Rejection', event.reason);
  if (typeof renderCombatLog === 'function') {
    renderCombatLog();
  }
});