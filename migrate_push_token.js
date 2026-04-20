require('dotenv').config();
const { sequelize } = require('./models');

async function migrate() {
    try {
        await sequelize.query("ALTER TABLE Officers ADD COLUMN pushToken VARCHAR(255) NULL;");
        console.log('✅ pushToken column added successfully!');
    } catch (err) {
        if (err.original && err.original.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ pushToken column already exists, skipping.');
        } else {
            console.error('❌ Migration failed:', err.message);
        }
    }
    process.exit(0);
}

migrate();
