const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Officer', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        username: { type: DataTypes.STRING, allowNull: false, unique: true },
        password: { type: DataTypes.STRING, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false, unique: true },
        phoneNumber: { type: DataTypes.STRING, allowNull: false },
        designation: { type: DataTypes.STRING, allowNull: false },
        role: { type: DataTypes.ENUM('MainOfficer', 'Officer'), defaultValue: 'Officer' },
        department: { type: DataTypes.ENUM('RTG', 'ITE&C'), defaultValue: 'ITE&C' },
        status: { type: DataTypes.ENUM('Active', 'Deactive'), defaultValue: 'Active' },
        mustChangePassword: { type: DataTypes.BOOLEAN, defaultValue: true },
        pushToken: { type: DataTypes.STRING, allowNull: true }
    });
};
