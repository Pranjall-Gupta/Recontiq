package com.impact.gst.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.impact.gst.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * AgentService
 * ─────────────────────────────────────────────────────────────────────────────
 * Agentic email drafting, risk explanation, and action recommendation using
 * Ollama's llama3.2 model (100% free, runs locally on CPU in ~2 GB RAM).
 *
 * Spring AI integration:
 * - Uses {@link ChatModel} — the current Spring AI 1.0.x API.
 * - Auto-configured by spring-ai-ollama-spring-boot-starter via
 * application.yml:
 * spring.ai.ollama.base-url: http://localhost:11434
 * spring.ai.ollama.chat.options.model: llama3.2:1b
 *
 * Error handling:
 * - When Ollama is not running, Spring AI throws a ResourceAccessException
 * (connection refused). All three methods catch this and return a
 * deterministic, rule-based fallback so the application stays functional
 * without the LLM.
 * - Pull the model first: {@code ollama pull llama3.2}
 * or use the lightweight 1B variant: {@code ollama pull llama3.2:1b}
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentService {

    private final ChatModel chatModel;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    // ═════════════════════════════════════════════════════════════════════════
    // PROMPT TEMPLATES (constants for easy A/B testing + audit)
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Template variables: vendorName, gstin, invoiceNumber, gstPeriod,
     * mismatchType, ourAmount, gstr2bAmount, diff
     */
    private static final String EMAIL_DRAFT_TEMPLATE = """
            You are a GST compliance officer in India. \
            Draft a professional but firm email to vendor {vendorName} (GSTIN: {gstin}) \
            about invoice {invoiceNumber} for GST period {gstPeriod}.

            Context of the discrepancy:
            {actionInstruction}

            The email must:
            - Be in formal Indian business English
            - Reference the specific invoice number and GST period
            - Request them to rectify this discrepancy within 7 working days
            - Mention that unresolved mismatches affect Input Tax Credit (ITC) claims under the CGST Act
            - Be under 130 words
            - Write directly and assertively. Speak in the active voice, stating the discrepancy context as a hard, settled fact.
            - Do NOT use conditional structures or instructions (e.g., do NOT say "If the GSTR-2B amount is ₹0...", "If the mismatch type is MISSING...", or "In case of mismatches..."). State directly what has happened and what they must do.

            Return ONLY the email body — no subject line, no "Subject:", no greeting label.
            Start directly with "Dear {vendorName}," and end with "Regards,\\nGST Compliance Team".
            """;

    /**
     * Template variables: riskLabel, vendorName, invoiceNumber,
     * mismatchType, diff, ourAmount
     */
    private static final String EXPLAIN_RISK_TEMPLATE = """
            Aap ek GST expert hain. Explain karein simple Hinglish mein (Hindi + English mix) \
            kyun yeh GST invoice mismatch {riskLabel} risk category mein aata hai.

            Mismatch details:
            - Vendor: {vendorName}
            - Invoice: {invoiceNumber}
            - Mismatch type: {mismatchType}
            - Our records: ₹{ourAmount} | GSTR-2B: ₹{gstr2bAmount} | Difference: ₹{diff}

            Do 2-3 bullet points mein batao:
            1. Risk kyun hai?
            2. ITC pe kya asar padega?
            3. Kya karna chahiye?

            80 words ke andar rakho. Bullet points use karo (•).
            """;

    /**
     * Template variables: mismatchType, riskScore, riskLabel, vendorName,
     * gstin, invoiceNumber, diff, ourAmount, gstr2bAmount,
     * vendorTrust
     */
    private static final String SUGGEST_ACTION_TEMPLATE = """
            You are an expert GST reconciliation advisor. Based on the mismatch below, \
            recommend the BEST action to take.

            Mismatch snapshot:
            - Vendor: {vendorName} (GSTIN: {gstin}, trust score: {vendorTrust}/1.0)
            - Invoice: {invoiceNumber}
            - Type: {mismatchType}
            - Our amount: ₹{ourAmount} | GSTR-2B: ₹{gstr2bAmount} | Difference: ₹{diff}
            - AI Risk Score: {riskScore} ({riskLabel})

            Choose ONE action from this list:
              auto_resolve            — difference is trivial, safe to ignore
              request_vendor_correction — vendor should issue corrected invoice or credit note
              escalate_to_ca          — complex issue, needs Chartered Accountant review
              write_off               — difference is unrecoverable, write it off

            Respond ONLY with a valid JSON object. Do not include markdown fences, preambles, or explanations.
            The JSON object must have these exact keys:
            - "action": the selected action from the list above (as a string)
            - "reason": one-sentence reason explaining the decision (as a string)
            - "confidence": confidence score between 0.0 and 1.0 (as a float)
            """;

    private static final String VENDOR_CHAT_TEMPLATE = """
            You are "Recontiq Vendor Assistant", a helpful, empathetic, and expert GST tax advisor.
            Your job is to assist vendors/suppliers in resolving invoice mismatches flagged by their corporate buyers.

            Guidelines:
            - ALWAYS respond in professional, grammatically correct English. All output must be strictly in English.
            - Use the following accurate statutory definitions for tax concepts to avoid errors or hallucinations:
              * ITC (Input Tax Credit): The credit a buyer/business gets for paying tax on purchase invoices, which they offset against their sales tax liability.
              * GSTR (Goods and Services Tax Return): Official tax return filings under Indian GST.
              * GSTR-1: Return for reporting outward sales invoices. Suppliers must upload invoices here so buyers can view them in GSTR-2B.
              * GSTR-2B: An auto-drafted static ITC statement for the buyer. It lists invoices uploaded by suppliers in GSTR-1.
              * GSTR-3B: Monthly return used to claim ITC and pay net tax liability to the government.
              * Section 16(2)(c) of CGST Act: Legal rule stating that a buyer can ONLY claim Input Tax Credit if the supplier has filed their returns and paid the tax to the government.
            - Focus on explaining Section 16(2)(c) of the CGST Act (the buyer can only claim Input Tax Credit if the supplier has filed their returns and paid the tax).
            - Guide them on how to resolve mismatches:
              1. File GSTR-1/IFF if they missed uploading the invoice.
              2. Upload correct tax rates (CGST/SGST/IGST) and taxable values.
              3. File GSTR-3B to pay the tax.
            - Provide clear, professional explanation of ITC, GSTR, CGST vs IGST, and missing returns.
            - Be concise, supportive, and extremely professional. Keep answers under 120 words.

            User message: {message}
            """;

    // ═════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Draft a vendor discrepancy email using Ollama llama3.2.
     *
     * @param mismatchId UUID of the mismatch record
     * @return email body string (plain text, ready to send)
     */
    public String draftVendorEmail(UUID mismatchId) {
        MismatchContext ctx = loadContext(mismatchId);

        boolean isMissing = "MISSING".equalsIgnoreCase(ctx.mismatchType())
                || ctx.amountB() == null
                || ctx.amountB().compareTo(java.math.BigDecimal.ZERO) == 0;

        String actionInstruction;
        if (isMissing) {
            actionInstruction = "The invoice is completely missing/unfiled from GSTR-2B. Clearly state that this invoice is completely missing/unfiled from GSTR-2B (GSTR-2B shows a value of ₹0). Expressly request them to immediately upload and file this invoice in their GSTR-1 or IFF (Invoice Furnishing Facility) return so it flows into our GSTR-2B. Do NOT ask for a credit note or a corrected invoice under any circumstances.";
        } else {
            actionInstruction = String.format("Our records show the invoice amount is ₹%s, but GSTR-2B shows it as ₹%s (a difference of ₹%s). Request that they verify this mismatch and issue a corrected invoice or credit note to reconcile the discrepancy.",
                    fmt(ctx.amountA()), fmt(ctx.amountB()), fmt(ctx.diff()));
        }

        String promptText = new PromptTemplate(EMAIL_DRAFT_TEMPLATE)
                .render(Map.of(
                        "vendorName", ctx.vendorName(),
                        "gstin", ctx.gstin(),
                        "invoiceNumber", ctx.invoiceNumber(),
                        "gstPeriod", ctx.gstPeriod(),
                        "actionInstruction", actionInstruction));

        log.info("Drafting email for mismatch {} via Ollama llama3.2", mismatchId);
        return callOllamaWithFallback(
                promptText,
                emailFallback(ctx),
                "email draft");
    }

    /**
     * Explain the risk of a mismatch in Hinglish bullet points.
     *
     * @param mismatchId UUID of the mismatch record
     * @return Hinglish risk explanation (2-3 bullet points, ≤80 words)
     */
    public String explainRisk(UUID mismatchId) {
        MismatchContext ctx = loadContext(mismatchId);

        String promptText = new PromptTemplate(EXPLAIN_RISK_TEMPLATE)
                .render(Map.of(
                        "riskLabel", ctx.riskLabel(),
                        "vendorName", ctx.vendorName(),
                        "invoiceNumber", ctx.invoiceNumber(),
                        "mismatchType", ctx.mismatchType(),
                        "ourAmount", ctx.amountA(),
                        "gstr2bAmount", ctx.amountB(),
                        "diff", ctx.diff()));

        log.info("Generating risk explanation for mismatch {} via Ollama", mismatchId);
        return callOllamaWithFallback(
                promptText,
                riskFallback(ctx),
                "risk explanation");
    }

    /**
     * Recommend the best action for a mismatch using Ollama.
     * Parses structured JSON from the LLM; falls back to rule-based logic
     * if Ollama is unavailable or returns malformed output.
     *
     * @param mismatchId UUID of the mismatch record
     * @return {@link ActionSuggestion} with action, reason, and confidence
     */
    public ActionSuggestion suggestAction(UUID mismatchId) {
        MismatchContext ctx = loadContext(mismatchId);

        String promptText = new PromptTemplate(SUGGEST_ACTION_TEMPLATE)
                .render(Map.of(
                        "vendorName", ctx.vendorName(),
                        "gstin", ctx.gstin(),
                        "vendorTrust", String.format("%.2f", ctx.vendorTrust()),
                        "invoiceNumber", ctx.invoiceNumber(),
                        "mismatchType", ctx.mismatchType(),
                        "ourAmount", ctx.amountA(),
                        "gstr2bAmount", ctx.amountB(),
                        "diff", ctx.diff(),
                        "riskScore", String.format("%.2f", ctx.riskScore()),
                        "riskLabel", ctx.riskLabel()));

        log.info("Requesting action suggestion for mismatch {} via Ollama", mismatchId);

        try {
            String raw = chatModel.call(new Prompt(promptText))
                    .getResult().getOutput().getContent();
            return parseActionSuggestion(raw, ctx.riskScore());
        } catch (Exception ex) {
            log.warn("Ollama unavailable for action suggestion (mismatch {}): {}. Using rule-based fallback.",
                    mismatchId, rootCause(ex));
            return ActionSuggestion.ruleBasedFallback(ctx.riskScore());
        }
    }

    /**
     * Generates a conversational response for a vendor compliance query.
     * Hooks into Ollama's local llama3.2 instance, falling back to an intelligent,
     * keyword-driven tax advisor routing block if Ollama is unavailable.
     *
     * @param message The raw chat query sent by the vendor
     * @return AI assistant text response
     */
    public String generateVendorChatResponse(String message) {
        String safeMessage = message != null ? message : "";
        String promptText = new PromptTemplate(VENDOR_CHAT_TEMPLATE)
                .render(Map.of("message", safeMessage));

        log.info("Generating vendor chat response via Ollama");
        return callOllamaWithFallback(
                promptText,
                generateVendorChatFallback(safeMessage),
                "vendor chat");
    }

    /**
     * High-fidelity GST tax expert keyword routing fallback block when Ollama is offline.
     */
    private String generateVendorChatFallback(String message) {
        String msg = message != null ? message.toLowerCase() : "";
        if (msg.contains("16(2)(c)") || msg.contains("section 16") || msg.contains("cgst act")) {
            return "Under Section 16(2)(c) of the CGST Act, 2017, your buyer (Acme Corporation) can only claim Input Tax Credit (ITC) if you file your GSTR-1 return containing this invoice and pay the tax via GSTR-3B. Since this invoice is missing in our GSTR-2B, Acme's ITC is blocked, causing direct cash flow loss. To resolve this, please upload invoice WIP/24/1099 in your next GSTR-1 filing.";
        }
        if (msg.contains("wip/24/1099") || msg.contains("invoice") || msg.contains("missing")) {
            return "Invoice WIP/24/1099 has been marked as 'MISSING' because we recorded it in our Books (₹7,80,000 value with ₹1,40,400 GST), but no record exists on the Government GSTR-2B Portal. Please immediately upload this invoice to your GSTR-1 return and ensure the correct GSTIN (07AAACR1294F1Z1) is used.";
        }
        if (msg.contains("how to file") || msg.contains("upload") || msg.contains("step")) {
            return "To upload your pending invoice to the GST Portal:\n1. Log in to the GST Portal (gst.gov.in).\n2. Go to Services > Returns > Returns Dashboard.\n3. Select the Financial Year and Period (e.g., March 2024), and click GSTR-1.\n4. Go to '4A, 4B, 4C, 6B, 6C - B2B Invoices' and click 'Add Record'.\n5. Input Acme's GSTIN (07AAACR1294F1Z1), Invoice No WIP/24/1099, Date, Value, and matching Tax Rates.\n6. Click Save, and submit/file the GSTR-1 return.";
        }
        if (msg.contains("hi") || msg.contains("hello") || msg.contains("help")) {
            return "Hello! I am your Recontiq Vendor Assistant. I can help you understand GST compliance issues, check why an invoice was flagged as a mismatch, explain Section 16(2)(c) liabilities, or guide you on uploading invoices to your GSTR-1 return. What compliance query can I help you with today?";
        }
        return "Thank you for reaching out. To resolve your current mismatch for invoice WIP/24/1099, please ensure that you have uploaded it under B2B Invoices in your GSTR-1 return for March 2024, using Recipient GSTIN 07AAACR1294F1Z1, and that your GSTR-3B return is successfully filed. Let me know if you need step-by-step instructions or details on Section 16(2)(c)!";
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PRIVATE — OLLAMA CALL WITH FALLBACK
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Calls Ollama's ChatModel. If the connection fails (Ollama not running),
     * logs a warning and returns the provided static fallback text.
     * All other runtime exceptions also fall back to avoid breaking the API
     * response.
     */
    private String callOllamaWithFallback(String promptText, String fallback, String operation) {
        try {
            String response = chatModel.call(new Prompt(promptText))
                    .getResult().getOutput().getContent();
            log.debug("Ollama {} — response length: {} chars", operation, response.length());
            return response.trim();
        } catch (Exception ex) {
            log.warn("Ollama unavailable for {} ({}). Returning rule-based fallback. " +
                    "Ensure Ollama is running: `ollama serve` and model is pulled: `ollama pull llama3.2`",
                    operation, rootCause(ex));
            return fallback;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PRIVATE — JSON PARSING
    // ═════════════════════════════════════════════════════════════════════════

    private static final Set<String> VALID_ACTIONS = Set.of(
            "auto_resolve", "request_vendor_correction", "escalate_to_ca", "write_off");

    /**
     * Extracts the JSON object from the LLM response.
     * The model may wrap it in markdown fences — we strip those first.
     */
    private ActionSuggestion parseActionSuggestion(String raw, double riskScore) {
        try {
            // Strip ```json ... ``` or ``` ... ``` markdown fences
            String json = raw.trim();
            if (json.startsWith("```")) {
                json = json.replaceFirst("^```(json)?\\s*", "").replaceFirst("```\\s*$", "").trim();
            }

            JsonNode node = objectMapper.readTree(json);
            String action = node.path("action").asText("request_vendor_correction").trim()
                    .toLowerCase().replace(" ", "_");
            String reason = node.path("reason").asText("See mismatch details for context.").trim();
            double conf = node.path("confidence").asDouble(0.60);

            // Validate action is in the allowed set
            if (!VALID_ACTIONS.contains(action)) {
                log.warn("LLM returned unknown action '{}', defaulting to rule-based", action);
                return ActionSuggestion.ruleBasedFallback(riskScore);
            }

            return ActionSuggestion.builder()
                    .action(action)
                    .reason(reason)
                    .confidence(Math.min(1.0, Math.max(0.0, conf)))
                    .build();

        } catch (Exception ex) {
            log.warn("Failed to parse LLM action JSON: {}. Using rule-based fallback. Raw: {}",
                    ex.getMessage(), raw.substring(0, Math.min(200, raw.length())));
            return ActionSuggestion.ruleBasedFallback(riskScore);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PRIVATE — DB CONTEXT LOADER
    // ═════════════════════════════════════════════════════════════════════════

    private MismatchContext loadContext(UUID mismatchId) {
        return jdbc.query("""
                SELECT
                    m.mismatch_type::text,
                    m.risk_score,
                    m.amount_diff,
                    ia.vendor_name,
                    ia.gstin,
                    ia.invoice_number,
                    ia.invoice_date,
                    ia.amount                                          AS amount_a,
                    COALESCE(ib.amount, 0)                             AS amount_b,
                    ABS(ia.amount - COALESCE(ib.amount, 0))           AS diff,
                    TO_CHAR(ia.invoice_date, 'Mon YYYY')              AS gst_period,
                    COALESCE(v.trust_score, 1.0)                      AS vendor_trust,
                    CASE
                        WHEN m.risk_score >= 0.85 THEN 'CRITICAL'
                        WHEN m.risk_score >= 0.60 THEN 'HIGH'
                        WHEN m.risk_score >= 0.40 THEN 'MEDIUM'
                        ELSE 'LOW'
                    END                                                AS risk_label
                FROM   mismatches m
                JOIN   invoices ia ON ia.id = m.invoice_id_a
                LEFT JOIN invoices ib ON ib.id = m.invoice_id_b
                LEFT JOIN vendors  v  ON v.gstin = ia.gstin
                WHERE  m.id = ?::uuid
                """,
                rs -> {
                    if (!rs.next())
                        throw new ResourceNotFoundException("Mismatch", mismatchId);
                    return new MismatchContext(
                            rs.getString("vendor_name"),
                            rs.getString("gstin"),
                            rs.getString("invoice_number"),
                            rs.getString("gst_period"),
                            rs.getString("mismatch_type"),
                            rs.getBigDecimal("amount_a"),
                            rs.getBigDecimal("amount_b"),
                            rs.getBigDecimal("diff"),
                            rs.getDouble("risk_score"),
                            rs.getString("risk_label"),
                            rs.getDouble("vendor_trust"));
                },
                mismatchId.toString());
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PRIVATE — STATIC FALLBACKS (when Ollama is offline)
    // ═════════════════════════════════════════════════════════════════════════

    private String emailFallback(MismatchContext ctx) {
        boolean isMissing = "MISSING".equalsIgnoreCase(ctx.mismatchType())
                || ctx.amountB() == null
                || ctx.amountB().compareTo(BigDecimal.ZERO) == 0;
        if (isMissing) {
            return """
                    Dear %s,

                    We are writing regarding Invoice No. %s (GST Period: %s) registered against your GSTIN %s.

                    Upon reconciliation with GSTR-2B, we noted that this invoice is completely missing/unfiled from your GSTR-1 returns, preventing it from appearing in our GSTR-2B.

                    This mismatch impacts our Input Tax Credit (ITC) claim under Section 16 of the CGST Act, 2017.

                    Kindly upload/file this invoice in your GSTR-1 or IFF return immediately to allow timely reconciliation.

                    Regards,
                    GST Compliance Team
                    """.formatted(ctx.vendorName(), ctx.invoiceNumber(), ctx.gstPeriod(), ctx.gstin());
        } else {
            return """
                    Dear %s,

                    We are writing regarding Invoice No. %s (GST Period: %s) registered against your GSTIN %s.

                    Upon reconciliation with GSTR-2B, we have identified an amount discrepancy:
                      • Our records reflect: ₹%s
                      • GSTR-2B shows:       ₹%s
                      • Difference:          ₹%s

                    This mismatch impacts our Input Tax Credit (ITC) claim under Section 16 of the CGST Act, 2017.

                    Kindly issue a corrected invoice or credit note within 7 working days to allow timely reconciliation.

                    Regards,
                    GST Compliance Team
                    """.formatted(
                    ctx.vendorName(), ctx.invoiceNumber(), ctx.gstPeriod(), ctx.gstin(),
                    fmt(ctx.amountA()), fmt(ctx.amountB()), fmt(ctx.diff()));
        }
    }

    private String riskFallback(MismatchContext ctx) {
        return """
                • Risk kyun hai: %s mismatch detected — ₹%s ka difference hai jo ITC claim affect karta hai.
                • ITC pe asar: Agar GSTR-2B match nahi hoga toh Section 16(2)(c) ke under ITC block ho sakta hai.
                • Kya karna chahiye: Vendor se corrected invoice ya credit note maango within 7 working days.
                """.formatted(ctx.mismatchType(), fmt(ctx.diff()));
    }

    private String fmt(BigDecimal v) {
        return v == null ? "0.00" : String.format("%,.2f", v);
    }

    private String rootCause(Throwable ex) {
        Throwable cause = ex;
        while (cause.getCause() != null)
            cause = cause.getCause();
        return cause.getClass().getSimpleName() + ": " + cause.getMessage();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // INNER RECORD
    // ═════════════════════════════════════════════════════════════════════════

    record MismatchContext(
            String vendorName,
            String gstin,
            String invoiceNumber,
            String gstPeriod,
            String mismatchType,
            BigDecimal amountA,
            BigDecimal amountB,
            BigDecimal diff,
            double riskScore,
            String riskLabel,
            double vendorTrust) {
    }
}
