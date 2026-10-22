package md.dpscs.cch.iis.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.envers.Audited;

@Entity
@Table(name = "T_REF_RACE_V1")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RaceCode {

    @Id
    @Column(name = "RaceCode", length = 3)
    private String code;

    @Column(name = "Description", length = 100, nullable = false)
    private String description;
}