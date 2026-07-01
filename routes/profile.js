const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const db = require('../db');
const usedRequests = new Set();


function isLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}
// 정보 입력 페이지
router.get('/mypage', isLogin, async (req, res) => {

    const userId = req.session.user.id;

    // 1. 기본 정보
    const [detail] = await db.query(
        'SELECT * FROM user_detail WHERE user_id=?',
        [userId]
    );

    // 2. 경력
    const [careers] = await db.query(
        'SELECT * FROM careers WHERE user_id=?',
        [userId]
    );

    // 3. 자격증
    const [certificates] = await db.query(
        'SELECT * FROM certificates WHERE user_id=?',
        [userId]
    );

    // 4. 어학
    const [languages] = await db.query(
        'SELECT * FROM languages WHERE user_id=?',
        [userId]
    );

    // 5. 학력
    const [educations] = await db.query(
        'SELECT * FROM educations WHERE user_id=?',
        [userId]
    );

    res.render('mypage', {
        detail: detail[0] || null,
        careers,
        certificates,
        languages,
        educations
    });
});

router.post('/mypage', async (req, res) => {
    const { requestId } = req.body;

    if (usedRequests.has(requestId)) {
        return res.status(409).send("Duplicate request blocked");
    }

    const userId = req.session.user.id;

    const {
        school_name,
        education_level,
        entrance_date,
        graduation_date,
        major,

        company_name,
        position,
        start_date,
        end_Date,
        description,

        expected_salary_raw,
        job_objective,

        certificate_name,
        certificate_date,

        language_name,
        score,
        acquired_date,

    } = req.body;

    function toArray(v) {
        if (!v) return [];
        return Array.isArray(v) ? v : [v];
    }
    const majorArr = toArray(major);
    const schoolArr = toArray(school_name);
    const entranceArr = toArray(entrance_date);
    const graduationArr = toArray(graduation_date);

    const expected_salary =
        expected_salary_raw && expected_salary_raw !== ''
            ? Number(expected_salary_raw)
            : null;

    // ========================
    // 1. user_detail (UPSERT)
    // ========================
    const sql = `
    INSERT INTO user_detail
    (user_id, education_level, expected_salary, job_objective)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    education_level = VALUES(education_level),
    expected_salary = VALUES(expected_salary),
    job_objective = VALUES(job_objective)
    `;

    await db.query(sql, [
        userId,
        education_level,
        expected_salary,
        job_objective
    ]);

    // ========================
    // 2. certificates
    // ========================
    await db.query('DELETE FROM certificates WHERE user_id=?', [userId]);

    const sql2 = `
        INSERT INTO certificates 
        (user_id, certificate_name, certificate_date)
        VALUES (?, ?, ?)
    `;

    if (Array.isArray(certificate_name)) {
        for (let i = 0; i < certificate_name.length; i++) {

            if (!certificate_name[i] || certificate_name[i].trim() === '') continue;

            await db.query(sql2, [
                userId,
                certificate_name[i],
                certificate_date[i] || null
            ]);
        }
    } else if (certificate_name) {

        await db.query(sql2, [
            userId,
            certificate_name,
            certificate_date || null
        ]);
    }

    // ========================
    // 3. languages
    // ========================
    await db.query('DELETE FROM languages WHERE user_id=?', [userId]);

    const sql3 = `
        INSERT INTO languages 
        (user_id, language_name, score, acquired_date)
        VALUES (?, ?, ?, ?)
    `;

    if (Array.isArray(language_name)) {
        for (let i = 0; i < language_name.length; i++) {

            if (!language_name[i] || language_name[i].trim() === '') continue;

            await db.query(sql3, [
                userId,
                language_name[i],
                score[i],
                acquired_date[i] || null
            ]);
        }
    } else if (language_name) {

        await db.query(sql3, [
            userId,
            language_name,
            score || null,
            acquired_date || null
        ]);
    }

    // ========================
    // 4. careers
    // ========================
    await db.query('DELETE FROM careers WHERE user_id=?', [userId]);

    const sql4 = `
        INSERT INTO careers 
        (user_id, company_name, position, start_date, end_Date, description)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    if (Array.isArray(company_name)) {
        for (let i = 0; i < company_name.length; i++) {

            if (!company_name[i] || company_name[i].trim() === '') continue;

            await db.query(sql4, [
                userId,
                company_name[i],
                position[i] || null,
                start_date[i] || null,
                end_Date[i] || null,
                description[i] || null
            ]);
        }
    } else if (company_name) {

        await db.query(sql4, [
            userId,
            company_name,
            position || null,
            start_date || null,
            end_Date || null,
            description || null
        ]);
    }

    // ========================
    // 5. educations
    // ========================
    await db.query(
        'DELETE FROM educations WHERE user_id=?', [userId]);

    const sql5 = `
        INSERT INTO educations
        (user_id, school_name, entrance_date, graduation_date, major)
        VALUES (?, ?, ?, ?, ?)
    `;

    if (Array.isArray(school_name)) {
        for (let i = 0; i < schoolArr.length; i++) {

            if (!school_name[i] || school_name[i].trim() === '') continue;

            await db.query(sql5, [
                userId,
                school_name[i],
                entranceArr[i] || null,
                graduationArr[i] || null,
                majorArr[i] || null
            ]);
        }
    } else if (school_name) {

        await db.query(sql5, [
            userId,
            school_name,
            entrance_date || null,
            graduation_date || null,
            major || null
        ]);
    }
    res.redirect('/');
});



module.exports = router;