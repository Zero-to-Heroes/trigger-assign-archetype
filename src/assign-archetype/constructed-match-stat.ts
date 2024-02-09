import { normalizeDeckList } from '@firestone-hs/reference-data';
import { ReplayUploadMetadata } from '@firestone-hs/replay-metadata';
import serverlessMysql from 'serverless-mysql';
import { MatchAnalysis } from '../model';
import { buildMatchAnalysis, loadMetaDataFile } from './analysis/match-analysis';
import { allCards } from './process-assign-archetype';
import { SqsInput } from './sqs-input';

export const addConstructedMatchStat = async (
	mysql: serverlessMysql.ServerlessMysql,
	message: SqsInput,
	archetypeId: number,
): Promise<ReplayUploadMetadata> => {
	const metadata = await loadMetaDataFile(message.metadataKey);

	let matchAnalysis: MatchAnalysis = null;
	try {
		matchAnalysis = await buildMatchAnalysis(message, metadata);
	} catch (e) {
		console.error('Could not build match analysis', e);
	}
	const normalizedDecklist =
		metadata?.game?.normalizedDeckstring ?? normalizeDeckList(message.playerDecklist, allCards);
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
	const result = await mysql.query(insertQuery, [
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
	// console.debug('running query', result, insertQuery, message.creationDate, message.reviewId);

	if (archetypeId > 0) {
		// Also add a decklist/archetype mapping
		const deckArchetypeQuery = `
			INSERT IGNORE INTO constructed_deck_archetype
			(
				deckstring,
				archetypeId
			)
			VALUES
			(?, ?)
		`;
		await mysql.query(deckArchetypeQuery, [normalizedDecklist.replaceAll('/', '-'), archetypeId]);
	}

	return metadata;
};

// 1 is Diamond 1, 50 is bronze 10
const buildNumericalRankValue = (rank: string): number => {
	const [league, position] = rank.split('-');
	return 10 * (parseInt(league) - 1) + parseInt(position);
};
