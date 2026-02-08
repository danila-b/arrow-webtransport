use anyhow::Result;

use crate::arrow;

pub async fn handle_session(incoming_session: wtransport::endpoint::IncomingSession) -> Result<()> {
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

            let batch = arrow::create_demo_batch()?;
            let arrow_data = arrow::encode_batch(&batch)?;
            println!("Sending {} bytes of Arrow IPC data", arrow_data.len());

            send.write_all(&arrow_data).await?;

            println!("Arrow data sent successfully");
        }
        Err(e) => eprintln!("Error accepting stream: {}", e),
    }

    Ok(())
}
