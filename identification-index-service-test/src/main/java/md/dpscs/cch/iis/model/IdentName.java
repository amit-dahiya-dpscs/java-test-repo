package md.dpscs.cch.iis.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.envers.Audited;

import java.time.LocalDate;

@Entity
@Table(name = "T_IDENT_NAMES_V1")
@Audited
@Data
public class IdentName {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "NameID")
    private Long nameId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SystemID", nullable = false)
    private IdentMaster master;

    @Column(name = "NameType", length = 1)
    private String nameType; // 'P', 'A'

    @Column(name = "LastName", length = 50, nullable = false)
    private String lastName;

    @Column(name = "FirstName", length = 50, nullable = false)
    private String firstName;

    @Column(name = "MiddleInitial", length = 10)
    private String middleInitial;

    @Column(name = "MiddleName", length = 50)
    private String middleName;

    @Column(name = "DateOfBirth")
    private LocalDate dateOfBirth;

    @Column(name = "RaceCode", length = 1)
    private String raceCode;

    @Column(name = "SexCode", length = 1)
    private String sexCode;

    @Column(name = "MafisFingerprint", length = 20)
    private String mafisFingerprint;

    @Column(name = "SoundexCode", length = 4)
    private String soundexCode;

    @Column(name = "SequenceNumber")
    private Integer sequenceNumber;
}