package md.dpscs.cch.iis.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import org.hibernate.envers.Audited;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "T_IDENT_MASTER_V1")
@Audited
@Getter
@Setter
public class IdentMaster {
    @Id
    @Column(name = "SystemID")
    private Long systemId;

    @Column(name = "SID", length = 10, nullable = false)
    private String sid;

    @Column(name = "FBINumber", length = 9)
    private String fbiNumber;

    @Column(name = "RecordType")
    private String recordType;

    @Column(name = "LastUpdateDate")
    private LocalDateTime lastUpdateDate;

    // --- Demographics ---
    @Column(name = "Height", length = 3)
    private String height;
    @Column(name = "Weight", length = 3)
    private String weight;
    @Column(name = "RaceCode", length = 2)
    private String raceCode;
    @Column(name = "SexCode", length = 2)
    private String sexCode;
    @Column(name = "EyeColorCode", length = 3)
    private String eyeColorCode;
    @Column(name = "HairColorCode", length = 3)
    private String hairColorCode;
    @Column(name = "SkinToneCode", length = 3)
    private String skinToneCode;
    @Column(name = "PlaceOfBirthCode", length = 2)
    private String placeOfBirthCode;
    @Column(name = "CitizenshipCode", length = 2)
    private String citizenshipCode;

    // --- Flags ---
    @Column(name = "MugshotFlag", length = 1)
    private String mugshotFlag;
    @Column(name = "DnaFlag", length = 1)
    private String dnaFlag;
    @Column(name = "DisseminationFlag", length = 1)
    private String disseminationFlag;
    @Column(name = "IIIFlag", length = 1)
    private String iiiStatus;
    @Column(name = "RapbackFlag", length = 1)
    private String rapbackSubscriptionIndicator;
    @Column(name = "Comments")
    private String comments;

    // --- CRITICAL RELATIONSHIPS FOR SEARCH JOINS ---

    // Required for findBySsnPrimary ("JOIN m.ssnList s")
    @OneToMany(mappedBy = "master", fetch = FetchType.LAZY)
    private List<IdentSSN> ssnList;

    // Optional: Good practice to have these for future queries
    @OneToMany(mappedBy = "master", fetch = FetchType.LAZY)
    private List<IdentName> names;

    @OneToMany(mappedBy = "master", fetch = FetchType.LAZY)
    private List<IdentDL> driverLicenses;
}