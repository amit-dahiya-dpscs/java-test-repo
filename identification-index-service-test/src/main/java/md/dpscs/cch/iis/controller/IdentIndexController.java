package md.dpscs.cch.iis.controller;

import jakarta.servlet.http.HttpServletRequest;
import md.dpscs.cch.iis.dto.PersonDetailDTO;
import md.dpscs.cch.iis.dto.SearchCriteriaDTO;
import md.dpscs.cch.iis.dto.SearchResultDTO;
import md.dpscs.cch.iis.service.AuditService;
import md.dpscs.cch.iis.service.DetailService;
import md.dpscs.cch.iis.service.SearchService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/ident")
public class IdentIndexController {

    private final SearchService searchService;
    private final DetailService detailService;

    public IdentIndexController(SearchService searchService, DetailService detailService, AuditService auditService) {
        this.searchService = searchService;
        this.detailService = detailService;
    }

    @PostMapping("/search")
    public ResponseEntity<Page<SearchResultDTO>> searchRecords(
            @Valid @RequestBody SearchCriteriaDTO criteria,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<SearchResultDTO> results = searchService.executeSearch(criteria, pageable);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{systemId}")
    public ResponseEntity<PersonDetailDTO> getDetailRecord(
            @PathVariable Long systemId,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request) {

        PersonDetailDTO details = detailService.getPersonDetails(systemId);
        return ResponseEntity.ok(details);
    }
}