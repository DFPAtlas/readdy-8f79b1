-- Phase 15: Suppliers, Procurement, Materials and Purchase Orders

-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE requisition_status AS ENUM ('draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'partially_ordered', 'fully_ordered', 'rejected', 'cancelled');
CREATE TYPE rfq_status AS ENUM ('draft', 'issued', 'partially_responded', 'closed', 'awarded', 'cancelled');
CREATE TYPE purchase_order_status AS ENUM ('draft', 'awaiting_approval', 'approved', 'issued', 'acknowledged', 'partially_delivered', 'fully_delivered', 'closed', 'cancelled', 'superseded');
CREATE TYPE goods_receipt_status AS ENUM ('complete', 'partial', 'damaged', 'short', 'rejected', 'unplanned');
CREATE TYPE stock_movement_type AS ENUM ('receipt', 'transfer', 'job_issue', 'return_from_job', 'supplier_return', 'adjustment', 'write_off');
CREATE TYPE supplier_invoice_status AS ENUM ('draft', 'received', 'pending_match', 'matched', 'exception', 'approved', 'paid', 'disputed', 'cancelled');
CREATE TYPE invoice_match_type AS ENUM ('two_way', 'three_way', 'none');
CREATE TYPE supplier_status AS ENUM ('active', 'suspended', 'archived');
CREATE TYPE delivery_issue_status AS ENUM ('open', 'investigating', 'supplier_notified', 'resolved', 'credited', 'closed');
CREATE TYPE return_status AS ENUM ('authorised', 'in_progress', 'collected', 'returned', 'credited', 'cancelled');
CREATE TYPE hire_status AS ENUM ('requested', 'confirmed', 'on_hire', 'off_hired', 'disputed', 'closed');
CREATE TYPE approval_decision AS ENUM ('pending', 'approved', 'rejected', 'overridden');

-- ============================================================================
-- SUPPLIERS
-- ============================================================================
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  trading_name text NOT NULL,
  legal_name text,
  supplier_reference text,
  company_number text,
  vat_number text,
  website text,
  account_number text,
  payment_terms text,
  lead_time_notes text,
  minimum_order text,
  delivery_areas text,
  status supplier_status NOT NULL DEFAULT 'active',
  is_approved boolean NOT NULL DEFAULT false,
  insurance_document_url text,
  internal_rating integer CHECK (internal_rating >= 1 AND internal_rating <= 5),
  internal_notes text,
  payment_method text,
  bank_name text,
  bank_account_last_four text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE supplier_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  job_title text,
  email text,
  phone text,
  mobile text,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE supplier_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  branch_name text NOT NULL,
  address_line1 text,
  address_line2 text,
  city text,
  county text,
  postcode text,
  country text DEFAULT 'GB',
  phone text,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE supplier_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_hash text,
  issued_date date,
  expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE supplier_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, name)
);

-- Supplier-category junction
CREATE TABLE supplier_category_links (
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES supplier_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (supplier_id, category_id)
);

-- ============================================================================
-- MATERIAL CATALOGUE
-- ============================================================================
CREATE TABLE material_catalogue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  internal_code text,
  description text NOT NULL,
  category text,
  manufacturer text,
  part_number text,
  unit_of_measure text NOT NULL DEFAULT 'each',
  preferred_supplier_id uuid REFERENCES suppliers(id),
  latest_cost_pence integer,
  latest_cost_date timestamptz,
  lead_time_days integer,
  minimum_order_quantity numeric(12,4) DEFAULT 1,
  pack_size numeric(12,4),
  tax_treatment text DEFAULT 'standard',
  storage_requirements text,
  safety_data_sheet_url text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE supplier_item_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_item_id uuid NOT NULL REFERENCES material_catalogue_items(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_item_code text,
  unit_price_pence integer NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  effective_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz,
  lead_time_days integer,
  minimum_order numeric(12,4),
  is_preferred boolean NOT NULL DEFAULT false,
  quoted_by text,
  quote_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(material_item_id, supplier_id, effective_date)
);

