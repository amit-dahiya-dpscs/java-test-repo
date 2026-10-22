package md.dpscs.cch.iis.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.envers.Audited;

@Entity
@Table(name = "T_IDENT_FLAGS_V1")
@Audited
@Data
public class IdentFlag {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "FlagID")
    private Long flagId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SystemID")
    private IdentMaster master;

    @Column(name = "FlagType", length = 10)
    private String flagType; // 'CAUTION', 'STATUS'

    @Column(name = "FlagCode", length = 1)
    private String flagCode;
}