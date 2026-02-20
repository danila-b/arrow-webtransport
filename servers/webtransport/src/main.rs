mod certs;
mod session;

use std::sync::Arc;

use anyhow::Result;
use wtransport::config::QuicTransportConfig;
use wtransport::{Endpoint, ServerConfig};

#[tokio::main]
async fn main() -> Result<()> {
    let identity = certs::get_or_create_identity().await?;

    let ctx = Arc::new(server_core::query::create_context().await?);

    let mut transport = QuicTransportConfig::default();
    transport.send_window(8 * 1024 * 1024);
    transport.receive_window(quinn::VarInt::from_u32(16 * 1024 * 1024));
    transport.stream_receive_window(quinn::VarInt::from_u32(8 * 1024 * 1024));

    let config = ServerConfig::builder()
        .with_bind_default(4433)
        .with_custom_transport(identity, transport)
        .build();

    let server = Endpoint::server(config)?;
    println!("WebTransport server listening on https://127.0.0.1:4433");

    loop {
        let incoming_session = server.accept().await;
        let ctx = ctx.clone();

        tokio::spawn(async move {
            if let Err(e) = session::handle_session(incoming_session, ctx).await {
                eprintln!("Session error: {}", e);
            }
        });
    }
}
