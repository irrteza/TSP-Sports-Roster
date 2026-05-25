import { CreatorEditFormState } from '../types';
import { createAirtableRecordsBatch, BatchCreateResult } from './airtable';

// Batch size limit (Airtable allows up to 10 records per request)
const BATCH_SIZE = 10;

// Delay between batches to avoid rate limiting (ms)
const BATCH_DELAY = 200;

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  processedRecords: number;
  totalRecords: number;
  successCount: number;
  failureCount: number;
}

export interface RecordResult {
  rowNumber: number;
  name: string;
  success: boolean;
  recordId?: string;
  error?: string;
}

export interface BatchCreateAllResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: RecordResult[];
}

interface CreatorWithRow {
  rowNumber: number;
  data: CreatorEditFormState;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function batchCreateRecords(
  creators: CreatorWithRow[],
  onProgress: (progress: BatchProgress) => void
): Promise<BatchCreateAllResult> {
  const totalRecords = creators.length;
  const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);

  const allResults: RecordResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  let processedRecords = 0;

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, totalRecords);
    const batchCreators = creators.slice(start, end);

    // Report progress before batch
    onProgress({
      currentBatch: batchIndex + 1,
      totalBatches,
      processedRecords,
      totalRecords,
      successCount,
      failureCount,
    });

    // Create batch of records
    const batchResult: BatchCreateResult = await createAirtableRecordsBatch(
      batchCreators.map(c => c.data)
    );

    // Process results
    batchResult.results.forEach((result, index) => {
      const creator = batchCreators[index];
      const recordResult: RecordResult = {
        rowNumber: creator.rowNumber,
        name: creator.data.name,
        success: result.success,
        recordId: result.recordId,
        error: result.error,
      };

      allResults.push(recordResult);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    });

    processedRecords += batchCreators.length;

    // Report progress after batch
    onProgress({
      currentBatch: batchIndex + 1,
      totalBatches,
      processedRecords,
      totalRecords,
      successCount,
      failureCount,
    });

    // Delay between batches to avoid rate limiting (except for last batch)
    if (batchIndex < totalBatches - 1) {
      await delay(BATCH_DELAY);
    }
  }

  return {
    success: failureCount === 0,
    totalProcessed: processedRecords,
    successCount,
    failureCount,
    results: allResults,
  };
}
