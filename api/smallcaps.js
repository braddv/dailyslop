const sectorAd = require('./sector-ad');

module.exports = function smallCapsHandler(req, res) {
  req.query = { ...(req.query || {}), universe: 'smallcaps' };
  return sectorAd(req, res);
};
