
const express = require('express');
const app = express();

const cluster = require('cluster');
const num_workers = require('os').cpus().length - 1;

const seedrandom = require('seedrandom');

require('./data.min.js');

if (cluster.isMaster) {
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

if (cluster.isMaster) {
	console.log(`Starting ${num_workers} workers...`);
	for (let i = 0; i < num_workers; i++){
		cluster.fork();
	}
} else {
	app.use(express.json());
	app.post('/sim', (request, response) => {
		const winRate = SIM_CONTROLLER.startsim(request.body);
		response.json({ 'win_rate': winRate });
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
		console.log(`Simulation server started (worker ${cluster.worker.id}).`);
	})
}
