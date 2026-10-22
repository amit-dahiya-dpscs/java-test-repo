package md.dpscs.cch.iis.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import md.dpscs.cch.iis.dto.ConsolidationRequest;
import md.dpscs.cch.iis.service.ConsolidationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ident/consolidate")
@RequiredArgsConstructor
public class ConsolidationController {

    private final ConsolidationService consolidationService;

    @PostMapping("/{sourceSid}")
    public ResponseEntity<?> consolidateRecord(
            @PathVariable String sourceSid,
            @Valid @RequestBody ConsolidationRequest request,
            @AuthenticationPrincipal UserDetails user,
            HttpServletRequest httpRequest) {

        consolidationService.consolidateRecords(sourceSid, request.getTargetSid(), user.getUsername(), httpRequest.getRemoteAddr());

        return ResponseEntity.ok().body("{\"message\": \"CONSOLIDATION IS COMPLETED AND SID " + request.getTargetSid() + " SUCCESSFULLY UPDATED\"}");
    }
}