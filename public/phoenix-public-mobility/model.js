export const BASELINE = Object.freeze({
  regionalDailyVmt: 130_000_000,
  householdVehicles: 3_696_062,
  personalTrafficShare: 0.82,
  privateVehicleOccupancy: 1.52,
  operatingDays: 365,
  spareRatio: 0.15,
  infrastructureRate: 0.30,
  administrationRate: 0.15
});

export const VEHICLE_CLASSES = Object.freeze([
  { id: "car", label: "Waymo-scale car", capacity: 4, share: 0.45, occupancy: 1.8, emptyMiles: 0.22, dailyMiles: 220, unitCost: 160_000, operatingCostPerMile: 0.80 },
  { id: "van", label: "Shared autonomous van", capacity: 8, share: 0.35, occupancy: 5, emptyMiles: 0.15, dailyMiles: 190, unitCost: 260_000, operatingCostPerMile: 1.20 },
  { id: "bus", label: "Neighborhood autonomous bus", capacity: 24, share: 0.20, occupancy: 14, emptyMiles: 0.08, dailyMiles: 160, unitCost: 850_000, operatingCostPerMile: 2.40 }
]);

export const OD_ZONES = Object.freeze([
  { id: "west", label: "West Valley", originShare: 0.18, destinationShare: 0.10 },
  { id: "north", label: "North / Northwest", originShare: 0.14, destinationShare: 0.10 },
  { id: "central", label: "Central Phoenix", originShare: 0.16, destinationShare: 0.30 },
  { id: "northeast", label: "Scottsdale / Northeast", originShare: 0.12, destinationShare: 0.16 },
  { id: "east", label: "East Valley", originShare: 0.27, destinationShare: 0.22 },
  { id: "south", label: "South / Southwest", originShare: 0.13, destinationShare: 0.12 }
]);

export const TRANSIT_BENCHMARKS = Object.freeze([
  {
    id: "brt", label: "Dedicated-lane BRT", capitalPerMileMin: 17_700_000,
    capitalPerMileMax: 34_400_000, operatingCostPerPassengerMile: 2.13,
    basis: "Recent FTA Federal Boulevard and Wake Western Corridor projects",
    use: "A broad frequent grid with stations, priority and dedicated lanes"
  },
  {
    id: "lightRail", label: "Phoenix light rail", capitalPerMileMin: 244_600_000,
    capitalPerMileMax: 250_900_000, operatingCostPerPassengerMile: 1.95,
    basis: "South Central/Downtown Hub and Northwest Phase II approved budgets",
    use: "Durable high-capacity corridors connecting major activity centers"
  },
  {
    id: "subway", label: "Tunneled heavy rail", capitalPerMileMin: 2_090_000_000,
    capitalPerMileMax: 4_375_000_000, operatingCostPerPassengerMile: 0.84,
    basis: "FTA BART Silicon Valley II and Second Avenue Subway II estimates",
    use: "Very high peak capacity where surface rights-of-way cannot provide it"
  }
]);

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

