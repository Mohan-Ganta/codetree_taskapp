require('dotenv').config();
const { sequelize } = require('./models');

async function migrate() {
    try {
        await sequelize.query("ALTER TABLE Appointments ADD COLUMN idProofUrl VARCHAR(500) NULL;");
        console.log('✅ idProofUrl column added');
    } catch (err) {
        if (err.original?.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ idProofUrl already exists');
        else console.error('❌', err.message);
    }

    try {
        await sequelize.query("ALTER TABLE Appointments ADD COLUMN smsStatus VARCHAR(50) DEFAULT 'Pending';");
        console.log('✅ smsStatus column added');
    } catch (err) {
        if (err.original?.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ smsStatus already exists');
        else console.error('❌', err.message);
    }

    process.exit(0);
}

migrate();
