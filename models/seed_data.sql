-- ============================================
-- SPARTRACK Database Seed Data
-- ============================================
-- This file contains SQL INSERT statements for:
-- Departments, Programs, Majors, Sections, Industries, and Skills
-- Note: Sequences are reset to start from 1 (PostgreSQL syntax)
-- ============================================

-- ============================================
-- 1. DEPARTMENTS
-- ============================================
-- Reset sequence and insert departments
ALTER SEQUENCE departments_department_id_seq RESTART WITH 1;

INSERT INTO departments (department_name, department_abbv, department_dean, status, "createdAt", "updatedAt") VALUES
('College of Information Technology', 'CIT', 'Dr. Maria Santos', 'enabled', NOW(), NOW()),
('College of Engineering', 'COE', 'Dr. Juan Dela Cruz', 'enabled', NOW(), NOW()),
('College of Business Administration', 'CBA', 'Dr. Anna Garcia', 'enabled', NOW(), NOW()),
('College of Education', 'COED', 'Dr. Robert Martinez', 'enabled', NOW(), NOW()),
('College of Arts and Sciences', 'CAS', 'Dr. Lisa Rodriguez', 'enabled', NOW(), NOW());

-- ============================================
-- 2. PROGRAMS
-- ============================================
-- Reset sequence and insert programs
-- Note: department_id references departments (1-5)
ALTER SEQUENCE programs_program_id_seq RESTART WITH 1;

INSERT INTO programs (program_name, program_abbv, status, department_id, "createdAt", "updatedAt") VALUES
-- College of Information Technology (department_id = 1)
('Bachelor of Science in Information Technology', 'BSIT', 'enabled', 1, NOW(), NOW()),
('Bachelor of Science in Computer Science', 'BSCS', 'enabled', 1, NOW(), NOW()),
('Bachelor of Science in Information Systems', 'BSIS', 'enabled', 1, NOW(), NOW()),

-- College of Engineering (department_id = 2)
('Bachelor of Science in Civil Engineering', 'BSCE', 'enabled', 2, NOW(), NOW()),
('Bachelor of Science in Electrical Engineering', 'BSEE', 'enabled', 2, NOW(), NOW()),
('Bachelor of Science in Mechanical Engineering', 'BSME', 'enabled', 2, NOW(), NOW()),

-- College of Business Administration (department_id = 3)
('Bachelor of Science in Business Administration', 'BSBA', 'enabled', 3, NOW(), NOW()),
('Bachelor of Science in Accountancy', 'BSA', 'enabled', 3, NOW(), NOW()),
('Bachelor of Science in Entrepreneurship', 'BSE', 'enabled', 3, NOW(), NOW()),

-- College of Education (department_id = 4)
('Bachelor of Elementary Education', 'BEED', 'enabled', 4, NOW(), NOW()),
('Bachelor of Secondary Education', 'BSED', 'enabled', 4, NOW(), NOW()),

-- College of Arts and Sciences (department_id = 5)
('Bachelor of Arts in Psychology', 'BAP', 'enabled', 5, NOW(), NOW()),
('Bachelor of Science in Psychology', 'BSP', 'enabled', 5, NOW(), NOW());

-- ============================================
-- 3. MAJORS
-- ============================================
-- Reset sequence and insert majors
ALTER SEQUENCE majors_major_id_seq RESTART WITH 1;

INSERT INTO majors (major_name, major_abbv, status, "createdAt", "updatedAt") VALUES
-- IT/CS Related Majors
('Web Development', 'WD', 'enabled', NOW(), NOW()),
('Mobile Application Development', 'MAD', 'enabled', NOW(), NOW()),
('Network Administration', 'NA', 'enabled', NOW(), NOW()),
('Database Management', 'DBM', 'enabled', NOW(), NOW()),
('Cybersecurity', 'CS', 'enabled', NOW(), NOW()),
('Software Engineering', 'SE', 'enabled', NOW(), NOW()),
('Data Science', 'DS', 'enabled', NOW(), NOW()),
('Artificial Intelligence', 'AI', 'enabled', NOW(), NOW()),

-- Engineering Majors
('Structural Engineering', 'STE', 'enabled', NOW(), NOW()),
('Power Systems', 'PS', 'enabled', NOW(), NOW()),
('Automotive Engineering', 'AE', 'enabled', NOW(), NOW()),

-- Business Majors
('Marketing Management', 'MM', 'enabled', NOW(), NOW()),
('Financial Management', 'FM', 'enabled', NOW(), NOW()),
('Human Resource Management', 'HRM', 'enabled', NOW(), NOW()),
('Operations Management', 'OM', 'enabled', NOW(), NOW()),

-- Education Majors
('Mathematics', 'MATH', 'enabled', NOW(), NOW()),
('English', 'ENG', 'enabled', NOW(), NOW()),
('Science', 'SCI', 'enabled', NOW(), NOW()),
('Social Studies', 'SS', 'enabled', NOW(), NOW());

