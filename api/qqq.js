const sectorAd = require('./sector-ad');

module.exports = function qqqHandler(req, res) {
  req.query = { ...(req.query || {}), universe: 'qqq' };
  return sectorAd(req, res);
};
