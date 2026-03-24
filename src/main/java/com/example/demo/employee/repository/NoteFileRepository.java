package com.example.demo.employee.repository;

import com.example.demo.employee.entity.NoteFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteFileRepository extends JpaRepository<NoteFile, Long>, JpaSpecificationExecutor<NoteFile> {
    List<NoteFile> findByNoteId(Long noteId);
}
