package com.impact.gst.controller;

import com.impact.gst.service.ActionSuggestion;
import com.impact.gst.service.AgentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/agent")
@RequiredArgsConstructor
@Tag(name = "AI Agent", description = "LLM-powered email drafting, risk explanation, and action suggestion")
public class AgentController {

        private final AgentService agentService;
        private final JdbcTemplate jdbc;

        // ─── POST /draft-email/{mismatchId} ───────────────────────────────────────
        @Operation(summary = "Draft a vendor discrepancy email using Ollama llama3.2", description = "Generates a professional email body requesting clarification on the invoice discrepancy")
        @PostMapping("/draft-email/{mismatchId}")
        public ResponseEntity<Map<String, String>> draftEmail(@PathVariable UUID mismatchId) {
                log.info("Generating email draft for mismatch {}", mismatchId);
                String draft = agentService.draftVendorEmail(mismatchId);

                // Persist as agent_action
                jdbc.update("""
                                INSERT INTO agent_actions (id, mismatch_id, action_type, content, status, model_version)
                                VALUES (uuid_generate_v4(), ?::uuid, 'EMAIL_DRAFT'::action_type, ?,
                                        'PENDING'::action_status, 'ollama/llama3.2')
                                """, mismatchId.toString(), draft);

                return ResponseEntity.ok(Map.of("mismatchId", mismatchId.toString(), "emailDraft", draft));
        }

        // ─── POST /explain-risk/{mismatchId} ──────────────────────────────────────
        @Operation(summary = "Plain-English risk explanation using Ollama llama3.2", description = "Asks the LLM to explain why this mismatch is risky in Hinglish")
        @PostMapping("/explain-risk/{mismatchId}")
        public ResponseEntity<Map<String, String>> explainRisk(@PathVariable UUID mismatchId) {
                log.info("Generating risk explanation for mismatch {}", mismatchId);
                String explanation = agentService.explainRisk(mismatchId);

                // Persist as agent_action
                jdbc.update("""
                                INSERT INTO agent_actions (id, mismatch_id, action_type, content, status, model_version)
                                VALUES (uuid_generate_v4(), ?::uuid, 'FLAG_REVIEW'::action_type, ?,
                                        'COMPLETED'::action_status, 'ollama/llama3.2')
                                """, mismatchId.toString(), explanation);

                return ResponseEntity.ok(Map.of("mismatchId", mismatchId.toString(), "explanation", explanation));
        }

        // ─── POST /suggest-action/{mismatchId} ────────────────────────────────────
        @Operation(summary = "Get AI recommendation on how to resolve the mismatch", description = "Uses Ollama to suggest: auto_resolve, correction, escalation, or write-off")
        @PostMapping("/suggest-action/{mismatchId}")
        public ResponseEntity<ActionSuggestion> suggestAction(@PathVariable UUID mismatchId) {
                log.info("Requesting action suggestion for mismatch {}", mismatchId);
                ActionSuggestion suggestion = agentService.suggestAction(mismatchId);

                // Persist as agent_action
                jdbc.update("""
                                INSERT INTO agent_actions (id, mismatch_id, action_type, content, status, model_version)
                                VALUES (uuid_generate_v4(), ?::uuid, 'AUTO_RESOLVE'::action_type, ?,
                                        'COMPLETED'::action_status, 'ollama/llama3.2')
                                """, mismatchId.toString(), suggestion.getAction() + ": " + suggestion.getReason());

                return ResponseEntity.ok(suggestion);
        }

        // ─── POST /vendor-chat ────────────────────────────────────────────────────
        @Operation(summary = "Vendor AI Copilot Chat", description = "Allows a vendor to interact with the AI assistant for GST discrepancy resolution")
        @PostMapping("/vendor-chat")
        public ResponseEntity<Map<String, String>> vendorChat(@RequestBody Map<String, String> request) {
                String message = request.get("message");
                log.info("Received vendor chat request: {}", message);
                String response = agentService.generateVendorChatResponse(message);
                return ResponseEntity.ok(Map.of("response", response));
        }
}
