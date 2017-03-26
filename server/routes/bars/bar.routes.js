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

      // beers at bar
      req.brandNames = [];
      for (let i = 0; i < rows.length; ++i) {
        const brandName = rows[i].brand_name;
        let beer = { name: brandName };

        request(`${untappdRoot}&q=${brandName}&limit=1`, (err, res, body) => {
          const untappedJson = JSON.parse(body).response;
          if (untappedJson.length > 0 && untappedJson.beers.count > 0) {
            const imageUrl = untappedJson.beers.items[0].beer.beer_label;
            beer.imageUrl = imageUrl;
          }
        });
        req.brandNames.push(beer);
      }

      // Similar beers
      const range = 2;
      const topQualityScore = req.qualityScore + range;
      const bottomQualityScore = req.qualityScore - range;
      const similarBeerQuery = `
      SELECT
        bar_brand_consumption.brand_name,
        SUM(bar_brand_consumption.total_consumption) AS total_consumption
      FROM bar_brand_consumption
        INNER JOIN bar_scores ON bar_brand_consumption.external_id = bar_scores.external_id
      WHERE bar_scores.quality_score > ${bottomQualityScore} AND bar_scores.quality_score < ${topQualityScore}
        GROUP BY bar_brand_consumption.brand_name
        ORDER BY total_consumption DESC
      LIMIT 10`;

      connection.query(similarBeerQuery, (err, rows) => {
        req.similarBeers = [];
        for (let i = 0; i < rows.length; ++i) {
          const brandName = rows[i].brand_name;
          const totalConsumption = rows[i].total_consumption;
          let similarBeer = { name: brandName, total_consumption: totalConsumption };

          // get beer URLs
          request(`${untappdRoot}&q=${brandName}&limit=1`, (err, res, body) => {
            const untappdJson = JSON.parse(body).response;

            if (untappdJson.length > 0 && untappdJson.beers.count > 0) {
              const imageUrl = untappdJson.beers.items[0].beer.beer_label;
              similarBeer.imageUrl = imageUrl;
            }
          });
          req.similarBeers.push(similarBeer);
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

router.get('/', (req, res) => {
  const barIdsQuery = squel
      .select()
      .from('bar_scores')
      .field('external_id')
      .distinct()
      .field('quality_score')
      .order('external_id')
      .toString();

  db.getConnection((err, connection) => {
    if (err) console.error(err);

    connection.query(barIdsQuery, (err, rows) => {
      if (err) console.error(err);

      res.json(rows);
      connection.release();
    });
  });
});

module.exports = router;