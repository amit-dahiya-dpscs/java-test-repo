package md.dpscs.cch.iis.repository;

import md.dpscs.cch.iis.model.IdentMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IdentMasterRepository extends JpaRepository<IdentMaster, Long> {

    Optional<IdentMaster> findBySid(String targetSid);
}