// Field mode mock data — Voice Daily Log & OCR Scanner
export const fieldJobs = [
  {
    id: '104',
    reference: 'Job #104',
    project: 'Oakridge Residential Phase 2',
    site: 'Plot 12, Oakridge Estate',
    trade: 'Residential new build',
  },
  {
    id: '102',
    reference: 'Job #102',
    project: 'Ashford Commercial Fit-Out',
    site: 'Unit 7, Ashford Business Park',
    trade: 'Commercial fit-out',
  },
  {
    id: '098',
    reference: 'Job #098',
    project: 'Riverside Flats Block C',
    site: 'Block C, Riverside Wharf',
    trade: 'Residential flats',
  },
];

export const voiceTranscript =
  'Arrived at 7:30 AM. 4 bricklayers and 2 carpenters on site. Rain delayed scaffolding from 10 AM to 12 PM. Delivered 3 pallets of blocks.';

export const ocrLineItems = [
  { id: 'li1', description: '100m C24 Treated Timber 47x100mm', costCode: '04-Framing', amount: 240.0 },
  { id: 'li2', description: '10x Bags Portland Cement 25kg', costCode: '03-Masonry', amount: 85.0 },
  { id: 'li3', description: '2x Rolls DPC Membrane 450mm x 30m', costCode: '01-Groundworks', amount: 64.5 },
];

export const ocrMerchant = {
  name: 'Travis Perkins',
  branch: 'Bristol — Avonmouth',
  docket: 'DN-88214',
  date: '26 Aug 2026',
  poRef: 'PO #204-019',
  variance: '£0.00',
  confidence: 98,
};