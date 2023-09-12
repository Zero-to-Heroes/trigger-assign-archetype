import { getConnection } from '@firestone-hs/aws-lambda-utils';
import serverlessMysql from 'serverless-mysql';
import { SqsInput } from './sqs-input';

export const handleArchetypeMessage = async (message: SqsInput): Promise<void> => {
	const isValid = isMessageValid(message);
	if (!isValid) {
		return;
	}

	const mysql = await getConnection();
	const archetypeId = await insertArchetype(mysql, message.archetype);
	await addConstructedMatchStat(mysql, message, archetypeId);
	await mysql.end();
};

const isMessageValid = (message: SqsInput): boolean => {
	return !!message.playerRank?.length;
};

const addConstructedMatchStat = async (
	mysql: serverlessMysql.ServerlessMysql,
	message: SqsInput,
	archetypeId: number,
): Promise<void> => {
	const insertQuery = `
		INSERT INTO constructed_match_stats
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
			durationSeconds
		)
		VALUES
		(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`;
	const isLegend = message.playerRank?.includes('legend');
	const playerRank = isLegend
		? parseInt(message.playerRank.split('legend-')[1])
		: buildNumericalRankValue(message.playerRank);
	const result: any = await mysql.query(insertQuery, [
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
		message.playerDecklist,
		null,
		null,
		null,
	]);
};

const insertArchetype = async (mysql: serverlessMysql.ServerlessMysql, archetypeName: string): Promise<number> => {
	archetypeName = slugify(archetypeName);
	const selectQuery = `
        SELECT id FROM constructed_archetypes WHERE archetype = ?
    `;
	const selectResult: any = await mysql.query(selectQuery, [archetypeName]);
	// console.debug('selected archetype', archetypeName, selectResult);
	if (selectResult?.[0]?.id > 0) {
		return selectResult[0].id;
	}

	const insertQuery = `
        INSERT IGNORE INTO constructed_archetypes (archetype)
        VALUES (?)
    `;
	const result: any = await mysql.query(insertQuery, [archetypeName, archetypeName]);
	// console.debug('inserted archetype', archetypeName, result.insertId);
	if (result.insertId > 0) {
		return result.insertId;
	}

	return null;
};

// 1 is Diamond 1, 50 is bronze 10
const buildNumericalRankValue = (rank: string): number => {
	const [league, position] = rank.split('-');
	return 10 * (parseInt(league) - 1) + parseInt(position);
};

const slugify = (name: string): string => {
	return name
		.toLowerCase()
		.replace(/ /g, '-')
		.replace(/'/g, '')
		.replace(/\./g, '')
		.replace(/\(/g, '')
		.replace(/\)/g, '')
		.replace(/:/g, '')
		.replace(/!/g, '')
		.replace(/,/g, '')
		.replace(/;/g, '')
		.replace(/"/g, '')
		.replace(/’/g, '')
		.replace(/&/g, '')
		.replace(/%/g, '')
		.replace(/@/g, '')
		.replace(/#/g, '')
		.replace(/\+/g, '')
		.replace(/`/g, '')
		.replace(/’/g, '');
};
