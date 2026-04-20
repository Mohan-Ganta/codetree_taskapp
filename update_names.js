require('dotenv').config();
const { Officer } = require('./models');

async function updateOfficerNames() {
    const updates = [
        { phone: '9807885652', newName: 'Prakhar Jain, IAS' },
        { phone: '8454855089', newName: 'Dhatri Reddy, IAS' },
        { phone: '9121285555', newName: 'Geetanjali Sharma, IAS' },
        { phone: '9618088215', newName: 'Mallika Garg, IPS' },
        { phone: '9063572299', newName: 'Surya Teja, IAS' }
    ];

    console.log('\n🔄 Updating officer names...');
    console.log('---------------------------');

    let successCount = 0;

    for (const update of updates) {
        try {
            const [count] = await Officer.update(
                { name: update.newName },
                { where: { phoneNumber: update.phone } }
            );

            if (count > 0) {
                console.log(`✅ Updated: ${update.phone} -> ${update.newName}`);
                successCount++;
            } else {
                console.log(`⚠️ Skip: No officer found with phone ${update.phone}`);
            }
        } catch (err) {
            console.error(`❌ Error updating ${update.phone}:`, err.message);
        }
    }

    console.log('---------------------------');
    console.log(`🎉 Finished. ${successCount} names updated.\n`);
    process.exit(0);
}

updateOfficerNames();
