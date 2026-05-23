package com.impact.gst.dto.invoice;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/**
 * Response for POST /api/v1/invoices/upload
 */
@Data
@Builder
public class UploadResultDto {
    private int totalRows;
    private int savedCount;
    private int skippedCount;
    private int errorCount;
    private String embeddingJobStatus; // STARTED | SKIPPED (if already embedded)
    private List<String> errors; // row-level parse errors (max 20 shown)
}
