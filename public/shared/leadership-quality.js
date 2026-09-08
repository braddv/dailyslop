(function attachLeadershipQuality(root) {
  function finite(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  }

  function calculateLeadershipQuality({ members = [], benchmarkReturn, groupReturn = null } = {}) {
    const usable = members
      .map((member) => ({
        returnValue: Number(member.returnValue),
        marketCap: Number(member.marketCap),
      }))
      .filter((member) => finite(member.returnValue) && finite(member.marketCap) && member.marketCap > 0);
    if (usable.length < 2 || !finite(benchmarkReturn)) return null;

    const totalWeight = usable.reduce((sum, member) => sum + member.marketCap, 0);
    const weightedReturn = usable.reduce((sum, member) =>
      sum + member.returnValue * member.marketCap, 0) / totalWeight;
    const equalReturn = usable.reduce((sum, member) => sum + member.returnValue, 0) / usable.length;
    const participation = usable.filter((member) => member.returnValue > Number(benchmarkReturn)).length
      / usable.length * 100;
    const contributions = usable
      .map((member) => Math.abs(member.returnValue * member.marketCap / totalWeight))
      .sort((a, b) => b - a);
    const absoluteContribution = contributions.reduce((sum, value) => sum + value, 0);
    const topFiveShare = absoluteContribution > 0
      ? contributions.slice(0, 5).reduce((sum, value) => sum + value, 0) / absoluteContribution * 100
      : 0;
    const weightingGap = weightedReturn - equalReturn;
    const relativeReturn = (finite(groupReturn) ? Number(groupReturn) : weightedReturn)
      - Number(benchmarkReturn);

    const topFiveIsBroad = usable.length < 10 || topFiveShare <= 50;
    const topFiveIsConcentrated = usable.length >= 10 && topFiveShare >= 60;
    let classification = 'Mixed';
    if (participation >= 60 && Math.abs(weightingGap) <= 1 && topFiveIsBroad) {
      classification = 'Broad';
    } else if (participation < 45 || Math.abs(weightingGap) >= 2 || topFiveIsConcentrated) {
      classification = 'Concentrated';
    }
    return {
      classification,
      relativeReturn,
      participation,
      weightingGap,
      topFiveShare,
      memberCount: usable.length,
    };
  }

  root.DailySlopLeadershipQuality = { calculateLeadershipQuality };
}(typeof globalThis !== 'undefined' ? globalThis : window));