-- ============================================================================
-- PURCHASE REQUISITIONS
-- ============================================================================
CREATE TABLE purchase_requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  reference text NOT NULL,
  job_id uuid REFERENCES jobs(id),
  requester_id uuid NOT NULL,
  required_by_date date,
  delivery_location text,
  priority text DEFAULT 'normal',
  cost_code text,
  task_or_phase text,
  estimated_cost_pence integer,
  reason text,
  status requisition_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  UNIQUE(organisation_id, reference)
);

CREATE TABLE requisition_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  material_item_id uuid REFERENCES material_catalogue_items(id),
  description text NOT NULL,
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit_of_measure text NOT NULL DEFAULT 'each',
  suggested_supplier_id uuid REFERENCES suppliers(id),
  estimated_unit_price_pence integer,
  estimated_line_total_pence integer,
  cost_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requisition_id, line_number)
);

-- ============================================================================
-- APPROVAL RULES & APPROVALS
-- ============================================================================
CREATE TABLE procurement_approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  min_value_pence integer NOT NULL DEFAULT 0,
  max_value_pence integer,
  job_id uuid REFERENCES jobs(id),
  cost_code text,
  supplier_id uuid REFERENCES suppliers(id),
  approver_role text NOT NULL,
  approval_order integer NOT NULL DEFAULT 1,
  prevent_self_approval boolean NOT NULL DEFAULT true,
  is_emergency_allowed boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE procurement_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid REFERENCES purchase_requisitions(id),
  approval_rule_id uuid REFERENCES procurement_approval_rules(id),
  approver_id uuid NOT NULL,
  decision approval_decision NOT NULL DEFAULT 'pending',
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- REQUESTS FOR QUOTATION (RFQ)
-- ============================================================================
CREATE TABLE requests_for_quotation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  reference text NOT NULL,
  job_id uuid REFERENCES jobs(id),
  description text,
  delivery_address text,
  required_by_date date,
  response_deadline timestamptz,
  commercial_notes text,
  internal_notes text,
  status rfq_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  issued_at timestamptz,
  closed_at timestamptz,
  awarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, reference)
);

CREATE TABLE rfq_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES requests_for_quotation(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  material_item_id uuid REFERENCES material_catalogue_items(id),
  description text NOT NULL,
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit_of_measure text NOT NULL DEFAULT 'each',
  specification text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rfq_id, line_number)
);

CREATE TABLE rfq_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES requests_for_quotation(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  invitation_token text UNIQUE,
  invitation_sent_at timestamptz,
  intention_to_quote boolean,
  response_received boolean NOT NULL DEFAULT false,
  response_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rfq_id, supplier_id)
);

-- Supplier RFQ responses
CREATE TABLE supplier_quote_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_supplier_id uuid NOT NULL REFERENCES rfq_suppliers(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  delivery_charge_pence integer DEFAULT 0,
  lead_time_days integer,
  validity_date date,
  quote_document_url text,
  alternatives_text text,
  questions_text text,
  status text DEFAULT 'submitted',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE supplier_quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_response_id uuid NOT NULL REFERENCES supplier_quote_responses(id) ON DELETE CASCADE,
  rfq_line_id uuid NOT NULL REFERENCES rfq_lines(id),
  unit_price_pence integer,
  availability text,
  alternative_item text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PURCHASE ORDERS
-- ============================================================================
CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  po_number text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  job_id uuid REFERENCES jobs(id),
  cost_code text,
  delivery_address text,
  delivery_contact text,
  order_date date,
  required_delivery_date date,
  supplier_quote_reference text,
  delivery_charge_pence integer DEFAULT 0,
  net_total_pence integer,
  tax_total_pence integer,
  gross_total_pence integer,
  tax_rate numeric(6,4),
  instructions text,
  terms_reference text,
  requested_by uuid NOT NULL,
  approved_by uuid,
  status purchase_order_status NOT NULL DEFAULT 'draft',
  acknowledged_at timestamptz,
  issued_at timestamptz,
  closed_at timestamptz,
  sent_to text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, po_number, version)
);

