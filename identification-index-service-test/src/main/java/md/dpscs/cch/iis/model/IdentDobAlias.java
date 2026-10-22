package md.dpscs.cch.iis.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.envers.Audited;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "T_IDENT_DOB_ALIAS_V1")
@Audited
@Data
public class IdentDobAlias {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DobID")
    private Long dobId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SystemID", nullable = false)
    private IdentMaster master;

    @Column(name = "DateOfBirth", nullable = false)
    private LocalDate dateOfBirth;

    @UpdateTimestamp
    @Column(name = "CreateTimestamp")
    private LocalDateTime createTimestamp;
}