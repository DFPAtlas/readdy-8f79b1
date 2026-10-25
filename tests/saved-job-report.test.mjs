import test from 'node:test';
import assert from 'node:assert/strict';
import { savedJobReportConfig } from '../src/lib/saved-job-report.ts';
const valid = { name: 'Site progress', report_type: 'jobs', visibility: 'internal_management', selected_sections: ['job_status'], filter_config: { status: 'in_progress' } };
test('restores title and supported status', () => assert.deepEqual(savedJobReportConfig(valid), { title: 'Site progress', status: 'in_progress' }));
test('rejects configurations that would silently lose scope or sections', () => {
  for (const patch of [{ filter_config: { status: 'all', job_ids: ['private-job'] } }, { selected_sections: ['job_status', 'commercial'] }, { visibility: 'client_safe' }, { report_type: 'workforce' }, { filter_config: { status: 'invented' } }, { filter_config: null }, { name: '' }]) assert.throws(() => savedJobReportConfig({ ...valid, ...patch }));
});
