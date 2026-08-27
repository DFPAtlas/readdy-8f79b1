import { useNavigate } from 'react-router-dom';

const templates = [
  { label: 'Purchase Order — Materials', description: 'Standard PO template for material orders', icon: 'ri-clipboard-line' },
  { label: 'Purchase Order — Subcontract', description: 'PO template for subcontracted works', icon: 'ri-team-line' },
  { label: 'Purchase Order — Plant Hire', description: 'PO template for plant and equipment hire', icon: 'ri-tools-line' },
  { label: 'Request for Quotation', description: 'Standard RFQ template for supplier pricing', icon: 'ri-mail-send-line' },
  { label: 'Requisition Form', description: 'Material requisition template for site teams', icon: 'ri-file-list-3-line' },
  { label: 'Goods Receipt Note', description: 'Delivery receipt and inspection template', icon: 'ri-checkbox-circle-line' },
  { label: 'Supplier Return Note', description: 'Return authorisation and tracking template', icon: 'ri-arrow-go-back-line' },
  { label: 'Material Allocation Sheet', description: 'Job material allocation and tracking template', icon: 'ri-stack-line' },
];

export default function ProcurementTemplates() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Procurement Templates</h1>
          <p className="text-sm text-foreground-600 mt-1">Manage document templates for your procurement workflows</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-add-line text-base" />
          Create template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.label}
            className="bg-background-50 border border-background-200/70 rounded-xl p-5 hover:border-background-300/60 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-background-100 flex items-center justify-center mb-3">
              <i className={`${tpl.icon} text-lg text-foreground-700`} />
            </div>
            <h3 className="font-semibold text-foreground-950 mb-1">{tpl.label}</h3>
            <p className="text-sm text-foreground-600">{tpl.description}</p>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-background-200/70">
              <button className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors whitespace-nowrap cursor-pointer">
                <i className="ri-edit-line mr-1" /> Edit
              </button>
              <button className="text-xs font-medium text-foreground-600 hover:text-foreground-800 transition-colors whitespace-nowrap cursor-pointer">
                <i className="ri-download-line mr-1" /> Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-accent-50 border border-accent-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i className="ri-lightbulb-line text-accent-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground-950 mb-1">About templates</h3>
            <p className="text-sm text-foreground-700">
              Templates define the standard layouts and fields for your procurement documents.
              When you issue a purchase order or RFQ, the template controls which branding,
              terms, and fields are included. Edit templates to match your organisation's commercial terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}