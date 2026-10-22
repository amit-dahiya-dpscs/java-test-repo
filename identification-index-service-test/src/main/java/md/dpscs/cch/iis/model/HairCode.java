package md.dpscs.cch.iis.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "T_REF_HAIR_V1")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HairCode {

    @Id
    @Column(name = "HairCode", length = 3)
    private String code;

    @Column(name = "Description", length = 100, nullable = false)
    private String description;
}