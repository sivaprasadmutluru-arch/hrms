package com.example.demo.backup;
import com.example.demo.backup.engine.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;
import static org.assertj.core.api.Assertions.*;
class BackupArchiveTest {
 @TempDir Path temp;ObjectMapper json=new ObjectMapper();BackupProperties properties;BackupArchive archive;
 @BeforeEach void setup(){properties=new BackupProperties();properties.setEncryptionKeyFile(temp.resolve("key").toString());archive=new BackupArchive(properties,json);}
 Path zip(boolean valid) throws Exception {Path zip=temp.resolve(UUID.randomUUID()+".zip");byte[] bytes=new byte[180000];new Random(9).nextBytes(bytes);String checksum=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));try(var out=new ZipOutputStream(Files.newOutputStream(zip))){out.putNextEntry(new ZipEntry("database.dump"));out.write(bytes);out.closeEntry();out.putNextEntry(new ZipEntry("manifest.json"));out.write(json.writeValueAsBytes(Map.of("version",1,"checksums",Map.of("database.dump",valid?checksum:"incorrect"))));out.closeEntry();}return zip;}
 Path encrypted() throws Exception {return archive.encrypt(zip(true),temp.resolve("backup.ahrbackup"));}
 @Test void encryptedArchiveRoundTripsAndChecksumsVerify() throws Exception {Path result=encrypted();assertThatCode(()->archive.verify(result)).doesNotThrowAnyException();assertThat(Arrays.copyOf(Files.readAllBytes(result),2)).isNotEqualTo(new byte[]{'P','K'});assertThat(Files.getPosixFilePermissions(result)).isEqualTo(java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"));}
 @Test void tamperedCiphertextIsRejected() throws Exception {Path result=encrypted();byte[] data=Files.readAllBytes(result);data[200]^=1;Files.write(result,data);assertThatThrownBy(()->archive.verify(result)).isInstanceOf(Exception.class);}
 @Test void truncationIsRejected() throws Exception {Path result=encrypted();byte[] data=Files.readAllBytes(result);Files.write(result,Arrays.copyOf(data,data.length-20));assertThatThrownBy(()->archive.verify(result)).isInstanceOf(Exception.class);}
 @Test void missingEndFrameIsRejected() throws Exception {Path result=encrypted();byte[] data=Files.readAllBytes(result);Files.write(result,Arrays.copyOf(data,data.length-20));assertThatThrownBy(()->archive.verify(result)).isInstanceOf(Exception.class);}
 @Test void appendedDataIsRejected() throws Exception {Path result=encrypted();Files.write(result,new byte[]{1,2},StandardOpenOption.APPEND);assertThatThrownBy(()->archive.verify(result)).isInstanceOf(Exception.class);}
 @Test void mismatchedManifestIsRejected() throws Exception {Path result=archive.encrypt(zip(false),temp.resolve("bad.ahrbackup"));assertThatThrownBy(()->archive.verify(result)).hasMessageContaining("checksums");}
 @Test void wrongKeyIsRejected() throws Exception {Path result=encrypted();byte[] key=new byte[32];new Random(5).nextBytes(key);Files.write(Path.of(properties.getEncryptionKeyFile()),key);assertThatThrownBy(()->archive.verify(result)).isInstanceOf(Exception.class);}
 @Test void missingKeyDoesNotMakeAnArchiveValid() throws Exception {Path result=encrypted();Files.delete(Path.of(properties.getEncryptionKeyFile()));assertThatThrownBy(()->archive.verify(result)).isInstanceOf(Exception.class);}
 @Test void reorderedFramesAreRejected() throws Exception {Path result=encrypted();byte[] data=Files.readAllBytes(result);int start=17;int length=java.nio.ByteBuffer.wrap(data,start,4).getInt()+4;byte[] first=Arrays.copyOfRange(data,start,start+length);System.arraycopy(data,start+length,data,start,length);System.arraycopy(first,0,data,start+length,length);Files.write(result,data);assertThatThrownBy(()->archive.verify(result)).isInstanceOf(Exception.class);}
}
