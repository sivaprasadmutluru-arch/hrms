package com.example.demo.backup.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.*;
import java.util.zip.ZipInputStream;

/** Offline recovery preparation only. Never restores over a live database. */
public final class BackupRecoveryTool {
 private BackupRecoveryTool() {}
 public static void main(String[] args) throws Exception {
  if(args.length!=3)throw new IllegalArgumentException("Usage: BackupRecoveryTool <archive.ahrbackup> <encryption-key-file> <empty-output-directory>");
  var properties=new BackupProperties();properties.setEncryptionKeyFile(args[1]);var archive=new BackupArchive(properties,new ObjectMapper());Path input=Path.of(args[0]);archive.verify(input);
  Path destination=Path.of(args[2]).toAbsolutePath().normalize();if(Files.isSymbolicLink(destination))throw new IllegalArgumentException("Output must not be a symbolic link");
  if(Files.exists(destination)){try(var files=Files.list(destination)){if(files.findAny().isPresent())throw new IllegalArgumentException("Output directory must be empty");}}
  BackupArchive.privateDirectory(destination);
  try(var zip=new ZipInputStream(archive.decrypt(input))){java.util.zip.ZipEntry entry;while((entry=zip.getNextEntry())!=null){Path target=destination.resolve(entry.getName()).normalize();if(!target.startsWith(destination) || entry.isDirectory())throw new IllegalArgumentException("Invalid archive path");BackupArchive.privateDirectory(target.getParent());Files.createFile(target);BackupArchive.privateFile(target);try(var out=Files.newOutputStream(target)){zip.transferTo(out);}zip.closeEntry();}}
  System.out.println("Backup verified and extracted to private recovery directory. Restore database.dump only into a separate empty PostgreSQL database first.");
 }
}