CREATE TABLE purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  material_item_id uuid REFERENCES material_catalogue_items(id),
  description text NOT NULL,
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit_of_measure text NOT NULL DEFAULT 'each',
  unit_price_pence integer NOT NULL,
  line_total_pence integer,
  tax_rate numeric(6,4),
  requisition_line_id uuid REFERENCES requisition_lines(id),
  notes text,
  received_quantity numeric(12,4) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(purchase_order_id, line_number)
);

CREATE TABLE purchase_order_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  version integer NOT NULL,
  change_reason text NOT NULL,
  changed_by uuid NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(purchase_order_id, version)
);

CREATE TABLE order_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  acknowledged_by uuid,
  supplier_contact_name text,
  response_type text NOT NULL,
  confirmed_delivery_date date,
  supplier_reference text,
  notes text,
  acknowledged_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- GOODS RECEIPTS
-- ============================================================================
CREATE TABLE goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  delivery_note_number text,
  arrival_date date,
  arrival_time time,
  received_by uuid NOT NULL,
  job_id uuid REFERENCES jobs(id),
  location text,
  status goods_receipt_status NOT NULL DEFAULT 'partial',
  notes text,
  photographs jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE goods_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id uuid NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_line_id uuid REFERENCES purchase_order_lines(id),
  ordered_quantity numeric(12,4) NOT NULL DEFAULT 0,
  previously_received numeric(12,4) DEFAULT 0,
  received_now numeric(12,4) NOT NULL DEFAULT 0,
  accepted_quantity numeric(12,4) NOT NULL DEFAULT 0,
  rejected_quantity numeric(12,4) DEFAULT 0,
  damaged_quantity numeric(12,4) DEFAULT 0,
  missing_quantity numeric(12,4) DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- DELIVERY ISSUES & RETURNS
-- ============================================================================
CREATE TABLE delivery_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  goods_receipt_id uuid REFERENCES goods_receipts(id),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
  issue_type text NOT NULL,
  description text NOT NULL,
  reported_by uuid NOT NULL,
  assigned_to uuid,
  supplier_notified boolean NOT NULL DEFAULT false,
  supplier_notified_at timestamptz,
  evidence_urls jsonb DEFAULT '[]',
  affected_task text,
  resolution text,
  replacement_date date,
  credit_expected boolean NOT NULL DEFAULT false,
  credit_amount_pence integer,
  status delivery_issue_status NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE supplier_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  return_reference text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  delivery_issue_id uuid REFERENCES delivery_issues(id),
  reason text NOT NULL,
  collection_address text,
  collection_date date,
  return_method text,
  evidence_urls jsonb DEFAULT '[]',
  credit_note_received boolean NOT NULL DEFAULT false,
  credit_note_amount_pence integer,
  credit_note_reference text,
  status return_status NOT NULL DEFAULT 'authorised',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, return_reference)
);

CREATE TABLE supplier_return_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_return_id uuid NOT NULL REFERENCES supplier_returns(id) ON DELETE CASCADE,
  goods_receipt_line_id uuid REFERENCES goods_receipt_lines(id),
  description text NOT NULL,
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit_price_pence integer,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INVENTORY & LOCATIONS
-- ============================================================================
CREATE TABLE inventory_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  location_type text NOT NULL,
  job_id uuid REFERENCES jobs(id),
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES inventory_locations(id),
  material_item_id uuid NOT NULL REFERENCES material_catalogue_items(id),
  quantity_on_hand numeric(12,4) NOT NULL DEFAULT 0,
  reserved_quantity numeric(12,4) DEFAULT 0,
  minimum_level numeric(12,4) DEFAULT 0,
  reorder_level numeric(12,4) DEFAULT 0,
  last_counted_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(location_id, material_item_id)
);

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  location_id uuid NOT NULL REFERENCES inventory_locations(id),
  material_item_id uuid NOT NULL REFERENCES material_catalogue_items(id),
  movement_type stock_movement_type NOT NULL,
  quantity numeric(12,4) NOT NULL,
  reference_type text,
  reference_id uuid,
  job_id uuid REFERENCES jobs(id),
  performed_by uuid NOT NULL,
  reason text,
  unit_cost_pence integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- MATERIAL ALLOCATIONS
