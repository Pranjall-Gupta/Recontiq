package com.impact.gst.model;

/**
 * Maps to the invoice_status PostgreSQL ENUM.
 */
public enum InvoiceStatus {
    PENDING,
    MATCHED,
    MISMATCHED,
    IGNORED
}
