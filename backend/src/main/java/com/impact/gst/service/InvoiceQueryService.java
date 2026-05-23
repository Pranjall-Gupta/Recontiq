package com.impact.gst.service;

import com.impact.gst.dto.PagedResponse;
import com.impact.gst.dto.invoice.*;
import com.impact.gst.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Read-side query service for invoices.
 * Uses native JDBC for performance-critical queries (vector + trigram).
 */
@Service
@RequiredArgsConstructor
public class InvoiceQueryService {

    private final JdbcTemplate jdbc;

    // ─── getInvoiceDetail ─────────────────────────────────────────────────────
    public InvoiceDto getInvoiceDetail(UUID id) {
        List<InvoiceDto> rows = jdbc.query("""
                SELECT i.id::text, i.vendor_name, i.gstin, i.invoice_number,
                       i.amount, i.tax_amount, i.invoice_date,
                       i.source::text, i.status::text, i.created_at
                FROM   invoices i
                WHERE  i.id = ?::uuid
                """,
                (rs, n) -> InvoiceDto.builder()
                        .id(UUID.fromString(rs.getString("id")))
                        .vendorName(rs.getString("vendor_name"))
                        .gstin(rs.getString("gstin"))
                        .invoiceNumber(rs.getString("invoice_number"))
                        .amount(rs.getBigDecimal("amount"))
                        .taxAmount(rs.getBigDecimal("tax_amount"))
                        .invoiceDate(rs.getObject("invoice_date", LocalDate.class))
                        .source(rs.getString("source"))
                        .status(rs.getString("status"))
                        .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .build(),
                id.toString());

        if (rows.isEmpty())
            throw new ResourceNotFoundException("Invoice", id);
        InvoiceDto dto = rows.get(0);

        dto.setMatches(loadMatches(id));
        dto.setRiskScore(loadLatestRisk(id));
        return dto;
    }

    // ─── listInvoices ─────────────────────────────────────────────────────────
    public PagedResponse<InvoiceDto> listInvoices(String status, String source,
            String vendorName,
            LocalDate dateFrom, LocalDate dateTo,
            int page, int size) {
        StringBuilder where = new StringBuilder("WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (status != null && !status.isBlank()) {
            where.append("AND i.status = ?::invoice_status ");
            params.add(status);
        }
        if (source != null && !source.isBlank()) {
            where.append("AND i.source = ?::invoice_source ");
            params.add(source);
        }
        if (vendorName != null && !vendorName.isBlank()) {
            where.append("AND i.vendor_name ILIKE ? ");
            params.add("%" + vendorName.trim() + "%");
        }
        if (dateFrom != null) {
            where.append("AND i.invoice_date >= ? ");
            params.add(java.sql.Date.valueOf(dateFrom));
        }
        if (dateTo != null) {
            where.append("AND i.invoice_date <= ? ");
            params.add(java.sql.Date.valueOf(dateTo));
        }

        String countSql = "SELECT COUNT(*) FROM invoices i " + where;
        Long total = jdbc.queryForObject(countSql, Long.class, params.toArray());
        if (total == null)
            total = 0L;

        params.add(size);
        params.add(page * size);
        String dataSql = "SELECT i.id::text, i.vendor_name, i.gstin, i.invoice_number, " +
                "i.amount, i.tax_amount, i.invoice_date, i.source::text, i.status::text, i.created_at " +
                "FROM invoices i " + where +
                "ORDER BY i.created_at DESC LIMIT ? OFFSET ?";

        List<InvoiceDto> content = jdbc.query(dataSql,
                (rs, n) -> InvoiceDto.builder()
                        .id(UUID.fromString(rs.getString("id")))
                        .vendorName(rs.getString("vendor_name"))
                        .gstin(rs.getString("gstin"))
                        .invoiceNumber(rs.getString("invoice_number"))
                        .amount(rs.getBigDecimal("amount"))
                        .taxAmount(rs.getBigDecimal("tax_amount"))
                        .invoiceDate(rs.getObject("invoice_date", LocalDate.class))
                        .source(rs.getString("source"))
                        .status(rs.getString("status"))
                        .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
                        .build(),
                params.toArray());

        int totalPages = (int) Math.ceil((double) total / size);
        return PagedResponse.<InvoiceDto>builder()
                .content(content).page(page).size(size)
                .totalElements(total).totalPages(totalPages)
                .last(page >= totalPages - 1)
                .build();
    }

