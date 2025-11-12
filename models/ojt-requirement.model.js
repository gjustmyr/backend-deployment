module.exports = (sequelize, Sequelize) => {
	const OJTRequirements = sequelize.define(
		"ojt_requirements",
		{
			ojt_requirement_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			requirement_name: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			document_url: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			type: {
				type: Sequelize.ENUM("pre-ojt", "post-ojt"),
				allowNull: false,
			},
			status: {
				type: Sequelize.ENUM("active", "expired", "terminated"),
				defaultValue: "active",
				allowNull: false,
			},
		},
		{
			tableName: "ojt_requirements",
			timestamps: true,
		}
	);
	return OJTRequirements;
};
