const { PrismaClient } = require("@prisma/client");
const { AggregationServiceImpl } = require("./dist/src/services/aggregation.service");
const axios = require("axios");

const p = new PrismaClient();
const agg = new AggregationServiceImpl(p);

(async () => {
  try {
    const predDbUrl = process.env.PREDICTION_DB_SERVICE_URL || "http://microplate-prediction-db-service:6406";
    const resp = await axios.get(predDbUrl + "/api/v1/prediction", { params: { page: 1, limit: 10000 } });
    const runs = resp.data.data.runs || [];
    const sampleNos = [...new Set(runs.map(r => r.sampleNo))];

    const existing = await p.sampleSummary.findMany({ select: { sampleNo: true } });
    const existingSet = new Set(existing.map(s => s.sampleNo));
    const missing = sampleNos.filter(s => !existingSet.has(s));

    console.log("Total unique samples:", sampleNos.length);
    console.log("Already in SampleSummary:", existingSet.size);
    console.log("Missing (need backfill):", missing.length);

    let ok = 0;
    let fail = 0;
    for (const sn of missing) {
      try {
        await agg.updateSampleSummary(sn);
        ok++;
        if (ok % 20 === 0) console.log("Progress:", ok, "/", missing.length);
      } catch (e) {
        console.error("Failed:", sn, e.message);
        fail++;
      }
    }

    console.log("Backfill complete:", ok, "success,", fail, "failed");
    const finalCount = await p.sampleSummary.count();
    console.log("Final SampleSummary count:", finalCount);
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    await p.$disconnect();
  }
})();
