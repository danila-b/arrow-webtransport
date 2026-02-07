use anyhow::Result;
use arrow::array::{Int32Array, StringArray};
use arrow::datatypes::{DataType, Field, Schema};
use arrow::ipc::writer::StreamWriter;
use arrow::record_batch::RecordBatch;
use std::sync::Arc;
use wtransport::{Endpoint, Identity, ServerConfig};

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
    // Generate self-signed certificate for local development
    let identity = Identity::self_signed(["localhost", "127.0.0.1"])?;

    // Print certificate hash for client configuration
    let cert_hash = identity.certificate_chain().as_slice()[0].hash();
    println!("Certificate Hash: {:?}", cert_hash);
    println!("Use this hash in your client's serverCertificateHashes option");

    let config = ServerConfig::builder()
        .with_bind_default(4433)
        .with_identity(&identity)
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

async fn handle_session(incoming_session: wtransport::endpoint::IncomingSession) -> Result<()> {
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
