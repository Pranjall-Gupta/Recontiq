package com.impact.gst.service;

import com.impact.gst.dto.invoice.UploadResultDto;
import com.opencsv.CSVReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.io.Reader;
import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Parses uploaded invoice CSV files and batch-inserts rows into the invoices
 * table.
 *
 * Expected CSV headers (order-independent, case-insensitive):
 * vendor_name, gstin, invoice_number, amount, tax_amount, invoice_date, source
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceCsvParser {

    private final JdbcTemplate jdbc;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Transactional
    public UploadResultDto parseAndSave(MultipartFile file, String defaultSource) {
        List<String> errors = new ArrayList<>();
        int saved = 0, skipped = 0;

        try (Reader reader = new InputStreamReader(file.getInputStream());
                CSVReader csv = new CSVReader(reader)) {

            String[] headers = csv.readNext();
            if (headers == null) {
                return UploadResultDto.builder()
                        .errors(List.of("Empty CSV file")).build();
            }

            // Build column index map (case-insensitive)
            java.util.Map<String, Integer> idx = new java.util.HashMap<>();
            for (int i = 0; i < headers.length; i++) {
                idx.put(headers[i].trim().toLowerCase(), i);
            }

            String[] row;
            int lineNum = 1;
            List<Object[]> batch = new ArrayList<>();

            while ((row = csv.readNext()) != null) {
                lineNum++;
                try {
                    String vendorName = col(row, idx, "vendor_name");
                    String gstin = col(row, idx, "gstin");
                    String invoiceNumber = col(row, idx, "invoice_number");
                    BigDecimal amount = new BigDecimal(col(row, idx, "amount"));
                    BigDecimal taxAmount = new BigDecimal(col(row, idx, "tax_amount"));
                    LocalDate invDate = LocalDate.parse(col(row, idx, "invoice_date"), DATE_FMT);
                    String source = idx.containsKey("source")
                            ? col(row, idx, "source")
                            : defaultSource;

                    batch.add(new Object[] {
                            UUID.randomUUID().toString(),
                            vendorName, gstin, invoiceNumber,
                            amount, taxAmount,
                            Date.valueOf(invDate),
                            source.toUpperCase(), "PENDING"
                    });
                } catch (Exception e) {
                    errors.add("Row " + lineNum + ": " + e.getMessage());
                    skipped++;
                }
            }

            // Batch insert with ON CONFLICT DO NOTHING to skip duplicates
            int[] counts = jdbc.batchUpdate("""
                    INSERT INTO invoices
                        (id, vendor_name, gstin, invoice_number, amount, tax_amount,
                         invoice_date, source, status)
                    VALUES (?::uuid, ?, ?, ?, ?, ?, ?, ?::invoice_source, ?::invoice_status)
                    ON CONFLICT (invoice_number, gstin, source) DO NOTHING
                    """, batch);

            for (int c : counts)
                saved += (c > 0 ? 1 : 0);
            skipped += (batch.size() - saved);

        } catch (Exception e) {
            log.error("CSV parse failed", e);
            errors.add("Fatal: " + e.getMessage());
        }

        log.info("CSV upload complete — saved={} skipped={} errors={}", saved, skipped, errors.size());
        return UploadResultDto.builder()
                .totalRows(saved + skipped + errors.size())
                .savedCount(saved)
                .skippedCount(skipped)
                .errorCount(errors.size())
                .embeddingJobStatus("STARTED")
                .errors(errors.stream().limit(20).toList())
                .build();
    }

    private String col(String[] row, java.util.Map<String, Integer> idx, String name) {
        Integer i = idx.get(name);
        if (i == null || i >= row.length)
            throw new IllegalArgumentException("Missing column: " + name);
        return row[i].trim();
    }
}
