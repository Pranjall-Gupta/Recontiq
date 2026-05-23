package com.impact.gst.service;

import com.impact.gst.dto.fraud.FraudVendorDto;
import com.impact.gst.dto.fraud.GraphDto;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FraudDetectionService {

    private final JdbcTemplate jdbc;

    // ─── findSuspiciousVendors ────────────────────────────────────────────────

    public List<FraudVendorDto> findSuspiciousVendors(double maxTrustScore, int minMismatchCount) {
        return jdbc.query("""
                SELECT
                    v.id::text                                          AS vendor_id,
                    v.gstin,
                    v.canonical_name,
                    v.trust_score,
                    v.mismatch_history_count,
                    COUNT(DISTINCT i.vendor_name)                       AS name_variant_count,
                    ARRAY_AGG(DISTINCT i.vendor_name)                   AS name_variants,
                    COALESCE(SUM(m.amount_diff), 0)                     AS total_mismatch_amount,
                    CASE
                      WHEN COUNT(DISTINCT i.vendor_name) > 1 THEN
                        COUNT(DISTINCT i.vendor_name)::text || ' companies share this GSTIN'
                      WHEN v.trust_score < 0.3 THEN 'Very low trust score'
                      ELSE 'High mismatch frequency'
                    END                                                  AS risk_reason
                FROM vendors v
                JOIN invoices i ON i.gstin = v.gstin
                LEFT JOIN mismatches m ON m.invoice_id_a = i.id
                WHERE v.trust_score <= ?
                   OR v.mismatch_history_count >= ?
                GROUP BY v.id, v.gstin, v.canonical_name, v.trust_score, v.mismatch_history_count
                ORDER BY v.trust_score ASC, v.mismatch_history_count DESC
                LIMIT 50
                """,
                (rs, n) -> FraudVendorDto.builder()
                        .vendorId(UUID.fromString(rs.getString("vendor_id")))
                        .gstin(rs.getString("gstin"))
                        .canonicalName(rs.getString("canonical_name"))
                        .nameVariants(List.of((String[]) rs.getArray("name_variants").getArray()))
                        .mismatchCount(rs.getInt("mismatch_history_count"))
                        .trustScore(rs.getDouble("trust_score"))
                        .totalMismatchAmount(rs.getBigDecimal("total_mismatch_amount"))
                        .riskReason(rs.getString("risk_reason"))
                        .build(),
                maxTrustScore, minMismatchCount);
    }

    // ─── buildFraudGraph ──────────────────────────────────────────────────────

    public GraphDto buildFraudGraph(double maxTrustScore) {
        List<GraphDto.GraphNode> nodes = new ArrayList<>();
        List<GraphDto.GraphEdge> edges = new ArrayList<>();

        // Nodes: suspicious vendors
        List<FraudVendorDto> suspects = findSuspiciousVendors(maxTrustScore, 1);

        for (FraudVendorDto v : suspects) {
            // Vendor node
            nodes.add(GraphDto.GraphNode.builder()
                    .id("vendor:" + v.getVendorId())
                    .label(v.getCanonicalName())
                    .type("vendor")
                    .riskLevel(v.getTrustScore() < 0.3 ? "critical" : v.getTrustScore() < 0.5 ? "high" : "medium")
                    .data(java.util.Map.of(
                            "trustScore", v.getTrustScore(),
                            "mismatchCount", v.getMismatchCount()))
                    .build());

            // GSTIN node (shared hub)
            String gstinNodeId = "gstin:" + v.getGstin();
            if (nodes.stream().noneMatch(nn -> nn.getId().equals(gstinNodeId))) {
                nodes.add(GraphDto.GraphNode.builder()
                        .id(gstinNodeId)
                        .label(v.getGstin())
                        .type("gstin")
                        .riskLevel(v.getNameVariants().size() > 1 ? "critical" : "medium")
                        .build());
            }

            // Edge: vendor → GSTIN
            edges.add(GraphDto.GraphEdge.builder()
                    .id("e:" + v.getVendorId() + ":" + v.getGstin())
                    .source("vendor:" + v.getVendorId())
                    .target(gstinNodeId)
                    .relation(v.getNameVariants().size() > 1 ? "SUSPICIOUS" : "FILED")
                    .weight(v.getMismatchCount())
                    .build());

            // Name-variant alias nodes for GSTIN-sharing fraud
            if (v.getNameVariants().size() > 1) {
                for (String alias : v.getNameVariants()) {
                    String aliasId = "alias:" + v.getGstin() + ":" + alias.hashCode();
                    nodes.add(GraphDto.GraphNode.builder()
                            .id(aliasId).label(alias).type("vendor_alias").riskLevel("high")
                            .build());
                    edges.add(GraphDto.GraphEdge.builder()
                            .id("e:" + aliasId + ":" + v.getGstin())
                            .source(aliasId).target(gstinNodeId)
                            .relation("SUSPICIOUS").weight(1.0)
                            .build());
                }
            }
        }

        return GraphDto.builder().nodes(nodes).edges(edges).build();
    }
}
