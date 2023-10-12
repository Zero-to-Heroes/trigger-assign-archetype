// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.

import { S3, getConnection } from '@firestone-hs/aws-lambda-utils';
import { AllCardsService } from '@firestone-hs/reference-data';
import { handleArchetypeMessage } from './archetype-message-handler';
import { SqsInput } from './sqs-input';

export const allCards = new AllCardsService();
export const s3 = new S3();

// [1]: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
export default async (event): Promise<any> => {
	const messages: readonly SqsInput[] = (event.Records as any[])
		.map((event) => JSON.parse(event.body))
		.reduce((a, b) => a.concat(b), [])
		.filter((event) => event)
		.map((event) => event.Message)
		.filter((msg) => msg)
		.map((msg) => JSON.parse(msg));
	if (!allCards.getCards()?.length) {
		await allCards.initializeCardsDb();
	}
	const mysql = await getConnection();
	for (const message of messages) {
		await handleArchetypeMessage(message, mysql);
	}
	await mysql.end();
	return { statusCode: 200, body: null };
};
