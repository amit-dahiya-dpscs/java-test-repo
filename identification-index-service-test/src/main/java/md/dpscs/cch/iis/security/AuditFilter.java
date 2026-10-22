package md.dpscs.cch.iis.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import md.dpscs.cch.iis.model.AuditLog;
import md.dpscs.cch.iis.repository.AuditLogRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Objects;

@Component
public class AuditFilter extends OncePerRequestFilter {

    private final AuditLogRepository auditLogRepository;

    public AuditFilter(@Lazy AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Skip preflight requests and static assets if necessary
        if (request.getMethod().equals("OPTIONS")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Execute the actual request
        filterChain.doFilter(request, response);

        // Skip the global filter if the request is destined for the manual Audit Controller
        if (request.getRequestURI().contains("/api/audit/log")) {
            return;
        }

        // After request completes, build the audit log
        logRequest(request, response);
    }

    private void logRequest(HttpServletRequest request, HttpServletResponse response) {
        try {
            AuditLog log = new AuditLog();

            // 1. Identify User
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            log.setUsername((auth != null && auth.isAuthenticated() && !Objects.equals(auth.getPrincipal(), "anonymousUser"))
                    ? auth.getName() : "UNAUTHENTICATED");

            // 2. Forensic Context
            log.setAction("API_REQUEST");
            log.setHttpMethod(request.getMethod());
            log.setEndpoint(request.getRequestURI());
            log.setStatusCode(response.getStatus());
            log.setIpAddress(getClientIp(request));
            log.setUserAgent(request.getHeader("User-Agent"));

            // 3. Correlation ID (Passed from React Frontend)
            String correlationId = request.getHeader("X-Correlation-ID");
            log.setCorrelationId(correlationId != null ? correlationId : java.util.UUID.randomUUID().toString());

            // Save asynchronously or directly (Repository save is fast enough for this level)
            auditLogRepository.save(log);

        } catch (Exception e) {
            // Fail safely: Auditing shouldn't crash the app
            logger.error("Failed to write audit log for request: " + request.getRequestURI(), e);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(request.getRemoteAddr())) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}