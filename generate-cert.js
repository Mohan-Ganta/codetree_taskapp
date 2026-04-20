const selfsigned = require('selfsigned');
const fs = require('fs');

const attrs = [{ name: 'commonName', value: 'nexus.ctapps.in' }];
const options = { 
    days: 365, 
    keySize: 2048,
    extensions: [{
        name: 'subjectAltName',
        altNames: [
            { type: 2, value: 'nexus.ctapps.in' }, // DNS
            { type: 7, ip: '43.204.189.106' }   // IP
        ]
    }]
};

selfsigned.generate(attrs, options).then(pems => {
    fs.writeFileSync('cert.pem', pems.cert);
    fs.writeFileSync('key.pem', pems.private);
    console.log('Certificates generated successfully.');
}).catch(err => console.error(err));
