package md.dpscs.cch.iis.service;

import md.dpscs.cch.iis.dto.*;
import md.dpscs.cch.iis.model.*;
import md.dpscs.cch.iis.repository.*;
import md.dpscs.cch.iis.util.MainframeDataUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DetailService {

    // --- Repositories ---
    private final IdentMasterRepository masterRepo;
    private final IdentNameRepository nameRepo;
    private final IdentAddressRepository addrRepo;
    private final IdentSSNRepository ssnRepo;
    private final IdentDLRepository dlRepo;
    private final IdentMiscNumRepository miscRepo;
    private final IdentDobAliasRepository dobRepo;
    private final IdentFlagRepository flagRepo;
    private final IdentScarsMarksRepository scarsRepo;
    private final IdentHenryFPRepository henryRepo;
    private final IdentNcicFPRepository ncicRepo;
    private final IdentDocumentRepository docRepo;
    private final IdentFbiMasterRepository fbiMasterRepo;

    // --- Services & Utilities ---
    private final ReferenceDataService refService;
    private final MainframeDataUtils utils;

    @Transactional(readOnly = true)
    public PersonDetailDTO getPersonDetails(Long systemId) {

        // 1. Fetch Core Master Record
        IdentMaster master = masterRepo.findById(systemId)
                .orElseThrow(() -> new RuntimeException("Record not found for SystemID: " + systemId));

        // 2. Execute Sequential Fetches (Lightning fast because of SystemID Indexes!)
        List<IdentName> namesList = nameRepo.findByMaster_SystemId(systemId);
        List<IdentAddress> addrList = addrRepo.findByMaster_SystemId(systemId);
        List<IdentSSN> ssnList = ssnRepo.findByMaster_SystemId(systemId);
        List<IdentDL> dlList = dlRepo.findByMaster_SystemId(systemId);
        List<IdentMiscNum> miscListRaw = miscRepo.findByMaster_SystemId(systemId);
        List<IdentDobAlias> dobList = dobRepo.findByMaster_SystemId(systemId);
        List<IdentFlag> flagList = flagRepo.findByMaster_SystemId(systemId);
        List<IdentScarsMarks> scarList = scarsRepo.findByMaster_SystemId(systemId);
        List<IdentHenryFP> henryList = henryRepo.findByMaster_SystemId(systemId);
        List<IdentNcicFP> ncicList = ncicRepo.findByMaster_SystemId(systemId);
        List<IdentDocument> allDocs = docRepo.findByMaster_SystemIdOrderByDocumentDateDesc(systemId);
        boolean isFbiOwned = fbiMasterRepo.existsBySid(master.getSid());

        // 3. Load Reference Data
        Map<String, String> cautionMap = refService.getAllCautionCodes();

        // 4. Assemble DTO
        PersonDetailDTO dto = new PersonDetailDTO();

        // --- Header Information ---
        dto.setSystemId(master.getSystemId());
        dto.setSid(master.getSid());
        dto.setFbiNumber(master.getFbiNumber());
        dto.setRecordType(mapRecordType(master.getRecordType()));
        dto.setRapbackSubscriptionIndicator(master.getRapbackSubscriptionIndicator());
        dto.setFbiOwned(isFbiOwned);
        dto.setLastUpdated(master.getLastUpdateDate());
        dto.setComments(master.getComments());

        // --- Personal Identifiers ---
        dto.setRace(master.getRaceCode());
        dto.setSex(master.getSexCode());
        dto.setHeight(master.getHeight());
        dto.setWeight(master.getWeight());
        dto.setEyeColor(master.getEyeColorCode());
        dto.setHairColor(master.getHairColorCode());
        dto.setSkinTone(master.getSkinToneCode());
        dto.setPlaceOfBirth(master.getPlaceOfBirthCode());
        dto.setCitizenship(master.getCitizenshipCode());

        // --- Mapped Lists ---
        dto.setNamesAndAliases(namesList.stream().map(this::mapName).collect(Collectors.toList()));
        dto.setAddressHistory(addrList.stream().map(this::mapAddress).collect(Collectors.toList()));
        dto.setSsnHistory(ssnList.stream().map(this::mapSsn).collect(Collectors.toList()));
        dto.setDriverLicenses(dlList.stream().map(this::mapDl).collect(Collectors.toList()));
        dto.setAlternateDOBs(dobList.stream().map(this::mapDob).collect(Collectors.toList()));
        dto.setScarsAndMarks(scarList.stream().map(this::mapScar).collect(Collectors.toList()));
        dto.setFlags(flagList.stream().map(f -> mapFlag(f, cautionMap)).collect(Collectors.toList()));

        // --- Map Misc Numbers & DL Mapping ---
        List<SecondaryIDDTO> miscList = miscListRaw.stream().map(this::mapMisc).collect(Collectors.toList());
        List<SecondaryIDDTO> dlAsMisc = dlList.stream().map(this::mapDlToMisc).collect(Collectors.toList());
        miscList.addAll(dlAsMisc);
        dto.setSecondaryIdentifiers(miscList);

        // --- Fingerprint Classifications ---
        List<FingerprintDTO> fpList = new ArrayList<>();
        henryList.forEach(h -> fpList.add(mapHenry(h)));
        ncicList.forEach(n -> fpList.add(mapNcic(n)));
        dto.setFingerprints(fpList);

        // --- Fingerprint Pattern Type (MAFIS) ---
        IdentName primaryName = dto.getNamesAndAliases().isEmpty() ? null :
                namesList.stream().filter(n -> "P".equals(n.getNameType())).findFirst().orElse(namesList.get(0));

        if (primaryName != null && primaryName.getMafisFingerprint() != null) {
            String rawFp = primaryName.getMafisFingerprint();
            String convertedFp = utils.convertMafisHandToDisplay(rawFp);
            String paddedFp = String.format("%-10s", convertedFp);
            dto.setPatternRight(paddedFp.substring(0, 5).trim());
            dto.setPatternLeft(paddedFp.substring(5, Math.min(10, paddedFp.length())).trim());
        } else {
            dto.setPatternRight("");
            dto.setPatternLeft("");
        }

        // --- Documents ---
        dto.setArrestDocuments(allDocs.stream().filter(d -> "ARREST".equalsIgnoreCase(d.getDocCategory())).map(this::mapDoc).collect(Collectors.toList()));
        dto.setIndexDocuments(allDocs.stream().filter(d -> "INDEX".equalsIgnoreCase(d.getDocCategory())).map(this::mapDoc).collect(Collectors.toList()));
        dto.setGeneralReferences(allDocs.stream().filter(d -> "REFER".equalsIgnoreCase(d.getDocCategory())).map(this::mapDoc).collect(Collectors.toList()));

        // --- Derived Caution Flag ---
        String primaryCaution = dto.getFlags().stream()
                .filter(f -> "CAUTION".equals(f.getType()))
                .findFirst()
                .map(FlagDTO::getDescription)
                .orElse("NONE");
        dto.setCautionFlag(primaryCaution);

        return dto;
    }

    private SecondaryIDDTO mapDlToMisc(IdentDL entity) {
        SecondaryIDDTO dto = new SecondaryIDDTO();
        // Route the 3-char prefix (e.g. "MD-", "MDA") to idType
        dto.setIdType(entity.getStateSource() != null ? entity.getStateSource().trim() : "");
        // Route the actual number to idValue
        dto.setIdValue(entity.getLicenseNumber() != null ? entity.getLicenseNumber().trim() : "");
        return dto;
    }

    // --- NEW HELPER: Record Type Mapping ---
    private String mapRecordType(String code) {
        if (code == null) return "CRIMINAL";
        return switch (code.toUpperCase()) {
            case "J" -> "JUVENILE";
            case "N" -> "NON-CRIMINAL";
            case "T" -> "PENDING";
            case "F" -> "FLYER";
            default -> "CRIMINAL";
        };
    }

    // --- Mappers (Existing) ---
    private NameDTO mapName(IdentName entity) {
        NameDTO dto = new NameDTO();
        dto.setId(entity.getNameId());
        dto.setNameType(entity.getNameType());
        dto.setLastName(entity.getLastName());
        dto.setFirstName(entity.getFirstName());
        dto.setMiddleName(entity.getMiddleName());
        dto.setMiddleInitial(entity.getMiddleInitial());
        dto.setDateOfBirth(entity.getDateOfBirth());
        dto.setRace(entity.getRaceCode());
        dto.setSex(entity.getSexCode());
        return dto;
    }

    private AddressDTO mapAddress(IdentAddress entity) {
        AddressDTO dto = new AddressDTO();
        dto.setStreetNumber(entity.getStreetNumber());
        dto.setStreetDirection(entity.getStreetDirection());
        dto.setStreetName(entity.getStreetName());
        dto.setStreetSuffix(entity.getStreetSuffix());
        dto.setCity(entity.getCity());
        dto.setState(entity.getStateCode());
        dto.setZip(entity.getZipCode());
        dto.setIsCurrent(entity.getIsCurrent());

        String full = (entity.getStreetNumber() != null ? entity.getStreetNumber() + " " : "") +
                (entity.getStreetDirection() != null ? entity.getStreetDirection() + " " : "") +
                (entity.getStreetName() != null ? entity.getStreetName() + " " : "") +
                (entity.getStreetSuffix() != null ? entity.getStreetSuffix() : "");
        dto.setFullAddress(full.trim());
        return dto;
    }

    private SsnDTO mapSsn(IdentSSN entity) {
        SsnDTO dto = new SsnDTO();
        dto.setSsn(entity.getSsn());
        dto.setDateRecorded(entity.getDateRecorded() != null ? entity.getDateRecorded().toLocalDate() : null);
        return dto;
    }

    private DriverLicenseDTO mapDl(IdentDL entity) {
        DriverLicenseDTO dto = new DriverLicenseDTO();
        dto.setLicenseNumber(entity.getLicenseNumber());
        dto.setStateCode(entity.getStateSource());
        return dto;
    }

    private SecondaryIDDTO mapMisc(IdentMiscNum entity) {
        SecondaryIDDTO dto = new SecondaryIDDTO();

        dto.setIdType(entity.getMiscNumType());
        String num = entity.getMiscNumber() != null ? entity.getMiscNumber().trim() : "";

        dto.setIdValue((num).trim());

        return dto;
    }

    private AltDOBDTO mapDob(IdentDobAlias entity) {
        AltDOBDTO dto = new AltDOBDTO();
        dto.setDob(entity.getDateOfBirth());
        return dto;
    }

    private FlagDTO mapFlag(IdentFlag entity, Map<String, String> cautionMap) {
        FlagDTO dto = new FlagDTO();
        dto.setCode(entity.getFlagCode());
        dto.setType(entity.getFlagType());
        String desc = cautionMap.getOrDefault(entity.getFlagCode(), entity.getFlagCode());
        dto.setDescription(desc);
        return dto;
    }

    private AttributeDTO mapScar(IdentScarsMarks entity) {
        AttributeDTO dto = new AttributeDTO();
        dto.setCode(entity.getCode());
        dto.setDescription(entity.getDescription());
        return dto;
    }

    private FingerprintDTO mapHenry(IdentHenryFP entity) {
        FingerprintDTO dto = new FingerprintDTO();
        dto.setType("HENRY");
        dto.setPrimary(entity.getPrimaryHenry());
        dto.setClassification(entity.getFpcHenry());
        return dto;
    }

    private FingerprintDTO mapNcic(IdentNcicFP entity) {
        FingerprintDTO dto = new FingerprintDTO();
        dto.setType("NCIC");
        dto.setClassification(entity.getFpcPattern());
        return dto;
    }

    private DocumentDTO mapDoc(IdentDocument entity) {
        DocumentDTO dto = new DocumentDTO();
        dto.setId(entity.getDocId());
        dto.setDocumentType(entity.getDocumentType());
        dto.setDocumentNumber(entity.getDocumentNumber());
        dto.setDocumentDate(entity.getDocumentDate());
        dto.setDescription(entity.getDescription());
        dto.setCategory(entity.getDocCategory());
        return dto;
    }
}