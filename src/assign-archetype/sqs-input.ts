import { GameFormatString } from '@firestone-hs/reference-data';

export interface SqsInput {
	readonly coinPlay: 'play' | 'coin';
	readonly opponentClass: string;
	readonly opponentDecklist: string;
	readonly opponentHero: string;
	readonly opponentName: string;
	readonly opponentRank: string;
	readonly playerClass: string;
	readonly playerDecklist: string;
	readonly playerHero: string;
	readonly playerName: string;
	readonly playerRank: string;
	readonly result: 'lost' | 'won' | 'tied';
	readonly reviewId: string;
	readonly gameMode: string;
	readonly creationDate: string;
	readonly userId: string;
	readonly gameFormat: GameFormatString;
	readonly opponentCardId: string;
	readonly playerCardId: string;
	readonly uploaderToken: string;
	readonly buildNumber: string;
	readonly playerDeckName: string;
	readonly additionalResult: string;
	readonly replayKey: string;
	readonly application: string;
	readonly appVersion: string;
	readonly archetype: string;
}
