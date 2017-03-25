const mysql = require('mysql'),
      connectionPool = mysql.createPool({
        connectionLimit: 25,
        host: process.env.HOST_NAME,
        user: process.env.DB_USERNAME,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD
      });

exports.connectionPool = connectionPool;
exports.QUERY_LIMIT = 500;
