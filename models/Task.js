const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Task', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        title: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: false },
        assignedTo: { type: DataTypes.INTEGER, allowNull: false },
        assignedToName: { type: DataTypes.STRING },
        priority: { type: DataTypes.ENUM('High', 'Medium', 'Low'), defaultValue: 'Medium' },
        status: { type: DataTypes.ENUM('Open', 'Submitted', 'Closed'), defaultValue: 'Open' },
        progressStatus: { type: DataTypes.ENUM('Open', 'In Progress', 'On Hold', 'Delayed', 'Request for Closure', 'Closed'), defaultValue: 'Open' },
        suggestedTimeline: { type: DataTypes.STRING, defaultValue: 'Within 7 days' },
        adminRemarks: { type: DataTypes.STRING, defaultValue: 'No remarks yet' },
        timeline: { type: DataTypes.JSON, defaultValue: [] },
        dailyUpdates: { type: DataTypes.JSON, defaultValue: [] }
    });
};
