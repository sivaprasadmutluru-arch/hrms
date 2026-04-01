package com.example.demo.asset.controller;

import com.example.demo.asset.entity.*;
import com.example.demo.asset.repository.*;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.HashMap;
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
    private final AssetCategoryRepository assetCategoryRepository;
    private final AssetRequestRepository assetRequestRepository;

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

    // ─── Asset Categories ─────────────────────────────────────────────────────

    @GetMapping("/categories")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List asset categories for a company")
    public ResponseEntity<List<AssetCategory>> listCategories(@RequestParam Long companyId) {
        return ResponseEntity.ok(assetCategoryRepository.findByCompanyId(companyId));
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAuthority('asset:create')")
    @Transactional
    @Operation(summary = "Create an asset category")
    public ResponseEntity<AssetCategory> createCategory(@RequestBody AssetCategory body, @RequestParam Long companyId) {
        body.setCompany(companyRepository.getReferenceById(companyId));
        return ResponseEntity.ok(assetCategoryRepository.save(body));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Transactional
    @Operation(summary = "Update an asset category")
    public ResponseEntity<AssetCategory> updateCategory(@PathVariable Long id, @RequestBody AssetCategory body) {
        AssetCategory cat = assetCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetCategory", id));
        cat.setName(body.getName());
        return ResponseEntity.ok(assetCategoryRepository.save(cat));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasAuthority('asset:delete')")
    @Operation(summary = "Delete an asset category")
    public ResponseEntity<Map<String, String>> deleteCategory(@PathVariable Long id) {
        assetCategoryRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Category deleted"));
    }

    @PostMapping("/categories/{id}/duplicate")
    @PreAuthorize("hasAuthority('asset:create')")
    @Transactional
    @Operation(summary = "Duplicate an asset category")
    public ResponseEntity<AssetCategory> duplicateCategory(@PathVariable Long id, @RequestParam Long companyId) {
        AssetCategory original = assetCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetCategory", id));
        AssetCategory copy = new AssetCategory();
        copy.setName(original.getName() + " (Copy)");
        copy.setCompany(companyRepository.getReferenceById(companyId));
        return ResponseEntity.ok(assetCategoryRepository.save(copy));
    }

    // ─── Asset Duplicate ──────────────────────────────────────────────────────

    @PostMapping("/{id}/duplicate")
    @PreAuthorize("hasAuthority('asset:create')")
    @Transactional
    @Operation(summary = "Duplicate an asset")
    public ResponseEntity<Asset> duplicateAsset(@PathVariable Long id, @RequestParam Long companyId) {
        Asset original = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
        Asset copy = new Asset();
        copy.setAssetName(original.getAssetName() + " (Copy)");
        copy.setDescription(original.getDescription());
        copy.setStatus(Asset.AssetStatus.AVAILABLE);
        copy.setCategory(original.getCategory());
        copy.setPurchaseDate(original.getPurchaseDate());
        copy.setPurchaseCost(original.getPurchaseCost());
        copy.setWarrantyExpiry(original.getWarrantyExpiry());
        copy.setCompany(companyRepository.getReferenceById(companyId));
        return ResponseEntity.ok(assetRepository.save(copy));
    }

    // ─── Asset Requests ───────────────────────────────────────────────────────

    @GetMapping("/requests")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List asset requests for a company")
    public ResponseEntity<Page<AssetRequest>> listRequests(@RequestParam Long companyId, Pageable pageable) {
        return ResponseEntity.ok(assetRequestRepository.findByCompanyId(companyId, pageable));
    }

    @PostMapping("/requests")
    @PreAuthorize("hasAuthority('asset:create')")
    @Transactional
    @Operation(summary = "Create an asset request")
    public ResponseEntity<AssetRequest> createRequest(@RequestBody AssetRequest body, @RequestParam Long companyId) {
        body.setCompany(companyRepository.getReferenceById(companyId));
        body.setStatus(AssetRequest.RequestStatus.REQUESTED);
        return ResponseEntity.ok(assetRequestRepository.save(body));
    }

    @PutMapping("/requests/{id}")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Transactional
    @Operation(summary = "Update an asset request")
    public ResponseEntity<AssetRequest> updateRequest(@PathVariable Long id, @RequestBody AssetRequest body) {
        AssetRequest req = assetRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetRequest", id));
        req.setDescription(body.getDescription());
        req.setStatus(body.getStatus());
        return ResponseEntity.ok(assetRequestRepository.save(req));
    }

    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Transactional
    @Operation(summary = "Approve an asset request")
    public ResponseEntity<AssetRequest> approveRequest(@PathVariable Long id) {
        AssetRequest req = assetRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetRequest", id));
        req.setStatus(AssetRequest.RequestStatus.APPROVED);
        return ResponseEntity.ok(assetRequestRepository.save(req));
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Transactional
    @Operation(summary = "Reject an asset request")
    public ResponseEntity<AssetRequest> rejectRequest(@PathVariable Long id) {
        AssetRequest req = assetRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetRequest", id));
        req.setStatus(AssetRequest.RequestStatus.REJECTED);
        return ResponseEntity.ok(assetRequestRepository.save(req));
    }

    // ─── Asset Export / Import ────────────────────────────────────────────────

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "Export assets as Excel")
    public void exportToExcel(@RequestParam Long companyId, HttpServletResponse response) throws IOException {
        var spec = ScopeFilter.<Asset>byCompany();
        List<Asset> assets = spec != null ? assetRepository.findAll(spec) : assetRepository.findAll();
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=assets.xlsx");
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Assets");
            Row header = sheet.createRow(0);
            String[] cols = {"Asset Name", "Category", "Status", "Assigned To", "Company"};
            for (int i = 0; i < cols.length; i++) {
                header.createCell(i).setCellValue(cols[i]);
            }
            int rowNum = 1;
            for (Asset a : assets) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(a.getAssetName() != null ? a.getAssetName() : "");
                row.createCell(1).setCellValue(a.getCategory() != null ? a.getCategory().getName() : "");
                row.createCell(2).setCellValue(a.getStatus() != null ? a.getStatus().name() : "");
                String assignedTo = a.getAssignedTo() != null
                        ? a.getAssignedTo().getFirstName() + " " + a.getAssignedTo().getLastName()
                        : "";
                row.createCell(3).setCellValue(assignedTo);
                row.createCell(4).setCellValue(a.getCompany() != null ? a.getCompany().getName() : "");
            }
            workbook.write(response.getOutputStream());
        }
    }

    @PostMapping("/import")
    @PreAuthorize("hasAuthority('asset:create')")
    @Transactional
    @Operation(summary = "Import assets from Excel")
    public ResponseEntity<Map<String, Object>> importFromExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam Long companyId) throws IOException {
        int count = 0;
        try (XSSFWorkbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                Cell nameCell = row.getCell(0);
                if (nameCell == null) continue;
                Asset asset = new Asset();
                asset.setAssetName(nameCell.getStringCellValue());
                asset.setCompany(companyRepository.getReferenceById(companyId));
                assetRepository.save(asset);
                count++;
            }
        }
        return ResponseEntity.ok(Map.of("message", "Import completed", "count", count));
    }

    // ─── Asset Dashboard ──────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('asset:view')")
    @Transactional(readOnly = true)
    @Operation(summary = "Get asset dashboard stats for a company")
    public ResponseEntity<Map<String, Object>> getDashboard(@RequestParam Long companyId) {
        List<Asset> assets = assetRepository.findAll();
        List<AssetCategory> categories = assetCategoryRepository.findByCompanyId(companyId);
        List<AssetRequest> requests = assetRequestRepository.findByCompanyId(companyId);
        long pending = requests.stream()
                .filter(r -> r.getStatus() == AssetRequest.RequestStatus.REQUESTED).count();
        long approved = requests.stream()
                .filter(r -> r.getStatus() == AssetRequest.RequestStatus.APPROVED).count();
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalAssets", assets.size());
        dashboard.put("totalCategories", categories.size());
        dashboard.put("totalRequests", requests.size());
        dashboard.put("pendingRequests", pending);
        dashboard.put("approvedRequests", approved);
        return ResponseEntity.ok(dashboard);
    }
}
