import { analyzeReplay, loadReplay } from '../src/analysis/match-analysis';
import { allCards } from '../src/process-assign-archetype';

const test = async () => {
	const replayKey = 'hearthstone/replay/2023/10/12/f5f5e67a-8885-4302-8294-a56b9708db8d.xml.zip';
	const decklist = 'AAECAZ8FBIbiBKHiBISWBfboBQ3JoATXvQTavQS/4gTA4gSrkwWBlgWDlgXBxAXGxAWOlQa1ngaGowYAAA==';

	await allCards.initializeCardsDb();
	const replay = await loadReplay(replayKey);
	const analysis = analyzeReplay(replay, decklist);
	console.debug(analysis.cardsAnalysis.filter((c) => c.cardId === 'REV_952'));
};
test();
