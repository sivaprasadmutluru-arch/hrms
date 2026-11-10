package com.example.demo.auth.service;

import com.example.demo.auth.repository.UserRepository;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.common.service.FileUploadService;
import com.example.demo.common.exception.BadRequestException;
import com.example.demo.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.io.*;
import java.util.Set;

@Service @RequiredArgsConstructor
public class AccountPhotoService {
    private final UserRepository users;
    private final EmployeeRepository employees;
    private final FileUploadService files;

    @Transactional(rollbackFor=IOException.class)
    public String upload(Long userId, MultipartFile file) throws IOException {
        var user=users.findByIdForUpdate(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
        if (employees.findByUserId(userId).isPresent())
            throw new BadRequestException("Use your employee profile to update your photo");
        if (file==null || file.isEmpty()) throw new BadRequestException("Choose a JPEG or PNG image");
        if (file.getSize()>5L*1024*1024) throw new BadRequestException("Profile pictures must be 5 MB or smaller");
        byte[] clean;
        try (var input=ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers=ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new BadRequestException("Choose a valid JPEG or PNG image");
            var reader=readers.next();
            try {
                reader.setInput(input);
                if (!Set.of("JPEG","PNG").contains(reader.getFormatName().toUpperCase(java.util.Locale.ROOT)))
                    throw new BadRequestException("Choose a JPEG or PNG image");
                if (reader.getWidth(0)>4096 || reader.getHeight(0)>4096)
                    throw new BadRequestException("Profile pictures must be at most 4096 × 4096 pixels");
                var image=reader.read(0);
                var output=new ByteArrayOutputStream();
                ImageIO.write(image,"png",output); clean=output.toByteArray();
            } finally { reader.dispose(); }
        } catch (IOException e) { throw new BadRequestException("The image could not be read. Choose a valid JPEG or PNG image"); }
        String previous=user.getPhotoPath();
        String path=files.storeBytes(clean,"profile.png","account-photos/"+userId);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status==STATUS_COMMITTED) { if (previous!=null && !previous.equals(path)) files.delete(previous); }
                    else files.delete(path);
                }
            });
        }
        user.setPhotoPath(path); users.saveAndFlush(user);
        return path;
    }
}
