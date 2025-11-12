module.exports = (sequelize, Sequelize) => {
	const Internship = sequelize.define(
		"internships",
		{
			internship_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			title: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			description: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			employer_id: {
				type: Sequelize.INTEGER,
				allowNull: true,
				comment: "Null for alumni postings, required for employer postings",
			},
			status: {
				type: Sequelize.ENUM("enabled", "disabled"),
				defaultValue: "enabled",
				allowNull: false,
			},
			is_hiring: {
				type: Sequelize.BOOLEAN,
				defaultValue: false,
				allowNull: false,
			},
			approval_status: {
				type: Sequelize.ENUM("pending", "approved", "rejected"),
				defaultValue: "pending",
				allowNull: false,
			},
		},
		{
			tableName: "internships",
			timestamps: true,
		}
	);

	return Internship;
};
