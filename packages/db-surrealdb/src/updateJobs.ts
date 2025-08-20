import type { UpdateJobs } from 'payload'

import type { SurrealDBAdapter } from './types.js'

export const updateJobs: UpdateJobs = async function updateJobs(this: SurrealDBAdapter, { jobs }) {
  try {
    // Create/update jobs table if it doesn't exist
    await this.client.query(`
      DEFINE TABLE payload_jobs SCHEMAFULL;
      DEFINE FIELD queue ON TABLE payload_jobs TYPE string;
      DEFINE FIELD taskId ON TABLE payload_jobs TYPE string;
      DEFINE FIELD taskSlug ON TABLE payload_jobs TYPE string;
      DEFINE FIELD input ON TABLE payload_jobs TYPE object;
      DEFINE FIELD waitUntil ON TABLE payload_jobs TYPE datetime;
      DEFINE FIELD waitingSince ON TABLE payload_jobs TYPE datetime;
      DEFINE FIELD attempts ON TABLE payload_jobs TYPE number;
      DEFINE FIELD completedAt ON TABLE payload_jobs TYPE option<datetime>;
      DEFINE FIELD error ON TABLE payload_jobs TYPE option<object>;
      DEFINE FIELD processing ON TABLE payload_jobs TYPE bool;
      DEFINE FIELD maxAttempts ON TABLE payload_jobs TYPE number;
      DEFINE FIELD totalTried ON TABLE payload_jobs TYPE number;
      DEFINE FIELD hasError ON TABLE payload_jobs TYPE bool;
      DEFINE INDEX idx_queue_taskid ON TABLE payload_jobs COLUMNS queue, taskId UNIQUE;
    `)

    // Process each job update
    for (const job of jobs) {
      const jobData = {
        attempts: job.attempts || 0,
        completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : null,
        error: job.error || null,
        hasError: job.hasError || false,
        input: job.input || {},
        maxAttempts: job.maxAttempts || 3,
        processing: job.processing || false,
        queue: job.queue || 'default',
        taskId: job.id,
        taskSlug: job.taskSlug,
        totalTried: job.totalTried || 0,
        waitingSince: job.waitingSince ? new Date(job.waitingSince).toISOString() : null,
        waitUntil: job.waitUntil ? new Date(job.waitUntil).toISOString() : null,
      }

      // Upsert the job
      const query = `
        UPDATE payload_jobs:${job.id} 
        CONTENT $data 
        RETURN *
      `

      await this.client.query(query, { data: jobData })
    }
  } catch (error) {
    this.payload.logger.error({ err: error, msg: 'Error updating jobs:' })
    throw error
  }
}
