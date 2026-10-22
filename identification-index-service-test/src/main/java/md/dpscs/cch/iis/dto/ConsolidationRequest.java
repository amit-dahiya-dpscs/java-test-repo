package md.dpscs.cch.iis.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConsolidationRequest {
    @NotBlank(message = "Target SID is required for consolidation.")
    private String targetSid;
}