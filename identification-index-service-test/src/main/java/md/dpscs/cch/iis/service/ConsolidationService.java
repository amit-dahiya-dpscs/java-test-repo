package md.dpscs.cch.iis.service;

import md.dpscs.cch.iis.model.*;
import md.dpscs.cch.iis.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConsolidationService {

    private final IdentMasterRepository masterRepo;
    private final IdentNameRepository nameRepo;
    private final IdentAddressRepository addressRepo;
    private final IdentFlagRepository flagRepo;
    private final IdentDobAliasRepository dobRepo;
    private final IdentScarsMarksRepository scarRepo;
    private final IdentSSNRepository ssnRepo;
    private final IdentMiscNumRepository miscNumRepo;
    private final IdentDocumentRepository documentRepo;
    private final AuditService auditService;
    private final ReferenceDataService referenceDataService;

    private static final List<String> CRIMINAL_TYPES = List.of(
            "BIN", "DOC", "DIO", "IUR", "PAA", "PAB", "COF", "PAR", "PAV", "PAL",
            "WPR", "WPL", "WAR", "WAA", "DET", "CSO", "SOR", "SVO", "SVP", "OFF",
            "CIE", "PAC", "PAD", "PAE", "PAF", "PAG", "PAH", "PAI", "PAJ",
            "209", "211", "CAR", "CNS", "DPP"
    );

    @Transactional
    public void consolidateRecords(String sourceSid, String targetSid, String username, String ipAddress) {
        if (sourceSid.equalsIgnoreCase(targetSid)) {
            throw new IllegalArgumentException("Source and Target SID cannot be the same.");
        }

        IdentMaster targetMaster = masterRepo.findBySid(targetSid)
                .orElseThrow(() -> new IllegalArgumentException("Unable to process Consolidation. Target SID does not exist."));

        IdentMaster sourceMaster = masterRepo.findBySid(sourceSid)
                .orElseThrow(() -> new IllegalArgumentException("Unable to process Consolidation. Source SID does not exist."));

        IdentName sourcePrimaryName = getPrimaryName(sourceMaster.getSystemId());
        IdentName targetPrimaryName = getPrimaryName(targetMaster.getSystemId());

        // --- TARGET SID UPDATES ---
        copyMissingDemographics(sourceMaster, targetMaster, sourcePrimaryName, targetPrimaryName);
        copyAppendedRecords(sourceMaster, targetMaster); // Duplication checks handled inside here

        addReference(targetMaster, "XRF", sourceSid, sourceSid + " HAS BEEN CONSOLIDATED WITH THIS SID");

        documentRepo.flush();
        recalculateRecordType(targetMaster, targetPrimaryName);

        masterRepo.save(targetMaster);

        // --- SOURCE SID DELETIONS & UPDATES ---
        addressRepo.deleteAll(addressRepo.findByMaster_SystemId(sourceMaster.getSystemId()));
        flagRepo.deleteAll(flagRepo.findByMaster_SystemId(sourceMaster.getSystemId()));
        dobRepo.deleteAll(dobRepo.findByMaster_SystemId(sourceMaster.getSystemId()));
        scarRepo.deleteAll(scarRepo.findByMaster_SystemId(sourceMaster.getSystemId()));
        ssnRepo.deleteAll(ssnRepo.findByMaster_SystemId(sourceMaster.getSystemId()));
        miscNumRepo.deleteAll(miscNumRepo.findByMaster_SystemId(sourceMaster.getSystemId()));

        List<IdentName> sourceNames = nameRepo.findByMaster_SystemId(sourceMaster.getSystemId());
        sourceNames.removeIf(n -> "P".equals(n.getNameType()));
        nameRepo.deleteAll(sourceNames);

        documentRepo.deleteAll(documentRepo.findByMaster_SystemId(sourceMaster.getSystemId()));
        documentRepo.flush();

        sourceMaster.setFbiNumber(null);
        sourceMaster.setComments(null);
        sourceMaster.setRecordType("T");
        sourcePrimaryName.setMafisFingerprint(null);

        nameRepo.save(sourcePrimaryName);

        addReference(sourceMaster, "CNS", targetSid, "THIS SID HAS BEEN CONSOLIDATED WITH SID " + targetSid);

        sourceMaster.setLastUpdateDate(LocalDateTime.now());
        masterRepo.save(sourceMaster);
    }

    private void copyMissingDemographics(IdentMaster source, IdentMaster target, IdentName sourceName, IdentName targetName) {
        if (!StringUtils.hasText(target.getFbiNumber()) && StringUtils.hasText(source.getFbiNumber())) {
            target.setFbiNumber(source.getFbiNumber());
        }
        if (!StringUtils.hasText(target.getRaceCode()) && StringUtils.hasText(source.getRaceCode())) { target.setRaceCode(source.getRaceCode()); targetName.setRaceCode(source.getRaceCode()); }
        if (!StringUtils.hasText(target.getSexCode()) && StringUtils.hasText(source.getSexCode())) { target.setSexCode(source.getSexCode()); targetName.setSexCode(source.getSexCode()); }
        if (targetName.getDateOfBirth() == null && sourceName.getDateOfBirth() != null) targetName.setDateOfBirth(sourceName.getDateOfBirth());
        if (!StringUtils.hasText(target.getPlaceOfBirthCode()) && StringUtils.hasText(source.getPlaceOfBirthCode())) target.setPlaceOfBirthCode(source.getPlaceOfBirthCode());
        if (!StringUtils.hasText(target.getHeight()) && StringUtils.hasText(source.getHeight())) target.setHeight(source.getHeight());
        if (!StringUtils.hasText(target.getWeight()) && StringUtils.hasText(source.getWeight())) target.setWeight(source.getWeight());
        if (!StringUtils.hasText(target.getEyeColorCode()) && StringUtils.hasText(source.getEyeColorCode())) target.setEyeColorCode(source.getEyeColorCode());
        if (!StringUtils.hasText(target.getHairColorCode()) && StringUtils.hasText(source.getHairColorCode())) target.setHairColorCode(source.getHairColorCode());
        if (!StringUtils.hasText(target.getSkinToneCode()) && StringUtils.hasText(source.getSkinToneCode())) target.setSkinToneCode(source.getSkinToneCode());
        if (!StringUtils.hasText(target.getCitizenshipCode()) && StringUtils.hasText(source.getCitizenshipCode())) target.setCitizenshipCode(source.getCitizenshipCode());
        if (!StringUtils.hasText(target.getComments()) && StringUtils.hasText(source.getComments())) target.setComments(source.getComments());

        IdentAddress sourceAddress = addressRepo.findByMaster_SystemId(source.getSystemId()).stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsCurrent()))
                .findFirst().orElse(null);

        IdentAddress targetAddress = addressRepo.findByMaster_SystemId(target.getSystemId()).stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsCurrent()))
                .findFirst().orElse(new IdentAddress());

        if (sourceAddress != null) {
            // Ensure target address is linked to the target master if it's a new record
            if (targetAddress.getAddressId() == null) {
                targetAddress.setMaster(target);
                targetAddress.setIsCurrent(true);
            }

            // Explicitly copy ONLY the missing fields from the source to the target
            if (!StringUtils.hasText(targetAddress.getStreetNumber()) && StringUtils.hasText(sourceAddress.getStreetNumber())) {
                targetAddress.setStreetNumber(sourceAddress.getStreetNumber());
            }
            if (!StringUtils.hasText(targetAddress.getStreetDirection()) && StringUtils.hasText(sourceAddress.getStreetDirection())) {
                targetAddress.setStreetDirection(sourceAddress.getStreetDirection());
            }
            if (!StringUtils.hasText(targetAddress.getStreetName()) && StringUtils.hasText(sourceAddress.getStreetName())) {
                targetAddress.setStreetName(sourceAddress.getStreetName());
            }
            if (!StringUtils.hasText(targetAddress.getStreetSuffix()) && StringUtils.hasText(sourceAddress.getStreetSuffix())) {
                targetAddress.setStreetSuffix(sourceAddress.getStreetSuffix());
            }
            if (!StringUtils.hasText(targetAddress.getCity()) && StringUtils.hasText(sourceAddress.getCity())) {
                targetAddress.setCity(sourceAddress.getCity());
            }
            if (!StringUtils.hasText(targetAddress.getStateCode()) && StringUtils.hasText(sourceAddress.getStateCode())) {
                targetAddress.setStateCode(sourceAddress.getStateCode());
            }
            if (!StringUtils.hasText(targetAddress.getZipCode()) && StringUtils.hasText(sourceAddress.getZipCode())) {
                targetAddress.setZipCode(sourceAddress.getZipCode());
            }

            addressRepo.save(targetAddress);
        }
        nameRepo.save(targetName);
    }

    private void copyAppendedRecords(IdentMaster source, IdentMaster target) {

        // 1. Fetch Existing Target Records for duplicate checks
        List<IdentName> targetNames = nameRepo.findByMaster_SystemId(target.getSystemId());
        List<IdentFlag> targetCautions = flagRepo.findByMaster_SystemId(target.getSystemId());
        List<IdentDobAlias> targetDobs = dobRepo.findByMaster_SystemId(target.getSystemId());
        List<IdentScarsMarks> targetScars = scarRepo.findByMaster_SystemId(target.getSystemId());
        List<IdentSSN> targetSsns = ssnRepo.findByMaster_SystemId(target.getSystemId());
        List<IdentMiscNum> targetMiscNums = miscNumRepo.findByMaster_SystemId(target.getSystemId());
        List<IdentDocument> targetDocs = documentRepo.findByMaster_SystemId(target.getSystemId());

        // 2. Copy ALIASES (Anti-Dupe Check)
        nameRepo.findByMaster_SystemId(source.getSystemId()).stream()
                .filter(n -> "A".equals(n.getNameType()))
                .forEach(sourceAlias -> {
                    boolean exists = targetNames.stream()
                            .filter(tn -> "A".equals(tn.getNameType()))
                            .anyMatch(tn -> isSameName(tn, sourceAlias));

                    if (!exists) {
                        IdentName newAlias = new IdentName();
                        newAlias.setMaster(target);
                        newAlias.setNameType("A");

                        // --- NAME COMPONENTS ---
                        newAlias.setLastName(sourceAlias.getLastName());
                        newAlias.setFirstName(sourceAlias.getFirstName());
                        newAlias.setMiddleName(sourceAlias.getMiddleName());
                        newAlias.setMiddleInitial(sourceAlias.getMiddleInitial());
                        newAlias.setSoundexCode(sourceAlias.getSoundexCode());

                        // --- DEMOGRAPHICS & BIOMETRICS SNAPSHOT ---
                        newAlias.setRaceCode(sourceAlias.getRaceCode());
                        newAlias.setSexCode(sourceAlias.getSexCode());
                        newAlias.setDateOfBirth(sourceAlias.getDateOfBirth());
                        newAlias.setMafisFingerprint(sourceAlias.getMafisFingerprint());

                        // Recalculate to append correctly to the Target SID's hierarchy
                        Integer maxSeq = nameRepo.findMaxSequenceBySystemId(target.getSystemId());
                        newAlias.setSequenceNumber(maxSeq != null ? maxSeq + 1 : 1);

                        // Save the new alias and immediately add it to the targetNames list
                        // so the maxSeq increments correctly if there are multiple source aliases
                        nameRepo.save(newAlias);
                        targetNames.add(newAlias);
                    }
                });

        // 3. Copy CAUTIONS (Anti-Dupe Check)
        flagRepo.findByMaster_SystemId(source.getSystemId()).forEach(f -> {
            boolean exists = targetCautions.stream().anyMatch(tc -> tc.getFlagCode().equalsIgnoreCase(f.getFlagCode()));
            if (!exists) {
                IdentFlag flag = new IdentFlag();
                flag.setMaster(target); flag.setFlagType(f.getFlagType()); flag.setFlagCode(f.getFlagCode());
                flagRepo.save(flag);
            }
        });

        // 4. Copy DOBs (Anti-Dupe Check)
        dobRepo.findByMaster_SystemId(source.getSystemId()).forEach(d -> {
            boolean exists = targetDobs.stream().anyMatch(td -> td.getDateOfBirth() != null && td.getDateOfBirth().equals(d.getDateOfBirth()));
            if (!exists) {
                IdentDobAlias dob = new IdentDobAlias();
                dob.setMaster(target); dob.setDateOfBirth(d.getDateOfBirth());
                dobRepo.save(dob);
            }
        });

        // 5. Copy SCARS/MARKS (Anti-Dupe Check)
        scarRepo.findByMaster_SystemId(source.getSystemId()).forEach(s -> {
            boolean exists = targetScars.stream().anyMatch(ts -> ts.getCode().equalsIgnoreCase(s.getCode()));
            if (!exists) {
                IdentScarsMarks scar = new IdentScarsMarks();
                scar.setMaster(target); scar.setCode(s.getCode());
                scar.setDescription(s.getDescription()); scar.setCreateTimestamp(LocalDateTime.now());
                scarRepo.save(scar);
            }
        });

        // 6. Copy SSNs (Anti-Dupe Check)
        ssnRepo.findByMaster_SystemId(source.getSystemId()).forEach(s -> {
            boolean exists = targetSsns.stream().anyMatch(ts -> ts.getSsn().equals(s.getSsn()));
            if (!exists) {
                IdentSSN ssn = new IdentSSN();
                ssn.setMaster(target); ssn.setSsn(s.getSsn());
                ssnRepo.save(ssn);
            }
        });

        // 7. Copy MISC NUMS (Anti-Dupe Check)
        miscNumRepo.findByMaster_SystemId(source.getSystemId()).forEach(m -> {
            boolean exists = targetMiscNums.stream().anyMatch(tm ->
                    tm.getMiscNumType().equalsIgnoreCase(m.getMiscNumType()) &&
                            tm.getMiscNumber().equalsIgnoreCase(m.getMiscNumber()));
            if (!exists) {
                IdentMiscNum misc = new IdentMiscNum();
                misc.setMaster(target); misc.setMiscNumType(m.getMiscNumType()); misc.setMiscNumber(m.getMiscNumber());
                miscNumRepo.save(misc);
            }
        });

        // 8. Copy REFERENCES (Anti-Dupe Check)
        documentRepo.findByMaster_SystemId(source.getSystemId()).forEach(doc -> {
            boolean exists = targetDocs.stream().anyMatch(td ->
                    td.getDocumentType().equalsIgnoreCase(doc.getDocumentType()) &&
                            td.getDocumentNumber().equalsIgnoreCase(doc.getDocumentNumber()) &&
                            td.getDocumentDate() != null && td.getDocumentDate().equals(doc.getDocumentDate()));

            if (!exists) {
                IdentDocument newDoc = new IdentDocument();
                newDoc.setMaster(target);
                newDoc.setDocumentDate(doc.getDocumentDate());
                newDoc.setDocumentType(doc.getDocumentType());
                newDoc.setDocumentNumber(doc.getDocumentNumber());
                newDoc.setDescription(doc.getDescription());
                newDoc.setDocCategory(doc.getDocCategory());
                documentRepo.save(newDoc);
            }
        });
    }

    private void addReference(IdentMaster master, String type, String number, String description) {
        IdentDocument ref = new IdentDocument();
        ref.setMaster(master);
        ref.setDocumentDate(LocalDate.now());
        ref.setDocumentType(type);
        ref.setDocumentNumber(number);
        ref.setDescription(description);

        String category = referenceDataService.determineCategory(type);
        ref.setDocCategory(category);

        documentRepo.save(ref);
    }

    private IdentName getPrimaryName(Long systemId) {
        return nameRepo.findByMaster_SystemId(systemId).stream()
                .filter(n -> "P".equals(n.getNameType()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Primary Name not found"));
    }

    // Helper Method for Name Duplication Checks
    private boolean isSameName(IdentName n1, IdentName n2) {
        String last1 = n1.getLastName() == null ? "" : n1.getLastName().trim();
        String first1 = n1.getFirstName() == null ? "" : n1.getFirstName().trim();
        String mid1 = n1.getMiddleName() == null ? "" : n1.getMiddleName().trim();

        String last2 = n2.getLastName() == null ? "" : n2.getLastName().trim();
        String first2 = n2.getFirstName() == null ? "" : n2.getFirstName().trim();
        String mid2 = n2.getMiddleName() == null ? "" : n2.getMiddleName().trim();

        return last1.equalsIgnoreCase(last2) && first1.equalsIgnoreCase(first2) && mid1.equalsIgnoreCase(mid2);
    }

    // Helper method to evaluate the Record Type ---
    private void recalculateRecordType(IdentMaster master, IdentName primaryName) {
        String fbi = master.getFbiNumber() != null ? master.getFbiNumber().trim() : "";
        String mafis = primaryName.getMafisFingerprint() != null ? primaryName.getMafisFingerprint().trim() : "";

        // Check if any document type on the record matches the criminal list
        boolean hasCrimRef = documentRepo.findByMaster_SystemId(master.getSystemId()).stream()
                .anyMatch(doc -> doc.getDocumentType() != null &&
                        CRIMINAL_TYPES.contains(doc.getDocumentType().toUpperCase().trim()));

        // --- PRIORITY 1: CRIMINAL STATUS (' ') ---
        if (hasCrimRef) {
            if(fbi.isEmpty() && mafis.isEmpty()) {
                master.setRecordType("T");
            } else {
                master.setRecordType(" ");
            }
        }
        // --- PRIORITY 2: NO CRIMINAL CRITERIA ---
        else {
            if (fbi.isEmpty() && mafis.isEmpty()) {
                master.setRecordType("T"); // Pending (No Biometrics)
            } else {
                master.setRecordType("N"); // Non-Criminal (Biometrics Exist)
            }
        }
    }
}