import { calculateKpis } from "./kpi-engine.js";

self.onmessage = (event) => {
  const { records, scope, months } = event.data;
  self.postMessage(calculateKpis(records, scope, months));
};