-- ============================================
-- 4. SECTIONS
-- ============================================
-- Reset sequence and insert sections
-- Note: program_id references programs (1-13), major_id references majors (1-22)
ALTER SEQUENCE sections_section_id_seq RESTART WITH 1;

INSERT INTO sections (section_name, year_level, semestral, status, program_id, major_id, "createdAt", "updatedAt") VALUES
-- BSIT Sections (program_id = 1)
('BSIT-1A', '1st Year', '1st Semester', 'enabled', 1, 1, NOW(), NOW()),
('BSIT-1B', '1st Year', '1st Semester', 'enabled', 1, 1, NOW(), NOW()),
('BSIT-2A', '2nd Year', '1st Semester', 'enabled', 1, 1, NOW(), NOW()),
('BSIT-2B', '2nd Year', '1st Semester', 'enabled', 1, 1, NOW(), NOW()),
('BSIT-3A', '3rd Year', '1st Semester', 'enabled', 1, 1, NOW(), NOW()),
('BSIT-3B', '3rd Year', '1st Semester', 'enabled', 1, 2, NOW(), NOW()),
('BSIT-4A', '4th Year', '1st Semester', 'enabled', 1, 2, NOW(), NOW()),
('BSIT-4B', '4th Year', '1st Semester', 'enabled', 1, 2, NOW(), NOW()),

-- BSCS Sections (program_id = 2)
('BSCS-1A', '1st Year', '1st Semester', 'enabled', 2, 6, NOW(), NOW()),
('BSCS-2A', '2nd Year', '1st Semester', 'enabled', 2, 6, NOW(), NOW()),
('BSCS-3A', '3rd Year', '1st Semester', 'enabled', 2, 7, NOW(), NOW()),
('BSCS-4A', '4th Year', '1st Semester', 'enabled', 2, 8, NOW(), NOW()),

-- BSBA Sections (program_id = 7)
('BSBA-1A', '1st Year', '1st Semester', 'enabled', 7, 12, NOW(), NOW()),
('BSBA-2A', '2nd Year', '1st Semester', 'enabled', 7, 12, NOW(), NOW()),
('BSBA-3A', '3rd Year', '1st Semester', 'enabled', 7, 13, NOW(), NOW()),
('BSBA-4A', '4th Year', '1st Semester', 'enabled', 7, 13, NOW(), NOW()),

-- BEED Sections (program_id = 10)
('BEED-1A', '1st Year', '1st Semester', 'enabled', 10, 18, NOW(), NOW()),
('BEED-2A', '2nd Year', '1st Semester', 'enabled', 10, 18, NOW(), NOW()),
('BEED-3A', '3rd Year', '1st Semester', 'enabled', 10, 19, NOW(), NOW()),
('BEED-4A', '4th Year', '1st Semester', 'enabled', 10, 19, NOW(), NOW());

-- ============================================
-- 5. INDUSTRIES
-- ============================================
-- Reset sequence and insert industries
ALTER SEQUENCE industries_industry_id_seq RESTART WITH 1;

INSERT INTO industries (industry_name, description, "createdAt", "updatedAt") VALUES
('Information Technology', 'Companies focused on software development, IT services, and technology solutions', NOW(), NOW()),
('Software Development', 'Firms specializing in creating software applications and systems', NOW(), NOW()),
('Telecommunications', 'Companies providing communication services and network infrastructure', NOW(), NOW()),
('Financial Services', 'Banks, insurance companies, and financial institutions', NOW(), NOW()),
('Healthcare', 'Hospitals, clinics, and healthcare service providers', NOW(), NOW()),
('Education', 'Educational institutions, training centers, and e-learning platforms', NOW(), NOW()),
('Manufacturing', 'Companies involved in production and manufacturing processes', NOW(), NOW()),
('Retail and E-commerce', 'Retail stores, online marketplaces, and e-commerce platforms', NOW(), NOW()),
('Construction and Engineering', 'Construction companies and engineering firms', NOW(), NOW()),
('Hospitality and Tourism', 'Hotels, restaurants, and tourism-related businesses', NOW(), NOW()),
('Media and Entertainment', 'Media companies, advertising agencies, and entertainment firms', NOW(), NOW()),
('Real Estate', 'Real estate agencies, property management, and development companies', NOW(), NOW()),
('Energy and Utilities', 'Power companies, utilities, and energy providers', NOW(), NOW()),
('Transportation and Logistics', 'Shipping, logistics, and transportation companies', NOW(), NOW()),
('Government and Public Sector', 'Government agencies and public sector organizations', NOW(), NOW()),
('Non-Profit Organizations', 'Charitable organizations and non-profit entities', NOW(), NOW()),
('Consulting Services', 'Business consulting and advisory firms', NOW(), NOW()),
('Food and Beverage', 'Food production, restaurants, and beverage companies', NOW(), NOW()),
('Automotive', 'Automotive manufacturers and related services', NOW(), NOW()),
('Agriculture', 'Agricultural companies and farming operations', NOW(), NOW());

-- ============================================
-- 6. SKILLS
-- ============================================
-- Reset sequence and insert skills
-- Drop incorrect foreign key constraint if it exists (should be on student_skills, not skills)
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_skill_id_fkey;
ALTER SEQUENCE skills_skill_id_seq RESTART WITH 1;

