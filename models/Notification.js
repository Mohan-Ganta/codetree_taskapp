const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Notification', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        recipient: { type: DataTypes.INTEGER, allowNull: false },
        title: { type: DataTypes.STRING, allowNull: false },
        body: { type: DataTypes.TEXT, allowNull: false },
        taskId: { type: DataTypes.INTEGER, allowNull: true },
        isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
    });
};
