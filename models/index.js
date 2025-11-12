const dbConfig = require("../config/db.config.js");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
	host: dbConfig.HOST,
	port: dbConfig.PORT,
	dialect: dbConfig.dialect,
	operatorsAliases: false,
	pool: {
		max: dbConfig.pool.max,
		min: dbConfig.pool.min,
		acquire: dbConfig.pool.acquire,
		idle: dbConfig.pool.idle,
	},
	dialectOptions: dbConfig.dialectOptions, // ✅ this is crucial
});
const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require("./user.model.js")(sequelize, Sequelize);
db.Department = require("./department.model.js")(sequelize, Sequelize);
db.Program = require("./program.model.js")(sequelize, Sequelize);
db.Major = require("./major.model.js")(sequelize, Sequelize);
db.Section = require("./section.model.js")(sequelize, Sequelize);
db.OJTHead = require("./ojt-head.model.js")(sequelize, Sequelize);
db.OJTCoordinator = require("./ojt-coordinator.model.js")(sequelize, Sequelize);
db.StudentTrainee = require("./student-trainee.model.js")(sequelize, Sequelize);
db.Employer = require("./employer.model.js")(sequelize, Sequelize);
db.Father = require("./father.model.js")(sequelize, Sequelize);
db.Mother = require("./mother.model.js")(sequelize, Sequelize);
db.Guardian = require("./guardian.model.js")(sequelize, Sequelize);
db.Internship = require("./internship.model.js")(sequelize, Sequelize);
db.InternshipSkill = require("./internship-skill.model.js")(
	sequelize,
	Sequelize
);
db.Skill = require("./skill.model.js")(sequelize, Sequelize);
db.StudentSkill = require("./student-skill.model.js")(sequelize, Sequelize);
db.SemestralInternship = require("./semestral-internship.model.js")(
	sequelize,
	Sequelize
);
db.SemestralInternshipListing =
	require("./semestral-internship-listing.model.js")(sequelize, Sequelize);
db.StudentInternship = require("./student-internship.model.js")(
	sequelize,
	Sequelize
);
db.Supervisor = require("./supervisor.model.js")(sequelize, Sequelize);
db.OJTRequirement = require("./ojt-requirement.model.js")(sequelize, Sequelize);
db.StudentRequirement = require("./student-requirement.model.js")(sequelize, Sequelize);
db.Industry = require("./industry.model.js")(sequelize, Sequelize);
db.MOA = require("./moa.model.js")(sequelize, Sequelize);
db.Message = require("./message.model.js")(sequelize, Sequelize);
// Associations
db.Department.hasMany(db.Program, { foreignKey: "department_id" });
db.Program.belongsTo(db.Department, { foreignKey: "department_id" });
db.Program.hasMany(db.Section, { foreignKey: "program_id" });
db.Section.belongsTo(db.Program, { foreignKey: "program_id" });

db.Major.hasMany(db.Section, { foreignKey: "major_id" });
db.Section.belongsTo(db.Major, { foreignKey: "major_id" });

db.OJTHead.hasMany(db.OJTCoordinator, { foreignKey: "ojt_head_id" });
db.OJTCoordinator.belongsTo(db.OJTHead, { foreignKey: "ojt_head_id" });

db.Department.hasMany(db.OJTCoordinator, { foreignKey: "department_id" });
db.OJTCoordinator.belongsTo(db.Department, { foreignKey: "department_id" });

db.User.hasOne(db.StudentTrainee, { foreignKey: "user_id" });
db.StudentTrainee.belongsTo(db.User, { foreignKey: "user_id" });

db.User.hasOne(db.Employer, { foreignKey: "user_id" });
db.Employer.belongsTo(db.User, { foreignKey: "user_id" });

db.StudentTrainee.hasOne(db.Father, { foreignKey: "student_trainee_id" });
db.Father.belongsTo(db.StudentTrainee, { foreignKey: "student_trainee_id" });

db.StudentTrainee.hasOne(db.Mother, { foreignKey: "student_trainee_id" });
db.Mother.belongsTo(db.StudentTrainee, { foreignKey: "student_trainee_id" });

db.StudentTrainee.hasOne(db.Guardian, { foreignKey: "student_trainee_id" });
db.Guardian.belongsTo(db.StudentTrainee, { foreignKey: "student_trainee_id" });

