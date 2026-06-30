const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const db = require('../db');
const usedRequests = new Set();


router.get('/', async (req, res) => {

    const user = req.session.user;

    if (!user) {
        return res.render('guest');
    }

    const [detail] = await db.query(
        'SELECT * FROM User_Detail WHERE user_id=?',
        [user.id]
    );

    const [certificates] = await db.query(
        'SELECT * FROM Certificates WHERE user_id=?',
        [user.id]
    );

    const [languages] = await db.query(
        'SELECT * FROM Languages WHERE user_id=?',
        [user.id]
    );

    const [careers] = await db.query(
        'SELECT * FROM Careers WHERE user_id=?',
        [user.id]
    );

    const [educations] = await db.query(
        'SELECT * FROM educations WHERE user_id=?',
        [user.id]
    );

    const [company] = await db.query(
        'SELECT * FROM company WHERE user_id=?',
        [user.id]
    );

    const fields = [
        { key: "job", compare: "compare_job", label: "직무" },
        { key: "salary", compare: "compare_salary", label: "연봉" },
        { key: "qualifications", compare: "compare_qualifications", label: "자격요건" },
        { key: "advantage", compare: "compare_advantage", label: "우대사항" },
        { key: "area", compare: "compare_area", label: "지역" },
        { key: "type", compare: "compare_type", label: "근무형태" },
        { key: "benefits", compare: "compare_benefits", label: "복지" },
        { key: "status", compare: "compare_status", label: "상태" },
        { key: "industry", compare: "compare_industry", label: "업종" }
    ];


    const detailData = detail[0] || null;

    const educationMap = {
        highschool: '고교 졸업 이하',
        college: '대학 졸업(2,3년제)',
        university: '대학교 졸업(4년제)',
        master: '대학원 석사 졸업',
        doctor: '대학원 박사 졸업',
        postdoctor: '박사 졸업 이상'
    };

    if (detailData) {
        detailData.educationText =
            educationMap[detailData.education_level] || '등록된 학력이 없습니다.';
    }

    res.render('dashboard', {
        user,
        detail: detailData,
        certificates,
        languages,
        careers,
        educations,
        list: company,
        fields
    });

});

module.exports = router;