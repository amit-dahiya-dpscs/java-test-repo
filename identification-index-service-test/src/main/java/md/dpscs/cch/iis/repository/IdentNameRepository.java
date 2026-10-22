package md.dpscs.cch.iis.repository;

import md.dpscs.cch.iis.model.IdentName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface IdentNameRepository extends JpaRepository<IdentName, Long>, JpaSpecificationExecutor<IdentName> {

    @Override
    Page<IdentName> findAll(Specification<IdentName> spec, Pageable pageable);

    List<IdentName> findByMaster_SystemId(Long systemId);

    @Query("SELECT COALESCE(MAX(n.sequenceNumber), 0) FROM IdentName n WHERE n.master.systemId = :systemId")
    Integer findMaxSequenceBySystemId(@Param("systemId") Long systemId);

    boolean existsByMaster_SystemIdAndLastNameAndFirstNameAndMiddleNameAndNameType(
            Long systemId, String lastName, String firstName, String middleName, String nameType
    );

    @EntityGraph(attributePaths = {"master"})
    @Query(
            value = "SELECT n FROM IdentName n WHERE n.master.sid = :sid AND n.nameType = 'P'",
            countQuery = "SELECT COUNT(m.systemId) FROM IdentMaster m WHERE m.sid = :sid"
    )
    Page<IdentName> findBySidPrimary(@Param("sid") String sid, Pageable pageable);

    @EntityGraph(attributePaths = {"master"})
    @Query(
            value = "SELECT n FROM IdentName n WHERE n.master.fbiNumber = :fbi AND n.nameType = 'P'",
            countQuery = "SELECT COUNT(m.systemId) FROM IdentMaster m WHERE m.fbiNumber = :fbi"
    )
    Page<IdentName> findByFbiPrimary(@Param("fbi") String fbi, Pageable pageable);

    @EntityGraph(attributePaths = {"master"})
    @Query(
            value = "SELECT n FROM IdentName n JOIN n.master m JOIN m.ssnList s WHERE s.ssn = :ssn AND n.nameType = 'P'",
            countQuery = "SELECT COUNT(s.ssnId) FROM IdentSSN s WHERE s.ssn = :ssn"
    )
    Page<IdentName> findBySsnPrimary(@Param("ssn") String ssn, Pageable pageable);

    // --- Driver's License Search ---
    @EntityGraph(attributePaths = {"master"})
    @Query(
            value = "SELECT n FROM IdentName n " +
                    "JOIN n.master m " +
                    "JOIN m.driverLicenses d " +
                    "WHERE d.licenseNumber = :dlNum " +
                    "AND d.stateSource LIKE :dlState " +
                    "AND n.nameType = 'P'",
            countQuery = "SELECT COUNT(d.driverLicId) FROM IdentDL d " +
                    "WHERE d.licenseNumber = :dlNum " +
                    "AND d.stateSource LIKE :dlState"
    )
    Page<IdentName> findByDlPrimary(
            @Param("dlNum") String dlNum,
            @Param("dlState") String dlState,
            Pageable pageable);

}