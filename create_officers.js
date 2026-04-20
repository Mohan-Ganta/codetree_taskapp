require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Officer } = require('./models');

const officers = [
    { name: 'Prakhar Jain', designation: 'IAS', phoneNumber: '9807885652', email: 'ceo.rtgs@ap.gov.in' },
    { name: 'Dhatri Reddy',  designation: 'IAS', phoneNumber: '8454855089', email: 'ceo@rtih.co.in' },
    { name: 'Geetanjali Sharma', designation: 'IAS', phoneNumber: '9121285555', email: 'mdapfiber@gmail.com' },
    { name: 'Mallika Garg',  designation: 'IPS', phoneNumber: '9618088215', email: 'malikagarg03@gmail.com' },
    { name: 'Surya Teja',    designation: 'IAS', phoneNumber: '9063572299', email: 'md_apts@ap.gov.in' },
];

async function run() {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const hashedPassword = await bcrypt.hash('rtgs@123', 10);

        for (const o of officers) {
            const [officer, created] = await Officer.findOrCreate({
                where: { email: o.email },
                defaults: {
                    username: o.phoneNumber,
                    password: hashedPassword,
                    name: o.name,
                    designation: o.designation,
                    email: o.email,
                    phoneNumber: o.phoneNumber,
                    role: 'Officer',
                    mustChangePassword: true
                }
            });

            if (created) {
                console.log(`✅ Created: ${o.name} | username: ${o.phoneNumber}`);
            } else {
                console.log(`⚠️  Already exists: ${o.name} (${o.email})`);
            }
        }

        console.log('\n✅ Done.');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sequelize.close();
    }
}

run();
