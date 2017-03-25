const db = require('../../config/database').connectionPool,
      squel = require('squel'),
      router = require('express').Router();

router.param('externalId', (req, res, next, externalId) => {
  const query = squel
      .select()
      .from('bar_scores')
      .field('quality_score')
      .where(`external_id = ${externalId}`)
      .toString();

  db.getConnection((err, connection) => {
    if (err) console.error(err.message);
    connection.query(query, (err, rows) => {
      if (err) {

      }

      req.rows = rows;
      next();
    });
  });
});

router.get('/:externalId', (req, res) => {
  res.json(req.rows);
});

module.exports = router;