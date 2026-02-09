
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create a sample run
    const sampleNo = 'TEST001';
    const run = await prisma.predictionRun.create({
        data: {
            sampleNo,
            submissionNo: 'SUB001',
            description: 'Test Run for Edit',
            status: 'completed',
            predictAt: new Date(),
            processingTimeMs: 1200,
            confidenceThreshold: 0.85,
            rowCounts: {
                create: {
                    counts: { positive: 5, negative: 3, total: 8 }
                }
            },
            inferenceResults: {
                create: {
                    results: {
                        distribution: {
                            'Well 1': 2,
                            'Well 2': 3,
                            'Well 3': 0,
                            'total': 5
                        }
                    }
                }
            },
            wellPredictions: {
                createMany: {
                    data: [
                        { wellId: 'A1', label: 'Positive', class_: 'positive', confidence: 0.95, bbox: {} },
                        { wellId: 'A2', label: 'Positive', class_: 'positive', confidence: 0.92, bbox: {} },
                        { wellId: 'B1', label: 'Negative', class_: 'negative', confidence: 0.88, bbox: {} },
                    ]
                }
            }
        }
    });

    // Create Sample Summary
    await prisma.sampleSummary.create({
        data: {
            sampleNo,
            summary: {
                distribution: {
                    'Well 1': 2,
                    'Well 2': 3,
                    'Well 3': 0,
                    'total': 5
                }
            },
            totalRuns: 1,
            lastRunAt: new Date(),
            lastRunId: run.id
        }
    });

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
