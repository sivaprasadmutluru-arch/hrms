package com.example.demo.asset.service;

import com.example.demo.asset.entity.*;
import com.example.demo.asset.repository.*;
import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.common.util.ScopeFilter;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssetService {

    private final AssetRepository assetRepository;
    private final AssetCategoryRepository assetCategoryRepository;
    private final AssetLotRepository assetLotRepository;
    private final AssetAssignmentRepository assetAssignmentRepository;
    private final AssetRequestRepository assetRequestRepository;
    private final AssetDocumentRepository assetDocumentRepository;
    private final AssetReportRepository assetReportRepository;
    private final ReturnImageRepository returnImageRepository;
    private final EmployeeRepository employeeRepository;
    private final CompanyRepository companyRepository;

    // ─── Asset CRUD ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Asset> getAssets() {
        Specification<Asset> spec = ScopeFilter.byCompany();
        log.debug("Fetching assets with scope filter: {}", spec != null ? "scoped" : "all");
        return spec != null ? assetRepository.findAll(spec) : assetRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Asset getAsset(Long id) {
        return assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
    }

    @Transactional
    public Asset createAsset(Asset asset) {
        log.info("Creating asset: {}", asset.getAssetName());
        if (asset.getCompany() != null && asset.getCompany().getId() != null) {
            asset.setCompany(companyRepository.getReferenceById(asset.getCompany().getId()));
        }
        if (asset.getCategory() != null && asset.getCategory().getId() != null) {
            asset.setCategory(assetCategoryRepository.getReferenceById(asset.getCategory().getId()));
        }
        if (asset.getAssignedTo() != null && asset.getAssignedTo().getId() != null) {
            asset.setAssignedTo(employeeRepository.getReferenceById(asset.getAssignedTo().getId()));
        }
        if (asset.getStatus() == null) {
            asset.setStatus(Asset.AssetStatus.AVAILABLE);
        }
        return assetRepository.save(asset);
    }

    @Transactional
    public Asset updateAsset(Long id, Asset updated) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
        asset.setAssetName(updated.getAssetName());
        asset.setDescription(updated.getDescription());
        asset.setStatus(updated.getStatus());
        asset.setPurchaseDate(updated.getPurchaseDate());
        asset.setPurchaseCost(updated.getPurchaseCost());
        asset.setWarrantyExpiry(updated.getWarrantyExpiry());
        if (updated.getCategory() != null && updated.getCategory().getId() != null) {
            asset.setCategory(assetCategoryRepository.getReferenceById(updated.getCategory().getId()));
        }
        if (updated.getAssignedTo() != null && updated.getAssignedTo().getId() != null) {
            asset.setAssignedTo(employeeRepository.getReferenceById(updated.getAssignedTo().getId()));
        } else if (updated.getAssignedTo() == null) {
            asset.setAssignedTo(null);
        }
        log.info("Updated asset id={}", id);
        return assetRepository.save(asset);
    }

    @Transactional
    public Map<String, String> deleteAsset(Long id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
        asset.setActive(false);
        assetRepository.save(asset);
        log.info("Soft-deleted asset id={}", id);
        return Map.of("message", "Asset deactivated");
    }

    @Transactional
    public Asset duplicateAsset(Long id, Long companyId) {
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
        log.info("Duplicated asset id={} for company id={}", id, companyId);
        return assetRepository.save(copy);
    }

    // ─── AssetCategory CRUD ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AssetCategory> getCategories(Long companyId) {
        return assetCategoryRepository.findByCompanyId(companyId);
    }

    @Transactional
    public AssetCategory createCategory(AssetCategory category, Long companyId) {
        category.setCompany(companyRepository.getReferenceById(companyId));
        log.info("Creating asset category: {} for company id={}", category.getName(), companyId);
        return assetCategoryRepository.save(category);
    }

    @Transactional
    public AssetCategory updateCategory(Long id, AssetCategory updated) {
        AssetCategory cat = assetCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetCategory", id));
        cat.setName(updated.getName());
        return assetCategoryRepository.save(cat);
    }

    @Transactional
    public Map<String, String> deleteCategory(Long id) {
        assetCategoryRepository.deleteById(id);
        return Map.of("message", "Category deleted");
    }

    @Transactional
    public AssetCategory duplicateCategory(Long id, Long companyId) {
        AssetCategory original = assetCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetCategory", id));
        AssetCategory copy = new AssetCategory();
        copy.setName(original.getName() + " (Copy)");
        copy.setCompany(companyRepository.getReferenceById(companyId));
        return assetCategoryRepository.save(copy);
    }

    // ─── AssetLot CRUD ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AssetLot> getLots() {
        Specification<AssetLot> spec = ScopeFilter.byCompany();
        return spec != null ? assetLotRepository.findAll(spec) : assetLotRepository.findAll();
    }

    @Transactional
    public AssetLot createLot(AssetLot lot) {
        if (lot.getCompany() != null && lot.getCompany().getId() != null) {
            lot.setCompany(companyRepository.getReferenceById(lot.getCompany().getId()));
        }
        if (lot.getCategory() != null && lot.getCategory().getId() != null) {
            lot.setCategory(assetCategoryRepository.getReferenceById(lot.getCategory().getId()));
        }
        log.info("Creating asset lot: {}", lot.getLotNumber());
        return assetLotRepository.save(lot);
    }

    @Transactional
    public AssetLot updateLot(Long id, AssetLot updated) {
        AssetLot lot = assetLotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetLot", id));
        lot.setLotNumber(updated.getLotNumber());
        lot.setDescription(updated.getDescription());
        lot.setQuantity(updated.getQuantity());
        lot.setPurchaseDate(updated.getPurchaseDate());
        lot.setPurchaseCost(updated.getPurchaseCost());
        return assetLotRepository.save(lot);
    }

    @Transactional
    public void deleteLot(Long id) {
        assetLotRepository.deleteById(id);
    }

    // ─── AssetAssignment ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AssetAssignment> getAssignments(Long assetId) {
        return assetAssignmentRepository.findByAssetId(assetId);
    }

    /**
     * Assigns an asset to an employee and creates an AssetAssignment record.
     * Also updates the asset's assignedTo / assignedDate / status fields.
     */
    @Transactional
    public AssetAssignment assignAsset(Long assetId, Long employeeId, LocalDate assignmentDate) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", assetId));
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));

        // Update asset-level assignment fields
        asset.setAssignedTo(employee);
        asset.setAssignedDate(assignmentDate != null ? assignmentDate : LocalDate.now());
        asset.setStatus(Asset.AssetStatus.IN_USE);
        assetRepository.save(asset);

        // Create assignment history record
        AssetAssignment assignment = new AssetAssignment();
        assignment.setAsset(asset);
        assignment.setEmployee(employee);
        assignment.setAssignedDate(assignmentDate != null ? assignmentDate : LocalDate.now());
        assignment.setIsReturned(false);
        log.info("Assigned asset id={} to employee id={}", assetId, employeeId);
        return assetAssignmentRepository.save(assignment);
    }

    /**
     * Processes the return of an asset assignment.
     * Marks the assignment returned, resets asset availability, and saves return images.
     */
    @Transactional
    public AssetAssignment returnAsset(Long assignmentId, LocalDate returnDate, String conditionNotes, List<String> imagePaths) {
        AssetAssignment assignment = assetAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("AssetAssignment", assignmentId));

        assignment.setIsReturned(true);
        assignment.setReturnedDate(returnDate != null ? returnDate : LocalDate.now());
        if (conditionNotes != null) {
            assignment.setNotes(conditionNotes);
        }

        // Reset asset-level assignment
        Asset asset = assignment.getAsset();
        asset.setAssignedTo(null);
        asset.setAssignedDate(null);
        asset.setStatus(Asset.AssetStatus.AVAILABLE);
        assetRepository.save(asset);

        // Persist return images if provided
        if (imagePaths != null) {
            for (String path : imagePaths) {
                ReturnImage image = new ReturnImage();
                image.setAsset(asset);
                image.setImagePath(path);
                image.setDescription(conditionNotes);
                returnImageRepository.save(image);
            }
        }

        log.info("Returned asset assignment id={}, asset id={}", assignmentId, asset.getId());
        return assetAssignmentRepository.save(assignment);
    }

    @Transactional
    public AssetAssignment markReturned(Long assignmentId) {
        AssetAssignment assignment = assetAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("AssetAssignment", assignmentId));
        assignment.setIsReturned(true);
        assignment.setReturnedDate(LocalDate.now());

        Asset asset = assignment.getAsset();
        asset.setAssignedTo(null);
        asset.setAssignedDate(null);
        asset.setStatus(Asset.AssetStatus.AVAILABLE);
        assetRepository.save(asset);

        return assetAssignmentRepository.save(assignment);
    }

    @Transactional
    public AssetAssignment recordAssignment(Long assetId, AssetAssignment assignment) {
        assignment.setAsset(assetRepository.getReferenceById(assetId));
        if (assignment.getEmployee() != null && assignment.getEmployee().getId() != null) {
            assignment.setEmployee(employeeRepository.getReferenceById(assignment.getEmployee().getId()));
        }
        return assetAssignmentRepository.save(assignment);
    }

    /**
     * Returns all assets currently assigned to a given employee.
     */
    @Transactional(readOnly = true)
    public List<Asset> getEmployeeAssets(Long employeeId) {
        employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));
        return assetRepository.findByAssignedToId(employeeId);
    }

    // ─── AssetRequest workflow ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AssetRequest> getRequests(Long companyId, Pageable pageable) {
        return assetRequestRepository.findByCompanyId(companyId, pageable);
    }

    /**
     * Creates a new asset request from an employee for a given category.
     */
    @Transactional
    public AssetRequest requestAsset(Long employeeId, Long categoryId, String description, Long companyId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));
        AssetRequest request = new AssetRequest();
        request.setEmployee(employee);
        if (categoryId != null) {
            request.setCategory(assetCategoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("AssetCategory", categoryId)));
        }
        request.setDescription(description);
        request.setStatus(AssetRequest.RequestStatus.REQUESTED);
        request.setCompany(companyRepository.getReferenceById(companyId));
        log.info("Employee id={} requested asset in category id={}", employeeId, categoryId);
        return assetRequestRepository.save(request);
    }

    @Transactional
    public AssetRequest createRequest(AssetRequest body, Long companyId) {
        body.setCompany(companyRepository.getReferenceById(companyId));
        body.setStatus(AssetRequest.RequestStatus.REQUESTED);
        return assetRequestRepository.save(body);
    }

    @Transactional
    public AssetRequest updateRequest(Long id, AssetRequest body) {
        AssetRequest req = assetRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetRequest", id));
        req.setDescription(body.getDescription());
        req.setStatus(body.getStatus());
        return assetRequestRepository.save(req);
    }

    /**
     * Approves an asset request and assigns the specified asset to the requesting employee.
     */
    @Transactional
    public AssetRequest approveAssetRequest(Long requestId, Long assetId) {
        AssetRequest request = assetRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("AssetRequest", requestId));

        request.setStatus(AssetRequest.RequestStatus.APPROVED);

        if (assetId != null) {
            Asset asset = assetRepository.findById(assetId)
                    .orElseThrow(() -> new ResourceNotFoundException("Asset", assetId));
            request.setAsset(asset);

            // Create formal assignment record and update asset status
            AssetAssignment assignment = new AssetAssignment();
            assignment.setAsset(asset);
            assignment.setEmployee(request.getEmployee());
            assignment.setAssignedDate(LocalDate.now());
            assignment.setIsReturned(false);
            assetAssignmentRepository.save(assignment);

            asset.setAssignedTo(request.getEmployee());
            asset.setAssignedDate(LocalDate.now());
            asset.setStatus(Asset.AssetStatus.IN_USE);
            assetRepository.save(asset);
        }

        log.info("Approved asset request id={}, assigned asset id={}", requestId, assetId);
        return assetRequestRepository.save(request);
    }

    /**
     * Rejects an asset request with an optional reason stored in description.
     */
    @Transactional
    public AssetRequest rejectAssetRequest(Long requestId, String reason) {
        AssetRequest request = assetRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("AssetRequest", requestId));
        request.setStatus(AssetRequest.RequestStatus.REJECTED);
        if (reason != null && !reason.isBlank()) {
            request.setDescription(reason);
        }
        log.info("Rejected asset request id={}", requestId);
        return assetRequestRepository.save(request);
    }

    // ─── AssetDocument CRUD ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AssetDocument> getDocuments(Long assetId) {
        return assetDocumentRepository.findByAssetId(assetId);
    }

    @Transactional
    public AssetDocument addDocument(Long assetId, AssetDocument doc) {
        assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", assetId));
        doc.setAsset(assetRepository.getReferenceById(assetId));
        log.info("Adding document to asset id={}", assetId);
        return assetDocumentRepository.save(doc);
    }

    @Transactional
    public void deleteDocument(Long id) {
        assetDocumentRepository.deleteById(id);
    }

    // ─── AssetReport ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AssetReport> getReports(Long assetId) {
        return assetReportRepository.findByAssetId(assetId);
    }

    @Transactional
    public AssetReport submitReport(Long assetId, AssetReport report) {
        assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", assetId));
        report.setAsset(assetRepository.getReferenceById(assetId));
        if (report.getReportedBy() != null && report.getReportedBy().getId() != null) {
            report.setReportedBy(employeeRepository.getReferenceById(report.getReportedBy().getId()));
        }
        return assetReportRepository.save(report);
    }

    /**
     * Generates an asset utilization report.
     * Filters by companyId. Optional status filter can narrow the result set.
     * Returns a summary with per-status counts and full asset list.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> generateReport(Long companyId, Asset.AssetStatus statusFilter) {
        List<Asset> assets;
        if (statusFilter != null) {
            assets = assetRepository.findByCompanyIdAndStatus(companyId, statusFilter);
        } else {
            assets = assetRepository.findByCompanyId(companyId);
        }

        long available = assets.stream().filter(a -> a.getStatus() == Asset.AssetStatus.AVAILABLE).count();
        long inUse = assets.stream().filter(a -> a.getStatus() == Asset.AssetStatus.IN_USE).count();
        long damaged = assets.stream().filter(a -> a.getStatus() == Asset.AssetStatus.DAMAGED).count();
        long retired = assets.stream().filter(a -> a.getStatus() == Asset.AssetStatus.RETIRED).count();

        BigDecimal totalValue = assets.stream()
                .filter(a -> a.getPurchaseCost() != null)
                .map(Asset::getPurchaseCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> report = new HashMap<>();
        report.put("totalAssets", assets.size());
        report.put("available", available);
        report.put("inUse", inUse);
        report.put("damaged", damaged);
        report.put("retired", retired);
        report.put("totalPurchaseValue", totalValue);
        report.put("utilizationRate", assets.isEmpty() ? 0.0 :
                Math.round((double) inUse / assets.size() * 10000.0) / 100.0);
        report.put("assets", assets);
        return report;
    }

    // ─── Return Images ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ReturnImage> getReturnImages(Long assetId) {
        return returnImageRepository.findByAssetId(assetId);
    }

    @Transactional
    public ReturnImage addReturnImage(Long assetId, ReturnImage image) {
        assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", assetId));
        image.setAsset(assetRepository.getReferenceById(assetId));
        return returnImageRepository.save(image);
    }

    @Transactional
    public void deleteReturnImage(Long id) {
        returnImageRepository.deleteById(id);
    }

    @Transactional
    public Asset importAsset(Asset asset, Long companyId) {
        asset.setCompany(companyRepository.getReferenceById(companyId));
        if (asset.getStatus() == null) asset.setStatus(Asset.AssetStatus.AVAILABLE);
        return assetRepository.save(asset);
    }

    // ─── Simple assign/return (controller convenience) ────────────────────────

    @Transactional
    public Asset assignToEmployee(Long assetId, Long employeeId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", assetId));
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee", employeeId));
        asset.setAssignedTo(employee);
        asset.setAssignedDate(LocalDate.now());
        asset.setStatus(Asset.AssetStatus.IN_USE);
        assetRepository.save(asset);

        AssetAssignment assignment = new AssetAssignment();
        assignment.setAsset(asset);
        assignment.setEmployee(employee);
        assignment.setAssignedDate(LocalDate.now());
        assignment.setIsReturned(false);
        assetAssignmentRepository.save(assignment);

        return asset;
    }

    @Transactional
    public Asset returnAssetById(Long assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", assetId));

        assetAssignmentRepository.findByAssetIdAndIsReturnedFalse(assetId)
                .forEach(a -> {
                    a.setIsReturned(true);
                    a.setReturnedDate(LocalDate.now());
                    assetAssignmentRepository.save(a);
                });

        asset.setAssignedTo(null);
        asset.setAssignedDate(null);
        asset.setStatus(Asset.AssetStatus.AVAILABLE);
        return assetRepository.save(asset);
    }

    // ─── Depreciation ─────────────────────────────────────────────────────────

    /**
     * Calculates straight-line depreciation for an asset.
     *
     * Formula: Annual Depreciation = purchaseCost / usefulLifeYears
     *          Accumulated = Annual Depreciation * yearsElapsed (capped at purchaseCost)
     *          Current Book Value = purchaseCost - Accumulated
     *
     * Requires: purchaseCost and purchaseDate on the asset.
     * usefulLifeYears defaults to 5 if not derivable from asset data.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> calculateDepreciation(Long assetId) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", assetId));

        if (asset.getPurchaseCost() == null || asset.getPurchaseDate() == null) {
            return Map.of(
                    "assetId", assetId,
                    "assetName", asset.getAssetName() != null ? asset.getAssetName() : "",
                    "error", "Asset is missing purchaseCost or purchaseDate required for depreciation calculation"
            );
        }

        int usefulLifeYears = 5; // default useful life
        BigDecimal purchaseCost = asset.getPurchaseCost();
        LocalDate purchaseDate = asset.getPurchaseDate();
        LocalDate today = LocalDate.now();

        long daysElapsed = ChronoUnit.DAYS.between(purchaseDate, today);
        double yearsElapsed = daysElapsed / 365.25;

        BigDecimal annualDepreciation = purchaseCost.divide(
                BigDecimal.valueOf(usefulLifeYears), 2, RoundingMode.HALF_UP);

        BigDecimal accumulatedDepreciation = annualDepreciation
                .multiply(BigDecimal.valueOf(yearsElapsed))
                .setScale(2, RoundingMode.HALF_UP);

        // Cap accumulated depreciation at the purchase cost
        if (accumulatedDepreciation.compareTo(purchaseCost) > 0) {
            accumulatedDepreciation = purchaseCost;
        }

        BigDecimal bookValue = purchaseCost.subtract(accumulatedDepreciation);
        if (bookValue.compareTo(BigDecimal.ZERO) < 0) {
            bookValue = BigDecimal.ZERO;
        }

        Map<String, Object> result = new HashMap<>();
        result.put("assetId", assetId);
        result.put("assetName", asset.getAssetName());
        result.put("purchaseCost", purchaseCost);
        result.put("purchaseDate", purchaseDate);
        result.put("usefulLifeYears", usefulLifeYears);
        result.put("annualDepreciation", annualDepreciation);
        result.put("yearsElapsed", Math.round(yearsElapsed * 100.0) / 100.0);
        result.put("accumulatedDepreciation", accumulatedDepreciation);
        result.put("currentBookValue", bookValue);
        result.put("fullyDepreciated", bookValue.compareTo(BigDecimal.ZERO) == 0);
        return result;
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────

    /**
     * Returns a dashboard summary of asset statistics for a given company.
     * Includes: total assets, assigned, available, under maintenance counts,
     * total purchase value, category count, and request status counts.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDashboard(Long companyId) {
        List<Asset> assets = assetRepository.findByCompanyId(companyId);
        List<AssetCategory> categories = assetCategoryRepository.findByCompanyId(companyId);
        List<AssetRequest> requests = assetRequestRepository.findByCompanyId(companyId);

        long totalAssets = assets.size();
        long assigned = assets.stream().filter(a -> a.getStatus() == Asset.AssetStatus.IN_USE).count();
        long available = assets.stream().filter(a -> a.getStatus() == Asset.AssetStatus.AVAILABLE).count();
        long damaged = assets.stream().filter(a -> a.getStatus() == Asset.AssetStatus.DAMAGED).count();
        long retired = assets.stream().filter(a -> a.getStatus() == Asset.AssetStatus.RETIRED).count();

        BigDecimal totalValue = assets.stream()
                .filter(a -> a.getPurchaseCost() != null)
                .map(Asset::getPurchaseCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long pendingRequests = requests.stream()
                .filter(r -> r.getStatus() == AssetRequest.RequestStatus.REQUESTED).count();
        long approvedRequests = requests.stream()
                .filter(r -> r.getStatus() == AssetRequest.RequestStatus.APPROVED).count();
        long rejectedRequests = requests.stream()
                .filter(r -> r.getStatus() == AssetRequest.RequestStatus.REJECTED).count();

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalAssets", totalAssets);
        dashboard.put("assignedAssets", assigned);
        dashboard.put("availableAssets", available);
        dashboard.put("damagedAssets", damaged);
        dashboard.put("retiredAssets", retired);
        dashboard.put("totalValue", totalValue);
        dashboard.put("totalCategories", categories.size());
        dashboard.put("totalRequests", requests.size());
        dashboard.put("pendingRequests", pendingRequests);
        dashboard.put("approvedRequests", approvedRequests);
        dashboard.put("rejectedRequests", rejectedRequests);
        return dashboard;
    }
}
