import serverlessMysql from 'serverless-mysql';
import { addConstructedMatchStat } from './constructed-match-stat';
import { SqsInput } from './sqs-input';

export const handleArchetypeMessage = async (
	message: SqsInput,
	mysql: serverlessMysql.ServerlessMysql,
): Promise<void> => {
	const isValid = isMessageValid(message);
	if (!isValid) {
		return;
	}

	const archetypeId = await insertArchetype(mysql, message.archetype);
	await addConstructedMatchStat(mysql, message, archetypeId);
};

const isMessageValid = (message: SqsInput): boolean => {
	return !!message.playerRank?.length && !!message.playerDecklist?.length;
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
