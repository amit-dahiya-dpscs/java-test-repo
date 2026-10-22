package md.dpscs.cch.iis.service;

import md.dpscs.cch.iis.model.AuditLog;
import md.dpscs.cch.iis.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private static final Logger logger = LoggerFactory.getLogger(AuditService.class);
    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Creates and saves an audit log entry triggered by the Frontend UI.
     */
    @Async
    public void logAction(String username, String ipAddress, String userAgent, String correlationId, String action, String details) {
        if (username == null) username = "UNKNOWN";
        if (ipAddress == null) ipAddress = "0.0.0.0";
        if (action == null || action.trim().isEmpty()) action = "UNKNOWN_ACTION";
        if (details == null) details = "";

        AuditLog logEntry = new AuditLog();
        logEntry.setUsername(username);
        logEntry.setIpAddress(ipAddress);
        logEntry.setUserAgent(userAgent);
        logEntry.setCorrelationId(correlationId);
        logEntry.setAction(action);
        logEntry.setDetails(details);

        // For UI intent logs, HTTP Method and Endpoint aren't strictly necessary
        // as the action describes the intent (e.g., "ADD_ALIAS_CLICK"), but you can set them if desired.
        logEntry.setHttpMethod("UI_EVENT");

        try {
            auditLogRepository.save(logEntry);
            logger.info("Audit: User '{}' | IP '{}' | Action '{}' | CorrelationID '{}'",
                    username, ipAddress, action, correlationId);
        } catch (Exception e) {
            // Prevent audit failure from crashing the main thread
            logger.error("Failed to save UI audit log", e);
        }
    }
}