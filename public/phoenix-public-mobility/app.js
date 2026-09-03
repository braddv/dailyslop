import { BASELINE, VEHICLE_CLASSES, calculatePeakScenario, calculateScenario, calculateTransitComparisons } from "./model.js";

const controls = {
  replacementRate: document.querySelector("#replacementRate"), carShare: document.querySelector("#carShare"),
  vanShare: document.querySelector("#vanShare"), busShare: document.querySelector("#busShare"),
  emptyMilesFactor: document.querySelector("#emptyMilesFactor"), fare: document.querySelector("#fare"),
  peakHourShare: document.querySelector("#peakHourShare"), averageTripMiles: document.querySelector("#averageTripMiles"),
  cycleMinutes: document.querySelector("#cycleMinutes")
};
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function compactMoney(value) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 1e12) return `${sign}$${number.format(absolute / 1e12)}T`;
  if (absolute >= 1e9) return `${sign}$${number.format(absolute / 1e9)}B`;
  if (absolute >= 1e6) return `${sign}$${number.format(absolute / 1e6)}M`;
  return money.format(value);
}
function compactNumber(value) {
  if (value >= 1e6) return `${number.format(value / 1e6)}M`;
  if (value >= 1e3) return `${number.format(value / 1e3)}K`;
  return number.format(value);
}
function signedPercent(value) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value * 100).toFixed(1)}%`;
}
function inputScenario() {
  return calculateScenario({
    replacementRate: Number(controls.replacementRate.value) / 100,
    emptyMilesFactor: Number(controls.emptyMilesFactor.value) / 100,
    farePerPassengerMile: Number(controls.fare.value),
    shares: { car: Number(controls.carShare.value) / 100, van: Number(controls.vanShare.value) / 100, bus: Number(controls.busShare.value) / 100 }
  });
}
function renderFleet(scenario) {
  document.querySelector("#fleetRows").innerHTML = scenario.fleet.map((vehicle) => `
    <div class="fleet-row">
      <div><span>${vehicle.capacity} seats</span><strong>${vehicle.label}</strong></div>
      <div><span>Demand share</span><strong>${Math.round(vehicle.share * 100)}%</strong></div>
      <div><span>Average occupied load</span><strong>${vehicle.occupancy}</strong></div>
      <div><span>Fleet owned</span><strong>${compactNumber(vehicle.vehiclesOwned)}</strong></div>
      <div><span>Vehicle capital</span><strong>${compactMoney(vehicle.vehicleCapital)}</strong></div>
      <div><span>Annual operations</span><strong>${compactMoney(vehicle.annualOperatingCost)}</strong></div>
    </div>`).join("");
}
function renderTraffic(scenario) {
  const cases = [
    ["Private robotaxis", "No pooling · 25% empty miles", scenario.trafficCases.unpooled],
    ["Designed public mix", "Cars + pooled vans + neighborhood buses", scenario.trafficCases.modeled],
    ["High-pooling benchmark", "Average load 5 · 8% empty miles", scenario.trafficCases.highPooling]
  ];
  document.querySelector("#trafficCases").innerHTML = cases.map(([name, note, change]) => {
    const width = Math.min(100, Math.max(3, 50 + (change * 100)));
    return `<article class="traffic-case ${change <= 0 ? "reduction" : "increase"}"><div><strong>${name}</strong><span>${note}</span></div><b>${signedPercent(change)}</b><i><em style="width:${width}%"></em></i></article>`;
  }).join("");
}
function renderPeak(scenario) {
  const peak = calculatePeakScenario(scenario, {
    peakHourShare: Number(controls.peakHourShare.value) / 100,
    averageTripMiles: Number(controls.averageTripMiles.value),
    cycleMinutes: Number(controls.cycleMinutes.value)
  });
  document.querySelector("#peakHourShareValue").textContent = `${Math.round(peak.peakHourShare * 100)}%`;
  document.querySelector("#averageTripMilesValue").textContent = `${number.format(peak.averageTripMiles)} miles`;
  document.querySelector("#cycleMinutesValue").textContent = `${Math.round(peak.cycleMinutes)} minutes`;
  document.querySelector("#dailyFleetRequirement").textContent = compactNumber(peak.dailyFleetOwned);
  document.querySelector("#peakFleetRequirement").textContent = compactNumber(peak.peakFleetOwned);
  document.querySelector("#governingFleetRequirement").textContent = compactNumber(peak.governingFleetOwned);
  document.querySelector("#peakCapitalRequirement").textContent = compactMoney(peak.peakAdjustedCapital);
  document.querySelector("#governingFleetComparison").textContent = `About ${(peak.householdFleetShare * 100).toFixed(1)}% of today’s household vehicles; ${peak.peakFleetOwned > peak.dailyFleetOwned ? "the peak hour governs" : "daily utilization governs"}.`;
  document.querySelector("#imbalanceOutput").textContent = `${Math.round(peak.directionalImbalance * 100)}% directional imbalance.`;
  document.querySelector("#odRows").innerHTML = peak.zones.map((zone) => {
    const pressure = zone.destinationShare - zone.originShare;
    const pressureLabel = pressure > 0 ? `+${Math.round(pressure * 100)} pts receiving` : pressure < 0 ? `${Math.round(pressure * 100)} pts sending` : "balanced";
    return `<div class="od-row">
      <strong>${zone.label}</strong>
      <div><i style="width:${zone.originShare * 300}%"></i><span>${Math.round(zone.originShare * 100)}%</span></div>
      <div><i style="width:${zone.destinationShare * 300}%"></i><span>${Math.round(zone.destinationShare * 100)}%</span></div>
      <b class="${pressure > 0 ? "receiving" : "sending"}">${pressureLabel}</b>
    </div>`;
  }).join("");
  renderAlternatives(scenario, peak);
}
function renderAlternatives(scenario, peak) {
  const comparisons = calculateTransitComparisons(peak.peakAdjustedCapital);
  document.querySelector("#comparisonBudget").textContent = `about ${compactMoney(peak.peakAdjustedCapital)}`;
  document.querySelector("#alternativeCards").innerHTML = comparisons.map((item) => `
    <article>
      <span>${item.label}</span>
      <strong>${number.format(item.routeMilesMin)}–${number.format(item.routeMilesMax)} <small>route-mi</small></strong>
      <p>${item.use}</p>
      <i>${item.basis} · ${compactMoney(item.capitalPerMileMin)}–${compactMoney(item.capitalPerMileMax)} per mile</i>
    </article>`).join("");
  const operatingModes = [
    { label: "Modeled autonomous mix", value: scenario.operatingCostPerPassengerMile, note: "Concept assumption" },
    ...comparisons.map((item) => ({ label: item.label, value: item.operatingCostPerPassengerMile, note: "FTA 2023 observed" }))
  ];
  const maximum = Math.max(...operatingModes.map((mode) => mode.value));
  document.querySelector("#operatingRows").innerHTML = operatingModes.map((mode) => `
    <div><strong>${mode.label}</strong><i><em style="width:${mode.value / maximum * 100}%"></em></i><b>${money.format(mode.value)} / passenger-mi</b><span>${mode.note}</span></div>`).join("");
}
function render() {
  const scenario = inputScenario();
  document.querySelector("#replacementRateValue").textContent = `${Math.round(scenario.replacementRate * 100)}%`;
  document.querySelector("#emptyMilesValue").textContent = `${Math.round(scenario.emptyMilesFactor * 100)}% of defaults`;
  document.querySelector("#fareValue").textContent = `${money.format(scenario.farePerPassengerMile)} / passenger-mile`;
  scenario.fleet.forEach((vehicle) => { document.querySelector(`#${vehicle.id}ShareValue`).textContent = `${Math.round(vehicle.share * 100)}% normalized`; });
  document.querySelector("#capitalOutput").textContent = compactMoney(scenario.initialCapital);
  document.querySelector("#fleetOutput").textContent = compactNumber(scenario.fleet.reduce((sum, item) => sum + item.vehiclesOwned, 0));
  const fleetOwned = scenario.fleet.reduce((sum, item) => sum + item.vehiclesOwned, 0);
  const householdVehiclesPerFleetVehicle = BASELINE.householdVehicles * scenario.replacementRate / fleetOwned;
  document.querySelector("#utilizationRatio").textContent = `${number.format(householdVehiclesPerFleetVehicle)} household vehicles`;
  document.querySelector("#operatingOutput").textContent = `${compactMoney(scenario.annualOperatingCost)} / yr`;
  document.querySelector("#trafficOutput").textContent = signedPercent(scenario.regionalVmtChange);
  document.querySelector("#shiftedOutput").textContent = `${compactNumber(scenario.shiftedPassengerMiles)} passenger-mi / day`;
  document.querySelector("#fleetMilesOutput").textContent = `${compactNumber(scenario.dailyFleetMiles)} fleet-mi / day`;
  document.querySelector("#fareRevenueOutput").textContent = compactMoney(scenario.annualFareRevenue);
  document.querySelector("#subsidyLabel").textContent = scenario.annualNetSubsidy >= 0 ? "NET OPERATING SUPPORT" : "MODELED OPERATING SURPLUS";
  document.querySelector("#subsidyOutput").textContent = compactMoney(scenario.annualNetSubsidy);
  document.querySelector("#costPerPassengerMile").textContent = `${money.format(scenario.operatingCostPerPassengerMile)} / passenger-mi`;
  document.querySelector("#vehicleCapitalOutput").textContent = compactMoney(scenario.vehicleCapital);
  document.querySelector("#infrastructureOutput").textContent = compactMoney(scenario.infrastructureCapital);
  renderFleet(scenario);
  renderTraffic(scenario);
  renderPeak(scenario);
}

Object.values(controls).forEach((control) => control.addEventListener("input", render));
document.querySelector("#resetModel").addEventListener("click", () => {
  controls.replacementRate.value = 80;
  controls.carShare.value = VEHICLE_CLASSES[0].share * 100;
  controls.vanShare.value = VEHICLE_CLASSES[1].share * 100;
  controls.busShare.value = VEHICLE_CLASSES[2].share * 100;
  controls.emptyMilesFactor.value = 100;
  controls.fare.value = 0.25;
  render();
});
document.querySelector("#resetPeakModel").addEventListener("click", () => {
  controls.peakHourShare.value = 10;
  controls.averageTripMiles.value = 9.5;
  controls.cycleMinutes.value = 34;
  render();
});
document.querySelector("#baselineVmt").textContent = `${compactNumber(BASELINE.regionalDailyVmt)} daily regional vehicle-miles`;
render();