INSERT INTO skills (skill_name, skill_description, "createdAt", "updatedAt") VALUES
-- Programming Languages
('JavaScript', 'Programming language for web development', NOW(), NOW()),
('Python', 'High-level programming language for various applications', NOW(), NOW()),
('Java', 'Object-oriented programming language', NOW(), NOW()),
('C++', 'General-purpose programming language', NOW(), NOW()),
('C#', 'Microsoft programming language for .NET applications', NOW(), NOW()),
('PHP', 'Server-side scripting language for web development', NOW(), NOW()),
('Ruby', 'Dynamic programming language', NOW(), NOW()),
('Swift', 'Programming language for iOS development', NOW(), NOW()),
('Kotlin', 'Programming language for Android development', NOW(), NOW()),
('Go', 'Google programming language for system programming', NOW(), NOW()),

-- Web Development
('HTML/CSS', 'Markup and styling languages for web pages', NOW(), NOW()),
('React', 'JavaScript library for building user interfaces', NOW(), NOW()),
('Vue.js', 'Progressive JavaScript framework', NOW(), NOW()),
('Angular', 'TypeScript-based web application framework', NOW(), NOW()),
('Node.js', 'JavaScript runtime for server-side development', NOW(), NOW()),
('Express.js', 'Web application framework for Node.js', NOW(), NOW()),
('Django', 'Python web framework', NOW(), NOW()),
('Flask', 'Lightweight Python web framework', NOW(), NOW()),
('Laravel', 'PHP web framework', NOW(), NOW()),
('ASP.NET', 'Microsoft web framework', NOW(), NOW()),

-- Mobile Development
('React Native', 'Framework for building mobile apps', NOW(), NOW()),
('Flutter', 'Google UI toolkit for mobile apps', NOW(), NOW()),
('Xamarin', 'Microsoft framework for cross-platform mobile development', NOW(), NOW()),
('Ionic', 'Framework for hybrid mobile app development', NOW(), NOW()),

-- Databases
('MySQL', 'Relational database management system', NOW(), NOW()),
('PostgreSQL', 'Advanced open-source relational database', NOW(), NOW()),
('MongoDB', 'NoSQL document database', NOW(), NOW()),
('SQL Server', 'Microsoft relational database management system', NOW(), NOW()),
('Oracle', 'Enterprise database management system', NOW(), NOW()),
('Redis', 'In-memory data structure store', NOW(), NOW()),
('Firebase', 'Google mobile and web application platform', NOW(), NOW()),

-- Cloud and DevOps
('AWS', 'Amazon Web Services cloud platform', NOW(), NOW()),
('Azure', 'Microsoft cloud computing platform', NOW(), NOW()),
('Google Cloud', 'Google cloud computing platform', NOW(), NOW()),
('Docker', 'Containerization platform', NOW(), NOW()),
('Kubernetes', 'Container orchestration system', NOW(), NOW()),
('CI/CD', 'Continuous Integration and Continuous Deployment', NOW(), NOW()),
('Git', 'Version control system', NOW(), NOW()),
('Jenkins', 'Automation server for CI/CD', NOW(), NOW()),

-- Data and Analytics
('Data Analysis', 'Analyzing data to extract insights', NOW(), NOW()),
('Machine Learning', 'AI technique for pattern recognition', NOW(), NOW()),
('Data Visualization', 'Creating visual representations of data', NOW(), NOW()),
('Excel', 'Spreadsheet software for data analysis', NOW(), NOW()),
('Tableau', 'Data visualization and business intelligence tool', NOW(), NOW()),
('Power BI', 'Microsoft business analytics tool', NOW(), NOW()),

-- Design and UI/UX
('UI/UX Design', 'User interface and user experience design', NOW(), NOW()),
('Adobe Photoshop', 'Image editing software', NOW(), NOW()),
('Adobe Illustrator', 'Vector graphics editor', NOW(), NOW()),
('Figma', 'Collaborative interface design tool', NOW(), NOW()),
('Sketch', 'Digital design toolkit', NOW(), NOW()),

-- Soft Skills
('Communication', 'Effective verbal and written communication', NOW(), NOW()),
('Problem Solving', 'Analytical thinking and problem-solving abilities', NOW(), NOW()),
('Teamwork', 'Collaboration and working effectively in teams', NOW(), NOW()),
('Leadership', 'Leading and motivating teams', NOW(), NOW()),
('Time Management', 'Efficiently managing time and priorities', NOW(), NOW()),
('Project Management', 'Planning and executing projects', NOW(), NOW()),
('Critical Thinking', 'Analyzing and evaluating information', NOW(), NOW()),
('Adaptability', 'Flexibility and adapting to change', NOW(), NOW());

-- ============================================
-- END OF SEED DATA
-- ============================================
-- Total Records:
-- Departments: 5
-- Programs: 13
-- Majors: 22
-- Sections: 20
-- Industries: 20
-- Skills: 70
-- ============================================

