package com.example.demo.backup.engine;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.*;
import java.time.Instant;
import java.util.*;
import java.util.zip.*;

@Component @RequiredArgsConstructor
public class BackupEngine {
 private final BackupProperties properties;private final BackupCommands commands;private final BackupArchive archive;private final ObjectMapper json;
 @Value("${file.upload-dir:./media}") private String mediaDirectory;
 public record Result(String filename,long bytes,String sha256){}
 public Path directory() throws IOException {Path root=Path.of(properties.getDirectory()).toAbsolutePath().normalize();Path media=Path.of(mediaDirectory).toAbsolutePath().normalize();Path key=Path.of(properties.getEncryptionKeyFile()).toAbsolutePath().normalize();if(root.startsWith(media) || media.startsWith(root) || key.startsWith(root) || key.startsWith(media))throw new IOException("Backup storage, encryption key and media storage must be separate");if(Files.isSymbolicLink(root))throw new IOException("Backup directory must not be a symbolic link");BackupArchive.privateDirectory(root);return root;}
 public Result create(UUID id,boolean database,boolean media) throws Exception {
  Path root=directory();Path work=Files.createTempDirectory(root,".building-");BackupArchive.privateDirectory(work);Path encrypted=work.resolve("encrypted.partial");Path output=root.resolve("accruehr-"+id+".ahrbackup");
  try {
   Path dump=work.resolve("database.dump");if(database){Files.createFile(dump);BackupArchive.privateFile(dump);commands.dump(dump,work.resolve("pg-dump.log"));commands.verifyDump(dump,work.resolve("pg-verify.log"));}
   Path zipPath=work.resolve("contents.zip");Files.createFile(zipPath);BackupArchive.privateFile(zipPath);var checksums=new TreeMap<String,String>();long mediaCount=0;
   try(var zip=new ZipOutputStream(Files.newOutputStream(zipPath))){
    if(database)add(zip,dump,"database.dump",checksums);
    if(media){Path source=Path.of(mediaDirectory).toAbsolutePath().normalize();if(!Files.isDirectory(source) || Files.isSymbolicLink(source))throw new IOException("Media directory is missing or invalid");try(var paths=Files.walk(source)){for(Path file:paths.toList()){if(Files.isSymbolicLink(file))throw new IOException("Media contains a symbolic link; backup stopped");if(Files.isRegularFile(file,LinkOption.NOFOLLOW_LINKS)){add(zip,file,"media/"+source.relativize(file).toString().replace('\\','/'),checksums);mediaCount++;}}}}
    zip.putNextEntry(new ZipEntry("manifest.json"));zip.write(json.writeValueAsBytes(Map.of("version",1,"createdAt",Instant.now().toString(),"scope","ALL_ORGANIZATIONS","database",database,"media",media,"mediaFiles",mediaCount,"checksums",checksums)));zip.closeEntry();
   }
   archive.encrypt(zipPath,encrypted);archive.verify(encrypted);Files.move(encrypted,output,StandardCopyOption.ATOMIC_MOVE);BackupArchive.privateFile(output);return new Result(output.getFileName().toString(),Files.size(output),BackupArchive.sha256(output));
  } finally {try(var paths=Files.walk(work)){for(Path p:paths.sorted(Comparator.reverseOrder()).toList())Files.deleteIfExists(p);}}
 }
 private void add(ZipOutputStream zip,Path file,String name,Map<String,String> sums) throws Exception {
  var before=Files.readAttributes(file,BasicFileAttributes.class,LinkOption.NOFOLLOW_LINKS);if(!before.isRegularFile())throw new IOException("Backup source must be a regular file");var hash=MessageDigest.getInstance("SHA-256");zip.putNextEntry(new ZipEntry(name));try(var input=Files.newInputStream(file,LinkOption.NOFOLLOW_LINKS)){byte[] bytes=new byte[65536];int n;while((n=input.read(bytes))!=-1){zip.write(bytes,0,n);hash.update(bytes,0,n);}}zip.closeEntry();var after=Files.readAttributes(file,BasicFileAttributes.class,LinkOption.NOFOLLOW_LINKS);if(before.size()!=after.size() || !before.lastModifiedTime().equals(after.lastModifiedTime()))throw new IOException("A file changed during backup; retry during a quiet period");sums.put(name,HexFormat.of().formatHex(hash.digest()));
 }
 public Path file(String filename) throws IOException {if(filename==null || !filename.matches("accruehr-[0-9a-f-]{36}\\.ahrbackup"))throw new IOException("Invalid backup filename");Path root=directory();Path file=root.resolve(filename);if(!Files.isRegularFile(file,LinkOption.NOFOLLOW_LINKS))throw new IOException("Backup file is missing");return file;}
}