-- ============================================================================
CREATE TABLE material_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  job_id uuid NOT NULL REFERENCES jobs(id),
  material_item_id uuid NOT NULL REFERENCES material_catalogue_items(id),
  purchase_order_line_id uuid REFERENCES purchase_order_lines(id),
  quantity_required numeric(12,4) NOT NULL DEFAULT 0,
  quantity_ordered numeric(12,4) DEFAULT 0,
  quantity_received numeric(12,4) DEFAULT 0,
  quantity_allocated numeric(12,4) DEFAULT 0,
  quantity_used numeric(12,4) DEFAULT 0,
  quantity_returned numeric(12,4) DEFAULT 0,
  task_or_phase text,
  allocated_by uuid,
  allocated_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PLANT & TOOL HIRE
-- ============================================================================
CREATE TABLE plant_hire_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  hire_reference text,
  job_id uuid REFERENCES jobs(id),
  equipment_description text NOT NULL,
  equipment_type text,
  quantity integer NOT NULL DEFAULT 1,
  hire_start_date date NOT NULL,
  hire_end_date date,
  rate_pence integer,
  charging_unit text DEFAULT 'per_week',
  deposit_pence integer DEFAULT 0,
  delivery_address text,
  collection_address text,
  operator_required boolean NOT NULL DEFAULT false,
  inspection_url text,
  certificate_url text,
  off_hire_reference text,
  off_hire_date date,
  damage_charges_pence integer DEFAULT 0,
  damage_notes text,
  status hire_status NOT NULL DEFAULT 'requested',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- SUPPLIER INVOICES & MATCHING
-- ============================================================================
CREATE TABLE supplier_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  invoice_number text NOT NULL,
  invoice_date date,
  due_date date,
  purchase_order_id uuid REFERENCES purchase_orders(id),
  job_id uuid REFERENCES jobs(id),
  cost_code text,
  net_amount_pence integer NOT NULL DEFAULT 0,
  tax_amount_pence integer DEFAULT 0,
  gross_amount_pence integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  tax_rate numeric(6,4),
  invoice_document_url text,
  approval_status text DEFAULT 'pending',
  payment_status text DEFAULT 'unpaid',
  payment_reference text,
  paid_at timestamptz,
  status supplier_invoice_status NOT NULL DEFAULT 'received',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, supplier_id, invoice_number)
);

CREATE TABLE supplier_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_invoice_id uuid NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  description text NOT NULL,
  quantity numeric(12,4) DEFAULT 1,
  unit_price_pence integer NOT NULL,
  line_total_pence integer,
  tax_rate numeric(6,4),
  purchase_order_line_id uuid REFERENCES purchase_order_lines(id),
  goods_receipt_line_id uuid REFERENCES goods_receipt_lines(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_invoice_id, line_number)
);

CREATE TABLE invoice_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_invoice_id uuid NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES purchase_orders(id),
  goods_receipt_id uuid REFERENCES goods_receipts(id),
  match_type invoice_match_type NOT NULL DEFAULT 'two_way',
  price_match boolean NOT NULL DEFAULT true,
  quantity_match boolean NOT NULL DEFAULT true,
  tax_match boolean NOT NULL DEFAULT true,
  exceptions jsonb DEFAULT '[]',
  matched_by uuid,
  matched_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_invoice_id)
);

