const localtunnel = require('localtunnel');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 5000 });
    console.log(`Tunnel Started! URL: ${tunnel.url}`);

    tunnel.on('close', () => {
      console.log('Tunnel Closed');
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel Error:', err);
    });

  } catch (err) {
    console.error('Failed to start tunnel:', err);
  }
})();
