import { SessionSummarizer } from '../../src/summarizer';

const summarizer = {
    styleTransfer: async (summary: string, activityType: string) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return `Transferred: ${summary}`;
    }
};

async function sequential() {
    const activities = Array.from({ length: 10 }).map((_, i) => ({
        index: i,
        activityId: `id-${i}`,
        summary: `Summary ${i}`,
        activityType: 'type'
    }));

    const start = Date.now();
    for (const activity of activities) {
        const newSummary = await summarizer.styleTransfer(
            activity.summary,
            activity.activityType,
        );
    }
    const end = Date.now();
    console.log(`Sequential took: ${end - start}ms`);
}

async function concurrent() {
    const activities = Array.from({ length: 10 }).map((_, i) => ({
        index: i,
        activityId: `id-${i}`,
        summary: `Summary ${i}`,
        activityType: 'type'
    }));

    const start = Date.now();
    await Promise.all(
        activities.map(async (activity) => {
            const newSummary = await summarizer.styleTransfer(
                activity.summary,
                activity.activityType,
            );
        })
    );
    const end = Date.now();
    console.log(`Concurrent took: ${end - start}ms`);
}

async function run() {
    await sequential();
    await concurrent();
}

run();
