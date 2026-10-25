export function savedJobReportConfig(value: unknown): { title: string; status: string } {
  if (!value || typeof value !== 'object') throw new Error('Unsupported report configuration');
  const row = value as Record<string, unknown>;
  const filters = row.filter_config;
  const sections = row.selected_sections;
  const allowed = ['all', 'enquiry', 'quoting', 'quote_sent', 'accepted', 'in_progress', 'on_site', 'completed', 'on_hold', 'cancelled'];
  if (row.report_type !== 'jobs' || row.visibility !== 'internal_management' || typeof row.name !== 'string' || !row.name.trim() || !filters || typeof filters !== 'object' || Array.isArray(filters) || !Array.isArray(sections) || sections.length !== 1 || sections[0] !== 'job_status') throw new Error('Unsupported report configuration');
  const fields = filters as Record<string, unknown>;
  if (Object.keys(fields).some(key => key !== 'status') || typeof fields.status !== 'string' || !allowed.includes(fields.status)) throw new Error('Unsupported report configuration');
  return { title: row.name, status: fields.status };
}
