module.exports = (sequelize, Sequelize) => {
	const Message = sequelize.define(
		"messages",
		{
			message_id: {
				type: Sequelize.INTEGER,
				autoIncrement: true,
				primaryKey: true,
			},
			sender_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: "users",
					key: "user_id",
				},
			},
			receiver_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: "users",
					key: "user_id",
				},
			},
			message: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			is_read: {
				type: Sequelize.BOOLEAN,
				defaultValue: false,
				allowNull: false,
			},
			read_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
		},
		{
			tableName: "messages",
			timestamps: true,
		}
	);
	return Message;
};



