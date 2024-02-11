
import requests, json, threading, subprocess
from deck_utils import *

def update_sim():
	# repo = 'TheSench'
	repo = 'vuzaldo' # forked version with latest fixes
	url = f'https://raw.githubusercontent.com/{repo}/SIMSpellstone/gh-pages/dist/'
	for file in 'simulator.js data.min.js'.split():
		print(f'Downloading {file} from {repo}\'s SIMSpellstone repository...')
		response = requests.get(url + file).text
		# Adjust files for headless execution with multiple CPU cores
		if 'data' in file:
			response = response[17:]
		if 'sim' in file:
			response = response[:response.index(';(function (angular)')]
			with open('sim_template.js') as f: template = f.read()
			response = template.replace('### SIMULATOR CODE HERE ###', response)
		with open(file, 'w') as f: f.write(response)
	print('Simulator files ready')

# Update simulator/data
# Only needed to pull new cards/buffs/BGEs or bug fixes
update_sim()

# Open a new window to run the simulator
# You don't need this line if it is already running in the background
subprocess.run('start node simulator', shell = True)

sim_url = 'http://localhost:1337'

number_sims = 10000 # quick/decent estimation amount distributed against multiple enemy decks
# number_sims = 150000 # minimize error for fine-tuning phase or single card/rune change comparison

seed_rng = 1337 # seed the RNG for "stable" results (results will be the same when using the same seed and set of parameters)

def run_sim(sim_options, results):
	res = requests.post(sim_url + '/sim', json = sim_options)
	res = float(res.json()['win_rate'])
	results.append(res)

def mass_sim(deck, enemy_decks, bge, defense_mode = False):
	threads, results = [], []
	sims = round(number_sims / len(enemy_decks))
	for enemy in enemy_decks:
		options = { 'bge': bge, 'sims': sims, 'seed': seed_rng }
		options['deck'], options['deck2'] = (enemy, deck) if defense_mode else (deck, enemy)
		t = threading.Thread(target = run_sim, args = [options, results])
		t.start()
		threads.append(t)
	for t in threads:
		t.join()
	score = sum(results) / len(results)
	score = 100 - score if defense_mode else score
	score = round(score, 2)
	return score

def get_current_bges():
	return requests.get(sim_url + '/current_bges').json()

def get_card_data():
	return requests.get(sim_url + '/card_data').json()

def get_rune_data():
	return requests.get(sim_url + '/rune_data').json()

def get_bge_data():
	return requests.get(sim_url + '/bge_data').json()

try:
	print('Current BGEs:', get_current_bges())
except Exception:
	print('\nSimulator not running! Try installing Node.js/dependencies with "npm install"')
	quit()

with open('challenges.json') as f: challenges = json.loads(f.read())

def list_challenge_bges():
	print('Number of challenges:', len(challenges))
	for i, c in zip(range(len(challenges)), challenges):
		print(f'{i + 1}. {c}: {challenges[c]}')

# list_challenge_bges()

def load_enemy_decks(file, top = None):
	with open('test_decks/' + file + '.txt') as f: decks = f.read().split('\n')
	decks = [deck.split(', ')[0] for deck in decks] # discard defense % field
	decks = decks[:top]
	return decks

def mass_sim_list(decks, enemy_decks, bge, defense_mode = False, last = None):
	last = last if last else len(decks)
	decks = decks[-last:]
	mode = 'defense' if defense_mode else 'offense'
	print(f'\nTesting {len(decks)} hashes ({len(enemy_decks)} enemy decks; BGEs = [{bge}]; N = {number_sims}; {mode}):')
	results = []
	for deck in decks:
		score = mass_sim(deck, enemy_decks, bge, defense_mode)
		print(deck, str(score) + '%')
		results.append([deck, score])
	results.sort(key = lambda r : r[1], reverse = True)
	return results

def export_results(results, file = 'out.txt', show = True):
	if file:
		with open(file, 'w') as f: f.write('\n'.join(f'{r[0]}, {r[1]}%' for r in results))
	if show:
		print('\n' + '\n'.join(f'\t#{results.index(r) + 1} {r[0]}: {r[1]}%' for r in results))


bge = challenges['Equilibrium'] # empty BGE ID
enemy_decks = load_enemy_decks('Equilibrium')

bge = get_current_bges()
enemy_decks = load_enemy_decks('guild_offs', top = 50)
enemy_decks = load_enemy_decks('guild_defs', top = 50)

with open('hashes.txt') as f: decks = f.read().split()

# results = mass_sim_list(decks, enemy_decks, bge, last = 30) # test only the last decks on the list
# export_results(results[:10]) # top 10 rates
# results = mass_sim_list(decks, enemy_decks, bge, True, last = 30) # defense
# export_results(results[:10])

card_data = get_card_data()
set_card_data(card_data)

commanders = [c for c in card_data.values() if c['card_type'] == '1']
player_commanders = [c['id'] for c in commanders if c['set'] == '7000' and c['rarity'] == 4]

def hero_test(deck):
	print(f'\n{deck} {mass_sim(deck, enemy_decks, bge)}% (original)')
	deck = hash2deck(deck)
	hashes = []
	for hero in player_commanders:
		deck[0] = card_data[hero]
		hashes.append(deck2hash(deck))
	results = mass_sim_list(hashes, enemy_decks, bge)
	for r in results: # remap hash -> hero name
		r[0] = hash2deck(r[0])[0]['name']
	export_results(results, False)

for deck in decks[:5]:
	hero_test(deck)