export function calculateScenario(options = {}) {
  const replacementRate = clamp(options.replacementRate ?? 0.80, 0, 1);
  const emptyMilesFactor = clamp(options.emptyMilesFactor ?? 1, 0, 3);
  const farePerPassengerMile = clamp(options.farePerPassengerMile ?? 0.25, 0, 5);
  const suppliedShares = options.shares || {};
  const rawShares = VEHICLE_CLASSES.map((vehicle) => clamp(suppliedShares[vehicle.id] ?? vehicle.share, 0, 1));
  const shareTotal = rawShares.reduce((sum, share) => sum + share, 0) || 1;
  const classes = VEHICLE_CLASSES.map((vehicle, index) => ({ ...vehicle, share: rawShares[index] / shareTotal }));
  const eligibleDailyVmt = BASELINE.regionalDailyVmt * BASELINE.personalTrafficShare;
  const displacedDailyVmt = eligibleDailyVmt * replacementRate;
  const shiftedPassengerMiles = displacedDailyVmt * BASELINE.privateVehicleOccupancy;

  const fleet = classes.map((vehicle) => {
    const passengerMiles = shiftedPassengerMiles * vehicle.share;
    const loadedMiles = passengerMiles / vehicle.occupancy;
    const emptyMilesRate = clamp(vehicle.emptyMiles * emptyMilesFactor, 0, 0.75);
    const dailyFleetMiles = loadedMiles * (1 + emptyMilesRate);
    const vehiclesInService = dailyFleetMiles / vehicle.dailyMiles;
    const vehiclesOwned = Math.ceil(vehiclesInService / (1 - BASELINE.spareRatio));
    const vehicleCapital = vehiclesOwned * vehicle.unitCost;
    const annualFleetMiles = dailyFleetMiles * BASELINE.operatingDays;
    return {
      ...vehicle,
      passengerMiles,
      loadedMiles,
      emptyMilesRate,
      dailyFleetMiles,
      vehiclesOwned,
      vehicleCapital,
      annualFleetMiles,
      annualOperatingCost: annualFleetMiles * vehicle.operatingCostPerMile
    };
  });

  const dailyFleetMiles = fleet.reduce((sum, vehicle) => sum + vehicle.dailyFleetMiles, 0);
  const vehicleCapital = fleet.reduce((sum, vehicle) => sum + vehicle.vehicleCapital, 0);
  const infrastructureCapital = vehicleCapital * BASELINE.infrastructureRate;
  const initialCapital = vehicleCapital + infrastructureCapital;
  const directOperatingCost = fleet.reduce((sum, vehicle) => sum + vehicle.annualOperatingCost, 0);
  const annualOperatingCost = directOperatingCost * (1 + BASELINE.administrationRate);
  const annualPassengerMiles = shiftedPassengerMiles * BASELINE.operatingDays;
  const annualFareRevenue = annualPassengerMiles * farePerPassengerMile;
  const annualNetSubsidy = annualOperatingCost - annualFareRevenue;
  const newRegionalDailyVmt = BASELINE.regionalDailyVmt - displacedDailyVmt + dailyFleetMiles;
  const regionalVmtChange = (newRegionalDailyVmt / BASELINE.regionalDailyVmt) - 1;
  const unpooledFleetMiles = displacedDailyVmt * 1.25;
  const highPoolingFleetMiles = (shiftedPassengerMiles / 5) * 1.08;

  return {
    replacementRate,
    emptyMilesFactor,
    farePerPassengerMile,
    eligibleDailyVmt,
    displacedDailyVmt,
    shiftedPassengerMiles,
    dailyFleetMiles,
    newRegionalDailyVmt,
    regionalVmtChange,
    initialCapital,
    vehicleCapital,
    infrastructureCapital,
    annualOperatingCost,
    annualFareRevenue,
    annualNetSubsidy,
    annualPassengerMiles,
    operatingCostPerPassengerMile: annualOperatingCost / annualPassengerMiles,
    fleet,
    trafficCases: {
      unpooled: ((BASELINE.regionalDailyVmt - displacedDailyVmt + unpooledFleetMiles) / BASELINE.regionalDailyVmt) - 1,
      modeled: regionalVmtChange,
      highPooling: ((BASELINE.regionalDailyVmt - displacedDailyVmt + highPoolingFleetMiles) / BASELINE.regionalDailyVmt) - 1
    }
  };
}

export function calculatePeakScenario(scenario = calculateScenario(), options = {}) {
  const peakHourShare = clamp(options.peakHourShare ?? 0.10, 0.01, 0.30);
  const averageTripMiles = clamp(options.averageTripMiles ?? 9.5, 2, 30);
  const cycleMinutes = clamp(options.cycleMinutes ?? 34, 10, 120);
  const dailyPassengerTrips = scenario.shiftedPassengerMiles / averageTripMiles;
  const peakPassengerTrips = dailyPassengerTrips * peakHourShare;
  const peakVehicleTrips = scenario.fleet.reduce(
    (sum, vehicle) => sum + (peakPassengerTrips * vehicle.share / vehicle.occupancy),
    0
  );
  const directionalImbalance = OD_ZONES.reduce(
    (sum, zone) => sum + Math.abs(zone.originShare - zone.destinationShare),
    0
  ) / 2;
  const simultaneousVehicles = peakVehicleTrips * (cycleMinutes / 60);
  const peakVehiclesInService = simultaneousVehicles * (1 + directionalImbalance);
  const peakFleetOwned = Math.ceil(peakVehiclesInService / (1 - BASELINE.spareRatio));
  const dailyFleetOwned = scenario.fleet.reduce((sum, vehicle) => sum + vehicle.vehiclesOwned, 0);
  const governingFleetOwned = Math.max(dailyFleetOwned, peakFleetOwned);
  const peakAdjustedCapital = scenario.initialCapital * (governingFleetOwned / dailyFleetOwned);

  return {
    peakHourShare,
    averageTripMiles,
    cycleMinutes,
    dailyPassengerTrips,
    peakPassengerTrips,
    peakVehicleTrips,
    directionalImbalance,
    simultaneousVehicles,
    peakFleetOwned,
    dailyFleetOwned,
    governingFleetOwned,
    peakAdjustedCapital,
    householdFleetShare: governingFleetOwned / BASELINE.householdVehicles,
    zones: OD_ZONES
  };
}

export function calculateTransitComparisons(capital) {
  const availableCapital = Math.max(0, Number(capital) || 0);
  return TRANSIT_BENCHMARKS.map((benchmark) => ({
    ...benchmark,
    routeMilesMin: availableCapital / benchmark.capitalPerMileMax,
    routeMilesMax: availableCapital / benchmark.capitalPerMileMin
  }));
}
