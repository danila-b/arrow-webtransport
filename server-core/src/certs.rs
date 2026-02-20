use anyhow::Result;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

/// Certificates are valid for 14 days (WebTransport spec maximum).
/// Regenerate after 13 days to avoid last-minute expiry.
pub const CERT_MAX_AGE: Duration = Duration::from_secs(13 * 24 * 3600);

pub fn certs_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("certs")
}

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

/// Ensure valid PEM certificate files exist in the shared `certs/` directory.
/// Generates a new self-signed certificate if missing or expired.
/// Returns `(cert_path, key_path)`.
pub fn ensure_certs() -> Result<(PathBuf, PathBuf)> {
    let dir = certs_dir();
    let cert_path = dir.join("cert.pem");
    let key_path = dir.join("key.pem");

    if cert_path.exists() && key_path.exists() && !cert_needs_refresh(&cert_path) {
        println!("Using existing certificate from {}", dir.display());
        return Ok((cert_path, key_path));
    }

    if cert_path.exists() && cert_needs_refresh(&cert_path) {
        println!("Certificate expired, regenerating...");
    }

    generate_and_save(&dir, &cert_path, &key_path)?;
    Ok((cert_path, key_path))
}

fn generate_and_save(dir: &Path, cert_path: &Path, key_path: &Path) -> Result<()> {
    let mut params = rcgen::CertificateParams::new(vec!["localhost".into()])?;
    params
        .subject_alt_names
        .push(rcgen::SanType::IpAddress(std::net::IpAddr::V4(
            std::net::Ipv4Addr::LOCALHOST,
        )));

    let key_pair = rcgen::KeyPair::generate()?;
    let cert = params.self_signed(&key_pair)?;

    std::fs::create_dir_all(dir)?;
    std::fs::write(cert_path, cert.pem())?;
    std::fs::write(key_path, key_pair.serialize_pem())?;

    println!("Generated new self-signed certificate in {}", dir.display());
    Ok(())
}
