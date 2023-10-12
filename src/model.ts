export interface MatchAnalysis {
	readonly cardsAnalysis: readonly CardAnalysis[];
}

export interface CardAnalysis {
	cardId: string;
	drawnBeforeMulligan: boolean;
	mulligan: boolean;
	kept: boolean;
	drawnTurn: number | undefined;
}
