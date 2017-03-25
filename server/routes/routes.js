'use strict';
const router = require('express').Router(),
      barRoutes = require('./bars/bar.routes');

router.use('/bar', barRoutes);

module.exports = router;