    // ─── getSummary ───────────────────────────────────────────────────────────
    public InvoiceSummaryDto getSummary() {
        Map<String, Object> row = jdbc.queryForMap("""
                SELECT
                  COUNT(*)                                                     AS total,
                  COUNT(*) FILTER (WHERE status = 'MATCHED')                  AS matched,
                  COUNT(*) FILTER (WHERE status = 'MISMATCHED')               AS unmatched,
                  COUNT(*) FILTER (WHERE status = 'PENDING')                  AS pending,
                  COALESCE(SUM(amount), 0)                                     AS total_amount,
                  COALESCE(SUM(tax_amount), 0)                                 AS total_tax
                FROM invoices
                """);

        // High-risk count + ITC at risk (sum of amounts for HIGH/CRITICAL mismatches)
        Map<String, Object> risk = jdbc.queryForMap("""
                SELECT
                  COUNT(*)                        AS high_risk_count,
                  COALESCE(SUM(ia.amount), 0)    AS itc_at_risk
                FROM mismatches m
                JOIN invoices ia ON ia.id = m.invoice_id_a
                WHERE m.risk_score >= 0.60
                  AND m.status = 'PENDING'
                """);

        return InvoiceSummaryDto.builder()
                .total(((Number) row.get("total")).longValue())
                .matched(((Number) row.get("matched")).longValue())
                .unmatched(((Number) row.get("unmatched")).longValue())
                .pending(((Number) row.get("pending")).longValue())
                .highRisk(((Number) risk.get("high_risk_count")).longValue())
                .itcAtRisk((BigDecimal) risk.get("itc_at_risk"))
                .totalAmount((BigDecimal) row.get("total_amount"))
                .totalTaxAmount((BigDecimal) row.get("total_tax"))
                .build();
    }

    // ─── PRIVATE ──────────────────────────────────────────────────────────────

    private List<InvoiceMatchDto> loadMatches(UUID uploadedId) {
        return jdbc.query("""
                SELECT ib.id::text, ib.vendor_name, ib.amount, ib.invoice_date, ib.source::text,
                       m.risk_score
                FROM mismatches m
                JOIN invoices ib ON ib.id = m.invoice_id_b
                WHERE m.invoice_id_a = ?::uuid AND m.invoice_id_b IS NOT NULL
                LIMIT 10
                """,
                (rs, n) -> InvoiceMatchDto.builder()
                        .matchedInvoiceId(UUID.fromString(rs.getString("id")))
                        .vendorName(rs.getString("vendor_name"))
                        .amount(rs.getBigDecimal("amount"))
                        .invoiceDate(rs.getObject("invoice_date", LocalDate.class))
                        .source(rs.getString("source"))
                        .similarity(1 - rs.getDouble("risk_score"))
                        .matchStrength(rs.getDouble("risk_score") < 0.15 ? "STRONG" : "POSSIBLE")
                        .build(),
                uploadedId.toString());
    }

    private RiskScoreDto loadLatestRisk(UUID invoiceId) {
        return jdbc.query("""
                SELECT rs.score, rs.label::text, rs.model_version
                FROM risk_scores rs
                JOIN mismatches m ON m.id = rs.mismatch_id
                WHERE m.invoice_id_a = ?::uuid
                ORDER BY rs.created_at DESC
                LIMIT 1
                """,
                rs -> rs.next() ? RiskScoreDto.builder()
                        .score(rs.getDouble("score"))
                        .label(rs.getString("label"))
                        .modelVersion(rs.getString("model_version"))
                        .topFeatures(List.of("amount_diff_ratio", "vendor_trust_score"))
                        .build() : null,
                invoiceId.toString());
    }
}
