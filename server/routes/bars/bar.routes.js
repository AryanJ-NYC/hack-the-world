const db = require('../../config/database').connectionPool,
      squel = require('squel'),
      router = require('express').Router();

router.param('externalId', (req, res, next, externalId) => {
  if (isNaN(externalId)) return res.json({'error': `${externalId} is not a number`});
  const qualityScoreQuery = squel
      .select()
      .from('bar_scores')
      .left_join('quality_and_loc', 'quality_and_loc', 'bar_scores.external_id = quality_and_loc.external_id')
      .left_join('bar_scores', 'similar_scores', 'similar_scores.quality_score > bar_scores.quality_score-2 AND similar_scores.quality_score < bar_scores.quality_score+2')
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

      req.qualityScore = rows[0].quality_score;

      req.brandNames = [];
      for (let i = 0; i < rows.length; ++i) {
        req.brandNames.push(rows[i].brand_name);
      }
      connection.release();
      next();
    });

  });
});
router.get('/:externalId', (req, res) => {
  res.json({
    qualityScore: req.qualityScore,
    brandNames: req.brandNames
  });
});

module.exports = router;