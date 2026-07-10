const express = require('express');
const app = express();
const db = require('./db');
const session = require('express-session');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '0404',
    database: 'careerdb'
});
const path = require('path');

const dashboardRouter = require('./routes/dashboard');
const profileRouter = require('./routes/profile');
const resumeRouter = require('./routes/resume');
const companyRouter = require('./routes/company');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

app.use('/', dashboardRouter);
app.use('/', profileRouter);
app.use('/', resumeRouter);
app.use('/', companyRouter);

app.post('/login', async (req, res) => {
    const { user_id, password } = req.body;

    try {
        const [rows] = await pool.promise().query(
            'SELECT * FROM users WHERE user_id = ?',
            [user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'no_user' });
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'wrong_password' });
        }

        // 로그인 성공
        req.session.user = user;

        return res.json({ message: 'success' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'server_error' });
    }
});

app.post('/register', async (req, res) => {

    const {
        user_id,
        name,
        password,
        birth,
        sex,
        number,
        email,
        address
    } = req.body;

    try {
        // 1. 비밀번호 해싱 (암호화)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await db.query(
            `INSERT INTO users 
            (user_id, name, password, birth, sex, number, email, address)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, name, hashedPassword, birth, sex, number, email, address]
        );

        res.redirect('/login');

    } catch (err) {
        console.error(err);
        res.status(500).send('서버 오류');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/reset-password', (req, res) => {
    res.render('reset-password');
});

app.post('/reset-password', async (req, res) => {
    const { user_id, name, email, new_password } = req.body;

    try {
        // 1. 사용자 검증 (3개 조건)
        const [rows] = await pool.promise().query(
            'SELECT * FROM users WHERE user_id = ? AND name = ? AND email = ?',
            [user_id, name, email]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'no_user' });
        }

        // 2. 비밀번호 암호화
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // 3. 업데이트
        await pool.promise().query(
            'UPDATE users SET password = ? WHERE user_id = ?',
            [hashedPassword, user_id]
        );

        return res.json({ message: 'success' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'server_error' });
    }
});

app.get('/mypage', (req, res) => {
    res.render('mypage');
});

app.get('/resume-edit', (req, res) => {
    res.render('resume-edit');
});

app.get('/jobsite', (req, res) => {
    res.render('jobsite');
});

app.get('/spec', (req, res) => {
    res.render('spec');
});

app.get('/logout', (req, res) => {

    req.session.destroy((err) => {
        if (err) {
            return res.send('로그아웃 실패');
        }

        res.clearCookie('connect.sid'); // 세션 쿠키 삭제
        res.redirect('/');
    });

});
app.listen(8080, () => {
    console.log('Server is running...');
});