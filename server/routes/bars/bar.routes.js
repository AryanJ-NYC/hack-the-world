const db = require('../../config/database').connectionPool,
      squel = require('squel'),
      request = require('request'),
      router = require('express').Router();

const untappdRoot = `https://api.untappd.com/v4/search/beer?client_id=${process.env.UNTAPPD_CLIENT_ID}&client_secret=3A42276AFB59D83D2ACA1FFCE5956BF72B5CC255`;

router.param('externalId', (req, res, next, externalId) => {
  if (isNaN(externalId)) return res.json({'error': `${externalId} is not a number`});
  const qualityScoreQuery = squel
      .select()
      .from('bar_scores')
      .left_join('quality_and_loc', 'quality_and_loc', 'bar_scores.external_id = quality_and_loc.external_id')
      .field('bar_scores.quality_score')
      .distinct()
      .field('quality_and_loc.brand_name')
      .where(`bar_scores.external_id = ${externalId}`)
      .toString();

  db.getConnection((err, connection) => {
    connection.query(qualityScoreQuery, (err, rows) => {
      if (err) console.error(err);
      if (rows.length === 0) {
        return res.json({message: `No bar with ID ${externalId}`});
      }

      req.qualityScore = parseInt(rows[0].quality_score);

      req.brandNames = [];
      for (let i = 0; i < rows.length; ++i) {
        let brandName = rows[i].brand_name;
        request(`${untappdRoot}&q=${brandName}&limit=1`, (err, res, body) => {
          const untappedJson = JSON.parse(body).response;
          if (untappedJson.length === 0) {
            req.brandNames.push({name: brandName});
            return;
          }
          const imageUrl = untappedJson.beers.items[0].beer.beer_label;
          req.brandNames.push({ name: brandName, imageUrl: imageUrl })
        });
      }

      const range = 2;
      const topQualityScore = req.qualityScore + range;
      const bottomQualityScore = req.qualityScore - range;
      const similarBeerQuery = `
      SELECT
        DISTINCT quality_and_loc.brand_name,
        beer_total_consumption.total_consumption
      FROM bar_scores
	      LEFT JOIN quality_and_loc quality_and_loc ON (bar_scores.external_id = quality_and_loc.external_id) 
	      LEFT JOIN beer_total_consumption ON quality_and_loc.brand_name=beer_total_consumption.brand_name
      WHERE (bar_scores.quality_score < ${topQualityScore} AND bar_scores.quality_score > ${bottomQualityScore})
      ORDER BY beer_total_consumption.total_consumption DESC LIMIT 10;`;

      connection.query(similarBeerQuery, (err, rows) => {
        req.similarBeers = [];
        for (let i = 0; i < rows.length; ++i) {
          req.similarBeers.push({name: rows[i].brand_name, total_consumption: rows[i].total_consumption});
        }

        connection.release();
        next();
      });
    });

  });
});
router.get('/:externalId', (req, res) => {
  res.json({
    qualityScore: req.qualityScore,
    brandNames: req.brandNames,
    similarBeers: req.similarBeers
  });
});

module.exports = router;