module.exports = (sequelize, Sequelize) => {
	const SemestralInternshipListing = sequelize.define(
		"semestral_internship_listings",
		{
			semestral_internship_listing_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			semestral_internship_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			ojt_coordinator_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			section_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
		},
		{
			tableName: "semestral_internship_listings",
			timestamps: true,
		}
	);
	return SemestralInternshipListing;
};
