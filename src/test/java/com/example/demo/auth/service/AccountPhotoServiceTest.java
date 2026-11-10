package com.example.demo.auth.service;
import com.example.demo.auth.entity.User;
import com.example.demo.auth.repository.UserRepository;
import com.example.demo.employee.entity.Employee;
import com.example.demo.employee.repository.EmployeeRepository;
import com.example.demo.common.service.FileUploadService;
import com.example.demo.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.*;
import java.util.Optional;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.ByteArrayOutputStream;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class AccountPhotoServiceTest {
    UserRepository users=mock(UserRepository.class);
    EmployeeRepository employees=mock(EmployeeRepository.class);
    FileUploadService files=mock(FileUploadService.class);
    AccountPhotoService service=new AccountPhotoService(users,employees,files);
    User user=new User();
    AccountPhotoServiceTest() { user.setId(1L); when(users.findByIdForUpdate(1L)).thenReturn(Optional.of(user)); }
    MockMultipartFile image(int width) throws Exception {
        var out=new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(width,2,BufferedImage.TYPE_INT_RGB),"png",out);
        return new MockMultipartFile("file","../../unsafe.html","image/png",out.toByteArray());
    }
    @Test void storesSafeImageOnAccountAndDeletesPreviousOnlyAfterCommit() throws Exception {
        user.setPhotoPath("old.png"); when(files.storeBytes(any(),eq("profile.png"),eq("account-photos/1"))).thenReturn("account-photos/1/new.png");
        TransactionSynchronizationManager.initSynchronization();
        try {
            assertThat(service.upload(1L,image(2))).isEqualTo("account-photos/1/new.png");
            assertThat(user.getPhotoPath()).isEqualTo("account-photos/1/new.png"); verify(users).saveAndFlush(user);
            verify(files,never()).delete(any());
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));
            verify(files).delete("old.png");
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }
    @Test void rollbackRemovesNewImageAndPreservesOldFile() throws Exception {
        user.setPhotoPath("old.png"); when(files.storeBytes(any(),anyString(),anyString())).thenReturn("new.png");
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.upload(1L,image(2));
            TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
            verify(files).delete("new.png"); verify(files,never()).delete("old.png");
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }
    @Test void rejectsInvalidOversizedAndExcessiveDimensions() throws Exception {
        assertThatThrownBy(() -> service.upload(1L,new MockMultipartFile("file","photo.png","image/png","not image".getBytes()))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.upload(1L,new MockMultipartFile("file",new byte[5*1024*1024+1]))).isInstanceOf(BadRequestException.class);
        var large=image(4097); assertThatThrownBy(() -> service.upload(1L,large)).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(files);
    }
    @Test void employeeMustUseFeatureGatedEmployeeUpload() throws Exception {
        when(employees.findByUserId(1L)).thenReturn(Optional.of(new Employee()));
        var photo=image(2); assertThatThrownBy(() -> service.upload(1L,photo)).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(files);
    }
}
