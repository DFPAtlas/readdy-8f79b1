import { getSupabase } from '@/lib/supabase';

const supabase = () => getSupabase()!;

// ============================================================================
// TYPES
// ============================================================================
export interface Supplier {
  id: string;
  organisation_id: string;
  trading_name: string;
  legal_name: string | null;
  supplier_reference: string | null;
  company_number: string | null;
  vat_number: string | null;
  website: string | null;
  account_number: string | null;
  payment_terms: string | null;
  lead_time_notes: string | null;
  minimum_order: string | null;
  delivery_areas: string | null;
  status: 'active' | 'suspended' | 'archived';
  is_approved: boolean;
  insurance_document_url: string | null;
  internal_rating: number | null;
  internal_notes: string | null;
  payment_method: string | null;
  bank_name: string | null;
  bank_account_last_four: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  contacts?: SupplierContact[];
  branches?: SupplierBranch[];
  categories?: SupplierCategory[];
}

export interface SupplierContact {
  id: string;
  supplier_id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_primary: boolean;
  notes: string | null;
}

export interface SupplierBranch {
  id: string;
  supplier_id: string;
  branch_name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string;
  phone: string | null;
  is_default: boolean;
  notes: string | null;
}

export interface SupplierCategory {
  id: string;
  organisation_id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface MaterialCatalogueItem {
  id: string;
  organisation_id: string;
  internal_code: string | null;
  description: string;
  category: string | null;
  manufacturer: string | null;
  part_number: string | null;
  unit_of_measure: string;
  preferred_supplier_id: string | null;
  latest_cost_pence: number | null;
  latest_cost_date: string | null;
  lead_time_days: number | null;
  minimum_order_quantity: number;
  pack_size: number | null;
  tax_treatment: string;
  storage_requirements: string | null;
  safety_data_sheet_url: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  preferred_supplier?: Supplier;
}

export interface PurchaseRequisition {
  id: string;
  organisation_id: string;
  reference: string;
  job_id: string | null;
  requester_id: string;
  required_by_date: string | null;
  delivery_location: string | null;
  priority: string;
  cost_code: string | null;
  task_or_phase: string | null;
  estimated_cost_pence: number | null;
  reason: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  lines?: RequisitionLine[];
}

export interface RequisitionLine {
  id: string;
  requisition_id: string;
  line_number: number;
  material_item_id: string | null;
  description: string;
  quantity: number;
  unit_of_measure: string;
  suggested_supplier_id: string | null;
  estimated_unit_price_pence: number | null;
  estimated_line_total_pence: number | null;
  cost_code: string | null;
  notes: string | null;
}

export interface RequestForQuotation {
  id: string;
  organisation_id: string;
  reference: string;
  job_id: string | null;
  description: string | null;
  delivery_address: string | null;
  required_by_date: string | null;
  response_deadline: string | null;
  commercial_notes: string | null;
  internal_notes: string | null;
  status: string;
  created_by: string;
  issued_at: string | null;
  closed_at: string | null;
  awarded_at: string | null;
  created_at: string;
  updated_at: string;
  lines?: RfqLine[];
  suppliers?: RfqSupplier[];
}

export interface RfqLine {
  id: string;
  rfq_id: string;
  line_number: number;
  material_item_id: string | null;
  description: string;
  quantity: number;
  unit_of_measure: string;
  specification: string | null;
  notes: string | null;
}

export interface RfqSupplier {
  id: string;
  rfq_id: string;
  supplier_id: string;
  invitation_token: string | null;
  invitation_sent_at: string | null;
  intention_to_quote: boolean | null;
  response_received: boolean;
  response_at: string | null;
  notes: string | null;
  supplier?: Supplier;
  responses?: SupplierQuoteResponse[];
}

export interface SupplierQuoteResponse {
  id: string;
  rfq_supplier_id: string;
  version: number;
  delivery_charge_pence: number;
  lead_time_days: number | null;
  validity_date: string | null;
  quote_document_url: string | null;
  alternatives_text: string | null;
  questions_text: string | null;
  status: string;
  submitted_at: string | null;
  created_at: string;
  lines?: SupplierQuoteLine[];
}

export interface SupplierQuoteLine {
  id: string;
  quote_response_id: string;
  rfq_line_id: string;
  unit_price_pence: number | null;
  availability: string | null;
  alternative_item: string | null;
  notes: string | null;
}

export interface PurchaseOrder {
  id: string;
  organisation_id: string;
  po_number: string;
  version: number;
  supplier_id: string;
  job_id: string | null;
  cost_code: string | null;
  delivery_address: string | null;
  delivery_contact: string | null;
  order_date: string | null;
  required_delivery_date: string | null;
  supplier_quote_reference: string | null;
  delivery_charge_pence: number;
  net_total_pence: number | null;
  tax_total_pence: number | null;
  gross_total_pence: number | null;
  tax_rate: number | null;
  instructions: string | null;
  terms_reference: string | null;
  requested_by: string;
  approved_by: string | null;
  status: string;
  acknowledged_at: string | null;
  issued_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  lines?: PurchaseOrderLine[];
}

export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  line_number: number;
  material_item_id: string | null;
  description: string;
  quantity: number;
  unit_of_measure: string;
  unit_price_pence: number;
  line_total_pence: number | null;
  tax_rate: number | null;
  requisition_line_id: string | null;
  notes: string | null;
  received_quantity: number;
}

