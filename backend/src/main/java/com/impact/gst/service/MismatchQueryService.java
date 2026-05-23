package com.impact.gst.service;

import com.impact.gst.dto.PagedResponse;
import com.impact.gst.dto.mismatch.MismatchDto;
import com.impact.gst.dto.mismatch.ResolveRequest;
import com.impact.gst.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MismatchQueryService {

    private final JdbcTemplate jdbc;

    private static final RowMapper<MismatchDto> MISMATCH_MAPPER = (rs, n) -> MismatchDto.builder()
            .id(UUID.fromString(rs.getString("id")))
            .invoiceIdA(UUID.fromString(rs.getString("invoice_id_a")))
            .invoiceIdB(rs.getString("invoice_id_b") != null ? UUID.fromString(rs.getString("invoice_id_b")) : null)
            .mismatchType(rs.getString("mismatch_type"))
            .amountDiff(rs.getBigDecimal("amount_diff"))
            .riskScore(rs.getDouble("risk_score"))
            .riskLabel(riskLabel(rs.getDouble("risk_score")))
            .status(rs.getString("status"))
            .vendorNameA(rs.getString("vendor_name_a"))
            .vendorNameB(rs.getString("vendor_name_b"))
            .gstinA(rs.getString("gstin_a"))
            .invoiceNumberA(rs.getString("invoice_number_a"))
            .resolvedBy(rs.getString("resolved_by"))
            .resolvedAt(rs.getTimestamp("resolved_at") != null ? rs.getTimestamp("resolved_at").toLocalDateTime() : null)
            .createdAt(rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null)
            .build();

    // ─── listMismatches ───────────────────────────────────────────────────────
    public PagedResponse<MismatchDto> listMismatches(String riskLabel, String type,
            String status, int page, int size) {
        StringBuilder where = new StringBuilder("WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if (type != null && !type.isBlank()) {
            where.append("AND m.mismatch_type = ?::mismatch_type ");
            params.add(type.toUpperCase());
        }
        if (status != null && !status.isBlank()) {
            where.append("AND m.status = ?::mismatch_status ");
            params.add(status.toUpperCase());
        }
        if (riskLabel != null && !riskLabel.isBlank()) {
            // Translate label to score range
            String scoreFilter = switch (riskLabel.toLowerCase()) {
                case "critical" -> "AND m.risk_score >= 0.85 ";
                case "high" -> "AND m.risk_score >= 0.60 AND m.risk_score < 0.85 ";
                case "medium" -> "AND m.risk_score >= 0.40 AND m.risk_score < 0.60 ";
                default -> "AND m.risk_score < 0.40 ";
            };
            where.append(scoreFilter);
        }

        String base = """
                FROM mismatches m
                JOIN invoices ia ON ia.id = m.invoice_id_a
                LEFT JOIN invoices ib ON ib.id = m.invoice_id_b
                """ + where;

        Long total = jdbc.queryForObject("SELECT COUNT(*) " + base, Long.class, params.toArray());
        if (total == null)
            total = 0L;

        params.add(size);
        params.add(page * size);

        List<MismatchDto> content = jdbc.query("""
                SELECT m.id::text, m.invoice_id_a::text, m.invoice_id_b::text,
                       m.mismatch_type::text, m.amount_diff, m.risk_score, m.status::text,
                       ia.vendor_name AS vendor_name_a, ib.vendor_name AS vendor_name_b,
                       ia.gstin AS gstin_a, ia.invoice_number AS invoice_number_a,
                       m.resolved_by, m.resolved_at, m.created_at
                """ + base + "ORDER BY m.risk_score DESC, m.created_at DESC LIMIT ? OFFSET ?",
                MISMATCH_MAPPER, params.toArray());

        int totalPages = (int) Math.ceil((double) total / size);
        return PagedResponse.<MismatchDto>builder()
                .content(content).page(page).size(size)
                .totalElements(total).totalPages(totalPages)
                .last(page >= totalPages - 1)
                .build();
    }

    // ─── resolve ──────────────────────────────────────────────────────────────
    @Transactional
    public MismatchDto resolve(UUID id, ResolveRequest req) {
        int updated = jdbc.update("""
                UPDATE mismatches
                   SET status = 'RESOLVED'::mismatch_status,
                       resolution_note = ?,
                       resolved_by = ?,
                       resolved_at = NOW()
                 WHERE id = ?::uuid AND (status = 'PENDING'::mismatch_status OR status = 'ESCALATED'::mismatch_status)
                """, req.getResolutionNote(), req.getResolvedBy(), id.toString());

        if (updated == 0)
            throw new ResourceNotFoundException("Mismatch", id);
        return loadOne(id);
    }

    // ─── escalate ─────────────────────────────────────────────────────────────
    @Transactional
    public MismatchDto escalate(UUID id, ResolveRequest req) {
        int updated = jdbc.update("""
                UPDATE mismatches
                   SET status = 'ESCALATED'::mismatch_status,
                       resolution_note = ?,
                       resolved_by = ?,
                       resolved_at = NOW()
                 WHERE id = ?::uuid AND status = 'PENDING'::mismatch_status
                """, req.getResolutionNote(), req.getResolvedBy(), id.toString());

        if (updated == 0)
            throw new ResourceNotFoundException("Mismatch", id);
        return loadOne(id);
    }

    // ─── writeOff ─────────────────────────────────────────────────────────────
    @Transactional
    public MismatchDto writeOff(UUID id, ResolveRequest req) {
        int updated = jdbc.update("""
                UPDATE mismatches
                   SET status = 'WRITTEN_OFF'::mismatch_status,
                       resolution_note = ?,
                       resolved_by = ?,
                       resolved_at = NOW()
                 WHERE id = ?::uuid AND (status = 'PENDING'::mismatch_status OR status = 'ESCALATED'::mismatch_status)
                """, req.getResolutionNote(), req.getResolvedBy(), id.toString());

        if (updated == 0)
            throw new ResourceNotFoundException("Mismatch", id);
        return loadOne(id);
    }

    // ─── PRIVATE ──────────────────────────────────────────────────────────────

    private MismatchDto loadOne(UUID id) {
        return jdbc.queryForObject("""
                SELECT m.id::text, m.invoice_id_a::text, m.invoice_id_b::text,
                       m.mismatch_type::text, m.amount_diff, m.risk_score, m.status::text,
                       ia.vendor_name AS vendor_name_a, ib.vendor_name AS vendor_name_b,
                       ia.gstin AS gstin_a, ia.invoice_number AS invoice_number_a,
                       m.resolved_by, m.resolved_at, m.created_at
                FROM mismatches m
                JOIN invoices ia ON ia.id = m.invoice_id_a
                LEFT JOIN invoices ib ON ib.id = m.invoice_id_b
                WHERE m.id = ?::uuid
                """, MISMATCH_MAPPER, id.toString());
    }

    private static String riskLabel(double score) {
        if (score >= 0.85)
            return "critical";
        if (score >= 0.60)
            return "high";
        if (score >= 0.40)
            return "medium";
        return "low";
    }
}
