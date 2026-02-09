const net = require('net');

const port = 35432;
const host = 'localhost';

const client = new net.Socket();

client.connect(port, host, function() {
	console.log('Connected to ' + host + ':' + port);
	client.destroy();
});

client.on('error', function(err) {
	console.error('Connection failed: ' + err.message);
	// Try 5432
	const client2 = new net.Socket();
	client2.connect(5432, host, function() {
		console.log('Connected to ' + host + ':5432');
		client2.destroy();
	});
	client2.on('error', function(err2) {
		console.error('Connection failed to 5432: ' + err2.message);
	});
});
