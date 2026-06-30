const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const db = require('../db');
const usedRequests = new Set();
const safe = (v) => v === undefined || v === "" ? null : v;

function isLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

router.get('/company/add', isLogin, async (req, res) => {

    const user = req.session.user;
    const userId = user.id;

    if (!user) {
        return res.redirect('/login');
    }

    // 1. 유저 기본정보 (고정)
    const [userRows] = await db.query(
        'SELECT name, sex, birth, email FROM users WHERE id=?',
        [userId]
    );

    res.render('company/add', {
        user: userRows[0],
    });
});

router.post('/company/add', async (req, res) => {

    const userId = req.session.user.id;

    const {
        company_name,
        job,
        qualifications,
        advantage,
        salary,
        area,
        type,
        benefits,
        status,
        compare_salary,
        compare_industry,
        compare_job,
        compare_qualifications,
        compare_advantage,
        compare_area,
        compare_type,
        compare_benefits,
        compare_status
    } = req.body;

    if (!company_name || !job) {
        return res.status(400).send("회사명과 직무는 필수입니다.");
    }

    await db.query(
        `INSERT INTO company
            (user_id, company_name, job, qualifications, advantage, salary, area, type, benefits, status,
            compare_salary, compare_industry, compare_job,
            compare_qualifications, compare_advantage, compare_area,
            compare_type, compare_benefits, compare_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            userId,
            safe(company_name),
            safe(job),
            safe(qualifications),
            safe(advantage),
            safe(salary),
            safe(area),
            safe(type),
            safe(benefits),
            safe(status),

            req.body.compare_salary ? 1 : 0,
            req.body.compare_industry ? 1 : 0,
            req.body.compare_job ? 1 : 0,
            req.body.compare_qualifications ? 1 : 0,
            req.body.compare_advantage ? 1 : 0,
            req.body.compare_area ? 1 : 0,
            req.body.compare_type ? 1 : 0,
            req.body.compare_benefits ? 1 : 0,
            req.body.compare_status ? 1 : 0
        ]
    );

    res.redirect('/');
    ;
});

router.get('/company/edit/:id', isLogin, async (req, res) => {
    const { id } = req.params;

    const sql = `SELECT * FROM company WHERE id = ?`;
    const [rows] = await db.execute(sql, [id]);

    res.render('company/edit', {
        data: rows[0] || null
    });
});

router.post('/company/update/:id', isLogin, async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    const sql = `
        UPDATE company SET
        company_name=?, industry=?, job=?, salary=?, area=?,
        type=?, qualifications=?, advantage=?, benefits=?, status=?,
        compare_salary=?, compare_industry=?, compare_job=?,
        compare_qualifications=?, compare_advantage=?, compare_area=?,
        compare_type=?, compare_benefits=?, compare_status=?
        WHERE id=?
    `;

    const values = [
        safe(body.company_name),
        safe(body.industry),
        safe(body.job),
        safe(body.salary),
        safe(body.area),
        safe(body.type),
        safe(body.qualifications),
        safe(body.advantage),
        safe(body.benefits),
        safe(body.status),
        body.compare_salary ? 1 : 0,
        body.compare_industry ? 1 : 0,
        body.compare_job ? 1 : 0,
        body.compare_qualifications ? 1 : 0,
        body.compare_advantage ? 1 : 0,
        body.compare_area ? 1 : 0,
        body.compare_type ? 1 : 0,
        body.compare_benefits ? 1 : 0,
        body.compare_status ? 1 : 0,
        id
    ];

    await db.execute(sql, values);

    res.redirect('/');
});

router.post('/company/delete/:id', isLogin, async (req, res) => {
    const { id } = req.params;

    const sql = `DELETE FROM company WHERE id = ?`;
    await db.execute(sql, [id]);

    res.redirect('/');
});

router.get('/company/list', isLogin, async (req, res) => {
    const userId = req.session.user.id;

    const [rows] = await db.execute(
        'SELECT * FROM company WHERE user_id=?',
        [userId]
    );

    res.render('company/list', {
        list: rows
    });
});

router.get('/company/compare', isLogin, async (req, res) => {

    let ids = req.query.ids;

    if (!ids) return res.send("선택된 회사가 없습니다.");

    if (!Array.isArray(ids)) {
        ids = [ids];
    }

    const sql = `
        SELECT * FROM company
        WHERE id IN (?)
    `;

    const [rows] = await db.query(sql, [ids]);

    res.render('company/compare', {
        list: rows
    });
});
module.exports = router;