## JS Replay

This is an initial implementation of a "JS Replay" system that can be used to
essentially "record" the execution of some JavaScript such that it can be
subsequently "replay" and remain identical from an observation standpoint. In
other words, we should be able to re-evaluate the original execution of a
function a potentially infinite number of times in a deterministic manner.

### Overview

In order to do so, we need to first define and understand the sources of
potential non-determinism in the execution of a JavaScript function, that is to
say, contextual factors or "inputs" that may be outside the control of the
program itself. `Date`, `Math.random`, user input, network calls, and native
APIs are all sources of potential non-determinism. So, in order to be able to
replay our JavaScript in a deterministic manner, we need to "record" these
sources and their changes over time during the initial execution, and serialize
them in such a way that we can simulate their effects later when we "replay" our
function (and potentially persist them or send them over the network).

Because there are so many of these sources of non-determinism, there is a
varying breadth with which this problem could be solved, to cover different
APIs, potential edge cases, native calls, etc.

As such, I decided to focus on an implementation that could generically record
and simulate a series of calls, ultimately applying it initially to `Date` and
`Math.random`. Following that, I began to take a stab at recording and
simulating events.

We use the `Proxy` object heavily in this implementation, to be able to
intercept calls to log their resulting values during recording as well to
simulate or "stub" those calls later during replay. This could be extended
further to take advantage of yet more Proxy handlers, but for now this initial
implementation uses the `construct`, `get`, and `apply` handlers to intercept
constructors, getters, and function applications, respectively.

### Next steps

To extend this solution, we could snapshot more global context or application
state during each event log, such as the DOM tree or other resulting
side-effects, to be able to paint a more accurate picture during simulation.

We can also record user input and other browser events. We first need to record
the start time of the JavaScript executin so we can replay the properly later at
full-speed. We could similarly use Proxy objects to intercept applications of
`addEventListener` or definitions of handlers like `onclick`. We'd then be able
to record each events the application cares about as it happens, along with its
target, a time, and any other data associated with the event. Then, to "replay"
those events, we'd have to set up a handful of timeouts upon beginning replay,
delaying each event by the difference between its recorded time and the initial
execution's start time (perhaps also accounting for execution time).

This kind of architecture lends itself toward a very basic method of
"time-travel debugging", allowing the user to scrub between events and changes
in global context or application state. However, short of being able to
introspect the JavaScript runtime within itself and recording snapshots of the
heap, we can't really step through an application's execution with as much
precision as you can in something like Chrome's developer tools.

We could also improve our method of saving the native functionality so that we
can both a) use it internally during the recording process without recording
extraneous events, and b) restore or "unwrap" our original non-Proxied
functionality upon stopping recording. To do this most flexibly and reliably, we
can use something like the `Reflect` object.

This implementation could also use some cleanup and file and/or class structure
to consolidate related recording and playback functionality, respectively.

### Downsides

There are definitely downsides with a client-side solution like this. The
biggest is that we need to define all of our sources of non-determinism to
record them. Compared to snapshotting the heap, this is a tedious manual task
that could take a while, and we may discover sources that require a different
approach to recording compared to logging calls and events.

Another is that, as mentioned, we don't really have the ability to step through
a JavaScript application, so we're mostly limited to "replaying" the session in
real-time.

That said, this architecture is comparitively very lean in terms of its effect
on performance and the size of data that it records, because we can track only
what we care about, and at a much higher-level without worrying too much about
lower-level implementation details of certain native functionality. This makes
sure we can easily send these serialized logs and events easily, without a ton
of bandwidth. By using `Proxy` to  define our interceptions closer to the call
site, we ensure the client is not working too hard to wrap or redefine functions
that won't ever be used. This all also ensures that this kind of recording
mechanism can be embedded in clientside applications and replayed elsewhere,
rather than something Chrome developer tools which leans more heavily on the
browser's JavaScript runtime for introspection. (power/detail vs.
performance/flexibility)

Browser support might also become an issue due to the compatibility of the
`Proxy` object.

