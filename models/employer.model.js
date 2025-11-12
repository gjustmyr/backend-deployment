module.exports = (sequelize, Sequelize) => {
	const Employer = sequelize.define(
		"employers",
		{
			employer_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			company_name: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			company_overview: {
				type: Sequelize.TEXT,
				allowNull: true, // description or background of company
			},
			industry_id: {
				type: Sequelize.INTEGER,
				allowNull: true,
			},
			logo_url: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			contact_person: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			contact_email: {
				type: Sequelize.STRING,
				allowNull: true,
				validate: { isEmail: true },
			},
			contact_phone: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			street_address: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			working_hours_start: {
				type: Sequelize.TIME,
				allowNull: true,
			},
			working_hours_end: {
				type: Sequelize.TIME,
				allowNull: true,
			},
			barangay_address: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			city_address: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			province_address: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			postal_code: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			website_url: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			status: {
				type: Sequelize.ENUM("enabled", "disabled"),
				defaultValue: "enabled",
				allowNull: false,
			},
			eligibility: {
				type: Sequelize.ENUM("BOTH", "INTERNSHIP", "JOB-PLACEMENT"),
				allowNull: false,
				defaultValue: "INTERNSHIP",
			},
			user_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				unique: true,
			},
		},
		{
			tableName: "employers",

			timestamps: true,
		}
	);

	return Employer;
};
