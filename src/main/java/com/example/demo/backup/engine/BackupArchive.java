package com.example.demo.backup.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import javax.crypto.*;
import javax.crypto.spec.*;
import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.*;
import java.util.*;
import java.util.zip.*;

/** Encrypted versioned archive. The deployment encryption key is never included. */
@Component @RequiredArgsConstructor
public class BackupArchive {
 private final BackupProperties properties;
 private final ObjectMapper json;
 private static final byte[] MAGIC="ACCRUEHR2".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
 public static void privateDirectory(Path path) throws IOException {Files.createDirectories(path);Files.setPosixFilePermissions(path,PosixFilePermissions.fromString("rwx------"));}
 public static void privateFile(Path path) throws IOException {Files.setPosixFilePermissions(path,PosixFilePermissions.fromString("rw-------"));}
 private byte[] key(boolean create) throws IOException {
  Path path=Path.of(properties.getEncryptionKeyFile()).toAbsolutePath().normalize();
  privateDirectory(path.getParent());
  if(!Files.exists(path) && !create)throw new IOException("Backup encryption key is missing; recover the original key before verifying or restoring archives");
  if(!Files.exists(path)) {Path storage=Path.of(properties.getDirectory());if(Files.isDirectory(storage)){try(var files=Files.list(storage)){if(files.anyMatch(file->file.getFileName().toString().endsWith(".ahrbackup")))throw new IOException("Original encryption key is missing; existing backups require that key");}}byte[] key=new byte[32];new SecureRandom().nextBytes(key);try{Files.write(path,key,StandardOpenOption.CREATE_NEW);privateFile(path);}catch(FileAlreadyExistsException ignored){}}
  if(Files.isSymbolicLink(path))throw new IOException("Encryption key must be a regular private file");
  privateFile(path);byte[] key=Files.readAllBytes(path);if(key.length!=32)throw new IOException("Backup encryption key must contain exactly 32 bytes");return key;
 }
 public Path encrypt(Path zip,Path output) throws Exception {
  byte[] nonce=new byte[8];new SecureRandom().nextBytes(nonce);byte[] key=key(true);
  try(var file=new DataOutputStream(Files.newOutputStream(output,StandardOpenOption.CREATE_NEW));var input=Files.newInputStream(zip)){
   privateFile(output);file.write(MAGIC);file.write(nonce);int counter=0;
   while(true){byte[] block=input.readNBytes(65536);byte[] encrypted=frame(Cipher.ENCRYPT_MODE,key,nonce,counter++,block);file.writeInt(encrypted.length);file.write(encrypted);if(block.length==0)break;}
  }
  return output;
 }
 private byte[] frame(int mode,byte[] key,byte[] nonce,int counter,byte[] input) throws Exception {
  var iv=java.nio.ByteBuffer.allocate(12).put(nonce).putInt(counter).array();Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(mode,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));cipher.updateAAD(MAGIC);return cipher.doFinal(input);
 }
 public InputStream decrypt(Path file) throws Exception {
  var input=new DataInputStream(Files.newInputStream(file));
  try{if(!Arrays.equals(input.readNBytes(MAGIC.length),MAGIC))throw new IOException("Unrecognized backup archive");byte[] nonce=input.readNBytes(8);if(nonce.length!=8)throw new IOException("Incomplete backup archive");byte[] key=key(false);
   return new InputStream(){byte[] block=new byte[0];int position=0,counter=0;boolean ended;
    private boolean fill() throws IOException {if(position<block.length)return true;if(ended)return false;try{int length=input.readInt();if(length<16 || length>65552)throw new IOException("Invalid encrypted frame");byte[] bytes=input.readNBytes(length);if(bytes.length!=length)throw new IOException("Truncated backup archive");block=frame(Cipher.DECRYPT_MODE,key,nonce,counter++,bytes);position=0;if(block.length==0){ended=true;if(input.read()!=-1)throw new IOException("Unexpected archive contents");return false;}return true;}catch(IOException e){throw e;}catch(Exception e){throw new IOException("Backup authentication failed",e);}}
    @Override public int read() throws IOException {return fill()?block[position++]&255:-1;}
    @Override public int read(byte[] bytes,int offset,int length) throws IOException {java.util.Objects.checkFromIndexSize(offset,length,bytes.length);if(length==0)return 0;if(!fill())return -1;int n=Math.min(length,block.length-position);System.arraycopy(block,position,bytes,offset,n);position+=n;return n;}
    @Override public void close() throws IOException {input.close();}
   };
  }catch(Exception e){input.close();throw e;}
 }
 public static String sha256(Path path) throws Exception {try(var in=Files.newInputStream(path)){return digest(in);}}
 private static String digest(InputStream in) throws Exception {var digest=MessageDigest.getInstance("SHA-256");byte[] buffer=new byte[65536];int size;while((size=in.read(buffer))!=-1)digest.update(buffer,0,size);return HexFormat.of().formatHex(digest.digest());}
 public void verify(Path archive) throws Exception {
  Map<String,String> actual=new TreeMap<>();Map<String,String> expected=null;
  // Consume to EOF to authenticate the GCM tag, including bytes after ZIP entries.
  try(var decrypted=decrypt(archive);var zip=new ZipInputStream(decrypted)){
   ZipEntry entry;while((entry=zip.getNextEntry())!=null){String name=entry.getName();if(name.startsWith("/") || name.contains("..") || actual.containsKey(name))throw new IOException("Invalid archive entry");if(name.equals("manifest.json")){if(expected!=null)throw new IOException("Duplicate manifest");var manifest=json.readTree(zip.readNBytes(8*1024*1024));if(manifest.path("version").asInt()!=1)throw new IOException("Unsupported manifest");expected=new TreeMap<>();var fields=manifest.path("checksums").fields();while(fields.hasNext()){var field=fields.next();expected.put(field.getKey(),field.getValue().asText());}}else actual.put(name,digest(zip));zip.closeEntry();}
   decrypted.transferTo(OutputStream.nullOutputStream());
  }
  if(expected==null || !expected.equals(actual) || actual.isEmpty())throw new IOException("Backup contents do not match manifest checksums");
 }
}
