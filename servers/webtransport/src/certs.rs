use anyhow::Result;
use server_core::certs;
use wtransport::Identity;
use wtransport::tls::Sha256DigestFmt;

/// Load or generate PEM certificates via the shared `server-core` certs module,
/// then convert them to a `wtransport::Identity` and write the SHA-256 hash
/// to `cert-hash.json` (needed for browser cert pinning).
pub async fn get_or_create_identity() -> Result<Identity> {
    let (cert_path, key_path) = certs::ensure_certs()?;
    let hash_path = certs::certs_dir().join("cert-hash.json");

    let identity = Identity::load_pemfiles(&cert_path, &key_path).await?;

    let hash = identity.certificate_chain().as_slice()[0].hash();
    let hash_array_str = hash.fmt(Sha256DigestFmt::BytesArray);
    let json = format!("{{\"hash\":{hash_array_str}}}");
    std::fs::write(&hash_path, &json)?;
    println!("Certificate hash written to {}", hash_path.display());

    Ok(identity)
}

#[cfg(test)]
mod tests {
    use server_core::certs::cert_needs_refresh;
    use std::fs;
    use std::path::Path;

    #[test]
    fn refresh_needed_for_nonexistent_file() {
        let path = Path::new("/tmp/does_not_exist_cert_test.pem");
        assert!(cert_needs_refresh(path));
    }

    #[test]
    fn no_refresh_for_fresh_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cert.pem");
        fs::write(&path, "fake cert").unwrap();
        assert!(!cert_needs_refresh(&path));
    }

    #[test]
    fn refresh_needed_for_old_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("cert.pem");
        fs::write(&path, "fake cert").unwrap();

        let old_time = filetime::FileTime::from_unix_time(0, 0);
        filetime::set_file_mtime(&path, old_time).unwrap();

        assert!(cert_needs_refresh(&path));
    }
}
