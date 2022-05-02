// Require Express.js
const express = require('express')
const app = express()
const args = require('minimist')(process.argv.slice(2))
args['port']
const HTTP_PORT = args.port || 5555
const db = require(".src/services/database.js");

const helpText = `
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.`;

if (args['help']) {
	console.log(helpText);
	process.exit(0);
}

// Start an app server
const server = app.listen(HTTP_PORT, () => {
    console.log('App listening on port %PORT%'.replace('%PORT%',HTTP_PORT))
});

//use json middleware
app.use(express.json());

//logging
app.use( (req, res, next) => {
	let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referer: req.headers['referer'],
        useragent: req.headers['user-agent']
    }

	const stmt = db.prepare(
		"INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
	);
	const info = stmt.run(
		logdata.remoteaddr,
		logdata.remoteuser,
		logdata.time,
		logdata.method,
		logdata.url,
		logdata.protocol,
		logdata.httpversion,
		logdata.status,
		logdata.referer,
		logdata.useragent
  	);
	next();
})

//debug only endpoints
if (args['debug']) {
	app.get('/app/log/access', (req, res) => {
		const stmt = db.prepare('SELECT * FROM accesslog').all();
        res.status(200).json(stmt);
	});
	app.get('/app/error', (req, res) => {
		throw new Error('Error test successful.');
	});
}

//import coin modules
function coinFlip() {
	if (Math.floor(Math.random()*2)>=1) {
			return 'heads';
		} else {
			return 'tails';
		}
}
function coinFlips(flips) {
	let response = new Array(flips);
	for (let i = 0; i<flips; i++) {
		response[i] = coinFlip();
	}
	return response;
}
function countFlips(array) {
	let t=0, h=0;
	for (let x = 0; x<array.length; x++)
		if (array[x] == 'tails')
			t++;
		else h++;
	return {heads: h, tails: t};
}
function flipACoin(call) {
	var response = {'call': call, 'flip':coinFlip(), 'result':'lose'};
	if (response.call == response.flip)
		response.result = 'win';
	return response;
}

// Serve static HTML files
app.use(express.static('./public'));

app.post('/app/flip/coins/', (req, res, next) => {
    const flips = coinFlips(req.body.number)
    const count = countFlips(flips)
    res.status(200).json({"raw":flips,"summary":count})
})

app.post('/app/flip/call/', (req, res, next) => {
    const game = flipACoin(req.body.guess)
    res.status(200).json(game)
})

app.get('/app/', (req, res) => {
// Respond with status 200
	res.statusCode = 200;
// Respond with status message "OK"
    res.statusMessage = 'OK';
    res.writeHead( res.statusCode, { 'Content-Type' : 'text/plain' });
    res.end(res.statusCode+ ' ' +res.statusMessage)
});

app.get('/app/flip/', (req, res) => {
	res.json({'flip':coinFlip()});
});

app.get('/app/flips/:number', (req, res) => {
	const flips = coinFlips(req.params.number);
	res.json({'raw':flips, 'summary':countFlips(flips)});
});

app.get('/app/flip/call/tails', (req, res) => {
	const flips = coinFlips(req.params.number);
	res.json(flipACoin('tails'));
});

app.get('/app/flip/call/heads', (req, res) => {
	const flips = coinFlips(req.params.number);
	res.json(flipACoin('heads'));
});

// Default response for any other request
app.use(function(req, res){
    res.status(404).send('404 NOT FOUND')
});




