
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding SUB001 data...');

    const sampleNo = 'SUB001'; // Matching the user's requesting ID

    // Clean up existing if any
    try {
        await prisma.wellPrediction.deleteMany({ where: { run: { sampleNo } } });
        await prisma.rowCounts.deleteMany({ where: { run: { sampleNo } } });
        await prisma.inferenceResult.deleteMany({ where: { run: { sampleNo } } });
        await prisma.predictionRun.deleteMany({ where: { sampleNo } });
        await prisma.sampleSummary.delete({ where: { sampleNo } });
    } catch (e) {
        console.log('Cleanup error (ignored):', e);
    }

    // Create a run for SUB001
    const run = await prisma.predictionRun.create({
        data: {
            sampleNo,
            submissionNo: 'SUB001',
            description: 'Manual Seed for SUB001',
            status: 'completed',
            predictAt: new Date(),
            processingTimeMs: 1500,
            confidenceThreshold: 0.90,
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
                            'Well 2': 1,
                            'Well 3': 0,
                            'Well 4': 0,
                            'Well 5': 1,
                            'Well 6': 1,
                            'Well 7': 3,
                            'total': 8
                        }
                    }
                }
            },
            wellPredictions: {
                createMany: {
                    data: [
                        { wellId: 'A1', label: 'Positive', class_: 'positive', confidence: 0.95, bbox: {} },
                        { wellId: 'A2', label: 'Positive', class_: 'positive', confidence: 0.92, bbox: {} }
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
                    'Well 2': 1,
                    'Well 3': 0,
                    'Well 4': 0,
                    'Well 5': 1,
                    'Well 6': 1,
                    'Well 7': 3,
                    'total': 8
                }
            },
            totalRuns: 1,
            lastRunAt: new Date(),
            lastRunId: run.id
        }
    });

    console.log('Seeding SUB001 completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
