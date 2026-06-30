const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const db = require('../db');
const usedRequests = new Set();
const multer = require('multer');
const path = require('path');

function isLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profile/');
    },
    filename: (req, file, cb) => {
        const userId = req.session.user.id;

        const ext = path.extname(file.originalname);
        cb(null, `profile_${userId}${ext}`);
    }
});

const upload = multer({ storage });

router.get('/resume-edit', isLogin, async (req, res) => {

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

    // 2. 이력서 상세정보
    const [detail] = await db.query(
        'SELECT * FROM user_detail WHERE user_id=?',
        [userId]
    );

    // 3. 경력
    const [careers] = await db.query(
        'SELECT * FROM careers WHERE user_id=?',
        [userId]
    );

    // 4. 자격증
    const [certificates] = await db.query(
        'SELECT * FROM certificates WHERE user_id=?',
        [userId]
    );

    // 5. 어학
    const [languages] = await db.query(
        'SELECT * FROM languages WHERE user_id=?',
        [userId]
    );

    // 6. 자기소개서
    const [coverLetters] = await db.query(
        'SELECT * FROM cover_letters WHERE user_id=?',
        [userId]
    );

    const [educations] = await db.query(
        'SELECT * FROM educations WHERE user_id=?',
        [userId]
    );

    const [photo_rows] = await db.query(`
    SELECT image_path
    FROM user_profile
    WHERE user_id = ?
    LIMIT 1
`, [userId]);

    const photo = photo_rows[0]?.image_path || null;

    const birth = new Date(user.birth);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();

    if (
        today.getMonth() < birth.getMonth() ||
        (
            today.getMonth() === birth.getMonth() &&
            today.getDate() < birth.getDate()
        )
    ) {
        age--;
    }

    const birthText =
        `${birth.getFullYear()}년 `
        + `${birth.getMonth() + 1}월 `
        + `${birth.getDate()}일 `
        + `(만 ${age}세)`;

    res.render('resume-edit', {
        photo,
        user: userRows[0],
        birthText,
        detail: detail[0] || {},
        careers,
        certificates,
        languages,
        coverLetters,
        educations,
        success: req.query.success
    });
});

router.post('/resume-edit', async (req, res) => {

    const userId = req.session.user.id;

    const {
        photo,

        school_name,
        education_level,
        entrance_date,
        graduation_date,
        major,

        company_name,
        position,
        start_date,
        end_date,
        description,

        expected_salary_raw,
        job_objective,

        certificate_name,
        certificate_date,

        language_name,
        score,
        acquired_date,

        title,
        content

    } = req.body;

    await db.query(
        'DELETE FROM cover_letters WHERE user_id=?',
        [userId]
    );

    if (Array.isArray(title)) {

        for (let i = 0; i < title.length; i++) {

            if (!title[i] || !content[i]) continue;

            await db.query(`
            INSERT INTO cover_letters
            (user_id, title, content)
            VALUES (?, ?, ?)
        `, [
                userId,
                title[i],
                content[i]
            ]);
        }

    } else if (title) {

        await db.query(`
        INSERT INTO cover_letters
        (user_id, title, content)
        VALUES (?, ?, ?)
    `, [
            userId,
            title,
            content
        ]);
    }

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
            (user_id, company_name, position, start_date, end_date)
            VALUES (?, ?, ?, ?, ?)
        `;

    if (Array.isArray(company_name)) {
        for (let i = 0; i < company_name.length; i++) {

            if (!company_name[i] || company_name[i].trim() === '') continue;

            await db.query(sql4, [
                userId,
                company_name[i],
                position[i] || null,
                start_date[i] || null,
                end_date[i] || null,
            ]);
        }
    } else if (company_name) {

        await db.query(sql4, [
            userId,
            company_name,
            position || null,
            start_date || null,
            end_date || null,

        ]);
    }

    await db.query(
        'DELETE FROM educations WHERE user_id=?',
        [userId]
    );
    const sql5 = `
            INSERT INTO educations
            (user_id, school_name, entrance_date, graduation_date, major)
            VALUES (?, ?, ?, ?, ?)
        `;
    if (Array.isArray(school_name)) {
        for (let i = 0; i < school_name.length; i++) {
            if (!school_name[i]) continue;

            await db.query(sql5, [
                userId,
                school_name[i],
                entrance_date[i] || null,
                graduation_date[i] || null,
                major[i] || null
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

    return res.redirect('/resume-edit?success=1');
});

router.post('/profile/upload', isLogin, upload.single('photo'), async (req, res) => {

    const userId = req.session.user.id;

    const image = `/uploads/profile/${req.file.filename}?t=${Date.now()}`;

    await db.query(`
        INSERT INTO user_profile(user_id, image_path)
        VALUES(?, ?)
        ON DUPLICATE KEY UPDATE
            image_path = VALUES(image_path),
            updated_at = CURRENT_TIMESTAMP
    `, [userId, image]);

    res.json({
        success: true,
        image
    });
});

module.exports = router;