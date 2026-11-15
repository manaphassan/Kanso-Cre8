use super::*;
use crate::vault::guard::test_support::TempDir;

fn vault() -> (TempDir, VaultRoot) {
    let tmp = TempDir::new("ops");
    let root = tmp.path().join("Vault");
    fs::create_dir_all(root.join("_Notes").join("01_Fleeting")).unwrap();
    fs::write(
        root.join("_Notes").join("Scratchpad.md"),
        "# Scratch\r\nline\r\n",
    )
    .unwrap();
    fs::create_dir_all(root.join(".obsidian")).unwrap();
    fs::write(root.join(".obsidian").join("app.json"), "{}").unwrap();
    let v = VaultRoot::open(&root).unwrap();
    (tmp, v)
}

#[test]
fn atomic_write_creates_parents_and_leaves_no_temp_files() {
    let (_tmp, v) = vault();
    let w = write_text_atomic(&v, "_Projects/2026/Alpha/README.md", "\u{FEFF}a\r\nb\n").unwrap();
    assert_eq!(w.path, "_Projects/2026/Alpha/README.md");
    let bytes = fs::read(v.path().join("_Projects/2026/Alpha/README.md")).unwrap();
    assert_eq!(bytes, b"a\nb\n");
    let leftovers: Vec<_> = fs::read_dir(v.path().join("_Projects/2026/Alpha"))
        .unwrap()
        .flatten()
        .filter(|e| is_temp_name(&e.file_name().to_string_lossy()))
        .collect();
    assert!(leftovers.is_empty());

    write_text_atomic(&v, "_Projects/2026/Alpha/README.md", "replaced").unwrap();
    assert_eq!(
        read_text(&v, "_Projects/2026/Alpha/README.md").unwrap(),
        "replaced"
    );
}

#[test]
fn read_accepts_crlf_and_bom() {
    let (_tmp, v) = vault();
    fs::write(v.path().join("bom.md"), b"\xEF\xBB\xBFtitle\r\nbody").unwrap();
    assert_eq!(read_text(&v, "bom.md").unwrap(), "title\nbody");
    assert_eq!(
        read_text(&v, "_Notes/Scratchpad.md").unwrap(),
        "# Scratch\nline\n"
    );
}

#[test]
fn rejects_invalid_new_names_but_allows_existing_folders() {
    let (_tmp, v) = vault();
    for rel in [
        "_Notes/CON.md",
        "_Notes/a:b.md",
        "_Notes/trailing.",
        "New?/x.md",
    ] {
        assert!(write_text_atomic(&v, rel, "x").is_err(), "{rel}");
    }
    // Existing folder with a name the app would not create itself.
    fs::create_dir_all(v.path().join("Odd name.")).ok();
    if v.path().join("Odd name.").is_dir() {
        assert!(write_text_atomic(&v, "Odd name./note.md", "x").is_ok());
    }
}

#[test]
fn rejects_case_collisions() {
    let (_tmp, v) = vault();
    let err = write_text_atomic(&v, "_Notes/scratchpad.md", "x");
    if cfg!(any(windows, target_os = "macos")) {
        // Case-insensitive file systems resolve to the existing file.
        assert!(err.is_ok());
        assert!(v.path().join("_Notes/Scratchpad.md").is_file());
    } else {
        assert!(err.unwrap_err().contains("letter case"));
    }
    assert!(
        write_text_atomic(&v, "_Notes", "x").is_err(),
        "folder target"
    );
}

#[test]
fn scan_returns_tree_with_text_and_skips_dot_folders() {
    let (_tmp, v) = vault();
    fs::write(v.path().join("_Notes/big.bin"), vec![0u8; 16]).unwrap();
    let entries = scan(&v, "").unwrap();
    let paths: Vec<&str> = entries.iter().map(|e| e.path.as_str()).collect();
    assert!(paths.contains(&"_Notes"));
    assert!(paths.contains(&"_Notes/01_Fleeting"));
    assert!(!paths.iter().any(|p| p.starts_with(".obsidian")));
    let scratch = entries
        .iter()
        .find(|e| e.path == "_Notes/Scratchpad.md")
        .unwrap();
    assert_eq!(scratch.text.as_deref(), Some("# Scratch\nline\n"));
    assert!(scratch.modified_ms.is_some());
    let bin = entries.iter().find(|e| e.path == "_Notes/big.bin").unwrap();
    assert_eq!((bin.size, bin.text.is_none()), (16, true));

    let sub = scan(&v, "_Notes/01_Fleeting").unwrap();
    assert!(sub.is_empty());
    assert!(scan(&v, "_Notes/Scratchpad.md").is_err());
}

