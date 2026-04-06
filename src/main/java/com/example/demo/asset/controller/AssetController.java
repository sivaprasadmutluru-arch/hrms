package com.example.demo.asset.controller;

import com.example.demo.asset.entity.*;
import com.example.demo.asset.service.AssetService;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
@Tag(name = "Assets")
public class AssetController {

    private final AssetService assetService;

    @GetMapping
    @PreAuthorize("hasAuthority('asset:view')")
    public ResponseEntity<List<Asset>> list() {
        return ResponseEntity.ok(assetService.getAssets());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('asset:view')")
    public ResponseEntity<Asset> get(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.getAsset(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('asset:create')")
    public ResponseEntity<Asset> create(@RequestBody Asset asset) {
        return ResponseEntity.ok(assetService.createAsset(asset));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('asset:edit')")
    public ResponseEntity<Asset> update(@PathVariable Long id, @RequestBody Asset updated) {
        return ResponseEntity.ok(assetService.updateAsset(id, updated));
    }

    @PostMapping("/{id}/assign/{employeeId}")
    @PreAuthorize("hasAuthority('asset:edit')")
    public ResponseEntity<Asset> assign(@PathVariable Long id, @PathVariable Long employeeId) {
        return ResponseEntity.ok(assetService.assignToEmployee(id, employeeId));
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasAuthority('asset:edit')")
    public ResponseEntity<Asset> returnAsset(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.returnAssetById(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('asset:delete')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.deleteAsset(id));
    }

    @PostMapping("/{id}/duplicate")
    @PreAuthorize("hasAuthority('asset:create')")
    @Operation(summary = "Duplicate an asset")
    public ResponseEntity<Asset> duplicateAsset(@PathVariable Long id, @RequestParam Long companyId) {
        return ResponseEntity.ok(assetService.duplicateAsset(id, companyId));
    }

    // ─── Asset Lots ───────────────────────────────────────────────────────────

    @GetMapping("/lots")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List asset lots (company-scoped)")
    public ResponseEntity<List<AssetLot>> listLots() {
        return ResponseEntity.ok(assetService.getLots());
    }

    @PostMapping("/lots")
    @PreAuthorize("hasAuthority('asset:create')")
    @Operation(summary = "Create an asset lot")
    public ResponseEntity<AssetLot> createLot(@RequestBody AssetLot lot) {
        return ResponseEntity.ok(assetService.createLot(lot));
    }

    @PutMapping("/lots/{id}")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Operation(summary = "Update an asset lot")
    public ResponseEntity<AssetLot> updateLot(@PathVariable Long id, @RequestBody AssetLot updated) {
        return ResponseEntity.ok(assetService.updateLot(id, updated));
    }

    @DeleteMapping("/lots/{id}")
    @PreAuthorize("hasAuthority('asset:delete')")
    @Operation(summary = "Delete an asset lot")
    public ResponseEntity<Void> deleteLot(@PathVariable Long id) {
        assetService.deleteLot(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Asset Assignment History ─────────────────────────────────────────────

    @GetMapping("/{assetId}/assignments")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "Get assignment history for an asset")
    public ResponseEntity<List<AssetAssignment>> listAssignments(@PathVariable Long assetId) {
        return ResponseEntity.ok(assetService.getAssignments(assetId));
    }

    @PostMapping("/{assetId}/assignments")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Operation(summary = "Record an asset assignment")
    public ResponseEntity<AssetAssignment> recordAssignment(@PathVariable Long assetId,
                                                             @RequestBody AssetAssignment assignment) {
        return ResponseEntity.ok(assetService.recordAssignment(assetId, assignment));
    }

    @PutMapping("/assignments/{id}/return")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Operation(summary = "Mark an assignment as returned")
    public ResponseEntity<AssetAssignment> markReturned(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.markReturned(id));
    }

    // ─── Asset Reports ────────────────────────────────────────────────────────

    @GetMapping("/{assetId}/reports")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List reports for an asset")
    public ResponseEntity<List<AssetReport>> listReports(@PathVariable Long assetId) {
        return ResponseEntity.ok(assetService.getReports(assetId));
    }

    @PostMapping("/{assetId}/reports")
    @PreAuthorize("hasAuthority('asset:create')")
    @Operation(summary = "Submit a report for an asset")
    public ResponseEntity<AssetReport> submitReport(@PathVariable Long assetId, @RequestBody AssetReport report) {
        return ResponseEntity.ok(assetService.submitReport(assetId, report));
    }

    // ─── Asset Documents ──────────────────────────────────────────────────────

    @GetMapping("/{assetId}/documents")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List documents for an asset")
    public ResponseEntity<List<AssetDocument>> listDocuments(@PathVariable Long assetId) {
        return ResponseEntity.ok(assetService.getDocuments(assetId));
    }

    @PostMapping("/{assetId}/documents")
    @PreAuthorize("hasAuthority('asset:create')")
    @Operation(summary = "Attach a document to an asset")
    public ResponseEntity<AssetDocument> addDocument(@PathVariable Long assetId, @RequestBody AssetDocument doc) {
        return ResponseEntity.ok(assetService.addDocument(assetId, doc));
    }

    @DeleteMapping("/documents/{id}")
    @PreAuthorize("hasAuthority('asset:delete')")
    @Operation(summary = "Delete an asset document")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        assetService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Return Images ────────────────────────────────────────────────────────

    @GetMapping("/{assetId}/return-images")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List return images for an asset")
    public ResponseEntity<List<ReturnImage>> listReturnImages(@PathVariable Long assetId) {
        return ResponseEntity.ok(assetService.getReturnImages(assetId));
    }

    @PostMapping("/{assetId}/return-images")
    @PreAuthorize("hasAuthority('asset:create')")
    @Operation(summary = "Add a return image to an asset")
    public ResponseEntity<ReturnImage> addReturnImage(@PathVariable Long assetId, @RequestBody ReturnImage image) {
        return ResponseEntity.ok(assetService.addReturnImage(assetId, image));
    }

    @DeleteMapping("/return-images/{id}")
    @PreAuthorize("hasAuthority('asset:delete')")
    @Operation(summary = "Delete a return image")
    public ResponseEntity<Void> deleteReturnImage(@PathVariable Long id) {
        assetService.deleteReturnImage(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Asset Categories ─────────────────────────────────────────────────────

    @GetMapping("/categories")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List asset categories for a company")
    public ResponseEntity<List<AssetCategory>> listCategories(@RequestParam Long companyId) {
        return ResponseEntity.ok(assetService.getCategories(companyId));
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAuthority('asset:create')")
    @Operation(summary = "Create an asset category")
    public ResponseEntity<AssetCategory> createCategory(@RequestBody AssetCategory body, @RequestParam Long companyId) {
        return ResponseEntity.ok(assetService.createCategory(body, companyId));
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Operation(summary = "Update an asset category")
    public ResponseEntity<AssetCategory> updateCategory(@PathVariable Long id, @RequestBody AssetCategory body) {
        return ResponseEntity.ok(assetService.updateCategory(id, body));
    }

    @DeleteMapping("/categories/{id}")
    @PreAuthorize("hasAuthority('asset:delete')")
    @Operation(summary = "Delete an asset category")
    public ResponseEntity<Map<String, String>> deleteCategory(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.deleteCategory(id));
    }

    @PostMapping("/categories/{id}/duplicate")
    @PreAuthorize("hasAuthority('asset:create')")
    @Operation(summary = "Duplicate an asset category")
    public ResponseEntity<AssetCategory> duplicateCategory(@PathVariable Long id, @RequestParam Long companyId) {
        return ResponseEntity.ok(assetService.duplicateCategory(id, companyId));
    }

    // ─── Asset Requests ───────────────────────────────────────────────────────

    @GetMapping("/requests")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "List asset requests for a company")
    public ResponseEntity<Page<AssetRequest>> listRequests(@RequestParam Long companyId, Pageable pageable) {
        return ResponseEntity.ok(assetService.getRequests(companyId, pageable));
    }

    @PostMapping("/requests")
    @PreAuthorize("hasAuthority('asset:create')")
    @Operation(summary = "Create an asset request")
    public ResponseEntity<AssetRequest> createRequest(@RequestBody AssetRequest body, @RequestParam Long companyId) {
        return ResponseEntity.ok(assetService.createRequest(body, companyId));
    }

    @PutMapping("/requests/{id}")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Operation(summary = "Update an asset request")
    public ResponseEntity<AssetRequest> updateRequest(@PathVariable Long id, @RequestBody AssetRequest body) {
        return ResponseEntity.ok(assetService.updateRequest(id, body));
    }

    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Operation(summary = "Approve an asset request")
    public ResponseEntity<AssetRequest> approveRequest(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.approveAssetRequest(id, null));
    }

    @PostMapping("/requests/{id}/reject")
    @PreAuthorize("hasAuthority('asset:edit')")
    @Operation(summary = "Reject an asset request")
    public ResponseEntity<AssetRequest> rejectRequest(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.rejectAssetRequest(id, null));
    }

    // ─── Export / Import ──────────────────────────────────────────────────────

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "Export assets as Excel")
    public void exportToExcel(@RequestParam Long companyId, HttpServletResponse response) throws IOException {
        List<Asset> assets = assetService.getAssets();
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
                assetService.importAsset(asset, companyId);
                count++;
            }
        }
        return ResponseEntity.ok(Map.of("message", "Import completed", "count", count));
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('asset:view')")
    @Operation(summary = "Get asset dashboard stats for a company")
    public ResponseEntity<Map<String, Object>> getDashboard(@RequestParam Long companyId) {
        return ResponseEntity.ok(assetService.getDashboard(companyId));
    }
}