CREATE TABLE supplier_credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  supplier_invoice_id uuid REFERENCES supplier_invoices(id),
  credit_note_number text NOT NULL,
  credit_note_date date,
  amount_pence integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  reason text,
  document_url text,
  status text DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, supplier_id, credit_note_number)
);

-- ============================================================================
-- PROCUREMENT-REQUISITION SUPPORTING FILES
-- ============================================================================
CREATE TABLE requisition_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rfq_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES requests_for_quotation(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PURCHASE ORDER SNAPSHOTS (immutable line snapshots at issue time)
-- ============================================================================
CREATE TABLE purchase_order_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  version integer NOT NULL,
  po_pdf_url text,
  po_pdf_hash text,
  snapshot_data jsonb NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(purchase_order_id, version)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_suppliers_org ON suppliers(organisation_id);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_trading_name ON suppliers(organisation_id, trading_name);
CREATE INDEX idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);
CREATE INDEX idx_supplier_branches_supplier ON supplier_branches(supplier_id);
CREATE INDEX idx_supplier_documents_supplier ON supplier_documents(supplier_id);
CREATE INDEX idx_supplier_categories_org ON supplier_categories(organisation_id);
CREATE INDEX idx_material_catalogue_org ON material_catalogue_items(organisation_id);
CREATE INDEX idx_material_catalogue_category ON material_catalogue_items(organisation_id, category);
CREATE INDEX idx_material_catalogue_active ON material_catalogue_items(organisation_id, is_active);
CREATE INDEX idx_supplier_item_prices_item ON supplier_item_prices(material_item_id);
CREATE INDEX idx_supplier_item_prices_supplier ON supplier_item_prices(supplier_id);
CREATE INDEX idx_purchase_requisitions_org ON purchase_requisitions(organisation_id);
CREATE INDEX idx_purchase_requisitions_job ON purchase_requisitions(job_id);
CREATE INDEX idx_purchase_requisitions_status ON purchase_requisitions(organisation_id, status);
CREATE INDEX idx_requisition_lines_req ON requisition_lines(requisition_id);
CREATE INDEX idx_procurement_approval_rules_org ON procurement_approval_rules(organisation_id);
CREATE INDEX idx_procurement_approvals_req ON procurement_approvals(requisition_id);
CREATE INDEX idx_requests_for_quotation_org ON requests_for_quotation(organisation_id);
CREATE INDEX idx_requests_for_quotation_job ON requests_for_quotation(job_id);
CREATE INDEX idx_requests_for_quotation_status ON requests_for_quotation(organisation_id, status);
CREATE INDEX idx_rfq_lines_rfq ON rfq_lines(rfq_id);
CREATE INDEX idx_rfq_suppliers_rfq ON rfq_suppliers(rfq_id);
CREATE INDEX idx_rfq_suppliers_supplier ON rfq_suppliers(supplier_id);
CREATE INDEX idx_rfq_suppliers_token ON rfq_suppliers(invitation_token);
CREATE INDEX idx_supplier_quote_responses_rfqs ON supplier_quote_responses(rfq_supplier_id);
CREATE INDEX idx_supplier_quote_lines_response ON supplier_quote_lines(quote_response_id);
CREATE INDEX idx_purchase_orders_org ON purchase_orders(organisation_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_job ON purchase_orders(job_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(organisation_id, status);
CREATE INDEX idx_purchase_orders_due ON purchase_orders(required_delivery_date);
CREATE INDEX idx_purchase_order_lines_po ON purchase_order_lines(purchase_order_id);
CREATE INDEX idx_purchase_order_versions_po ON purchase_order_versions(purchase_order_id);
CREATE INDEX idx_order_acknowledgements_po ON order_acknowledgements(purchase_order_id);
CREATE INDEX idx_goods_receipts_org ON goods_receipts(organisation_id);
CREATE INDEX idx_goods_receipts_po ON goods_receipts(purchase_order_id);
CREATE INDEX idx_goods_receipt_lines_receipt ON goods_receipt_lines(goods_receipt_id);
CREATE INDEX idx_delivery_issues_org ON delivery_issues(organisation_id);
CREATE INDEX idx_delivery_issues_po ON delivery_issues(purchase_order_id);
CREATE INDEX idx_delivery_issues_status ON delivery_issues(organisation_id, status);
CREATE INDEX idx_supplier_returns_org ON supplier_returns(organisation_id);
CREATE INDEX idx_supplier_returns_supplier ON supplier_returns(supplier_id);
CREATE INDEX idx_supplier_return_lines_return ON supplier_return_lines(supplier_return_id);
CREATE INDEX idx_inventory_locations_org ON inventory_locations(organisation_id);
CREATE INDEX idx_inventory_balances_location ON inventory_balances(location_id);
CREATE INDEX idx_inventory_balances_item ON inventory_balances(material_item_id);
CREATE INDEX idx_stock_movements_location ON stock_movements(location_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(material_item_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX idx_material_allocations_job ON material_allocations(job_id);
CREATE INDEX idx_material_allocations_item ON material_allocations(material_item_id);
CREATE INDEX idx_plant_hire_records_org ON plant_hire_records(organisation_id);
CREATE INDEX idx_plant_hire_records_job ON plant_hire_records(job_id);
CREATE INDEX idx_plant_hire_records_status ON plant_hire_records(organisation_id, status);
CREATE INDEX idx_plant_hire_records_end ON plant_hire_records(hire_end_date);
CREATE INDEX idx_supplier_invoices_org ON supplier_invoices(organisation_id);
CREATE INDEX idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_po ON supplier_invoices(purchase_order_id);
CREATE INDEX idx_supplier_invoices_status ON supplier_invoices(organisation_id, status);
CREATE INDEX idx_supplier_invoices_due ON supplier_invoices(due_date);
CREATE INDEX idx_supplier_invoice_lines_invoice ON supplier_invoice_lines(supplier_invoice_id);
CREATE INDEX idx_invoice_matches_invoice ON invoice_matches(supplier_invoice_id);
CREATE INDEX idx_supplier_credit_notes_org ON supplier_credit_notes(organisation_id);
CREATE INDEX idx_supplier_credit_notes_invoice ON supplier_credit_notes(supplier_invoice_id);
CREATE INDEX idx_po_snapshots_po ON purchase_order_snapshots(purchase_order_id);

-- ============================================================================
-- RLS — ENABLE ON ALL PROCUREMENT TABLES
-- ============================================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_catalogue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_item_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisition_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests_for_quotation ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quote_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_return_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_hire_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisition_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES — Standard org-scoped SELECT for all tables
-- ============================================================================
-- Macro helper: org membership check function
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'suppliers', 'supplier_contacts', 'supplier_branches', 'supplier_documents',
      'supplier_categories', 'supplier_category_links',
      'material_catalogue_items', 'supplier_item_prices',
      'purchase_requisitions', 'requisition_lines',
      'procurement_approval_rules', 'procurement_approvals',
      'requests_for_quotation', 'rfq_lines', 'rfq_suppliers',
      'supplier_quote_responses', 'supplier_quote_lines',
      'purchase_orders', 'purchase_order_lines', 'purchase_order_versions',
      'order_acknowledgements',
      'goods_receipts', 'goods_receipt_lines',
      'delivery_issues', 'supplier_returns', 'supplier_return_lines',
      'inventory_locations', 'inventory_balances', 'stock_movements',
      'material_allocations', 'plant_hire_records',
      'supplier_invoices', 'supplier_invoice_lines', 'invoice_matches',
      'supplier_credit_notes',
      'requisition_attachments', 'rfq_documents',
      'purchase_order_snapshots'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "Org members can SELECT from %1$s" ON %1$s FOR SELECT USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = ''active''));',
      tbl
    );
  END LOOP;
END $$;

-- Supplier contacts and branches: inherit supplier org
CREATE POLICY "Org members can SELECT supplier_contacts through supplier" ON supplier_contacts FOR SELECT
  USING (supplier_id IN (SELECT id FROM suppliers WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

CREATE POLICY "Org members can SELECT supplier_branches through supplier" ON supplier_branches FOR SELECT
  USING (supplier_id IN (SELECT id FROM suppliers WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

CREATE POLICY "Org members can SELECT supplier_documents through supplier" ON supplier_documents FOR SELECT
  USING (supplier_id IN (SELECT id FROM suppliers WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

-- Supplier category links: inherit through supplier
CREATE POLICY "Org members can SELECT supplier_category_links through supplier" ON supplier_category_links FOR SELECT
  USING (supplier_id IN (SELECT id FROM suppliers WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

-- Supplier item prices: inherit through supplier
CREATE POLICY "Org members can SELECT supplier_item_prices through supplier" ON supplier_item_prices FOR SELECT
  USING (supplier_id IN (SELECT id FROM suppliers WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

-- INSERT policies — organisation members can create records for their org
CREATE POLICY "Org members can INSERT suppliers" ON suppliers FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT supplier_contacts" ON supplier_contacts FOR INSERT WITH CHECK (supplier_id IN (SELECT id FROM suppliers WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT supplier_branches" ON supplier_branches FOR INSERT WITH CHECK (supplier_id IN (SELECT id FROM suppliers WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT supplier_documents" ON supplier_documents FOR INSERT WITH CHECK (supplier_id IN (SELECT id FROM suppliers WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT material_catalogue_items" ON material_catalogue_items FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT supplier_item_prices" ON supplier_item_prices FOR INSERT WITH CHECK (supplier_id IN (SELECT id FROM suppliers WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT purchase_requisitions" ON purchase_requisitions FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT requisition_lines" ON requisition_lines FOR INSERT WITH CHECK (requisition_id IN (SELECT id FROM purchase_requisitions WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT procurement_approval_rules" ON procurement_approval_rules FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT procurement_approvals" ON procurement_approvals FOR INSERT WITH CHECK (requisition_id IN (SELECT id FROM purchase_requisitions WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT requests_for_quotation" ON requests_for_quotation FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT rfq_lines" ON rfq_lines FOR INSERT WITH CHECK (rfq_id IN (SELECT id FROM requests_for_quotation WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT rfq_suppliers" ON rfq_suppliers FOR INSERT WITH CHECK (rfq_id IN (SELECT id FROM requests_for_quotation WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT purchase_orders" ON purchase_orders FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT purchase_order_lines" ON purchase_order_lines FOR INSERT WITH CHECK (purchase_order_id IN (SELECT id FROM purchase_orders WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT order_acknowledgements" ON order_acknowledgements FOR INSERT WITH CHECK (purchase_order_id IN (SELECT id FROM purchase_orders WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT goods_receipts" ON goods_receipts FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT goods_receipt_lines" ON goods_receipt_lines FOR INSERT WITH CHECK (goods_receipt_id IN (SELECT id FROM goods_receipts WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT delivery_issues" ON delivery_issues FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT supplier_returns" ON supplier_returns FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT supplier_return_lines" ON supplier_return_lines FOR INSERT WITH CHECK (supplier_return_id IN (SELECT id FROM supplier_returns WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT inventory_locations" ON inventory_locations FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT inventory_balances" ON inventory_balances FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT stock_movements" ON stock_movements FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT material_allocations" ON material_allocations FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT plant_hire_records" ON plant_hire_records FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT supplier_invoices" ON supplier_invoices FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT supplier_invoice_lines" ON supplier_invoice_lines FOR INSERT WITH CHECK (supplier_invoice_id IN (SELECT id FROM supplier_invoices WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT invoice_matches" ON invoice_matches FOR INSERT WITH CHECK (supplier_invoice_id IN (SELECT id FROM supplier_invoices WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT supplier_credit_notes" ON supplier_credit_notes FOR INSERT WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can INSERT requisition_attachments" ON requisition_attachments FOR INSERT WITH CHECK (requisition_id IN (SELECT id FROM purchase_requisitions WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT rfq_documents" ON rfq_documents FOR INSERT WITH CHECK (rfq_id IN (SELECT id FROM requests_for_quotation WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));
CREATE POLICY "Org members can INSERT purchase_order_snapshots" ON purchase_order_snapshots FOR INSERT WITH CHECK (purchase_order_id IN (SELECT id FROM purchase_orders WHERE organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')));

-- UPDATE policies
CREATE POLICY "Org members can UPDATE suppliers" ON suppliers FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')) WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE material_catalogue_items" ON material_catalogue_items FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')) WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE purchase_requisitions" ON purchase_requisitions FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')) WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE purchase_orders" ON purchase_orders FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE goods_receipts" ON goods_receipts FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE inventory_locations" ON inventory_locations FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')) WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE inventory_balances" ON inventory_balances FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')) WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE plant_hire_records" ON plant_hire_records FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active')) WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE supplier_invoices" ON supplier_invoices FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE supplier_returns" ON supplier_returns FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));
CREATE POLICY "Org members can UPDATE requests_for_quotation" ON requests_for_quotation FOR UPDATE USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid() AND status = 'active'));

-- DELETE — restricted, only soft-archive where appropriate
-- Suppliers: only archive (set status, not delete)
-- Purchase orders: never deleted, only status changed
-- Goods receipts: never deleted
-- Stock movements: immutable, never deleted or updated

-- Supplier quotes: suppliers with invitation token can SELECT/INSERT their own
CREATE POLICY "Token holders can SELECT their RFQ supplier link" ON rfq_suppliers FOR SELECT
  USING (invitation_token IS NOT NULL);
CREATE POLICY "Token holders can INSERT supplier_quote_responses" ON supplier_quote_responses FOR INSERT
  WITH CHECK (rfq_supplier_id IN (SELECT id FROM rfq_suppliers WHERE invitation_token IS NOT NULL));
CREATE POLICY "Token holders can SELECT their quote responses" ON supplier_quote_responses FOR SELECT
  USING (rfq_supplier_id IN (SELECT id FROM rfq_suppliers WHERE invitation_token IS NOT NULL));
CREATE POLICY "Token holders can INSERT supplier_quote_lines" ON supplier_quote_lines FOR INSERT
  WITH CHECK (quote_response_id IN (SELECT id FROM supplier_quote_responses WHERE rfq_supplier_id IN (SELECT id FROM rfq_suppliers WHERE invitation_token IS NOT NULL)));
CREATE POLICY "Token holders can SELECT their quote lines" ON supplier_quote_lines FOR SELECT
  USING (quote_response_id IN (SELECT id FROM supplier_quote_responses WHERE rfq_supplier_id IN (SELECT id FROM rfq_suppliers WHERE invitation_token IS NOT NULL)));
CREATE POLICY "Token holders can SELECT their RFQ" ON requests_for_quotation FOR SELECT
  USING (id IN (SELECT rfq_id FROM rfq_suppliers WHERE invitation_token IS NOT NULL));
CREATE POLICY "Token holders can SELECT their RFQ lines" ON rfq_lines FOR SELECT
  USING (rfq_id IN (SELECT id FROM requests_for_quotation WHERE id IN (SELECT rfq_id FROM rfq_suppliers WHERE invitation_token IS NOT NULL)));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================
-- Get available quantity for an inventory item
CREATE FUNCTION inventory_available_quantity(p_material_item_id uuid, p_location_id uuid)
RETURNS numeric(12,4)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(quantity_on_hand, 0) - COALESCE(reserved_quantity, 0)
  FROM inventory_balances
  WHERE material_item_id = p_material_item_id AND location_id = p_location_id;
$$;

-- Check if organisation exists (for foreign key safety)
CREATE FUNCTION org_member_check(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE organisation_id = p_org_id AND user_id = auth.uid() AND status = 'active'
  );
$$;