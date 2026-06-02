// Live timer Web Worker — accurate ticking even when the host tab is throttled.
// iOS Safari reduces setInterval resolution when backgrounded. A dedicated Worker
// with its own event loop ticks accurately regardless of visibility state.

let intervalId = null;

self.onmessage = function(e) {
  if (e.data.type === 'start') {
    if (intervalId) clearInterval(intervalId);
    self.postMessage({ type: 'tick', now: Date.now() });
    intervalId = setInterval(function() {
      self.postMessage({ type: 'tick', now: Date.now() });
    }, 1000);
  } else if (e.data.type === 'stop') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};