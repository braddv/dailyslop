module.exports = async function handler(req, res) {
  return res.status(410).json({
    error: 'Deprecated: portfolio classifications are no longer sourced here. Use FactorsToday factors only.',
  });
};