db.Internship.hasMany(db.InternshipSkill, { foreignKey: "internship_id" });
db.InternshipSkill.belongsTo(db.Internship, { foreignKey: "internship_id" });

db.Skill.hasMany(db.InternshipSkill, { foreignKey: "skill_id" });
db.InternshipSkill.belongsTo(db.Skill, { foreignKey: "skill_id" });

db.StudentSkill.hasMany(db.Skill, { foreignKey: "skill_id" });
db.Skill.belongsTo(db.StudentSkill, { foreignKey: "skill_id" });

db.StudentTrainee.hasMany(db.StudentSkill, {
	foreignKey: "student_trainee_id",
});
db.StudentSkill.belongsTo(db.StudentTrainee, {
	foreignKey: "student_trainee_id",
});

db.SemestralInternship.hasMany(db.SemestralInternshipListing, {
	foreignKey: "semestral_internship_id",
});
db.SemestralInternshipListing.belongsTo(db.SemestralInternship, {
	foreignKey: "semestral_internship_id",
});

db.OJTCoordinator.hasMany(db.SemestralInternshipListing, {
	foreignKey: "ojt_coordinator_id",
});
db.SemestralInternshipListing.belongsTo(db.OJTCoordinator, {
	foreignKey: "ojt_coordinator_id",
});

db.Section.hasMany(db.SemestralInternshipListing, {
	foreignKey: "section_id",
});
db.SemestralInternshipListing.belongsTo(db.Section, {
	foreignKey: "section_id",
});

db.StudentTrainee.hasMany(db.StudentInternship, {
	foreignKey: "student_trainee_id",
});
db.StudentInternship.belongsTo(db.StudentTrainee, {
	foreignKey: "student_trainee_id",
});

db.SemestralInternshipListing.hasMany(db.StudentInternship, {
	foreignKey: "semestral_internship_listing_id",
});
db.StudentInternship.belongsTo(db.SemestralInternshipListing, {
	foreignKey: "semestral_internship_listing_id",
});

db.Supervisor.hasMany(db.StudentInternship, { foreignKey: "supervisor_id" });
db.StudentInternship.belongsTo(db.Supervisor, { foreignKey: "supervisor_id" });

db.User.hasOne(db.Supervisor, { foreignKey: "user_id" });
db.Supervisor.belongsTo(db.User, { foreignKey: "user_id" });

db.Employer.hasMany(db.Supervisor, { foreignKey: "employer_id" });
db.Supervisor.belongsTo(db.Employer, { foreignKey: "employer_id" });

db.User.hasOne(db.OJTCoordinator, { foreignKey: "user_id" });
db.OJTCoordinator.belongsTo(db.User, { foreignKey: "user_id" });

db.Industry.hasMany(db.Employer, { foreignKey: "industry_id" });
db.Employer.belongsTo(db.Industry, { foreignKey: "industry_id" });

db.Employer.hasMany(db.MOA, { foreignKey: "employer_id" });
db.MOA.belongsTo(db.Employer, { foreignKey: "employer_id" });

db.Employer.hasMany(db.Internship, { foreignKey: "employer_id" });
db.Internship.belongsTo(db.Employer, { foreignKey: "employer_id" });

// Student Requirement Associations
db.StudentInternship.hasMany(db.StudentRequirement, {
	foreignKey: "student_internship_id",
});
db.StudentRequirement.belongsTo(db.StudentInternship, {
	foreignKey: "student_internship_id",
});

db.OJTRequirement.hasMany(db.StudentRequirement, {
	foreignKey: "ojt_requirement_id",
});
db.StudentRequirement.belongsTo(db.OJTRequirement, {
	foreignKey: "ojt_requirement_id",
});

db.OJTCoordinator.hasMany(db.StudentRequirement, {
	foreignKey: "reviewed_by",
});
db.StudentRequirement.belongsTo(db.OJTCoordinator, {
	foreignKey: "reviewed_by",
	as: "reviewer",
});

// Message Associations
db.User.hasMany(db.Message, { foreignKey: "sender_id", as: "sentMessages" });
db.Message.belongsTo(db.User, { foreignKey: "sender_id", as: "sender" });

db.User.hasMany(db.Message, { foreignKey: "receiver_id", as: "receivedMessages" });
db.Message.belongsTo(db.User, { foreignKey: "receiver_id", as: "receiver" });

module.exports = db;
