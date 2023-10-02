import { decode } from '@firestone-hs/deckstrings';
import { Replay, parseHsReplayString } from '@firestone-hs/hs-replay-xml-parser/dist/public-api';
import { allCards, s3 } from '../process-assign-archetype';
import { SqsInput } from '../sqs-input';
import { cardDrawn } from './parsers/cards-draw-parser';
import { cardsInHand } from './parsers/cards-in-hand-parser';
import { ReplayParser } from './replay-parser';

export const buildMatchAnalysis = async (message: SqsInput): Promise<MatchAnalysis> => {
	const replay = await loadReplay(message.replayKey);
	const analysis = analyzeReplay(replay, message.playerDecklist);
	return analysis;
};

const analyzeReplay = (replay: Replay, decklist: string): MatchAnalysis => {
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
	let cardsDrawn: any[] = [];
	parser.on('card-draw', (event) => {
		// console.debug('card drawn', event.cardId);
		cardsDrawn = [...cardsDrawn, { cardId: event.cardId, turn: event.turn }];
	});
	parser.parse();

	const deckDefinition = decode(decklist);
	// List of cards, ordered by id, including duplicates
	const deckCards = deckDefinition.cards
		.flatMap((pair) => new Array(pair[1]).fill(allCards.getCard(pair[0]).id))
		.sort();
	const cardsAnalysis: readonly CardAnalysis[] = deckCards.map((cardId) => {
		// Remove the info from cards after mulligan
		const card = cardsAfterMulligan.find((c) => c.cardId === cardId);
		if (card) {
			cardsAfterMulligan = cardsAfterMulligan.filter((c) => c !== card);
		}
		return {
			cardId: cardId,
			mulligan: !!card,
			kept: card?.kept ?? false,
			drawnTurn: null,
		};
	});

	const result: MatchAnalysis = {
		cardsAnalysis: cardsAnalysis,
		// cardsBeforeMulligan: cardsBeforeMulligan,
		// cardsAfterMulligan: cardsAfterMulligan,
		// cardsDrawn: cardsDrawn,
	};
	return result;
};

const loadReplay = async (replayKey: string): Promise<Replay> => {
	const replayString = await loadReplayString(replayKey);
	if (!replayString || replayString.length === 0) {
		return null;
	}
	const replay: Replay = parseHsReplayString(replayString, allCards);
	return replay;
};

const loadReplayString = async (replayKey: string): Promise<string> => {
	if (!replayKey) {
		return null;
	}
	const data = await s3.readZippedContent('xml.firestoneapp.com', replayKey);
	return data;
};

export interface MatchAnalysis {
	readonly cardsAnalysis: readonly CardAnalysis[];
}

export interface CardAnalysis {
	cardId: string;
	mulligan: boolean;
	kept: boolean;
	drawnTurn: number;
}