#[test]
fn list_dir_returns_children_only() {
    let (_tmp, v) = vault();
    let root_items: Vec<String> = list_dir(&v, "")
        .unwrap()
        .into_iter()
        .map(|e| e.path)
        .collect();
    assert_eq!(
        root_items,
        vec![".obsidian".to_string(), "_Notes".to_string()]
    );
    let notes: Vec<String> = list_dir(&v, "_Notes/")
        .unwrap()
        .into_iter()
        .map(|e| e.path)
        .collect();
    assert_eq!(notes, vec!["_Notes/01_Fleeting", "_Notes/Scratchpad.md"]);
}

#[test]
fn ensure_dirs_reports_only_created() {
    let (_tmp, v) = vault();
    let created = ensure_dirs(
        &v,
        &[
            "_Notes".to_string(),
            "_Finance/Quotes".to_string(),
            "_Finance/Invoices".to_string(),
        ],
    )
    .unwrap();
    assert_eq!(created, vec!["_Finance/Quotes", "_Finance/Invoices"]);
    assert!(ensure_dirs(&v, &["../x".to_string()]).is_err());
}

#[test]
fn archive_moves_instead_of_deleting() {
    let (_tmp, v) = vault();
    let first = move_to_archive(&v, "_Notes/Scratchpad.md").unwrap();
    assert!(first.starts_with("_Archive/") && first.ends_with("/_Notes/Scratchpad.md"));
    assert!(!v.path().join("_Notes/Scratchpad.md").exists());
    assert!(v.resolve(&first).unwrap().is_file());

    write_text_atomic(&v, "_Notes/Scratchpad.md", "again").unwrap();
    let second = move_to_archive(&v, "_Notes/Scratchpad.md").unwrap();
    assert_ne!(first, second, "same-second archives must not collide");

    assert!(move_to_archive(&v, "").is_err());
    assert!(move_to_archive(&v, "_Archive").is_err());
    assert!(move_to_archive(&v, "missing.md").is_err());
}

#[test]
fn copy_into_vault_respects_overwrite() {
    let (tmp, v) = vault();
    let src = tmp.path().join("render.png");
    fs::write(&src, vec![7u8; 1000]).unwrap();
    let w = copy_into_vault(&v, &src, "_Projects/P/05_DELIVERABLES/render.png", false).unwrap();
    assert_eq!(
        (w.path.as_str(), w.size),
        ("_Projects/P/05_DELIVERABLES/render.png", 1000)
    );
    assert!(copy_into_vault(&v, &src, "_Projects/P/05_DELIVERABLES/render.png", false).is_err());
    assert!(copy_into_vault(&v, &src, "_Projects/P/05_DELIVERABLES/render.png", true).is_ok());
    assert!(copy_into_vault(&v, tmp.path(), "_Projects/P/dir.png", false).is_err());
    assert!(copy_into_vault(&v, &src, "../escape.png", false).is_err());
}

#[test]
fn writes_bytes_and_copies_within_the_vault() {
    let (_tmp, v) = vault();
    let bytes: Vec<u8> = (0..=255u8).collect();
    let w = write_bytes(&v, "_Projects/P/04_WIP/raw.png", &bytes, false).unwrap();
    assert_eq!(
        (w.path.as_str(), w.size),
        ("_Projects/P/04_WIP/raw.png", 256)
    );
    assert_eq!(
        fs::read(v.path().join("_Projects/P/04_WIP/raw.png")).unwrap(),
        bytes
    );
    assert!(write_bytes(&v, "_Projects/P/04_WIP/raw.png", &bytes, false).is_err());
    assert!(write_bytes(&v, "_Projects/P/04_WIP/raw.png", b"x", true).is_ok());
    assert!(write_bytes(&v, "../escape.bin", b"x", false).is_err());

    copy_within(
        &v,
        "_Notes/Scratchpad.md",
        "_Projects/P/_snapshots/s1/Scratchpad.md",
        false,
    )
    .unwrap();
    assert_eq!(
        fs::read(v.path().join("_Projects/P/_snapshots/s1/Scratchpad.md")).unwrap(),
        fs::read(v.path().join("_Notes/Scratchpad.md")).unwrap()
    );
    assert!(copy_within(&v, "_Notes", "x.md", false).is_err());
}

#[test]
fn handles_paths_longer_than_260_characters() {
    let (_tmp, v) = vault();
    let deep: Vec<String> = (0..12)
        .map(|i| format!("Folder_{i:02}_{}", "x".repeat(20)))
        .collect();
    let rel = format!("_Projects/{}/README.md", deep.join("/"));
    assert!(v.path().join(&rel).to_string_lossy().len() > 260);
    write_text_atomic(&v, &rel, "deep").unwrap();
    assert_eq!(read_text(&v, &rel).unwrap(), "deep");
    assert!(scan(&v, "_Projects").unwrap().iter().any(|e| e.path == rel));
    let archived = move_to_archive(&v, &rel).unwrap();
    assert!(v.resolve(&archived).unwrap().is_file());
}
