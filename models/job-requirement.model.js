module.exports = (sequelize, Sequelize) => {
	const JobRequirement = sequelize.define(
		"job_requirements",
		{
			job_requirement_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			internship_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			title: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			description: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			is_required: {
				type: Sequelize.BOOLEAN,
				defaultValue: true,
				allowNull: false,
			},
			order: {
				type: Sequelize.INTEGER,
				defaultValue: 0,
				allowNull: false,
			},
		},
		{
			tableName: "job_requirements",
			timestamps: true,
		}
	);

	return JobRequirement;
};

