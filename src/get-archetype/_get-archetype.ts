// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.

import { S3, getConnection } from '@firestone-hs/aws-lambda-utils';
import { AllCardsService } from '@firestone-hs/reference-data';

export const allCards = new AllCardsService();
export const s3 = new S3();

// [1]: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
export default async (event, context): Promise<any> => {
	console.debug('handling event', event);
	const mysql = await getConnection();
	const deckstring = event.rawPath.split('/').slice(-1)[0];
	const query = `SELECT archetypeId FROM constructed_deck_archetype WHERE deckstring = ?`;
	console.debug('query', query);
	const result = await mysql.query(query, [deckstring]);
	console.debug('result', result);
	const archetypeId = result?.[0]?.archetypeId;
	await mysql.end();
	return {
		statusCode: 200,
		headers: {
			'Cache-Control': 'public, max-age=7200', // Cache for 1 hour
			'Content-Type': 'application/json',
		},
		body: archetypeId,
	};
};
