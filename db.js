const mysql = require('mysql2');

// DB 연결 풀 생성
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '비밀번호',
    database: 'careerdb',
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool.promise();