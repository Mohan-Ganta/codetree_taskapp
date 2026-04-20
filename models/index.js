const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  }
);

const Appointment = require('./Appointment')(sequelize);
const Notification = require('./Notification')(sequelize);
const Officer = require('./Officer')(sequelize);
const Task = require('./Task')(sequelize);

// Define relations
Officer.hasMany(Task, { foreignKey: 'assignedTo', onDelete: 'CASCADE' });
Task.belongsTo(Officer, { foreignKey: 'assignedTo', as: 'OfficerDetails' });

Officer.hasMany(Notification, { foreignKey: 'recipient', onDelete: 'CASCADE' });
Notification.belongsTo(Officer, { foreignKey: 'recipient', as: 'RecipientDetails' });

module.exports = {
  sequelize,
  Appointment,
  Notification,
  Officer,
  Task
};
