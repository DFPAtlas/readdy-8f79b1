-- The normalized active-invoice index replaces exact uniqueness across cancelled history.
ALTER TABLE public.supplier_invoices DROP CONSTRAINT supplier_invoices_organisation_id_supplier_id_invoice_numbe_key;
