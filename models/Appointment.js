const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Appointment', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false },
        mobile: { type: DataTypes.STRING, allowNull: false },
        date: { type: DataTypes.STRING, allowNull: false },
        time: { type: DataTypes.STRING, allowNull: false },
        subject: { type: DataTypes.TEXT, allowNull: false },
        status: {
            type: DataTypes.ENUM('Pending', 'Scheduled', 'Rejected'),
            defaultValue: 'Pending'
        },
        meetLink: { type: DataTypes.STRING, defaultValue: '' },
        idProofUrl: { type: DataTypes.STRING(500), allowNull: true },
        smsStatus: { type: DataTypes.STRING, defaultValue: 'Pending' },
        idProofType: { type: DataTypes.STRING, allowNull: true },
        idNumber: { type: DataTypes.STRING, allowNull: true },
        noOfPersons: { type: DataTypes.INTEGER, defaultValue: 1 },
        visitorType: { type: DataTypes.STRING, defaultValue: 'Official' },
        vehicleNo: { type: DataTypes.STRING, allowNull: true },
        gatePassId: { type: DataTypes.STRING, allowNull: true }
    });
};

