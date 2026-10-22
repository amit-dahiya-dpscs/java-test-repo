package md.dpscs.cch.iis.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.envers.Audited;

import java.time.LocalDate;

@Entity
@Table(name = "T_IDENT_DOCUMENTS_V1")
@Audited
@Data
public class IdentDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "DocID")
    private Long docId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SystemID")
    private IdentMaster master;

    @Column(name = "DocCategory", length = 10)
    private String docCategory; // 'ARREST', 'INDEX', 'REFER'

    @Column(name = "DocumentType", length = 3)
    private String documentType;

    @Column(name = "DocumentNumber", length = 12)
    private String documentNumber;

    @Column(name = "DocumentDate")
    private LocalDate documentDate;

    @Column(name = "Description")
    private String description;
}