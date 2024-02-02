
def set_card_data(data):
	global card_data
	card_data = data

chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!~'
maxRuneID = 1000

def base64_to_decimal(base64):
	dec = 0
	for c in base64[::-1]:
		dec *= 64
		dec += chars.index(c)
	return dec

def base64_to_unit(base64):
	dec = base64_to_decimal(base64)
	rune_id = dec % maxRuneID
	dec = int((dec - rune_id) / maxRuneID)
	level = dec % 7
	dec = int((dec - level) / 7)
	level += 1
	fusion = dec % 3
	dec = int((dec - fusion) / 3)
	unit_id = str(dec)
	if 'shard_card' in card_data[unit_id]:
		level += fusion * 7
	elif fusion > 0:
		unit_id = str(fusion) + unit_id
	unit = card_data[unit_id].copy()
	unit['level'] = level
	unit['rune'] = rune_id + 5000 if rune_id > 0 else None
	return unit

def hash2deck(deckHash):
	deck = []
	entryLength = 5
	while deckHash:
		unitHash = deckHash[:entryLength]
		deckHash = deckHash[entryLength:]
		deck.append(base64_to_unit(unitHash))
	return deck

def decimal_to_base64(dec):
	base64 = ''
	for i in range(5):
		part = dec % 64
		base64 += chars[part]
		dec = int((dec - part) / 64)
	return base64

def unit_to_base64(unit):
	unit_id = int(unit['id'])
	level = int(unit['level']) - 1
	fusion = int(unit_id / 10000)
	if 'shard_card' in card_data[str(unit_id)]:
		fusion = int(level / 7)
	level = level % 7
	rune_id = 0
	if unit.get('rune'):
		rune_id = unit['rune'] - 5000
	dec = unit_id % 10000
	dec = dec * 3 + fusion
	dec = dec * 7 + level
	dec = dec * maxRuneID + rune_id
	base64 = decimal_to_base64(dec)
	return base64

def deck2hash(deck):
	deckHash = ''
	for card in deck:
		deckHash += unit_to_base64(card)
	return deckHash
