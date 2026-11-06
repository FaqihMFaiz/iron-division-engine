/* ==========================================================================
   IRON DIVISION ENGINE — SYSTEM ERROR LOGGING & DIAGNOSTICS
   File: js/diagnostics.js
   ========================================================================== */
window.IronDivision = window.IronDivision || {};

(function (ID) {
  'use strict';

  function logSystemError(context, error) {
    console.error(`[Iron Division Diagnostic: ${context}]`, error);
    const errMsg = error ? (error.message || String(error)) : 'Unknown exception';
    const logText = `🚨 [CRITICAL ERROR: ${context}] ${errMsg} (Check Developer Console for full stack trace)`;

    if (ID.Helpers && typeof ID.Helpers.addLog === 'function') {
      ID.Helpers.addLog('error', logText);
    }

    if (ID.Helpers && typeof ID.Helpers.showToast === 'function') {
      ID.Helpers.showToast(`🚨 System Error: ${errMsg}`, 'danger');
    }

    if (ID.state) {
      if (!ID.state.systemErrors) ID.state.systemErrors = [];
      ID.state.systemErrors.push({
        time: new Date().toLocaleTimeString(),
        round: ID.state.battle ? ID.state.battle.round : 0,
        context: context,
        message: errMsg,
        stack: error?.stack || 'No stack trace available'
      });
    }
  }

  // Global uncaught exception traps
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    logSystemError(`Uncaught Script Error (Line ${lineNo}:${columnNo})`, error || msg);
    if (ID.UI && typeof ID.UI.renderCombatLog === 'function') {
      ID.UI.renderCombatLog();
    }
    return false;
  };

  window.addEventListener('unhandledrejection', function (event) {
    logSystemError('Unhandled Promise Rejection', event.reason);
    if (ID.UI && typeof ID.UI.renderCombatLog === 'function') {
      ID.UI.renderCombatLog();
    }
  });

  ID.Diagnostics = {
    logSystemError
  };

})(window.IronDivision);