import { processSessionAndPrint } from './pipeline.js';

async function main() {
    const sessionId = '7058525030495993685';
    for await (const result of processSessionAndPrint(sessionId)) {
        console.log(result);
    }
}

main();