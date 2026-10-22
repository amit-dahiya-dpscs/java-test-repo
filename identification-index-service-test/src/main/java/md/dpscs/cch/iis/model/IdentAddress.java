package md.dpscs.cch.iis.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.envers.Audited;

@Entity
@Table(name = "T_IDENT_ADDRESS_V1")
@Audited
@Data
public class IdentAddress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "AddressID")
    private Long addressId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "SystemID")
    private IdentMaster master;

    @Column(name = "StreetNumber", length = 10)
    private String streetNumber;

    @Column(name = "StreetDirection", length = 3)
    private String streetDirection;

    @Column(name = "StreetName", length = 50)
    private String streetName;

    @Column(name = "StreetSuffix", length = 10)
    private String streetSuffix;

    @Column(name = "City", length = 20)
    private String city;

    @Column(name = "StateCode", length = 3)
    private String stateCode;

    @Column(name = "ZipCode", length = 5)
    private String zipCode;

    @Column(name = "IsCurrent")
    private Boolean isCurrent;
}