package com.impact.gst.dto.fraud;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/**
 * Graph payload for GET /api/v1/fraud/graph
 * Designed for consumption by front-end graph libraries (e.g. D3, Cytoscape).
 */
@Data
@Builder
public class GraphDto {
    private List<GraphNode> nodes;
    private List<GraphEdge> edges;

    @Data
    @Builder
    public static class GraphNode {
        private String id;
        private String label;
        private String type; // vendor | gstin | invoice
        private String riskLevel; // low | medium | high | critical
        private Object data; // arbitrary extra fields serialised as JSON object
    }

    @Data
    @Builder
    public static class GraphEdge {
        private String id;
        private String source;
        private String target;
        private String relation; // FILED | MATCHES | SUSPICIOUS
        private double weight;
    }
}
