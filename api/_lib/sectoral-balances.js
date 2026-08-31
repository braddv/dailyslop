const SERIES = [
  { key: 'private', id: 'W994RC1Q027SBEA', label: 'Private domestic balance' },
  { key: 'government', id: 'AD01RC1Q027SBEA', label: 'Government balance' },
  { key: 'currentAccount', id: 'NETFI', label: 'U.S. current-account balance' },
  { key: 'household', id: 'W996RC1Q027SBEA', label: 'Households and institutions' },
  { key: 'business', id: 'W995RC1Q027SBEA', label: 'Domestic business' },
  { key: 'gdp', id: 'GDP', label: 'Gross domestic product' },
];

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseFredCsv(text, expectedId) {
  const lines = String(text || '').trim().split(/\r?\n/);
  if (lines.length < 2) return new Map();
  const header = lines[0].split(',');
  const valueIndex = Math.max(1, header.findIndex((column) => column.trim() === expectedId));
  const values = new Map();
  lines.slice(1).forEach((line) => {
    if (!line.trim()) return;
    const columns = line.split(',');
    const date = columns[0]?.trim();
    const value = finite(columns[valueIndex]?.trim());
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && value !== null) values.set(date, value);
  });
  return values;
}

function percentOfGdp(value, gdp) {
  if (!Number.isFinite(value) || !Number.isFinite(gdp) || gdp === 0) return null;
  return (value / gdp) * 100;
}

function quarterLabel(date) {
  const [year, month] = date.split('-').map(Number);
  return `Q${Math.floor((month - 1) / 3) + 1} ${year}`;
}

function mergeSeries(seriesMaps) {
  const required = ['private', 'government', 'currentAccount', 'household', 'business', 'gdp'];
  const dates = [...(seriesMaps.gdp?.keys() || [])].sort();
  const observations = dates.flatMap((date) => {
    if (!required.every((key) => Number.isFinite(seriesMaps[key]?.get(date)))) return [];
    const gdp = seriesMaps.gdp.get(date);
    const privateBalance = seriesMaps.private.get(date);
    const government = seriesMaps.government.get(date);
    const currentAccount = seriesMaps.currentAccount.get(date);
    const foreign = -currentAccount;
    const household = seriesMaps.household.get(date);
    const business = seriesMaps.business.get(date);
    const privatePct = percentOfGdp(privateBalance, gdp);
    const governmentPct = percentOfGdp(government, gdp);
    const foreignPct = percentOfGdp(foreign, gdp);
    return [{
      date,
      quarter: quarterLabel(date),
      gdp,
      private: privateBalance,
      government,
      currentAccount,
      foreign,
      household,
      business,
      privatePct,
      governmentPct,
      foreignPct,
      householdPct: percentOfGdp(household, gdp),
      businessPct: percentOfGdp(business, gdp),
      identityResidualPct: privatePct + governmentPct + foreignPct,
      privateResidualPct: privatePct
        - percentOfGdp(household, gdp)
        - percentOfGdp(business, gdp),
    }];
  });
  return observations;
}

function changeFrom(observations, quartersBack, field) {
  const latest = observations.at(-1);
  const previous = observations.at(-(quartersBack + 1));
  if (!latest || !previous) return null;
  return latest[field] - previous[field];
}

function buildSummary(observations) {
  const latest = observations.at(-1);
  if (!latest) return null;
  const yearChanges = {
    privatePct: changeFrom(observations, 4, 'privatePct'),
    governmentPct: changeFrom(observations, 4, 'governmentPct'),
    foreignPct: changeFrom(observations, 4, 'foreignPct'),
    householdPct: changeFrom(observations, 4, 'householdPct'),
    businessPct: changeFrom(observations, 4, 'businessPct'),
  };
  const fiscalDirection = yearChanges.governmentPct < -0.35
    ? 'Fiscal balance widening'
    : yearChanges.governmentPct > 0.35
      ? 'Fiscal balance narrowing'
      : 'Fiscal balance broadly steady';
  const privateDirection = yearChanges.privatePct > 0.35
    ? 'Private surplus rebuilding'
    : yearChanges.privatePct < -0.35
      ? 'Private surplus compressing'
      : 'Private balance broadly steady';
  return { latest, yearChanges, fiscalDirection, privateDirection };
}

function buildPayload(seriesMaps, options = {}) {
  const observations = mergeSeries(seriesMaps);
  if (!observations.length) throw new Error('No complete sectoral-balance quarters were returned');
  return {
    success: true,
    asOf: options.asOf || new Date().toISOString(),
    latestCompleteQuarter: observations.at(-1).date,
    source: 'U.S. Bureau of Economic Analysis via FRED',
    units: {
      levels: 'Billions of dollars, seasonally adjusted annual rate',
      normalized: 'Percent of nominal GDP',
    },
    methodology: {
      identity: 'Private domestic balance + government balance + foreign balance = 0',
      foreignDefinition: 'Foreign balance is the inverse of the U.S. current-account balance.',
      completeness: 'A quarter is included only when all six source series are available.',
    },
    series: SERIES,
    summary: buildSummary(observations),
    observations,
    failures: options.failures || [],
  };
}

module.exports = {
  SERIES,
  buildPayload,
  buildSummary,
  mergeSeries,
  parseFredCsv,
  percentOfGdp,
  quarterLabel,
};
