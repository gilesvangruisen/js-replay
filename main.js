function recordCall(name, result) {
  const trace = {
    time: window.__native.Date.now(),
    name,
    result
  }

  const traces = window.__logs

  if (traces) {
    window.__logs = traces.concat([trace])
  } else {
    window.__logs = [trace]
  }
}

function traceCalls(target, name) {
  return new Proxy(target, {
    apply: function(target, thisArg, argumentsList) {
      window.__native[name] = target

      const result = target.apply(thisArg, argumentsList)

      recordCall(name, result)

      return result
    }
  });
}

function tracePropertyCalls(obj, name) {
  return new Proxy(obj, {
    construct: function(target, argumentsList) {
      window.__native[name] = target

      const result = new target(...argumentsList)

      recordCall(name, result)

      return result
    },
    get: function(target, propertyKey) {
      if (typeof target[propertyKey] === 'function') {
        return traceCalls(target[propertyKey], `${name}.${propertyKey}`)
      } else {
        const result = target[propertyKey]
        recordCall(`${name}.${propertyKey}`, result)

        return result
      }
    }
  })
}

function simulateResults(target, name) {
  return new Proxy(target, {
    apply: function(target, thisArg, argumentsList) {
      return window.__logs.shift().result
    }
  })
}

function simulatePropertyResults(obj, name) {
  return new Proxy(obj, {
    construct: function(target, argumentsList) {
      return window.__logs.shift().result
    },
    get: function(target, propertyKey) {
      if (typeof target[propertyKey] !== 'function') {
        return window.__logs.shift().result
      } else {
        return function() {
          return window.__logs.shift().result
        }
      }
    }
  })
}

function startRecording() {
  window.__logs = []
  window.__events = []
  window.__native = {}

  window.Date = tracePropertyCalls(Date, 'Date')
  Math.random = traceCalls(Math.random, 'Math.random')
}

function stopRecording() {
  const traces = window.__logs

  return traces
}

function polyfill(log) {
  window.__logs = log

  window.Date = simulatePropertyResults(Date, 'Date')
  Math.random = simulateResults(Math.random, 'Math.random')
}

function runProgram() {
  console.log(new Date());
  console.log(new Date(2012, 1, 1));

  setTimeout(() => {
    console.log('timeout 2!')
  }, 500);

  setTimeout(() => {
    console.log('timeout 1!');
  }, 100);

  console.log(new Date());

  console.log('====')
  console.log(Date.now());
  console.log(Math.random());
}

startRecording()

runProgram()

$('#iframe').contents().find('body').append($('<script>').html(`
  ${String(simulateResults)}
  ${String(simulatePropertyResults)}
  ${String(polyfill)}
  ${String(runProgram)}

  onmessage = e => {
    var log = e.data;

    polyfill(log);

    runProgram();
  };
`));

var log;

setInterval(function() {
  console.log('REPLAY')

  log = log || stopRecording()

  document.getElementById('iframe').contentWindow.postMessage(log, '*');
}, 3000)

