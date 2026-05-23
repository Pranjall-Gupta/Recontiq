package com.impact.gst.dto.invoice;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Full invoice response with optional embedded matches and risk score.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InvoiceDto {
    private UUID id;
    private String vendorName;
    private String gstin;
    private String invoiceNumber;
    private BigDecimal amount;
    private BigDecimal taxAmount;
    private LocalDate invoiceDate;
    private String source; // UPLOADED | GSTR2B
    private String status; // PENDING | MATCHED | MISMATCHED | IGNORED
    private LocalDateTime createdAt;

    // Included only on GET /{id}
    private List<InvoiceMatchDto> matches;
    private RiskScoreDto riskScore;
}