export interface GoodsReceipt {
  id: string;
  organisation_id: string;
  purchase_order_id: string;
  supplier_id: string;
  delivery_note_number: string | null;
  arrival_date: string | null;
  arrival_time: string | null;
  received_by: string;
  job_id: string | null;
  location: string | null;
  status: string;
  notes: string | null;
  photographs: any[];
  created_at: string;
  supplier?: Supplier;
  purchase_order?: PurchaseOrder;
  lines?: GoodsReceiptLine[];
}

export interface GoodsReceiptLine {
  id: string;
  goods_receipt_id: string;
  purchase_order_line_id: string | null;
  ordered_quantity: number;
  previously_received: number;
  received_now: number;
  accepted_quantity: number;
  rejected_quantity: number;
  damaged_quantity: number;
  missing_quantity: number;
  notes: string | null;
}

export interface InventoryLocation {
  id: string;
  organisation_id: string;
  name: string;
  location_type: string;
  job_id: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface InventoryBalance {
  id: string;
  organisation_id: string;
  location_id: string;
  material_item_id: string;
  quantity_on_hand: number;
  reserved_quantity: number;
  minimum_level: number;
  reorder_level: number;
  last_counted_date: string | null;
  material_item?: MaterialCatalogueItem;
  location?: InventoryLocation;
}

export interface PlantHireRecord {
  id: string;
  organisation_id: string;
  supplier_id: string;
  hire_reference: string | null;
  job_id: string | null;
  equipment_description: string;
  equipment_type: string | null;
  quantity: number;
  hire_start_date: string;
  hire_end_date: string | null;
  rate_pence: number | null;
  charging_unit: string;
  deposit_pence: number;
  delivery_address: string | null;
  collection_address: string | null;
  operator_required: boolean;
  inspection_url: string | null;
  certificate_url: string | null;
  off_hire_reference: string | null;
  off_hire_date: string | null;
  damage_charges_pence: number;
  damage_notes: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
}

export interface SupplierInvoice {
  id: string;
  organisation_id: string;
  supplier_id: string;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string | null;
  purchase_order_id: string | null;
  job_id: string | null;
  cost_code: string | null;
  net_amount_pence: number;
  tax_amount_pence: number;
  gross_amount_pence: number;
  currency: string;
  tax_rate: number | null;
  invoice_document_url: string | null;
  approval_status: string;
  payment_status: string;
  payment_reference: string | null;
  paid_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  purchase_order?: PurchaseOrder;
  match?: InvoiceMatch;
}

export interface InvoiceMatch {
  id: string;
  supplier_invoice_id: string;
  purchase_order_id: string | null;
  goods_receipt_id: string | null;
  match_type: string;
  price_match: boolean;
  quantity_match: boolean;
  tax_match: boolean;
  exceptions: any[];
  matched_by: string | null;
  matched_at: string | null;
  notes: string | null;
}

// ============================================================================
// SUPPLIERS
// ============================================================================
export const supplierService = {
  async getSuppliers(organisationId: string) {
    const { data, error } = await supabase()
      .from('suppliers')
      .select('*, contacts:supplier_contacts(*), branches:supplier_branches(*)')
      .eq('organisation_id', organisationId)
      .order('trading_name');
    if (error) throw error;
    return data as Supplier[];
  },

  async getSupplier(id: string) {
    const { data, error } = await supabase()
      .from('suppliers')
      .select('*, contacts:supplier_contacts(*), branches:supplier_branches(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as Supplier | null;
  },

  async getSupplierCategories(organisationId: string) {
    const { data, error } = await supabase()
      .from('supplier_categories')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('sort_order');
    if (error) throw error;
    return data as SupplierCategory[];
  },
};

// ============================================================================
// MATERIALS
// ============================================================================
export const materialService = {
  async getMaterials(organisationId: string) {
    const { data, error } = await supabase()
      .from('material_catalogue_items')
      .select('*, preferred_supplier:suppliers!preferred_supplier_id(trading_name)')
      .eq('organisation_id', organisationId)
      .order('description');
    if (error) throw error;
    return data;
  },

  async getActiveMaterials(organisationId: string) {
    const { data, error } = await supabase()
      .from('material_catalogue_items')
      .select('*, preferred_supplier:suppliers!preferred_supplier_id(trading_name)')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('category')
      .order('description');
    if (error) throw error;
    return data;
  },
};

// ============================================================================
// REQUISITIONS
// ============================================================================
export const requisitionService = {
  async getRequisitions(organisationId: string) {
    const { data, error } = await supabase()
      .from('purchase_requisitions')
      .select('*, lines:requisition_lines(*)')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PurchaseRequisition[];
  },

  async getRequisition(id: string) {
    const { data, error } = await supabase()
      .from('purchase_requisitions')
      .select('*, lines:requisition_lines(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as PurchaseRequisition | null;
  },
};

// ============================================================================
// RFQs
// ============================================================================
export const rfqService = {
  async getRFQs(organisationId: string) {
    const { data, error } = await supabase()
      .from('requests_for_quotation')
      .select('*, lines:rfq_lines(*), suppliers:rfq_suppliers(*, supplier:suppliers(trading_name))')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as RequestForQuotation[];
  },
};

// ============================================================================
// PURCHASE ORDERS
// ============================================================================
export const poService = {
  async getPurchaseOrders(organisationId: string) {
    const { data, error } = await supabase()
      .from('purchase_orders')
      .select('*, supplier:suppliers(trading_name), lines:purchase_order_lines(*)')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as PurchaseOrder[];
  },

  async getPurchaseOrder(id: string) {
    const { data, error } = await supabase()
      .from('purchase_orders')
      .select('*, supplier:suppliers(*), lines:purchase_order_lines(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
};

// ============================================================================
// GOODS RECEIPTS
// ============================================================================
export const deliveryService = {
  async getGoodsReceipts(organisationId: string) {
    const { data, error } = await supabase()
      .from('goods_receipts')
      .select('*, supplier:suppliers(trading_name), purchase_order:purchase_orders(po_number), lines:goods_receipt_lines(*)')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getDeliveryIssues(organisationId: string) {
    const { data, error } = await supabase()
      .from('delivery_issues')
      .select('*')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getReturns(organisationId: string) {
    const { data, error } = await supabase()
      .from('supplier_returns')
      .select('*, supplier:suppliers(trading_name), lines:supplier_return_lines(*)')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};

// ============================================================================
// INVENTORY
// ============================================================================
export const inventoryService = {
  async getLocations(organisationId: string) {
    const { data, error } = await supabase()
      .from('inventory_locations')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data as InventoryLocation[];
  },

  async getBalances(organisationId: string) {
    const { data, error } = await supabase()
      .from('inventory_balances')
      .select('*, material_item:material_catalogue_items(description, unit_of_measure, internal_code), location:inventory_locations(name)')
      .eq('organisation_id', organisationId)
      .order('location_id');
    if (error) throw error;
    return data as (InventoryBalance & { material_item: MaterialCatalogueItem; location: InventoryLocation })[];
  },
};

// ============================================================================
// PLANT HIRE
// ============================================================================
export const hireService = {
  async getHireRecords(organisationId: string) {
    const { data, error } = await supabase()
      .from('plant_hire_records')
      .select('*, supplier:suppliers(trading_name)')
      .eq('organisation_id', organisationId)
      .order('hire_start_date', { ascending: false });
    if (error) throw error;
    return data as PlantHireRecord[];
  },
};

// ============================================================================
// SUPPLIER INVOICES
// ============================================================================
export const supplierInvoiceService = {
  async getInvoices(organisationId: string) {
    const { data, error } = await supabase()
      .from('supplier_invoices')
      .select('*, supplier:suppliers(trading_name), purchase_order:purchase_orders(po_number), match:invoice_matches(*)')
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
};

// ============================================================================
// DASHBOARD AGGREGATION
// ============================================================================
export const procurementDashboardService = {
  async getSummary(organisationId: string) {
    const [reqRes, rfqRes, poRes, deliveryRes, invoiceRes, hireRes] = await Promise.all([
      supabase().from('purchase_requisitions').select('id,status,estimated_cost_pence').eq('organisation_id', organisationId),
      supabase().from('requests_for_quotation').select('id,status').eq('organisation_id', organisationId),
      supabase().from('purchase_orders').select('id,status,gross_total_pence,required_delivery_date').eq('organisation_id', organisationId),
      supabase().from('goods_receipts').select('id,status').eq('organisation_id', organisationId),
      supabase().from('supplier_invoices').select('id,status,gross_amount_pence').eq('organisation_id', organisationId),
      supabase().from('plant_hire_records').select('id,status,hire_end_date').eq('organisation_id', organisationId),
    ]);

    return {
      requisitionsAwaitingApproval: (reqRes.data || []).filter((r: any) => r.status === 'submitted' || r.status === 'under_review').length,
      rfqsAwaitingResponse: (rfqRes.data || []).filter((r: any) => r.status === 'issued').length,
      posAwaitingApproval: (poRes.data || []).filter((p: any) => p.status === 'awaiting_approval').length,
      ordersDueThisWeek: (poRes.data || []).filter((p: any) => {
        if (!p.required_delivery_date) return false;
        const d = new Date(p.required_delivery_date);
        const now = new Date();
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return d <= weekEnd && d >= now && !['fully_delivered', 'closed', 'cancelled'].includes(p.status);
      }).length,
      lateDeliveries: (poRes.data || []).filter((p: any) => {
        if (!p.required_delivery_date) return false;
        const d = new Date(p.required_delivery_date);
        const now = new Date();
        return d < now && !['fully_delivered', 'closed', 'cancelled'].includes(p.status);
      }).length,
      unmatchedInvoices: (invoiceRes.data || []).filter((i: any) => i.status === 'received' || i.status === 'pending_match').length,
      hireDueBack: (hireRes.data || []).filter((h: any) => {
        if (!h.hire_end_date) return false;
        const d = new Date(h.hire_end_date);
        const now = new Date();
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return d <= weekEnd && h.status === 'on_hire';
      }).length,
      committedCost: (poRes.data || []).filter((p: any) => !['cancelled', 'superseded'].includes(p.status)).reduce((s: number, p: any) => s + (p.gross_total_pence || 0), 0),
      invoicedCost: (invoiceRes.data || []).filter((i: any) => i.status !== 'cancelled').reduce((s: number, i: any) => s + (i.gross_amount_pence || 0), 0),
      requisitionCount: (reqRes.data || []).length,
      poCount: (poRes.data || []).length,
    };
  },
};