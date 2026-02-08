use anyhow::Result;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use wtransport::tls::Sha256DigestFmt;
use wtransport::Identity;

/// Certificates are valid for 14 days (WebTransport spec maximum).
/// Regenerate after 13 days to avoid last-minute expiry.
pub const CERT_MAX_AGE: Duration = Duration::from_secs(13 * 24 * 3600);

pub fn certs_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../certs")
}

/// Check whether the certificate file is older than `CERT_MAX_AGE`.
pub fn cert_needs_refresh(cert_path: &Path) -> bool {
    let Ok(meta) = std::fs::metadata(cert_path) else {
        return true;
    };
    let Ok(modified) = meta.modified() else {
        return true;
    };
    let age = SystemTime::now()
        .duration_since(modified)
        .unwrap_or(Duration::MAX);
    age > CERT_MAX_AGE
}

/// Load an existing certificate from PEM files, or generate a new self-signed
/// one. Persists cert + key as PEM and writes the SHA-256 hash to a JSON file
/// so the browser client can read it automatically.
pub async fn get_or_create_identity() -> Result<Identity> {
    let dir = certs_dir();
    let cert_path = dir.join("cert.pem");
    let key_path = dir.join("key.pem");
    let hash_path = dir.join("cert-hash.json");

    let identity = if cert_path.exists() && key_path.exists() && !cert_needs_refresh(&cert_path) {
        match Identity::load_pemfiles(&cert_path, &key_path).await {
            Ok(id) => {
                println!("Loaded existing certificate from {}", dir.display());
                id
            }
            Err(e) => {
                println!(
                    "Failed to load existing certs ({}), regenerating...",
                    e
                );
                generate_and_save_identity(&dir, &cert_path, &key_path).await?
            }
        }
    } else {
        if cert_path.exists() && cert_needs_refresh(&cert_path) {
            println!("Certificate expired, regenerating...");
        }
        generate_and_save_identity(&dir, &cert_path, &key_path).await?
    };

    let hash = identity.certificate_chain().as_slice()[0].hash();
    let hash_array_str = hash.fmt(Sha256DigestFmt::BytesArray);
    let json = format!("{{\"hash\":{hash_array_str}}}");
    std::fs::write(&hash_path, &json)?;
    println!("Certificate hash written to {}", hash_path.display());

    Ok(identity)
}

async fn generate_and_save_identity(
    dir: &Path,
    cert_path: &Path,
    key_path: &Path,
) -> Result<Identity> {
    let identity = Identity::self_signed(["localhost", "127.0.0.1"])?;

    std::fs::create_dir_all(dir)?;

    let cert = &identity.certificate_chain().as_slice()[0];
    cert.store_pemfile(cert_path).await?;
    identity
        .private_key()
        .store_secret_pemfile(key_path)
        .await?;

    println!(
        "Generated new self-signed certificate in {}",
        dir.display()
    );
    Ok(identity)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

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
