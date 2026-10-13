const classSizes = [50, 100, 200];
const activeInterval = { minimum: 5.5, maximum: 8, average: 6.75 };
const hiddenInterval = { minimum: 20, maximum: 30, average: 25 };

function callsPerSecond(students, seconds) {
  return Number((students / seconds).toFixed(2));
}

const report = classSizes.map((students) => ({
  students,
  activeAverageRequestsPerSecond: callsPerSecond(students, activeInterval.average),
  activeUpperBoundRequestsPerSecond: callsPerSecond(students, activeInterval.minimum),
  hiddenAverageRequestsPerSecond: callsPerSecond(students, hiddenInterval.average),
  hiddenUpperBoundRequestsPerSecond: callsPerSecond(students, hiddenInterval.minimum),
}));

console.table(report);
console.log("Intervals: active 5.5-8s with jitter; hidden 20-30s with jitter.");
console.log("These are deterministic request-frequency bounds, not measured production latency.");
console.log("Response latency, database connection usage, and lock waits require Supabase production telemetry; no values are inferred here.");
