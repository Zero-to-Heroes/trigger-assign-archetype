import { normalizeDeckList } from '@firestone-hs/reference-data';
import serverlessMysql from 'serverless-mysql';
import { buildMatchAnalysis } from './analysis/match-analysis';
import { MatchAnalysis } from './model';
import { allCards } from './process-assign-archetype';
import { SqsInput } from './sqs-input';

export const addConstructedMatchStat = async (
	mysql: serverlessMysql.ServerlessMysql,
	message: SqsInput,
	archetypeId: number,
): Promise<void> => {
	let matchAnalysis: MatchAnalysis = null;
	try {
		matchAnalysis = await buildMatchAnalysis(message);
	} catch (e) {
		console.error('Could not build match analysis', e);
	}
	const normalizedDecklist = normalizeDeckList(message.playerDecklist, allCards);
	const insertQuery = `
		INSERT IGNORE INTO constructed_match_stats
		(
			creationDate,
			buildNumber,
			reviewId,
			format,
			isLegend,
			playerRank,
			playerClass,
			playerArchetypeId,
			opponentClass,
			opponentArchetypeId,
			result,
			playerDecklist,
			opponentDecklist,
			durationTurns,
			durationSeconds,
            matchAnalysis
		)
		VALUES
		(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`;
	const isLegend = message.playerRank?.includes('legend');
	const playerRank = isLegend
		? parseInt(message.playerRank.split('legend-')[1])
		: buildNumericalRankValue(message.playerRank);
	await mysql.query(insertQuery, [
		message.creationDate,
		message.buildNumber,
		message.reviewId,
		message.gameFormat,
		isLegend,
		playerRank,
		message.playerClass,
		archetypeId,
		message.opponentClass,
		null,
		message.result,
		normalizedDecklist,
		null,
		null,
		null,
		JSON.stringify(matchAnalysis),
	]);

	if (archetypeId > 0) {
		// Also add a decklist/archetype mapping
		const deckArchetypeQuery = `
			INSERT IGNORE INTO constructed_deck_archetype
			(
				decklist,
				archetypeId
			)
			VALUES
			(?, ?)
		`;
		await mysql.query(deckArchetypeQuery, [normalizedDecklist, archetypeId]);
	}
};

// 1 is Diamond 1, 50 is bronze 10
const buildNumericalRankValue = (rank: string): number => {
	const [league, position] = rank.split('-');
	return 10 * (parseInt(league) - 1) + parseInt(position);
};
