const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        await connection.execute(`ALTER TABLE Appointments ADD COLUMN idProofType VARCHAR(255) NULL`);
        console.log("Added idProofType");
    } catch(err) { console.log(err.message); }

    try {
        await connection.execute(`ALTER TABLE Appointments ADD COLUMN idNumber VARCHAR(255) NULL`);
        console.log("Added idNumber");
    } catch(err) { console.log(err.message); }

    try {
        await connection.execute(`ALTER TABLE Appointments ADD COLUMN noOfPersons INT DEFAULT 1`);
        console.log("Added noOfPersons");
    } catch(err) { console.log(err.message); }

    try {
        await connection.execute(`ALTER TABLE Appointments ADD COLUMN visitorType VARCHAR(255) DEFAULT 'Official'`);
        console.log("Added visitorType");
    } catch(err) { console.log(err.message); }

    try {
        await connection.execute(`ALTER TABLE Appointments ADD COLUMN vehicleNo VARCHAR(255) NULL`);
        console.log("Added vehicleNo");
    } catch(err) { console.log(err.message); }

    try {
        await connection.execute(`ALTER TABLE Appointments ADD COLUMN gatePassId VARCHAR(255) NULL`);
        console.log("Added gatePassId");
    } catch(err) { console.log(err.message); }

    await connection.end();
    console.log("Migration finished.");
}

migrate();
