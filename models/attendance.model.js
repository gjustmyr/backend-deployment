module.exports = (sequelize, Sequelize) => {
	const Attendance = sequelize.define(
		"attendances",
		{
			attendance_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			student_internship_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			supervisor_id: {
				type: Sequelize.INTEGER,
				allowNull: true,
				comment: "Null if logged by student, set if verified/modified by supervisor",
			},
			date: {
				type: Sequelize.DATEONLY,
				allowNull: false,
			},
			time_in: {
				type: Sequelize.TIME,
				allowNull: true,
			},
			time_out: {
				type: Sequelize.TIME,
				allowNull: true,
			},
			working_arrangement: {
				type: Sequelize.ENUM("Work From Home", "Skeletal Workforce"),
				allowNull: true,
			},
			task_for_day: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			accomplishments: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			hours_worked: {
				type: Sequelize.FLOAT,
				allowNull: true,
				defaultValue: 0,
			},
			is_verified: {
				type: Sequelize.BOOLEAN,
				defaultValue: false,
				comment: "True if supervisor has verified this attendance",
			},
			is_modified: {
				type: Sequelize.BOOLEAN,
				defaultValue: false,
				comment: "True if supervisor has modified this attendance",
			},
			modified_by_supervisor_id: {
				type: Sequelize.INTEGER,
				allowNull: true,
				comment: "Supervisor who modified this attendance",
			},
			modification_notes: {
				type: Sequelize.TEXT,
				allowNull: true,
				comment: "Notes from supervisor about the modification",
			},
		},
		{
			tableName: "attendances",
			timestamps: true,
		}
	);
	return Attendance;
};

