
const express = require('express');
const app = express();

const { Worker, isMainThread, parentPort } = require('worker_threads');
const num_workers = require('os').cpus().length - 1;

const seedrandom = require('seedrandom');

require('./data.min.js');

if (isMainThread) {
	console.log('Checking data...');
	console.log('Skills:', Object.keys(SKILL_DATA).length);
	console.log('Runes:', Object.keys(RUNES).length);
	console.log('Cards:', Object.keys(CARDS).length);
	console.log('Fusions:', Object.keys(FUSIONS).length);
	console.log('BGEs:', Object.keys(BATTLEGROUNDS).length);
}

_GET = function(){};


### SIMULATOR CODE HERE ###


SIM_CONTROLLER.getConfiguration = function(){
	return {
			enemybges: '',
			getbattleground: '',
			selfbges: '',
			mapbges: '',
			playerDeck: '',
			playerOrdered: false,
			playerExactOrdered: false,
			cpuDeck: '',
			cpuOrdered: false,
			cpuExactOrdered: false,
			surge: false,
			siegeMode: true,
			towerType: '501',
			towerLevel: '18',
			campaignID: '',
			missionID: '',
			missionLevel: '7',
			raidID: '',
			raidLevel: '25',
			showAnimations: false,
			simsToRun: 10000,
			tournament: false,
			debug: false,
			logPlaysOnly: false,
			massDebug: false,
			findFirstWin: false,
			findFirstLoss: false,
		};
}

SIM_CONTROLLER.startsim = function (options) {
	SIMULATOR.total_turns = 0;
	SIMULATOR.games = 0;
	echo = '';

	const simConfig = SIM_CONTROLLER.getConfiguration();
	simConfig.playerDeck = options.deck;
	simConfig.cpuDeck = options.deck2;
	simConfig.simsToRun = options.sims;
	simConfig.getbattleground = options.bge;

	if (options.seed) Math.random = seedrandom(options.seed);

	SIMULATOR.simsLeft = simConfig.simsToRun;
	SIMULATOR.config = simConfig;
	SIMULATOR.battlegrounds = getBattlegrounds(simConfig);
	SIMULATOR.setupDecks();

	SIMULATOR.wins = 0;
	SIMULATOR.losses = 0;
	SIMULATOR.draws = 0;
	SIMULATOR.points = 0;

	for (let i = 0; i < SIMULATOR.simsLeft; i++) {
		SIMULATOR.simulate();
		SIM_CONTROLLER.processSimResult();
	}

	const winRate = SIMULATOR.wins / SIMULATOR.games * 100;
	return winRate;
}

if (isMainThread) {
	const workers = [];
	for (let i = 0; i < num_workers; i++) {
		workers.push(new Worker(__filename));
	}
	app.use(express.json());
	app.post('/sim', (request, response) => {
		const { attackers, defenders, options } = request.body;
		const totalMatchups = attackers.length * defenders.length;
		const matchupsPerWorker = Math.ceil(totalMatchups / num_workers);
		console.log(`Request received: ${totalMatchups} matchups (${matchupsPerWorker} per worker)`);
		let results = [];
		const handleWorkerMessage = (result) => {
			results = results.concat(result);
			if (results.length == totalMatchups) {
				console.log('Request finished processing');
				response.json(results);
			}
		};
		for (let i = 0; i < num_workers; i++) {
			const startIndex = i * matchupsPerWorker;
			const endIndex = Math.min((i + 1) * matchupsPerWorker, totalMatchups);
			workers[i].removeAllListeners('message');
			workers[i].on('message', handleWorkerMessage);
			workers[i].postMessage([attackers, defenders, startIndex, endIndex, options]);
		}
	})
	app.get('/current_bges', (request, response) => {
		response.json(current_bges.join(','));
	})
	app.get('/card_data', (request, response) => {
		response.json(CARDS);
	})
	app.get('/rune_data', (request, response) => {
		response.json(RUNES);
	})
	app.get('/bge_data', (request, response) => {
		response.json(BATTLEGROUNDS);
	})
	app.listen(1337, () => {
		console.log(`Simulation server started (${num_workers} workers).`);
	})
} else {
	parentPort.on('message', ([attackers, defenders, startIndex, endIndex, simOptions]) => {
		const results = [];
		for (let i = startIndex; i < endIndex; i++) {
			const attacker = attackers[Math.floor(i / defenders.length)];
			const defender = defenders[i % defenders.length];
			const winRate = SIM_CONTROLLER.startsim({ ...simOptions, deck: attacker, deck2: defender });
			results.push([attacker, defender, winRate]);
		}
		parentPort.postMessage(results);
	});
}
