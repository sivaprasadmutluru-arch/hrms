package com.example.demo.facedetection.service;

import com.example.demo.base.repository.CompanyRepository;
import com.example.demo.common.exception.ResourceNotFoundException;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.facedetection.entity.EmployeeFaceDetection;
import com.example.demo.facedetection.entity.FaceDetection;
import com.example.demo.facedetection.repository.EmployeeFaceDetectionRepository;
import com.example.demo.facedetection.repository.FaceDetectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class FaceDetectionService {

    private final FaceDetectionRepository faceDetectionRepository;
    private final EmployeeFaceDetectionRepository employeeFaceDetectionRepository;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    // ---- Settings ----

    @Transactional(readOnly = true)
    public List<FaceDetection> listSettings() {
        return faceDetectionRepository.findAll();
    }

    @Transactional(readOnly = true)
    public FaceDetection getSettingByCompany(Long companyId) {
        return faceDetectionRepository.findByCompanyId(companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "FaceDetection setting not found for company: " + companyId));
    }

    public FaceDetection createSetting(Long companyId, boolean start) {
        FaceDetection fd = new FaceDetection();
        fd.setStart(start);
        if (companyId != null) {
            fd.setCompany(companyRepository.getReferenceById(companyId));
        }
        return faceDetectionRepository.save(fd);
    }

    public FaceDetection updateSetting(Long id, Long companyId, boolean start) {
        FaceDetection fd = faceDetectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FaceDetection", id));
        fd.setStart(start);
        if (companyId != null) {
            fd.setCompany(companyRepository.getReferenceById(companyId));
        }
        return faceDetectionRepository.save(fd);
    }

    public void deleteSetting(Long id) {
        faceDetectionRepository.deleteById(id);
    }

    // ---- Employee Face Detections ----

    @Transactional(readOnly = true)
    public List<EmployeeFaceDetection> listEmployeeFaceDetections() {
        return employeeFaceDetectionRepository.findAll();
    }

    @Transactional(readOnly = true)
    public EmployeeFaceDetection getEmployeeFaceDetection(Long employeeId) {
        return employeeFaceDetectionRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "EmployeeFaceDetection not found for employee: " + employeeId));
    }

    public EmployeeFaceDetection createEmployeeFaceDetection(Long employeeId, String imagePath) {
        EmployeeFaceDetection efd = new EmployeeFaceDetection();
        efd.setImagePath(imagePath);
        if (employeeId != null) {
            efd.setEmployee(employeeRepository.getReferenceById(employeeId));
        }
        return employeeFaceDetectionRepository.save(efd);
    }

    public void deleteEmployeeFaceDetection(Long id) {
        employeeFaceDetectionRepository.deleteById(id);
    }
}
