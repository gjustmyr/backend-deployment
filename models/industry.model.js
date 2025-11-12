module.exports = (sequelize, Sequelize) => {
	const Industry = sequelize.define(
		"industries",
		{
			industry_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			industry_name: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
			},
			description: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
		},
		{
			tableName: "industries",
			timestamps: true,
		}
	);
	return Industry;
};
