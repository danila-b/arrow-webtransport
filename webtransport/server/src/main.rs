use anyhow::Result;
use arrow::array::{Int32Array, StringArray};
use arrow::datatypes::{DataType, Field, Schema};
use arrow::ipc::writer::StreamWriter;
use arrow::record_batch::RecordBatch;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use wtransport::tls::Sha256DigestFmt;
use wtransport::{Endpoint, Identity, ServerConfig};

/// Certificates are valid for 14 days (WebTransport spec maximum).
/// Regenerate after 13 days to avoid last-minute expiry.
const CERT_MAX_AGE: Duration = Duration::from_secs(13 * 24 * 3600);

fn certs_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../certs")
}

/// Check whether the certificate file is older than `CERT_MAX_AGE`.
fn cert_needs_refresh(cert_path: &Path) -> bool {
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
async fn get_or_create_identity() -> Result<Identity> {
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

    // Always write the hash file so the client can pick it up
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

async fn create_demo_arrow_batch() -> Result<Vec<u8>> {
    // Create schema
    let schema = Schema::new(vec![
        Field::new("id", DataType::Int32, false),
        Field::new("name", DataType::Utf8, false),
        Field::new("value", DataType::Int32, false),
    ]);

    // Create data
    let id_array = Int32Array::from(vec![1, 2, 3, 4, 5]);
    let name_array = StringArray::from(vec!["Alice", "Bob", "Charlie", "David", "Eve"]);
    let value_array = Int32Array::from(vec![100, 200, 300, 400, 500]);

    // Create record batch
    let batch = RecordBatch::try_new(
        Arc::new(schema),
        vec![
            Arc::new(id_array),
            Arc::new(name_array),
            Arc::new(value_array),
        ],
    )?;

    // Serialize to Arrow IPC format
    let mut buffer = Vec::new();
    {
        let mut writer = StreamWriter::try_new(&mut buffer, &batch.schema())?;
        writer.write(&batch)?;
        writer.finish()?;
    }

    Ok(buffer)
}

#[tokio::main]
async fn main() -> Result<()> {
    let identity = get_or_create_identity().await?;

    let config = ServerConfig::builder()
        .with_bind_default(4433)
        .with_identity(identity)
        .build();

    let server = Endpoint::server(config)?;
    println!("WebTransport server listening on https://127.0.0.1:4433");

    loop {
        let incoming_session = server.accept().await;

        tokio::spawn(async move {
            if let Err(e) = handle_session(incoming_session).await {
                eprintln!("Session error: {}", e);
            }
        });
    }
}

async fn handle_session(
    incoming_session: wtransport::endpoint::IncomingSession,
) -> Result<()> {
    let session_request = incoming_session.await?;
    println!(
        "New session request from: {:?}",
        session_request.authority()
    );

    let connection = session_request.accept().await?;
    println!("Connection established");

    match connection.accept_bi().await {
        Ok((mut send, mut recv)) => {
            println!("Accepted bidirectional stream");

            let mut buffer = vec![0u8; 1024];
            if let Some(bytes_read) = recv.read(&mut buffer).await? {
                println!("Received {} bytes from client", bytes_read);
            }

            let arrow_data = create_demo_arrow_batch().await?;
            println!("Sending {} bytes of Arrow IPC data", arrow_data.len());

            send.write_all(&arrow_data).await?;

            println!("Arrow data sent successfully");
        }
        Err(e) => eprintln!("Error accepting stream: {}", e),
    }

    Ok(())
}
