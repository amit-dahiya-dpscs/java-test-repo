package md.dpscs.cch.iis.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.envers.Audited;

@Entity
@Table(name = "T_IDENT_MISC_NUM_V1")
@Audited
@Data
public class IdentMiscNum {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "MiscID")
    private Long miscId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SystemID", nullable = false)
    private IdentMaster master;

    @Column(name = "MiscNumType", nullable = false, length = 3)
    private String miscNumType;

    @Column(name = "MiscNumber", nullable = false, length = 12)
    private String miscNumber;
}