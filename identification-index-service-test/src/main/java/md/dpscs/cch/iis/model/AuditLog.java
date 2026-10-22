package md.dpscs.cch.iis.model;

import lombok.Data;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "T_AUDIT_LOG")
@Data
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String action;

    @Column
    private String ipAddress;

    @Column(name = "correlation_id", length = 36)
    private String correlationId;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "http_method", length = 10)
    private String httpMethod;

    @Column(name = "endpoint", length = 255)
    private String endpoint;

    @Column(name = "status_code")
    private Integer statusCode;

    @Lob
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String details;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    public AuditLog() {
        this.timestamp = LocalDateTime.now();
    }

}