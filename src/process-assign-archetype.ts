// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.

import { getConnection } from '@firestone-hs/aws-lambda-utils';
import { handleArchetypeMessage } from './archetype-message-handler';
import { SqsInput } from './sqs-input';

// [1]: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
export default async (event): Promise<any> => {
	const messages: readonly SqsInput[] = (event.Records as any[])
		.map((event) => JSON.parse(event.body))
		.reduce((a, b) => a.concat(b), [])
		.filter((event) => event)
		.map((event) => event.Message)
		.filter((msg) => msg)
		.map((msg) => JSON.parse(msg));
	const mysql = await getConnection();
	for (const message of messages) {
		await handleArchetypeMessage(message, mysql);
	}
	await mysql.end();
	return { statusCode: 200, body: null };
};
