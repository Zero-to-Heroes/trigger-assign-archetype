import { decode } from '@firestone-hs/deckstrings';
import { AllCardsService } from '@firestone-hs/reference-data';
import { loadReplay } from '../src/analysis/match-analysis';
import { cardDrawn } from '../src/analysis/parsers/cards-draw-parser';
import { cardsInHand } from '../src/analysis/parsers/cards-in-hand-parser';
import { ReplayParser } from '../src/analysis/replay-parser';
import { CardAnalysis, MatchAnalysis } from '../src/model';

const test = async () => {
	const replayKey = 'hearthstone/replay/2023/10/12/f5f5e67a-8885-4302-8294-a56b9708db8d.xml.zip';
	const decklist = 'AAECAZ8FBIbiBKHiBISWBfboBQ3JoATXvQTavQS/4gTA4gSrkwWBlgWDlgXBxAXGxAWOlQa1ngaGowYAAA==';

	const allCards = new AllCardsService();
	await allCards.initializeCardsDb();

	const replay = await loadReplay(replayKey);
	const parser = new ReplayParser(replay, [cardsInHand, cardDrawn]);

	let cardsAfterMulligan: { cardId: string; kept: boolean }[] = [];
	let cardsBeforeMulligan: string[] = [];
	parser.on('cards-in-hand', (event) => {
		if (cardsBeforeMulligan?.length === 0) {
			cardsBeforeMulligan = event.cardsInHand;
		} else {
			cardsAfterMulligan = event.cardsInHand.map((cardId) => ({
				cardId: cardId,
				kept: cardsBeforeMulligan.includes(cardId),
			}));
		}
	});
	let cardsDrawn: { cardId: string; turn: number }[] = [];
	parser.on('card-draw', (event) => {
		cardsDrawn = [...cardsDrawn, { cardId: event.cardId, turn: event.turn }];
	});
	parser.parse();
	console.debug('cardsBeforeMulligan', cardsBeforeMulligan);

	const deckDefinition = decode(decklist);
	// List of cards, ordered by id, including duplicates
	const deckCards = deckDefinition.cards
		.flatMap((pair) => new Array(pair[1]).fill(allCards.getCard(pair[0]).id))
		.sort();
	const cardsAnalysis: readonly CardAnalysis[] = deckCards.map((cardId) => {
		const debug = cardId === 'REV_952';
		// Remove the info from cards after mulligan
		const cardAfterMulligan = cardsAfterMulligan.find((c) => c.cardId === cardId);
		if (cardAfterMulligan) {
			cardsAfterMulligan = cardsAfterMulligan.filter((c) => c !== cardAfterMulligan);
		}
		const cardBeforeMulliganIdx = cardsBeforeMulligan.indexOf(cardId);
		debug && console.log('cardBeforeMulliganIdx', cardBeforeMulliganIdx, cardsBeforeMulligan);
		if (cardBeforeMulliganIdx !== -1) {
			// Remove the info from cardsBeforeMulligan array, but be careful not to remove duplicates
			cardsBeforeMulligan.splice(cardBeforeMulliganIdx, 1);
		}
		const cardDrawn = cardsDrawn.find((c) => c.cardId === cardId);
		if (cardDrawn) {
			cardsDrawn = cardsDrawn.filter((c) => c !== cardDrawn);
		}

		return {
			cardId: cardId,
			drawnBeforeMulligan: cardBeforeMulliganIdx !== -1,
			mulligan: !!cardAfterMulligan,
			kept: cardAfterMulligan?.kept ?? false,
			drawnTurn: cardDrawn?.turn,
		};
	});

	const result: MatchAnalysis = {
		cardsAnalysis: cardsAnalysis,
	};
	console.debug(result.cardsAnalysis.filter((c) => c.cardId === 'REV_952'));
};
test();
