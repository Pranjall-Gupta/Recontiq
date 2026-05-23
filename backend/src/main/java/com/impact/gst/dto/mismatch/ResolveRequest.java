package com.impact.gst.dto.mismatch;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Request body for PATCH /mismatches/{id}/resolve */
@Data
public class ResolveRequest {
    @NotBlank(message = "Resolution note is required")
    @Size(min = 10, max = 2000, message = "Note must be between 10 and 2000 characters")
    private String resolutionNote;

    @NotBlank(message = "Resolved-by is required")
    private String resolvedBy;
}
