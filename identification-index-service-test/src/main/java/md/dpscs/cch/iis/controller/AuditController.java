package md.dpscs.cch.iis.controller;

import jakarta.servlet.http.HttpServletRequest;
import md.dpscs.cch.iis.service.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @PostMapping("/log")
    public ResponseEntity<Void> logUserAction(
            @RequestBody Map<String, String> payload,
            HttpServletRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String action = payload.get("action");
        String details = payload.get("details");
        String correlationId = payload.get("correlationId"); // Extract from React payload

        // 1. Get Username securely from the session
        String username = (userDetails != null) ? userDetails.getUsername() : "UNKNOWN_USER";

        // 2. Get Network/Browser Details
        String ipAddress = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");

        // 3. Call the updated Async Service
        auditService.logAction(username, ipAddress, userAgent, correlationId, action, details);

        return ResponseEntity.ok().build();
    }
}