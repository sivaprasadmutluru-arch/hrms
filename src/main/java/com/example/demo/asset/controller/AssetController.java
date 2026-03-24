package com.example.demo.asset.controller;

import com.example.demo.asset.entity.*;
import com.example.demo.asset.repository.*;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
@Tag(name = "Assets")
public class AssetController {

    private final AssetRepository assetRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;
    private final AssetLotRepository assetLotRepository;
    private final AssetAssignmentRepository assetAssignmentRepository;
    private final AssetReportRepository assetReportRepository;
    private final AssetDocumentRepository assetDocumentRepository;
    private final ReturnImageRepository returnImageRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('asset:view')")
    public ResponseEntity<List<Asset>> list() {
        var spec = ScopeFilter.<Asset>byCompany();
        return ResponseEntity.ok(spec != null ? assetRepository.findAll(spec) : assetRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('asset:view')")
    public ResponseEntity<Asset> get(@PathVariable Long id) {
        return ResponseEntity.ok(assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('asset:create')")
    public ResponseEntity<Asset> create(@RequestBody Asset asset) {
        return ResponseEntity.ok(assetRepository.save(asset));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('asset:edit')")
    public ResponseEntity<Asset> update(@PathVariable Long id, @RequestBody Asset updated) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
        asset.setAssetName(updated.getAssetName());
        asset.setDescription(updated.getDescription());
        asset.setStatus(updated.getStatus());
        return ResponseEntity.ok(assetRepository.save(asset));
    }

    @PostMapping("/{id}/assign/{employeeId}")
    @PreAuthorize("hasAuthority('asset:edit')")
    public ResponseEntity<Asset> assign(@PathVariable Long id, @PathVariable Long employeeId) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
        asset.setAssignedTo(employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId)));
        asset.setAssignedDate(LocalDate.now());
        asset.setStatus(Asset.AssetStatus.IN_USE);
        return ResponseEntity.ok(assetRepository.save(asset));
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasAuthority('asset:edit')")
    public ResponseEntity<Asset> returnAsset(@PathVariable Long id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
        asset.setAssignedTo(null);
        asset.setAssignedDate(null);
        asset.setStatus(Asset.AssetStatus.AVAILABLE);
        return ResponseEntity.ok(assetRepository.save(asset));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('asset:delete')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
        asset.setActive(false);
        assetRepository.save(asset);
        return ResponseEntity.ok(Map.of("message", "Asset deactivated"));
    }

    // ─── Asset Lots ───────────────────────────────────────────────────────────

    @GetMapping("/lots")
    @PreAuthorize("hasAuthority('asset:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "List asset lots (company-scoped)")
    public ResponseEntity<List<AssetLot>> listLots() {
        var spec = ScopeFilter.<AssetLot>byCompany();
        return ResponseEntity.ok(spec != null ? assetLotRepository.findAll(spec) : assetLotRepository.findAll());
    }

    @PostMapping("/lots")
    @PreAuthorize("hasAuthority('asset:create')")
    @Transactional
    @Operation(summary = "Create an asset lot")
    public ResponseEntity<AssetLot> createLot(@RequestBody AssetLot lot) {
        if (lot.getCompany() != null && lot.getCompany().getId() != null) {
            lot.setCompany(companyRepository.getReferenceById(lot.getCompany().getId()));
        }
        return ResponseEntity.ok(assetLotRepository.save(lot));
    }

    @PutMapping("/lots/{id}")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Transactional
    @Operation(summary = "Update an asset lot")
    public ResponseEntity<AssetLot> updateLot(@PathVariable Long id, @RequestBody AssetLot updated) {
        AssetLot lot = assetLotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetLot", id));
        lot.setLotNumber(updated.getLotNumber());
        lot.setDescription(updated.getDescription());
        lot.setQuantity(updated.getQuantity());
        lot.setPurchaseDate(updated.getPurchaseDate());
        lot.setPurchaseCost(updated.getPurchaseCost());
        return ResponseEntity.ok(assetLotRepository.save(lot));
    }

    @DeleteMapping("/lots/{id}")
    @PreAuthorize("hasAuthority('asset:delete')")
    @Operation(summary = "Delete an asset lot")
    public ResponseEntity<Void> deleteLot(@PathVariable Long id) {
        assetLotRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Asset Assignment History ─────────────────────────────────────────────

    @GetMapping("/{assetId}/assignments")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "Get assignment history for an asset")
    public ResponseEntity<List<AssetAssignment>> listAssignments(@PathVariable Long assetId) {
        return ResponseEntity.ok(assetAssignmentRepository.findByAssetId(assetId));
    }

    @PostMapping("/{assetId}/assignments")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Transactional
    @Operation(summary = "Record an asset assignment")
    public ResponseEntity<AssetAssignment> recordAssignment(@PathVariable Long assetId,
                                                             @RequestBody AssetAssignment assignment) {
        assignment.setAsset(assetRepository.getReferenceById(assetId));
        if (assignment.getEmployee() != null && assignment.getEmployee().getId() != null) {
            assignment.setEmployee(employeeRepository.getReferenceById(assignment.getEmployee().getId()));
        }
        return ResponseEntity.ok(assetAssignmentRepository.save(assignment));
    }

    @PutMapping("/assignments/{id}/return")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Transactional
    @Operation(summary = "Mark an assignment as returned")
    public ResponseEntity<AssetAssignment> markReturned(@PathVariable Long id) {
        AssetAssignment aa = assetAssignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetAssignment", id));
        aa.setIsReturned(true);
        aa.setReturnedDate(LocalDate.now());
        return ResponseEntity.ok(assetAssignmentRepository.save(aa));
    }

    // ─── Asset Reports ────────────────────────────────────────────────────────

    @GetMapping("/{assetId}/reports")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List reports for an asset")
    public ResponseEntity<List<AssetReport>> listReports(@PathVariable Long assetId) {
        return ResponseEntity.ok(assetReportRepository.findByAssetId(assetId));
    }

    @PostMapping("/{assetId}/reports")
    @PreAuthorize("hasAuthority('asset:create')")
    @Transactional
    @Operation(summary = "Submit a report for an asset")
    public ResponseEntity<AssetReport> submitReport(@PathVariable Long assetId, @RequestBody AssetReport report) {
        report.setAsset(assetRepository.getReferenceById(assetId));
        if (report.getReportedBy() != null && report.getReportedBy().getId() != null) {
            report.setReportedBy(employeeRepository.getReferenceById(report.getReportedBy().getId()));
        }
        return ResponseEntity.ok(assetReportRepository.save(report));
    }

    // ─── Asset Documents ──────────────────────────────────────────────────────

    @GetMapping("/{assetId}/documents")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List documents for an asset")
    public ResponseEntity<List<AssetDocument>> listDocuments(@PathVariable Long assetId) {
        return ResponseEntity.ok(assetDocumentRepository.findByAssetId(assetId));
    }

    @PostMapping("/{assetId}/documents")
    @PreAuthorize("hasAuthority('asset:create')")
    @Transactional
    @Operation(summary = "Attach a document to an asset")
    public ResponseEntity<AssetDocument> addDocument(@PathVariable Long assetId, @RequestBody AssetDocument doc) {
        doc.setAsset(assetRepository.getReferenceById(assetId));
        return ResponseEntity.ok(assetDocumentRepository.save(doc));
    }

    @DeleteMapping("/documents/{id}")
    @PreAuthorize("hasAuthority('asset:delete')")
    @Operation(summary = "Delete an asset document")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        assetDocumentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Return Images ────────────────────────────────────────────────────────

    @GetMapping("/{assetId}/return-images")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List return images for an asset")
    public ResponseEntity<List<ReturnImage>> listReturnImages(@PathVariable Long assetId) {
        return ResponseEntity.ok(returnImageRepository.findByAssetId(assetId));
    }

    @PostMapping("/{assetId}/return-images")
    @PreAuthorize("hasAuthority('asset:create')")
    @Transactional
    @Operation(summary = "Add a return image to an asset")
    public ResponseEntity<ReturnImage> addReturnImage(@PathVariable Long assetId, @RequestBody ReturnImage image) {
        image.setAsset(assetRepository.getReferenceById(assetId));
        return ResponseEntity.ok(returnImageRepository.save(image));
    }

    @DeleteMapping("/return-images/{id}")
    @PreAuthorize("hasAuthority('asset:delete')")
    @Operation(summary = "Delete a return image")
    public ResponseEntity<Void> deleteReturnImage(@PathVariable Long id) {
        returnImageRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
