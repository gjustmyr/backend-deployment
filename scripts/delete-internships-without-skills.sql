-- ============================================
-- DELETE INTERNSHIPS WITH NO SKILLS
-- ============================================
-- WARNING: This will permanently delete internships that have no associated skills
-- Always run the SELECT query first to preview what will be deleted!

-- ============================================
-- STEP 1: PREVIEW - See which internships will be deleted
-- ============================================
SELECT 
    i.internship_id,
    i.title,
    i.description,
    i.employer_id,
    i.status,
    i.approval_status,
    i.is_hiring,
    i.createdAt,
    COUNT(is.internship_skill_id) as skill_count
FROM 
    internships i
LEFT JOIN 
    internship_skills is ON i.internship_id = is.internship_id
GROUP BY 
    i.internship_id
HAVING 
    COUNT(is.internship_skill_id) = 0;

-- ============================================
-- STEP 2: DELETE - Remove internships with no skills
-- ============================================
-- Uncomment the DELETE statement below after reviewing the SELECT results above
-- PostgreSQL compatible syntax

-- Method 1: Using NOT IN (recommended)
-- DELETE FROM internships
-- WHERE internship_id NOT IN (
--     SELECT DISTINCT internship_id 
--     FROM internship_skills
--     WHERE internship_id IS NOT NULL
-- );

-- Method 2: Using NOT EXISTS (alternative, often faster)
-- DELETE FROM internships
-- WHERE NOT EXISTS (
--     SELECT 1 
--     FROM internship_skills 
--     WHERE internship_skills.internship_id = internships.internship_id
-- );

-- Method 3: Using CTE (Common Table Expression) - PostgreSQL specific
-- WITH internships_to_delete AS (
--     SELECT i.internship_id
--     FROM internships i
--     LEFT JOIN internship_skills is ON i.internship_id = is.internship_id
--     WHERE is.internship_id IS NULL
-- )
-- DELETE FROM internships
-- WHERE internship_id IN (SELECT internship_id FROM internships_to_delete);

