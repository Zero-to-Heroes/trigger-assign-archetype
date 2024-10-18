import serverlessMysql from 'serverless-mysql';
import { addConstructedMatchStat } from './constructed-match-stat';
import { SqsInput } from './sqs-input';

const knownArchetypesCache: { [archetype: string]: number } = {};

export const handleArchetypeMessage = async (
	message: SqsInput,
	mysql: serverlessMysql.ServerlessMysql,
): Promise<void> => {
	const start = Date.now();
	const archetypeId = await insertArchetype(mysql, message.archetype);
	const metadata = await addConstructedMatchStat(mysql, message, archetypeId);
	if (metadata != null || message.userId === 'OW_e9585b6b-4468-4455-9768-9fe91b05faed') {
		console.debug(
			'process took',
			Date.now() - start,
			'ms',
			'with analysis from metadata?',
			!!metadata?.stats?.matchAnalysis,
			message.reviewId,
		);
	}
};

const insertArchetype = async (mysql: serverlessMysql.ServerlessMysql, archetypeName: string): Promise<number> => {
	if (knownArchetypesCache[archetypeName]) {
		return knownArchetypesCache[archetypeName];
	}

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
		knownArchetypesCache[archetypeName] = result.insertId;
		return result.insertId;
	}

	return null;
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
