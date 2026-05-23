package com.impact.gst.controller;

import com.impact.gst.dto.PagedResponse;
import com.impact.gst.dto.invoice.*;
import com.impact.gst.service.InvoiceCsvParser;
import com.impact.gst.service.InvoiceQueryService;
import com.impact.gst.service.EmbeddingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.UUID;

@Slf4j
@Validated
@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
@Tag(name = "Invoices", description = "Invoice upload, query and summary operations")
public class InvoiceController {

    private final InvoiceCsvParser csvParser;
    private final InvoiceQueryService invoiceQueryService;
    private final EmbeddingService embeddingService;

    // ─── POST /upload ─────────────────────────────────────────────────────────
    @Operation(summary = "Upload invoice CSV", description = "Parses a CSV file and stores invoices. Triggers async Ollama embedding.")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadResultDto> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "source", defaultValue = "UPLOADED") String source) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        log.info("Invoice upload received: {} ({} bytes)", file.getOriginalFilename(), file.getSize());

        UploadResultDto result = csvParser.parseAndSave(file, source);

        // Trigger async embedding for all newly stored invoices (non-blocking)
        embeddingService.batchEmbedAll();

        return ResponseEntity.ok(result);
    }

    // ─── GET / ────────────────────────────────────────────────────────────────
    @Operation(summary = "List invoices with filters and pagination")
    @GetMapping
    public ResponseEntity<PagedResponse<InvoiceDto>> list(
            @Parameter(description = "Filter by status: PENDING|MATCHED|MISMATCHED|IGNORED") @RequestParam(required = false) String status,

            @Parameter(description = "Filter by invoice source: UPLOADED|GSTR2B") @RequestParam(required = false) String source,

            @Parameter(description = "Vendor name fuzzy search (trigram)") @RequestParam(required = false) String vendorName,

            @Parameter(description = "Start of invoice date range (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,

            @Parameter(description = "End of invoice date range (yyyy-MM-dd)") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,

            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {

        return ResponseEntity.ok(
                invoiceQueryService.listInvoices(status, source, vendorName, dateFrom, dateTo, page, size));
    }

    // ─── GET /{id} ────────────────────────────────────────────────────────────
    @Operation(summary = "Get single invoice detail with matches and risk score")
    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceQueryService.getInvoiceDetail(id));
    }

    // ─── GET /summary ─────────────────────────────────────────────────────────
    @Operation(summary = "Dashboard summary: totals, matched, unmatched, ITC at risk")
    @GetMapping("/summary")
    public ResponseEntity<InvoiceSummaryDto> summary() {
        return ResponseEntity.ok(invoiceQueryService.getSummary());
    }
}
