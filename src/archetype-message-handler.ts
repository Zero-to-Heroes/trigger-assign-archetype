import { getConnection } from '@firestone-hs/aws-lambda-utils';
import serverlessMysql from 'serverless-mysql';
import { SqsInput } from './sqs-input';

export const handleArchetypeMessage = async (event: SqsInput): Promise<void> => {
	const mysql = await getConnection();
	const archetypeId = insertArchetype(mysql, event.archetype);
};

const insertArchetype = async (mysql: serverlessMysql.ServerlessMysql, archetypeName: string): Promise<number> => {
	const selectQuery = `
        SELECT id FROM constructed_archetypes WHERE archetype = ?
    `;
	const selectResult: any = await mysql.query(selectQuery, [archetypeName]);
	console.debug('selected archetype', archetypeName, selectResult);
	if (selectResult?.[0]?.id > 0) {
		return selectResult[0].id;
	}

	const insertQuery = `
        INSERT IGNORE INTO constructed_archetypes (archetype)
        VALUES (?)
    `;
	const result: any = await mysql.query(insertQuery, [archetypeName, archetypeName]);
	console.debug('inserted archetype', archetypeName, result.insertId);
	if (result.insertId > 0) {
		return result.insertId;
	}

	return null;
};
