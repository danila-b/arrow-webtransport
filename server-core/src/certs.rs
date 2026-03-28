use anyhow::Result;
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};
use time::OffsetDateTime;

/// WebTransport spec caps self-signed cert validity at 14 days.
const CERT_VALIDITY_DAYS: i64 = 14;

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

/// Ensure valid PEM certificate files and `cert-hash.json` exist in the
/// shared `certs/` directory. Generates everything from scratch if any
/// file is missing or the certificate is older than [`CERT_MAX_AGE`].
/// Returns `(cert_path, key_path)`.
pub fn ensure_certs() -> Result<(PathBuf, PathBuf)> {
    let dir = certs_dir();
    let cert_path = dir.join("cert.pem");
    let key_path = dir.join("key.pem");
    let hash_path = dir.join("cert-hash.json");

    let all_exist = cert_path.exists() && key_path.exists() && hash_path.exists();

    if all_exist && !cert_needs_refresh(&cert_path) {
        println!("Using existing certificate from {}", dir.display());
        return Ok((cert_path, key_path));
    }

    if cert_path.exists() && cert_needs_refresh(&cert_path) {
        println!("Certificate expired, regenerating...");
    }

    generate_and_save(&dir, &cert_path, &key_path, &hash_path)?;
    Ok((cert_path, key_path))
}

fn generate_and_save(
    dir: &Path,
    cert_path: &Path,
    key_path: &Path,
    hash_path: &Path,
) -> Result<()> {
    let mut params = rcgen::CertificateParams::new(vec!["localhost".into()])?;
    params
        .subject_alt_names
        .push(rcgen::SanType::IpAddress(std::net::IpAddr::V4(
            std::net::Ipv4Addr::LOCALHOST,
        )));
    params.not_before = OffsetDateTime::now_utc();
    params.not_after =
        OffsetDateTime::now_utc() + time::Duration::days(CERT_VALIDITY_DAYS);

    let key_pair = rcgen::KeyPair::generate()?;
    let cert = params.self_signed(&key_pair)?;

    let hash = Sha256::digest(cert.der());
    let hash_bytes: Vec<u8> = hash.to_vec();
    let hash_json = format!("{{\"hash\":{hash_bytes:?}}}");

    std::fs::create_dir_all(dir)?;

    let tmp_cert = dir.join("cert.pem.tmp");
    let tmp_key = dir.join("key.pem.tmp");
    let tmp_hash = dir.join("cert-hash.json.tmp");

    std::fs::write(&tmp_cert, cert.pem())?;
    std::fs::write(&tmp_key, key_pair.serialize_pem())?;
    std::fs::write(&tmp_hash, &hash_json)?;

    std::fs::rename(&tmp_cert, cert_path)?;
    std::fs::rename(&tmp_key, key_path)?;
    std::fs::rename(&tmp_hash, hash_path)?;

    println!(
        "Generated new self-signed certificate in {} (valid {} days)",
        dir.display(),
        CERT_VALIDITY_DAYS,
    );
    Ok(())
}
